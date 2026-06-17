// utils/date.js
// 日期工具函数

/**
 * 格式化日期
 * @param {Date|number|string} date
 * @param {string} fmt yyyy-MM-dd HH:mm:ss
 */
function formatDate(date, fmt = 'yyyy-MM-dd') {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  const o = {
    'M+': d.getMonth() + 1,
    'd+': d.getDate(),
    'H+': d.getHours(),
    'm+': d.getMinutes(),
    's+': d.getSeconds()
  }
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, String(d.getFullYear()).substr(4 - RegExp.$1.length))
  }
  for (const k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(String(o[k]).length)
      )
    }
  }
  return fmt
}

/** 月初 */
function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

/** 月末 */
function monthEnd(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

/** 今日 0 点 */
function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** 今日 24 点 */
function todayEnd() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

/** 周几（中文） */
function weekday(date) {
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const d = date instanceof Date ? date : new Date(date)
  return map[d.getDay()]
}

/** 友好显示 */
function friendlyDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  const today = todayStart()
  const yesterday = new Date(today.getTime() - 86400000)
  if (d >= today) return '今天'
  if (d >= yesterday) return '昨天'
  if (d.getFullYear() === today.getFullYear()) {
    return formatDate(d, 'M月d日')
  }
  return formatDate(d, 'yyyy年M月d日')
}

module.exports = {
  formatDate,
  monthStart,
  monthEnd,
  todayStart,
  todayEnd,
  weekday,
  friendlyDate
}
