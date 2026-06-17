// pages/aa-split/aa-split.js
const store = require('../../store/index')
const recordService = require('../../services/record')
const moneyUtil = require('../../utils/money')
const dateUtil = require('../../utils/date')

Page({
  data: {
    currentLedger: null,
    viewYear: 0,
    viewMonth: 0,
    monthLabel: '',
    isCurrentMonth: true,
    records: [],          // 当月支出账单（不含收入）
    selectedIds: {},      // { recordId: true }，便于 O(1) 查找
    selectedCount: 0,
    selectedTotal: 0,
    selectedTotalLabel: '0.00',
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 30
  },

  onLoad(options) {
    const now = new Date()
    const year = parseInt(options.year, 10) || now.getFullYear()
    const month = parseInt(options.month, 10) || (now.getMonth() + 1)
    const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth() + 1)
    this.setData({
      viewYear: year,
      viewMonth: month,
      monthLabel: `${year}年${month}月`,
      isCurrentMonth
    })
    const ledger = store.getState('currentLedger')
    if (ledger) {
      this.setData({ currentLedger: ledger })
      this.loadAll()
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadMore()
  },

  /** 拉取当月全部支出账单（分批） */
  async loadAll() {
    this.setData({ records: [], selectedIds: {}, page: 1, hasMore: true })
    await this.loadMore()
  },

  async loadMore() {
    const { currentLedger, viewYear, viewMonth, page, pageSize, records } = this.data
    if (!currentLedger || this.data.loading) return
    this.setData({ loading: true })
    const start = new Date(viewYear, viewMonth - 1, 1, 0, 0, 0, 0)
    const end = new Date(viewYear, viewMonth, 0, 23, 59, 59, 999)
    // 当天范围（用于默认勾选）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today.getTime() + 86400000 - 1)
    try {
      const list = await recordService.list({
        ledger_id: currentLedger._id,
        start, end,
        page,
        pageSize
      })
      // 只参与支出 AA
      const expenses = list.filter(r => r.type === 'expense')
      const next = [...records, ...expenses.map(r => ({
        ...r,
        date_label: dateUtil.formatDate(r.record_date, 'M月d日'),
        amount_label: moneyUtil.format(r.amount)
      }))]
      // 默认仅勾选当天账单
      const selectedIds = { ...this.data.selectedIds }
      expenses.forEach(r => {
        const d = new Date(r.record_date)
        if (d >= today && d <= todayEnd) selectedIds[r._id] = true
      })
      this.setData({
        records: next,
        selectedIds,
        page: page + 1,
        hasMore: list.length === pageSize
      })
      this.recalcSelected()
    } catch (e) {
      console.error('加载账单失败', e)
    } finally {
      this.setData({ loading: false })
    }
  },

  toggleOne(e) {
    const id = e.currentTarget.dataset.id
    const selectedIds = { ...this.data.selectedIds }
    if (selectedIds[id]) delete selectedIds[id]
    else selectedIds[id] = true
    this.setData({ selectedIds })
    this.recalcSelected()
  },

  toggleAll() {
    const allChecked = this.data.selectedCount === this.data.records.length
    const selectedIds = {}
    if (!allChecked) {
      this.data.records.forEach(r => { selectedIds[r._id] = true })
    }
    this.setData({ selectedIds })
    this.recalcSelected()
  },

  recalcSelected() {
    const { records, selectedIds } = this.data
    let count = 0
    let total = 0
    records.forEach(r => {
      if (selectedIds[r._id]) {
        count += 1
        total = moneyUtil.add(total, r.amount)
      }
    })
    this.setData({
      selectedCount: count,
      selectedTotal: total,
      selectedTotalLabel: moneyUtil.format(total)
    })
  },

  /** 弹窗输入人数，给出结果 */
  startSplit() {
    if (this.data.selectedCount === 0) {
      wx.showToast({ title: '请选择账单', icon: 'none' })
      return
    }
    wx.showModal({
      title: 'AA 分账',
      editable: true,
      placeholderText: '请输入参与 AA 的人数',
      content: '',
      success: (res) => {
        if (!res.confirm) return
        const n = parseInt((res.content || '').trim(), 10)
        if (!n || n < 1 || n > 99) {
          wx.showToast({ title: '人数需在 1-99 之间', icon: 'none' })
          return
        }
        this.computeAA(n)
      }
    })
  },

  computeAA(headCount) {
    const { records, selectedIds, selectedTotal } = this.data
    const perHead = Math.round((selectedTotal / headCount) * 100) / 100

    // 按 openid 聚合每人垫付金额
    const payerMap = {}
    records.forEach(r => {
      if (!selectedIds[r._id]) return
      const key = r.openid
      if (!payerMap[key]) {
        payerMap[key] = {
          openid: key,
          nickname: r.creator_nickname || '未知',
          total: 0
        }
      }
      payerMap[key].total = moneyUtil.add(payerMap[key].total, r.amount)
    })
    const payers = Object.values(payerMap)
    const nonPayerCount = Math.max(0, headCount - payers.length)

    const lines = []
    lines.push(`勾选总额 ¥${moneyUtil.format(selectedTotal)}`)
    lines.push(`${headCount} 人 AA，人均 ¥${moneyUtil.format(perHead)}`)
    lines.push('')
    lines.push('—— 记账人 ——')
    payers.forEach(p => {
      const diff = Math.round((p.total - perHead) * 100) / 100
      if (diff > 0) {
        lines.push(`${p.nickname}：垫付 ¥${moneyUtil.format(p.total)}，应收 ¥${moneyUtil.format(diff)}`)
      } else if (diff < 0) {
        lines.push(`${p.nickname}：垫付 ¥${moneyUtil.format(p.total)}，应付 ¥${moneyUtil.format(-diff)}`)
      } else {
        lines.push(`${p.nickname}：垫付 ¥${moneyUtil.format(p.total)}，刚好`)
      }
    })
    if (nonPayerCount > 0) {
      lines.push('')
      lines.push(`—— 未记账成员（共 ${nonPayerCount} 人）——`)
      lines.push(`每人应付 ¥${moneyUtil.format(perHead)}`)
    }

    wx.showModal({
      title: 'AA 分账结果',
      content: lines.join('\n'),
      showCancel: false,
      confirmText: '我知道了'
    })
  }
})
