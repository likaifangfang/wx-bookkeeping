// 云函数：getRecord
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./_shared')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { id } = event
  if (!id) return fail('缺少 id')

  try {
    const recRes = await db.collection('records').doc(id).get().catch(() => null)
    if (!recRes || !recRes.data || recRes.data.is_deleted) return fail('记录不存在')
    const record = recRes.data

    // 校验是账本成员
    const memberRes = await db.collection('ledger_members')
      .where({ ledger_id: record.ledger_id, openid: OPENID, is_active: true })
      .get()
    if (memberRes.data.length === 0) return fail('无权限访问此记录')

    return ok(record)
  } catch (e) {
    console.error('getRecord 异常', e)
    return fail(e.message || '加载失败')
  }
}
