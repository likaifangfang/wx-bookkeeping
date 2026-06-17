// 云函数：manageMember
// action: remove | changeRole
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { ok, fail } = require('./_shared')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { action, ledger_id, target_openid, role } = event

  if (!action || !ledger_id || !target_openid) return fail('参数缺失')

  try {
    const ledgerRes = await db.collection('ledgers').doc(ledger_id).get().catch(() => null)
    if (!ledgerRes || !ledgerRes.data || ledgerRes.data.is_deleted) return fail('账本不存在')
    if (ledgerRes.data.owner_openid !== OPENID) return fail('仅所有者可管理成员')

    if (target_openid === OPENID) return fail('不能操作自己')

    const memberRes = await db.collection('ledger_members')
      .where({ ledger_id, openid: target_openid, is_active: true })
      .get()
    if (memberRes.data.length === 0) return fail('成员不存在')
    const member = memberRes.data[0]

    const now = new Date()

    if (action === 'remove') {
      await db.collection('ledger_members').doc(member._id).update({
        data: { is_active: false, updated_at: now }
      })
      await db.collection('ledgers').doc(ledger_id).update({
        data: { member_count: _.inc(-1), updated_at: now }
      })
      return ok({ removed: target_openid })
    }

    if (action === 'changeRole') {
      if (!['editor', 'viewer'].includes(role)) return fail('角色不合法')
      await db.collection('ledger_members').doc(member._id).update({
        data: { role, updated_at: now }
      })
      return ok({ openid: target_openid, role })
    }

    return fail('未知操作')
  } catch (e) {
    console.error('manageMember 异常', e)
    return fail(e.message || '操作失败')
  }
}
