// 云函数：deleteLedger
// 软删除账本:标记 ledger / records / members 为已删除/失活
// 仅所有者可操作；个人主账本(每用户唯一)不允许删除
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
    if (!ledgerRes || !ledgerRes.data) return fail('账本不存在')
    const ledger = ledgerRes.data

    if (ledger.is_deleted) return fail('账本已删除')
    if (ledger.owner_openid !== OPENID) return fail('仅所有者可删除账本')

    // 防止删掉用户唯一的个人账本
    if (ledger.type === 'personal') {
      const otherPersonalCount = await db.collection('ledgers')
        .where({
          owner_openid: OPENID,
          type: 'personal',
          is_deleted: false,
          _id: _.neq(ledger_id)
        })
        .count()
      if (otherPersonalCount.total === 0) {
        return fail('这是你唯一的个人账本,不能删除')
      }
    }

    const now = new Date()

    // 1. 软删账本
    await db.collection('ledgers').doc(ledger_id).update({
      data: { is_deleted: true, updated_at: now }
    })

    // 2. 失活所有成员(循环处理,每次最多20条)
    while (true) {
      const res = await db.collection('ledger_members')
        .where({ ledger_id, is_active: true })
        .limit(20)
        .update({ data: { is_active: false, updated_at: now } })
      if (res.stats.updated === 0) break
    }

    // 3. 软删该账本下的所有 records(循环处理)
    while (true) {
      const res = await db.collection('records')
        .where({ ledger_id, is_deleted: false })
        .limit(20)
        .update({ data: { is_deleted: true, updated_at: now } })
      if (res.stats.updated === 0) break
    }

    // 4. 失活所有该账本的邀请码(循环处理)
    while (true) {
      const res = await db.collection('invitations')
        .where({ ledger_id, is_active: true })
        .limit(20)
        .update({ data: { is_active: false } })
      if (res.stats.updated === 0) break
    }

    // 5. 若被删的是用户的默认账本,自动切到另一个有效账本
    const userRes = await db.collection('users').where({ _openid: OPENID }).get()
    if (userRes.data.length > 0 && userRes.data[0].default_ledger_id === ledger_id) {
      const fallback = await pickFallbackLedger(OPENID, ledger_id)
      await db.collection('users').doc(userRes.data[0]._id).update({
        data: {
          default_ledger_id: fallback ? fallback._id : null,
          updated_at: now
        }
      })
    }

    return ok({ ledger_id })
  } catch (e) {
    console.error('deleteLedger 异常', e)
    return fail(e.message || '删除失败')
  }
}

/**
 * 在用户已加入的账本里挑一个作为新默认
 * 优先级:个人账本 > 共享账本;同类型按 updated_at 倒序
 */
async function pickFallbackLedger(openid, excludeId) {
  const memberRes = await db.collection('ledger_members')
    .where({ openid, is_active: true })
    .limit(100)
    .get()
  if (memberRes.data.length === 0) return null
  const ledgerIds = memberRes.data
    .map(m => m.ledger_id)
    .filter(id => id !== excludeId)
  if (ledgerIds.length === 0) return null
  const ledgerRes = await db.collection('ledgers')
    .where({ _id: _.in(ledgerIds), is_deleted: false })
    .limit(100)
    .get()
  if (ledgerRes.data.length === 0) return null
  ledgerRes.data.sort((a, b) => {
    if (a.type === 'personal' && b.type !== 'personal') return -1
    if (a.type !== 'personal' && b.type === 'personal') return 1
    return new Date(b.updated_at) - new Date(a.updated_at)
  })
  return ledgerRes.data[0]
}
