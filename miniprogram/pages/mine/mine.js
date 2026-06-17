// pages/mine/mine.js
const store = require('../../store/index')
const userService = require('../../services/user')

Page({
  data: {
    user: null,
    showProfileModal: false,
    formNickname: '',
    formAvatar: ''
  },

  onLoad() {
    this._unsub = store.subscribe('user', user => this.setData({ user }))
    if (store.getState('user')) this.setData({ user: store.getState('user') })
  },

  onUnload() {
    if (this._unsub) this._unsub()
  },

  /** 打开"编辑资料"弹层 */
  openProfileModal() {
    const user = this.data.user || {}
    this.setData({
      showProfileModal: true,
      formNickname: user.nickname || '',
      formAvatar: user.avatar_url || ''
    })
  },

  closeProfileModal() {
    this.setData({ showProfileModal: false })
  },

  noop() {},

  /** 微信新版：通过 button open-type=chooseAvatar 选头像 */
  onChooseAvatar(e) {
    console.log('[chooseAvatar] event:', e)
    const avatarUrl = e && e.detail && e.detail.avatarUrl
    if (!avatarUrl) {
      wx.showToast({ title: '未获取到头像,请在真机测试', icon: 'none' })
      return
    }
    console.log('[chooseAvatar] avatarUrl:', avatarUrl)
    this.setData({ formAvatar: avatarUrl })
    wx.showToast({ title: '头像已选取', icon: 'success', duration: 800 })
  },

  /** 微信新版：input type=nickname 自动填充微信昵称 */
  onNicknameInput(e) {
    this.setData({ formNickname: e.detail.value })
  },

  async saveProfile() {
    const nickname = (this.data.formNickname || '').trim()
    let avatar_url = this.data.formAvatar
    console.log('[saveProfile] start', { nickname, avatar_url })
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    try {
      // 若头像是临时路径(chooseAvatar 选的本地文件),需先上传到云存储
      if (avatar_url && /^(http:\/\/tmp|wxfile:\/\/)/.test(avatar_url)) {
        console.log('[saveProfile] uploading avatar to cloud storage...')
        wx.showLoading({ title: '上传头像中', mask: true })
        const ext = (avatar_url.match(/\.([a-zA-Z0-9]+)$/) || [, 'jpg'])[1]
        const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const upload = await wx.cloud.uploadFile({ cloudPath, filePath: avatar_url })
        avatar_url = upload.fileID
        console.log('[saveProfile] uploaded fileID:', avatar_url)
        wx.hideLoading()
      }
      console.log('[saveProfile] calling updateProfile...')
      const data = await userService.updateProfile({ nickname, avatar_url })
      console.log('[saveProfile] updateProfile result:', data)
      store.setState('user', data.user)
      this.setData({ showProfileModal: false })
      wx.showToast({ title: '已保存', icon: 'success' })
    } catch (e) {
      wx.hideLoading()
      console.error('[saveProfile] 失败', e)
      wx.showToast({ title: e.message || '保存失败', icon: 'none' })
    }
  },

  goLedgers() {
    wx.navigateTo({ url: '/pages/ledgers/ledgers' })
  },

  goCategories() {
    wx.navigateTo({ url: '/pages/categories/categories' })
  },

  goSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
  }
})
