// utils/request.js
// 云函数调用统一封装

/**
 * 调用云函数
 * @param {string} name 云函数名
 * @param {object} data 参数
 * @param {object} options 选项
 * @returns {Promise<any>}
 */
async function callCloudFunc(name, data = {}, options = {}) {
  const { showLoading = true, loadingText = '加载中', showError = true } = options
  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true })
  }
  try {
    const res = await wx.cloud.callFunction({ name, data })
    const result = res.result || {}
    if (result.code !== 0) {
      throw new Error(result.message || '请求失败')
    }
    return result.data
  } catch (e) {
    console.error(`[cloud] ${name} 调用失败`, e)
    if (showError) {
      wx.showToast({
        title: e.message || '网络异常，请重试',
        icon: 'none',
        duration: 2000
      })
    }
    throw e
  } finally {
    if (showLoading) {
      wx.hideLoading()
    }
  }
}

module.exports = {
  callCloudFunc
}
