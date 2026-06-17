// 云函数：getLedgerDetail
// 返回账本信息 + 成员列表 + 当前用户角色
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./_shared')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { ledger_id } = event
  if (!ledger_id) return fail('缺少 ledger_id')

  try {
    const ledgerRes = await db.collection('ledgers').doc(ledger_id).get().catch(() => null)
    if (!ledgerRes || !ledgerRes.data || ledgerRes.data.is_deleted) return fail('账本不存在')
    const ledger = ledgerRes.data

    // 校验当前用户是账本成员
    const myRes = await db.collection('ledger_members')
      .where({ ledger_id, openid: OPENID, is_active: true })
      .get()
    if (myRes.data.length === 0) return fail('无权限访问此账本')

    // 拉所有成员
    const membersRes = await db.collection('ledger_members')
      .where({ ledger_id, is_active: true })
      .get()

    return ok({
      ledger,
      members: membersRes.data,
      my_role: myRes.data[0].role,
      is_owner: ledger.owner_openid === OPENID
    })
  } catch (e) {
    console.error('getLedgerDetail 异常', e)
    return fail(e.message || '加载失败')
  }
}
