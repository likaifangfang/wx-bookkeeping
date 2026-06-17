// services/category.js
const { callCloudFunc } = require('../utils/request')

const categoryService = {
  /** 列出账本下的分类（走云函数，支持共享账本） */
  async list(ledger_id) {
    return callCloudFunc('listCategories', { ledger_id }, { showLoading: false })
  },

  /** 新增分类 */
  create(data) {
    return callCloudFunc('manageCategory', { action: 'create', ...data })
  },

  /** 更新分类 */
  update(id, data) {
    return callCloudFunc('manageCategory', { action: 'update', id, ...data })
  },

  /** 隐藏分类（不删除） */
  hide(id) {
    return callCloudFunc('manageCategory', { action: 'hide', id })
  }
}

module.exports = categoryService
