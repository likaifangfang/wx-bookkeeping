// pages/ledger-form/ledger-form.js
const ledgerService = require('../../services/ledger')
const { LEDGER_COLORS } = require('../../utils/constants')

Page({
  data: {
    name: '',
    color: '#4A90E2',
    icon: 'wallet',
    colors: LEDGER_COLORS
  },

  onName(e) { this.setData({ name: e.detail.value }) },

  pickColor(e) {
    this.setData({ color: e.currentTarget.dataset.color })
  },

  async submit() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: '请输入账本名', icon: 'none' })
      return
    }
    try {
      await ledgerService.create({
        name: this.data.name.trim(),
        color: this.data.color,
        icon: this.data.icon,
        type: 'shared'
      })
      wx.showToast({ title: '已创建', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (e) { /* toast in request */ }
  }
})
