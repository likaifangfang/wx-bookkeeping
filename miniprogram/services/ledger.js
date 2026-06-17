// services/ledger.js
const { callCloudFunc } = require('../utils/request')

const ledgerService = {
  /** 列出我的所有账本（创建的 + 加入的） */
  list() {
    return callCloudFunc('listLedgers', {}, { showLoading: false })
  },

  /** 获取账本详情（含成员） */
  detail(ledger_id) {
    return callCloudFunc('getLedgerDetail', { ledger_id }, { showLoading: false })
  },

  /** 创建账本 */
  create(data) {
    return callCloudFunc('createLedger', data)
  },

  /** 通过邀请码加入账本 */
  join(invite_code) {
    return callCloudFunc('joinLedger', { invite_code })
  },

  /** 退出账本 */
  leave(ledger_id) {
    return callCloudFunc('leaveLedger', { ledger_id })
  },

  /** 删除账本(仅所有者) */
  remove(ledger_id) {
    return callCloudFunc('deleteLedger', { ledger_id })
  },

  /** 更新账本信息(仅所有者) */
  update(ledger_id, data) {
    return callCloudFunc('updateLedger', { ledger_id, ...data })
  },

  /** 创建邀请码 */
  createInvitation(ledger_id) {
    return callCloudFunc('createInvitation', { ledger_id })
  },

  /** 成员管理：移除 / 改角色 */
  manageMember(payload) {
    return callCloudFunc('manageMember', payload)
  }
}

module.exports = ledgerService
