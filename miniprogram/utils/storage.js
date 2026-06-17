// utils/storage.js
// 本地缓存封装

function set(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (e) {
    console.warn('[storage] set 失败', key, e)
  }
}

function get(key, defaultValue = null) {
  try {
    const value = wx.getStorageSync(key)
    return value === '' ? defaultValue : value
  } catch (e) {
    console.warn('[storage] get 失败', key, e)
    return defaultValue
  }
}

function remove(key) {
  try {
    wx.removeStorageSync(key)
  } catch (e) {
    console.warn('[storage] remove 失败', key, e)
  }
}

function clear() {
  try {
    wx.clearStorageSync()
  } catch (e) {
    console.warn('[storage] clear 失败', e)
  }
}

module.exports = { set, get, remove, clear }
