// pages/record-detail/record-detail.js
const recordService = require('../../services/record')
const dateUtil = require('../../utils/date')
const moneyUtil = require('../../utils/money')
const store = require('../../store/index')

Page({
  data: {
    record: null,
    canEdit: false,
    loading: true,
    loadFailed: false
  },

  onLoad(options) {
    this.id = options.id
    this.load()
  },

  async load() {
    if (!this.id) return
    this.setData({ loading: true, loadFailed: false })
    try {
      const record = await recordService.get(this.id)
      if (!record) {
        this.setData({ loading: false, loadFailed: true })
        return
      }
      const user = store.getState('user')
      const canEdit = !!(user && record && record.openid === user._openid)
      this.setData({
        loading: false,
        record: {
          ...record,
          amount_label: moneyUtil.format(record.amount),
          record_date_label: dateUtil.formatDate(record.record_date, 'yyyy-MM-dd HH:mm'),
          created_at_label: dateUtil.formatDate(record.created_at, 'yyyy-MM-dd HH:mm')
        },
        canEdit
      })
      if (!user) {
        this._unsub = store.subscribe('user', u => {
          if (!u || !this.data.record) return
          this.setData({ canEdit: this.data.record.openid === u._openid })
          if (this._unsub) { this._unsub(); this._unsub = null }
        })
      }
    } catch (e) {
      console.error('加载详情失败', e)
      this.setData({ loading: false, loadFailed: true })
    }
  },

  onUnload() {
    if (this._unsub) this._unsub()
  },

  onEdit() {
    if (!this.id) return
    wx.navigateTo({ url: `/pages/record/record?id=${this.id}` })
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src
    const urls = (this.data.record && this.data.record.images) || []
    wx.previewImage({ urls, current: src })
  },

  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      confirmColor: '#ee0a24',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await recordService.remove(this.id)
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 500)
        } catch (e) { /* toast 已在 request 层 */ }
      }
    })
  }
})
