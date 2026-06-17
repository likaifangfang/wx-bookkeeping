// pages/index/index.js
const app = getApp()
const store = require('../../store/index')
const recordService = require('../../services/record')
const statsService = require('../../services/stats')
const dateUtil = require('../../utils/date')
const moneyUtil = require('../../utils/money')

Page({
  data: {
    currentLedger: null,
    overview: { expense: 0, income: 0, balance: 0, expense_label: '0.00', income_label: '0.00', balance_label: '0.00' },
    groups: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    isEmpty: false,
    // 月份切换
    viewYear: 0,
    viewMonth: 0,        // 1-12
    monthLabel: '',
    isCurrentMonth: true,  // 是否本月(决定能否点"下一月")
  },

  onLoad() {
    const now = new Date()
    this.setData({
      viewYear: now.getFullYear(),
      viewMonth: now.getMonth() + 1,
      monthLabel: `${now.getFullYear()}年${now.getMonth() + 1}月`
    })
    this._needRefresh = false
    this._unsub = store.subscribe('currentLedger', (ledger) => {
      if (!ledger) return
      this.setData({ currentLedger: ledger })
      this.refresh()
    })
    if (store.getState('currentLedger')) {
      this.setData({ currentLedger: store.getState('currentLedger') })
      this.refresh()
    }
  },

  onShow() {
    if (this._needRefresh && this.data.currentLedger) {
      this._needRefresh = false
      this.refresh()
    }
  },

  onUnload() {
    if (this._unsub) this._unsub()
  },

  async onPullDownRefresh() {
    if (!this.data.currentLedger) {
      try {
        await getApp().initUser()
      } catch (e) {
        wx.stopPullDownRefresh()
        return
      }
    }
    await this.refresh()
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadMore()
  },

  /** 上一月 */
  prevMonth() {
    let { viewYear, viewMonth } = this.data
    viewMonth -= 1
    if (viewMonth < 1) {
      viewMonth = 12
      viewYear -= 1
    }
    this.changeMonth(viewYear, viewMonth)
  },

  /** 下一月 */
  nextMonth() {
    if (this.data.isCurrentMonth) return  // 不能超过当月
    let { viewYear, viewMonth } = this.data
    viewMonth += 1
    if (viewMonth > 12) {
      viewMonth = 1
      viewYear += 1
    }
    this.changeMonth(viewYear, viewMonth)
  },

  changeMonth(year, month) {
    const now = new Date()
    const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth() + 1)
    this.setData({
      viewYear: year,
      viewMonth: month,
      monthLabel: `${year}年${month}月`,
      isCurrentMonth
    })
    this.refresh()
  },

  async refresh() {
    if (!this.data.currentLedger) return
    this.setData({ page: 1, hasMore: true, groups: [] })
    await Promise.all([this.loadOverview(), this.loadList(true)])
  },

  async loadOverview() {
    const ledger = this.data.currentLedger
    if (!ledger) return
    try {
      const overview = await statsService.monthOverview({
        ledger_id: ledger._id,
        year: this.data.viewYear,
        month: this.data.viewMonth
      })
      this.setData({
        overview: {
          ...overview,
          expense_label: moneyUtil.format(overview.expense || 0),
          income_label: moneyUtil.format(overview.income || 0),
          balance_label: moneyUtil.format(overview.balance || 0)
        }
      })
    } catch (e) {
      console.warn('加载月度概览失败', e)
    }
  },

  async loadList(reset = false) {
    if (this.data.loading) return
    const ledger = this.data.currentLedger
    if (!ledger) return
    this.setData({ loading: true })
    const page = reset ? 1 : this.data.page
    const start = new Date(this.data.viewYear, this.data.viewMonth - 1, 1, 0, 0, 0, 0)
    const end = new Date(this.data.viewYear, this.data.viewMonth, 0, 23, 59, 59, 999)
    try {
      const list = await recordService.list({
        ledger_id: ledger._id,
        start, end,
        page,
        pageSize: this.data.pageSize
      })
      const groups = reset ? [] : [...this.data.groups]
      this.mergeGroups(groups, list)
      this.setData({
        groups,
        page: page + 1,
        hasMore: list.length === this.data.pageSize,
        isEmpty: groups.length === 0
      })
    } catch (e) {
      console.error('加载账单失败', e)
    } finally {
      this.setData({ loading: false })
    }
  },

  loadMore() {
    return this.loadList(false)
  },

  mergeGroups(groups, list) {
    const map = {}
    groups.forEach(g => { map[g.date_key] = g })
    list.forEach(r => {
      const d = new Date(r.record_date)
      const key = dateUtil.formatDate(d, 'yyyy-MM-dd')
      if (!map[key]) {
        const friendly = dateUtil.friendlyDate(d)
        const isShort = (friendly === '今天' || friendly === '昨天')
        const g = {
          date_key: key,
          date_label: isShort ? friendly : dateUtil.formatDate(d, 'M月d日'),
          weekday: dateUtil.weekday(d),
          expense: 0,
          income: 0,
          items: []
        }
        map[key] = g
        groups.push(g)
      }
      const g = map[key]
      g.items.push({
        ...r,
        amount_label: moneyUtil.format(r.amount, { sign: r.type === 'expense' ? '-' : '+' })
      })
      if (r.type === 'expense') g.expense = moneyUtil.add(g.expense, r.amount)
      else g.income = moneyUtil.add(g.income, r.amount)
    })
    groups.sort((a, b) => b.date_key.localeCompare(a.date_key))
    groups.forEach(g => {
      g.expense_label = moneyUtil.format(g.expense)
      g.income_label = moneyUtil.format(g.income)
    })
  },

  goRecord() {
    this._needRefresh = true
    wx.navigateTo({ url: '/pages/record/record' })
  },

  goDetail(e) {
    this._needRefresh = true
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/record-detail/record-detail?id=${id}` })
  },

  onLongPress(e) {
    const id = e.currentTarget.dataset.id
    wx.showActionSheet({
      itemList: ['删除'],
      success: (res) => {
        if (res.tapIndex === 0) this.deleteRecord(id)
      }
    })
  },

  deleteRecord(id) {
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      confirmColor: '#ee0a24',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await recordService.remove(id)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.refresh()
        } catch (e) {}
      }
    })
  },

  goLedgers() {
    wx.navigateTo({ url: '/pages/ledgers/ledgers' })
  }
})
