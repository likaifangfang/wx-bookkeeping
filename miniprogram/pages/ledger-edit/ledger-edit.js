// pages/ledger-edit/ledger-edit.js
const ledgerService = require('../../services/ledger')

Page({
  data: {
    ledger: null,
    members: [],
    isOwner: false,
    invitation: null
  },

  onLoad(options) {
    this.id = options.id
    this.load()
  },

  async load() {
    if (!this.id) return
    try {
      const data = await ledgerService.detail(this.id)
      this.setData({
        ledger: data.ledger,
        members: data.members,
        isOwner: data.is_owner
      })
    } catch (e) {
      console.error('加载账本详情失败', e)
    }
  },

  rename() {
    const ledger = this.data.ledger
    wx.showModal({
      title: '修改账本名称',
      editable: true,
      placeholderText: '请输入新名称',
      content: ledger.name,
      success: async (res) => {
        if (!res.confirm) return
        const newName = (res.content || '').trim()
        if (!newName) {
          wx.showToast({ title: '名称不能为空', icon: 'none' })
          return
        }
        if (newName === ledger.name) return
        if (newName.length > 20) {
          wx.showToast({ title: '名称不能超过20个字符', icon: 'none' })
          return
        }
        try {
          await ledgerService.update(this.id, { name: newName })
          this.setData({ 'ledger.name': newName })
          // 同步更新 store 中的 currentLedger
          const store = getApp().store
          const cur = store.getState('currentLedger')
          if (cur && cur._id === this.id) {
            store.setState('currentLedger', { ...cur, name: newName })
          }
          wx.showToast({ title: '已修改', icon: 'success' })
        } catch (e) {
          wx.showToast({ title: '修改失败', icon: 'none' })
        }
      }
    })
  },

  async copyInviteCode() {
    try {
      let inv = this.data.invitation
      if (!inv) {
        inv = await ledgerService.createInvitation(this.id)
        this.setData({ invitation: inv })
      }
      wx.setClipboardData({ data: inv.invite_code })
      wx.showModal({
        title: '邀请码已复制',
        content: `邀请码：${inv.invite_code}\n\n请点击右上角「...」转发小程序给好友，对方打开后输入邀请码即可加入`,
        showCancel: false
      })
    } catch (e) {
      wx.showToast({ title: '创建邀请码失败', icon: 'none' })
    }
  },

  async leave() {
    wx.showModal({
      title: '确认退出？',
      content: '退出后你将不能查看此账本',
      success: async (r) => {
        if (!r.confirm) return
        try {
          await ledgerService.leave(this.id)
          wx.showToast({ title: '已退出', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 500)
        } catch (e) {}
      }
    })
  },

  remove() {
    const isShared = this.data.ledger && this.data.ledger.type === 'shared'
    const memberCount = (this.data.ledger && this.data.ledger.member_count) || 1
    const tip = isShared && memberCount > 1
      ? `该账本有 ${memberCount} 名成员,删除后所有成员都将无法查看,且账单数据全部丢失,确认删除?`
      : '删除后所有账单数据将无法恢复,确认删除?'
    wx.showModal({
      title: '确认删除账本',
      content: tip,
      confirmText: '删除',
      confirmColor: '#ee0a24',
      success: async (r) => {
        if (!r.confirm) return
        try {
          await ledgerService.remove(this.id)
          wx.showToast({ title: '已删除', icon: 'success' })
          // 通知账本列表页和首页刷新
          const app = getApp()
          const store = app.store
          if (store) {
            const cur = store.getState('currentLedger')
            if (cur && cur._id === this.id) {
              // 当前正在使用这个账本,清掉,等返回时再选别的
              store.setState('currentLedger', null)
            }
          }
          setTimeout(() => wx.navigateBack(), 500)
        } catch (e) {}
      }
    })
  },

  onShareAppMessage() {
    const ledger = this.data.ledger || {}
    if (this.data.invitation) {
      return {
        title: `邀请你加入「${ledger.name}」`,
        path: `/pages/invite/invite?code=${this.data.invitation.invite_code}`
      }
    }
    return { title: `来看看「${ledger.name}」` }
  }
})
