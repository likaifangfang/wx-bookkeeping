// pages/ledgers/ledgers.js
const store = require('../../store/index')
const ledgerService = require('../../services/ledger')

Page({
  data: {
    user: null,
    ledgers: []
  },

  onLoad() {
    this.user = store.getState('user')
    this.setData({ user: this.user })
    this.load()
  },

  onShow() { this.load() },

  async load() {
    try {
      const list = await ledgerService.list()
      this.setData({ ledgers: list || [] })

      // 若当前账本不在列表里(被删了),自动切到第一个
      const cur = store.getState('currentLedger')
      const stillExists = cur && (list || []).some(l => l._id === cur._id)
      if ((!cur || !stillExists) && list && list.length > 0) {
        store.setState('currentLedger', list[0])
      }
    } catch (e) {
      console.error('账本列表加载失败', e)
    }
  },

  switchLedger(e) {
    const id = e.currentTarget.dataset.id
    const ledger = this.data.ledgers.find(l => l._id === id)
    if (!ledger) return
    store.setState('currentLedger', ledger)
    wx.showToast({ title: `已切换到 ${ledger.name}`, icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/ledger-form/ledger-form' })
  },

  goEdit(e) {
    e.stopPropagation && e.stopPropagation()
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/ledger-edit/ledger-edit?id=${id}` })
  }
})
