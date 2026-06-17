// 云函数：leaveLedger
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { ok, fail } = require('./_shared')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { ledger_id } = event
  if (!ledger_id) return fail('缺少 ledger_id')

  try {
    const ledgerRes = await db.collection('ledgers').doc(ledger_id).get().catch(() => null)
    if (!ledgerRes || !ledgerRes.data || ledgerRes.data.is_deleted) return fail('账本不存在')
    const ledger = ledgerRes.data

    if (ledger.owner_openid === OPENID) {
      return fail('所有者不能直接退出，请先转让账本或删除账本')
    }

    const memberRes = await db.collection('ledger_members')
      .where({ ledger_id, openid: OPENID, is_active: true })
      .get()
    if (memberRes.data.length === 0) return fail('您未加入此账本')

    const now = new Date()
    await db.collection('ledger_members').doc(memberRes.data[0]._id).update({
      data: { is_active: false, updated_at: now }
    })
    await db.collection('ledgers').doc(ledger_id).update({
      data: { member_count: _.inc(-1), updated_at: now }
    })

    return ok({ ledger_id })
  } catch (e) {
    console.error('leaveLedger 异常', e)
    return fail(e.message || '退出失败')
  }
}
