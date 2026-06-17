// pages/categories/categories.js
const store = require('../../store/index')
const categoryService = require('../../services/category')

Page({
  data: {
    type: 'expense',
    categories: []
  },

  onShow() { this.load() },

  async load() {
    const ledger = store.getState('currentLedger')
    if (!ledger) return
    try {
      const data = await categoryService.list(ledger._id)
      this.setData({ categories: data[this.data.type] || [] })
      // 更新 store 缓存
      store.setState('categories', data)
      store.setState('_categoriesLedgerId', ledger._id)
    } catch (e) {}
  },

  switchType(e) {
    this.setData({ type: e.currentTarget.dataset.type })
    this.load()
  }
})
