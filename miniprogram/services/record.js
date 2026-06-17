// services/record.js
const { callCloudFunc } = require('../utils/request')

const recordService = {
  /**
   * 列表查询（走云函数，支持共享账本）
   * @param {object} params { ledger_id, start, end, page, pageSize }
   */
  async list({ ledger_id, start, end, page = 1, pageSize = 20 }) {
    return callCloudFunc('listRecords', {
      ledger_id,
      start: start ? new Date(start).getTime() : undefined,
      end: end ? new Date(end).getTime() : undefined,
      page,
      pageSize
    }, { showLoading: false })
  },

  /** 单条详情 */
  async get(id) {
    return callCloudFunc('getRecord', { id }, { showLoading: false })
  },

  /** 创建 */
  create(data) {
    return callCloudFunc('createRecord', data, { loadingText: '保存中' })
  },

  /** 更新 */
  update(id, data) {
    return callCloudFunc('updateRecord', { id, ...data })
  },

  /** 删除（软删除） */
  remove(id) {
    return callCloudFunc('deleteRecord', { id })
  }
}

module.exports = recordService
