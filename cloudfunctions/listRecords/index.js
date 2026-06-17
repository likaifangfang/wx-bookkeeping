// 云函数：listRecords
// 走云函数读取，绕过 _openid 自动过滤，支持共享账本
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { ok, fail } = require('./_shared')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { ledger_id, start, end, page = 1, pageSize = 20 } = event
  if (!ledger_id) return fail('缺少 ledger_id')

  try {
    // 校验是账本成员
    const memberRes = await db.collection('ledger_members')
      .where({ ledger_id, openid: OPENID, is_active: true })
      .get()
    if (memberRes.data.length === 0) return fail('无权限访问此账本')

    const where = {
      ledger_id,
      is_deleted: false
    }
    if (start && end) {
      where.record_date = _.gte(new Date(Number(start) || start)).and(_.lte(new Date(Number(end) || end)))
    }

    const skip = (page - 1) * pageSize
    const res = await db.collection('records')
      .where(where)
      .orderBy('record_date', 'desc')
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    return ok(res.data)
  } catch (e) {
    console.error('listRecords 异常', e)
    return fail(e.message || '加载失败')
  }
}
