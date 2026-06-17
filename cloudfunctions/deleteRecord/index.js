// 云函数：deleteRecord（软删除）
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

    // 仅作者本人 或 账本 owner 可删
    if (record.openid !== OPENID) {
      const memberRes = await db.collection('ledger_members')
        .where({ ledger_id: record.ledger_id, openid: OPENID, role: 'owner', is_active: true })
        .get()
      if (memberRes.data.length === 0) return fail('无权限删除')
    }

    await db.collection('records').doc(id).update({
      data: { is_deleted: true, updated_at: new Date() }
    })
    return ok({ _id: id })
  } catch (e) {
    console.error('deleteRecord 异常', e)
    return fail(e.message || '删除失败')
  }
}
