// 云函数：joinLedger
// 通过邀请码加入共享账本
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { ok, fail } = require('./_shared')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { invite_code } = event
  if (!invite_code) return fail('缺少邀请码')

  try {
    const inviteRes = await db.collection('invitations')
      .where({ invite_code, is_active: true })
      .limit(1)
      .get()
    if (inviteRes.data.length === 0) return fail('邀请码无效或已失效')
    const invitation = inviteRes.data[0]

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return fail('邀请码已过期')
    }

    const ledger_id = invitation.ledger_id
    const ledgerRes = await db.collection('ledgers').doc(ledger_id).get().catch(() => null)
    if (!ledgerRes || !ledgerRes.data || ledgerRes.data.is_deleted) return fail('账本不存在')
    const ledger = ledgerRes.data

    // 取用户信息
    const userRes = await db.collection('users').where({ _openid: OPENID }).get()
    if (userRes.data.length === 0) return fail('请先登录')
    const user = userRes.data[0]

    // 是否已加入
    const memberRes = await db.collection('ledger_members')
      .where({ ledger_id, openid: OPENID })
      .get()

    const now = new Date()
    let isNewJoin = false
    if (memberRes.data.length > 0) {
      const existing = memberRes.data[0]
      if (!existing.is_active) {
        // 之前退出的，重新激活
        await db.collection('ledger_members').doc(existing._id).update({
          data: {
            is_active: true,
            role: 'editor',
            joined_at: now,
            updated_at: now
          }
        })
        await db.collection('ledgers').doc(ledger_id).update({
          data: { member_count: _.inc(1), updated_at: now }
        })
        isNewJoin = true
      }
      // 否则已是活跃成员,不消耗邀请码次数
    } else {
      await db.collection('ledger_members').add({
        data: {
          ledger_id,
          openid: OPENID,
          nickname: user.nickname,
          avatar_url: user.avatar_url,
          role: 'editor',
          joined_at: now,
          is_active: true,
          created_at: now,
          updated_at: now
        }
      })
      await db.collection('ledgers').doc(ledger_id).update({
        data: { member_count: _.inc(1), updated_at: now }
      })
      isNewJoin = true
    }

    if (isNewJoin) {
      // 原子性条件更新：仅在 used_count < max_uses 时自增，防止并发超额
      const updateRes = await db.collection('invitations')
        .where({
          _id: invitation._id,
          used_count: _.lt(invitation.max_uses)
        })
        .update({ data: { used_count: _.inc(1) } })
      if (updateRes.stats.updated === 0) {
        // 并发导致已达上限，回滚成员加入
        if (memberRes.data.length > 0) {
          await db.collection('ledger_members').doc(memberRes.data[0]._id).update({
            data: { is_active: false, updated_at: now }
          })
        } else {
          // 删掉刚加的记录(取最新一条)
          const newMember = await db.collection('ledger_members')
            .where({ ledger_id, openid: OPENID, is_active: true })
            .orderBy('created_at', 'desc')
            .limit(1)
            .get()
          if (newMember.data.length > 0) {
            await db.collection('ledger_members').doc(newMember.data[0]._id).remove()
          }
        }
        await db.collection('ledgers').doc(ledger_id).update({
          data: { member_count: _.inc(-1), updated_at: now }
        })
        return fail('邀请码已达使用上限')
      }
    }

    return ok({ ledger })
  } catch (e) {
    console.error('joinLedger 异常', e)
    return fail(e.message || '加入失败')
  }
}
