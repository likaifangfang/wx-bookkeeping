// app.js
const { CLOUD_ENV } = require('./utils/constants')
const store = require('./store/index')
const userService = require('./services/user')

App({
  globalData: {
    userInfo: null,
    currentLedger: null,
    systemInfo: null,
    initError: null
  },

  store,
  _initPromise: null,

  async onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    wx.cloud.init({
      env: CLOUD_ENV,
      traceUser: true
    })

    try {
      this.globalData.systemInfo = wx.getSystemInfoSync()
    } catch (e) {
      console.warn('获取系统信息失败', e)
    }

    this.initUser()
  },

  /**
   * 静默登录初始化
   * 防重入：多次调用复用同一个 Promise，避免并发触发多次 onUserLogin
   * 失败时:
   *  - 写入 store.initError,各页面可订阅显示提示
   *  - toast 一下
   */
  initUser() {
    if (this._initPromise) return this._initPromise
    this._initPromise = this._doInitUser().finally(() => {
      this._initPromise = null
    })
    return this._initPromise
  },

  async _doInitUser() {
    try {
      const { user, defaultLedger } = await userService.login()
      store.setState('user', user)
      store.setState('currentLedger', defaultLedger)
      store.setState('initError', null)
      this.globalData.userInfo = user
      this.globalData.currentLedger = defaultLedger
      return { user, defaultLedger }
    } catch (e) {
      console.error('初始化用户失败', e)
      store.setState('initError', e.message || '加载失败')
      wx.showToast({
        title: '初始化失败,下拉刷新重试',
        icon: 'none',
        duration: 2500
      })
      throw e
    }
  }
})
