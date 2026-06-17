// utils/money.js
// 金额工具

/** 规整金额：保留两位小数 */
function normalize(amount) {
  const num = Number(amount)
  if (isNaN(num)) return 0
  return Math.round(num * 100) / 100
}

/** 格式化金额：1234.5 -> "1,234.50" */
function format(amount, options = {}) {
  const { withSymbol = false, sign = '' } = options
  const num = normalize(amount)
  const fixed = num.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const withComma = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const result = `${withComma}.${decPart}`
  const symbol = withSymbol ? '¥' : ''
  return `${sign}${symbol}${result}`
}

/** 加 */
function add(a, b) {
  return normalize(normalize(a) + normalize(b))
}

/** 减 */
function sub(a, b) {
  return normalize(normalize(a) - normalize(b))
}

module.exports = {
  normalize,
  format,
  add,
  sub
}
