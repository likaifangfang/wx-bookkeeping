// services/stats.js
const { callCloudFunc } = require('../utils/request')

const statsService = {
  /**
   * 聚合统计
   * @param {object} params { ledger_id, type, start_date, end_date, group_by }
   * group_by: 'category' | 'day' | 'month'
   */
  aggregate(params) {
    return callCloudFunc('statsAggregate', params, { showLoading: false })
  },

  /** 月度概览（首页用） */
  monthOverview({ ledger_id, year, month }) {
    return callCloudFunc('statsAggregate', {
      ledger_id,
      year,
      month,
      group_by: 'overview'
    }, { showLoading: false })
  },

  /** 按支付人分组（AA 分账用，仅统计支出） */
  byPayer({ ledger_id, year, month }) {
    return callCloudFunc('statsAggregate', {
      ledger_id,
      year,
      month,
      group_by: 'payer'
    }, { showLoading: false })
  }
}

module.exports = statsService
