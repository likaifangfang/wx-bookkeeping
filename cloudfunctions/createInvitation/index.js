// 云函数：createInvitation
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./_shared')

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { ledger_id, max_uses = 10, expires_in_days = 7 } = event
  if (!ledger_id) return fail('缺少 ledger_id')

  try {
    const memberRes = await db.collection('ledger_members')
      .where({ ledger_id, openid: OPENID, is_active: true })
      .get()
    if (memberRes.data.length === 0) return fail('您不在此账本中')
    if (memberRes.data[0].role !== 'owner') return fail('仅所有者可创建邀请')

    let invite_code
    for (let i = 0; i < 5; i++) {
      const code = genCode()
      const exists = await db.collection('invitations').where({ invite_code: code }).count()
      if (exists.total === 0) { invite_code = code; break }
    }
    if (!invite_code) return fail('邀请码生成失败，请重试')

    const now = new Date()
    const expiresAt = new Date(now.getTime() + expires_in_days * 86400 * 1000)
    const insertRes = await db.collection('invitations').add({
      data: {
        ledger_id,
        inviter_openid: OPENID,
        invite_code,
        expires_at: expiresAt,
        used_count: 0,
        max_uses,
        is_active: true,
        created_at: now
      }
    })
    return ok({
      _id: insertRes._id,
      invite_code,
      expires_at: expiresAt,
      max_uses
    })
  } catch (e) {
    console.error('createInvitation 异常', e)
    return fail(e.message || '创建邀请失败')
  }
}
