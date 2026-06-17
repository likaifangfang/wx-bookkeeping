// pages/invite/invite.js
const ledgerService = require('../../services/ledger')
const store = require('../../store/index')

Page({
  data: {
    code: '',
    inputCode: '',
    autoMode: false
  },

  onLoad(options) {
    if (options.code) {
      this.setData({ code: options.code, autoMode: true })
    }
  },

  onCodeInput(e) {
    this.setData({ inputCode: e.detail.value.toUpperCase() })
  },

  async join(useInputCode = false) {
    const code = useInputCode ? this.data.inputCode : this.data.code
    if (!code) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' })
      return
    }
    try {
      const res = await ledgerService.join(code)
      // 切换当前账本为刚加入的账本
      if (res.ledger) {
        store.setState('currentLedger', res.ledger)
      }
      wx.showToast({ title: '加入成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 500)
    } catch (e) {}
  },

  joinAuto() { this.join(false) },
  joinManual() { this.join(true) }
})
