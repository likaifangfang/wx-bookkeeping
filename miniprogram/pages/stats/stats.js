// pages/stats/stats.js
const store = require('../../store/index')
const statsService = require('../../services/stats')
const moneyUtil = require('../../utils/money')

Page({
  data: {
    currentLedger: null,
    type: 'expense',
    overview: {},
    categoryStats: [],
    viewYear: 0,
    viewMonth: 0,
    monthLabel: '',
    isCurrentMonth: true
  },

  onLoad() {
    const now = new Date()
    this.setData({
      viewYear: now.getFullYear(),
      viewMonth: now.getMonth() + 1,
      monthLabel: `${now.getFullYear()}年${now.getMonth() + 1}月`,
      isCurrentMonth: true
    })
    const ledger = store.getState('currentLedger')
    if (ledger) {
      this.setData({ currentLedger: ledger })
      this.load()
    }
    this._unsub = store.subscribe('currentLedger', l => {
      if (!l) return
      this.setData({ currentLedger: l })
      this.load()
    })
  },

  onShow() {},

  onUnload() { if (this._unsub) this._unsub() },

  switchType(e) {
    this.setData({ type: e.currentTarget.dataset.type })
    this.load()
  },

  prevMonth() {
    let { viewYear, viewMonth } = this.data
    viewMonth -= 1
    if (viewMonth < 1) {
      viewMonth = 12
      viewYear -= 1
    }
    this.changeMonth(viewYear, viewMonth)
  },

  nextMonth() {
    if (this.data.isCurrentMonth) return
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
    this.load()
  },

  async load() {
    const ledger = this.data.currentLedger
    if (!ledger) return
    const { viewYear, viewMonth } = this.data
    try {
      const [overview, categoryStats] = await Promise.all([
        statsService.monthOverview({
          ledger_id: ledger._id,
          year: viewYear,
          month: viewMonth
        }),
        statsService.aggregate({
          ledger_id: ledger._id,
          type: this.data.type,
          year: viewYear,
          month: viewMonth,
          group_by: 'category'
        })
      ])
      const totalKey = this.data.type === 'expense' ? 'expense' : 'income'
      const total = overview[totalKey] || 0
      this.setData({
        overview,
        categoryStats: categoryStats.map(c => ({
          ...c,
          percent: total ? Math.round((c.total / total) * 100) : 0,
          total_label: moneyUtil.format(c.total)
        }))
      })
    } catch (e) {
      console.error('加载统计失败', e)
    }
  },

  /** 跳转 AA 分账页（带当前月份） */
  aaSplit() {
    const { viewYear, viewMonth, currentLedger } = this.data
    if (!currentLedger) return
    wx.navigateTo({
      url: `/pages/aa-split/aa-split?year=${viewYear}&month=${viewMonth}`
    })
  }
})
