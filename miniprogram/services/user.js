// services/user.js
const { callCloudFunc } = require('../utils/request')

const userService = {
  /** 静默登录，自动初始化用户与默认账本 */
  login(profile = {}) {
    return callCloudFunc('onUserLogin', profile, { showLoading: false, showError: false })
  },

  /** 更新昵称头像 */
  updateProfile(profile) {
    return callCloudFunc('onUserLogin', profile, { showLoading: false })
  }
}

module.exports = userService
