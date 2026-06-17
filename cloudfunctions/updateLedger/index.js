// 云函数：updateLedger
// 更新账本信息（仅所有者可操作）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./_shared')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { ledger_id, name } = event
  if (!ledger_id) return fail('缺少 ledger_id')

  try {
    const ledgerRes = await db.collection('ledgers').doc(ledger_id).get().catch(() => null)
    if (!ledgerRes || !ledgerRes.data || ledgerRes.data.is_deleted) return fail('账本不存在')
    const ledger = ledgerRes.data

    if (ledger.owner_openid !== OPENID) return fail('仅所有者可修改账本')

    const update = { updated_at: new Date() }
    if (name !== undefined) {
      if (!name || name.length > 20) return fail('账本名需在1-20个字符之间')
      update.name = name
    }

    if (Object.keys(update).length <= 1) return fail('没有需要更新的内容')

    await db.collection('ledgers').doc(ledger_id).update({ data: update })
    return ok({ ledger_id })
  } catch (e) {
    console.error('updateLedger 异常', e)
    return fail(e.message || '更新失败')
  }
}
