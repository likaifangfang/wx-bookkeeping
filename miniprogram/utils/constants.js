// utils/constants.js

// ⚠️ 注意：开通云开发后，将这里替换成你的环境 ID
const CLOUD_ENV = 'cloud1-d2g1flurjadf0b620'

// 默认支出分类
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

// 默认收入分类
const DEFAULT_INCOME_CATEGORIES = [
  { name: '工资', icon: '💰', color: '#10B981' },
  { name: '奖金', icon: '🎉', color: '#F59E0B' },
  { name: '理财', icon: '📈', color: '#3B82F6' },
  { name: '退款', icon: '↩️', color: '#06B6D4' },
  { name: '红包', icon: '🧧', color: '#EF4444' },
  { name: '其他', icon: '📌', color: '#9CA3AF' }
]

// 账本图标可选
const LEDGER_ICONS = ['wallet', 'home', 'couple', 'family', 'travel', 'work']

// 账本主题色可选
const LEDGER_COLORS = [
  '#4A90E2', '#FF6B6B', '#4ECDC4', '#FFA94D',
  '#A78BFA', '#34D399', '#F472B6', '#60A5FA'
]

// 角色
const ROLES = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer'
}

// 账单类型
const RECORD_TYPES = {
  EXPENSE: 'expense',
  INCOME: 'income'
}

// 账本类型
const LEDGER_TYPES = {
  PERSONAL: 'personal',
  SHARED: 'shared'
}

module.exports = {
  CLOUD_ENV,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  LEDGER_ICONS,
  LEDGER_COLORS,
  ROLES,
  RECORD_TYPES,
  LEDGER_TYPES
}
