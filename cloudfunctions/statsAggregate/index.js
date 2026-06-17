// 云函数：statsAggregate
// group_by: overview | category | day | month
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { ok, fail } = require('./_shared')
const $ = db.command.aggregate

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { ledger_id, type, year, month, start_date, end_date, group_by = 'category' } = event
  if (!ledger_id) return fail('缺少 ledger_id')

  try {
    // 校验权限
    const memberRes = await db.collection('ledger_members')
      .where({ ledger_id, openid: OPENID, is_active: true })
      .get()
    if (memberRes.data.length === 0) return fail('无权限查看此账本')

    // 计算时间范围
    let start, end
    if (start_date && end_date) {
      start = new Date(start_date)
      end = new Date(end_date)
    } else if (year && month) {
      start = new Date(year, month - 1, 1, 0, 0, 0, 0)
      end = new Date(year, month, 0, 23, 59, 59, 999)
    } else {
      const now = new Date()
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }

    if (group_by === 'overview') {
      // 总览：本月支出、收入
      const result = await db.collection('records').aggregate()
        .match({
          ledger_id,
          is_deleted: _.neq(true),
          record_date: _.gte(start).and(_.lte(end))
        })
        .group({
          _id: '$type',
          total: $.sum('$amount'),
          count: $.sum(1)
        })
        .end()
      const overview = { expense: 0, income: 0, expense_count: 0, income_count: 0 }
      result.list.forEach(r => {
        if (r._id === 'expense') {
          overview.expense = Math.round(r.total * 100) / 100
          overview.expense_count = r.count
        } else if (r._id === 'income') {
          overview.income = Math.round(r.total * 100) / 100
          overview.income_count = r.count
        }
      })
      overview.balance = Math.round((overview.income - overview.expense) * 100) / 100
      return ok(overview)
    }

    if (group_by === 'category') {
      const match = {
        ledger_id,
        is_deleted: _.neq(true),
        record_date: _.gte(start).and(_.lte(end))
      }
      if (type) match.type = type
      const result = await db.collection('records').aggregate()
        .match(match)
        .group({
          _id: '$category_id',
          name: $.first('$category_name'),
          icon: $.first('$category_icon'),
          color: $.first('$category_color'),
          total: $.sum('$amount'),
          count: $.sum(1)
        })
        .sort({ total: -1 })
        .end()
      const list = result.list.map(r => ({
        category_id: r._id,
        name: r.name,
        icon: r.icon,
        color: r.color,
        total: Math.round(r.total * 100) / 100,
        count: r.count
      }))
      return ok(list)
    }

    if (group_by === 'day') {
      const match = {
        ledger_id,
        is_deleted: _.neq(true),
        record_date: _.gte(start).and(_.lte(end))
      }
      if (type) match.type = type
      const result = await db.collection('records').aggregate()
        .match(match)
        .group({
          _id: {
            year: $.year('$record_date'),
            month: $.month('$record_date'),
            day: $.dayOfMonth('$record_date'),
            type: '$type'
          },
          total: $.sum('$amount')
        })
        .sort({ '_id.year': 1, '_id.month': 1, '_id.day': 1 })
        .end()
      const list = result.list.map(r => ({
        date: `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`,
        type: r._id.type,
        total: Math.round(r.total * 100) / 100
      }))
      return ok(list)
    }

    if (group_by === 'month') {
      const match = {
        ledger_id,
        is_deleted: _.neq(true),
        record_date: _.gte(start).and(_.lte(end))
      }
      if (type) match.type = type
      const result = await db.collection('records').aggregate()
        .match(match)
        .group({
          _id: {
            year: $.year('$record_date'),
            month: $.month('$record_date'),
            type: '$type'
          },
          total: $.sum('$amount')
        })
        .sort({ '_id.year': 1, '_id.month': 1 })
        .end()
      const list = result.list.map(r => ({
        month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
        type: r._id.type,
        total: Math.round(r.total * 100) / 100
      }))
      return ok(list)
    }

    if (group_by === 'payer') {
      // 按记账人(支付人)分组：用于 AA 分账
      const result = await db.collection('records').aggregate()
        .match({
          ledger_id,
          type: 'expense',
          is_deleted: _.neq(true),
          record_date: _.gte(start).and(_.lte(end))
        })
        .group({
          _id: '$openid',
          nickname: $.first('$creator_nickname'),
          avatar: $.first('$creator_avatar'),
          total: $.sum('$amount'),
          count: $.sum(1)
        })
        .sort({ total: -1 })
        .end()
      const list = result.list.map(r => ({
        openid: r._id,
        nickname: r.nickname || '未知',
        avatar: r.avatar || '',
        total: Math.round(r.total * 100) / 100,
        count: r.count
      }))
      return ok(list)
    }

    return fail('未知 group_by')
  } catch (e) {
    console.error('statsAggregate 异常', e)
    return fail(e.message || '统计失败')
  }
}
