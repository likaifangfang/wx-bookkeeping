// cloudfunctions/_shared/utils.js
// 云函数共享工具

function ok(data) {
  return { code: 0, message: 'ok', data }
}

function fail(message, code = -1) {
  return { code, message, data: null }
}

function now() {
  return new Date()
}

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: '餐饮', icon: '🍔', color: '#FF6B6B' },
  { name: '交通', icon: '🚗', color: '#4ECDC4' },
  { name: '购物', icon: '🛒', color: '#FFA94D' },
  { name: '娱乐', icon: '🎮', color: '#A78BFA' },
  { name: '居家', icon: '🏠', color: '#34D399' },
  { name: '医疗', icon: '💊', color: '#F472B6' },
  { name: '教育', icon: '📚', color: '#60A5FA' },
  { name: '通讯', icon: '📱', color: '#FBBF24' },
  { name: '人情', icon: '🎁', color: '#F87171' },
  { name: '其他', icon: '📌', color: '#9CA3AF' }
]

const DEFAULT_INCOME_CATEGORIES = [
  { name: '工资', icon: '💰', color: '#10B981' },
  { name: '奖金', icon: '🎉', color: '#F59E0B' },
  { name: '理财', icon: '📈', color: '#3B82F6' },
  { name: '退款', icon: '↩️', color: '#06B6D4' },
  { name: '红包', icon: '🧧', color: '#EF4444' },
  { name: '其他', icon: '📌', color: '#9CA3AF' }
]

module.exports = {
  ok,
  fail,
  now,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES
}
