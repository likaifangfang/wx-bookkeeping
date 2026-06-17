// 云函数：listLedgers
// 查询当前用户所有账本（创建的 + 加入的）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { ok, fail } = require('./_shared')

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  try {
    const memberRes = await db.collection('ledger_members')
      .where({ openid: OPENID, is_active: true })
      .limit(100)
      .get()
    if (memberRes.data.length === 0) return ok([])
    const ledgerIds = memberRes.data.map(m => m.ledger_id)

    const ledgerRes = await db.collection('ledgers')
      .where({ _id: _.in(ledgerIds), is_deleted: false })
      .limit(100)
      .get()

    // 组装：附带 my_role
    const roleMap = {}
    memberRes.data.forEach(m => { roleMap[m.ledger_id] = m.role })
    const list = ledgerRes.data.map(l => ({ ...l, my_role: roleMap[l._id] }))

    // 我创建的在前
    list.sort((a, b) => {
      if (a.owner_openid === OPENID && b.owner_openid !== OPENID) return -1
      if (a.owner_openid !== OPENID && b.owner_openid === OPENID) return 1
      return new Date(b.updated_at) - new Date(a.updated_at)
    })

    return ok(list)
  } catch (e) {
    console.error('listLedgers 异常', e)
    return fail(e.message || '查询失败')
  }
}
