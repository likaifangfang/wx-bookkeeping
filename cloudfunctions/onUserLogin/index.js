// 云函数：onUserLogin
// 用户登录 + 初始化默认账本与默认分类
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { ok, fail, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } = require('./_shared')

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('未获取到用户身份')

  const now = new Date()
  const { nickname = '微信用户', avatar_url = '' } = event

  try {
    // 查或建用户
    const userRes = await db.collection('users').where({ _openid: OPENID }).get()
    let user
    let isNewUser = false

    if (userRes.data.length === 0) {
      isNewUser = true
      const insertRes = await db.collection('users').add({
        data: {
          _openid: OPENID,
          nickname,
          avatar_url,
          default_ledger_id: null,
          settings: {
            reminder_enabled: false,
            reminder_time: '21:00',
            privacy_mode: false
          },
          created_at: now,
          updated_at: now
        }
      })
      user = {
        _id: insertRes._id,
        _openid: OPENID,
        nickname,
        avatar_url
      }
    } else {
      user = userRes.data[0]
      // 更新昵称头像（如有变化）
      const updates = {}
      if (nickname && nickname !== user.nickname) updates.nickname = nickname
      if (avatar_url && avatar_url !== user.avatar_url) updates.avatar_url = avatar_url
      if (Object.keys(updates).length) {
        updates.updated_at = now
        await db.collection('users').doc(user._id).update({ data: updates })
        Object.assign(user, updates)
      }
    }

    let defaultLedger = null

    // 1. 先尝试用现有的 default_ledger_id
    if (!isNewUser && user.default_ledger_id) {
      const ledgerRes = await db.collection('ledgers').doc(user.default_ledger_id).get().catch(() => null)
      if (ledgerRes && ledgerRes.data && !ledgerRes.data.is_deleted) {
        defaultLedger = ledgerRes.data
      }
    }

    // 2. 没有有效默认账本,在用户已加入的其他账本里挑一个
    if (!defaultLedger && !isNewUser) {
      defaultLedger = await pickFallbackLedger(OPENID)
    }

    // 2.5 如果 ledger_members 没找到,再直接查 ledgers 表(防止数据不一致)
    if (!defaultLedger && !isNewUser) {
      const ownedRes = await db.collection('ledgers')
        .where({ owner_openid: OPENID, is_deleted: false })
        .orderBy('created_at', 'asc')
        .limit(1)
        .get()
      if (ownedRes.data.length > 0) {
        defaultLedger = ownedRes.data[0]
      }
    }

    // 更新 default_ledger_id
    if (defaultLedger && !isNewUser && user.default_ledger_id !== defaultLedger._id) {
      await db.collection('users').doc(user._id).update({
        data: { default_ledger_id: defaultLedger._id, updated_at: now }
      })
      user.default_ledger_id = defaultLedger._id
    }

    // 3. 用户真的一个有效账本都没有,才创建新的
    if (!defaultLedger) {
      defaultLedger = await initDefaultLedger(OPENID, user, now)
      await db.collection('users').doc(user._id).update({
        data: { default_ledger_id: defaultLedger._id, updated_at: now }
      })
      user.default_ledger_id = defaultLedger._id
    }

    return ok({ user, defaultLedger })
  } catch (e) {
    console.error('onUserLogin 异常', e)
    return fail(e.message || '初始化失败')
  }
}

/**
 * 在用户已加入的有效账本里,挑一个作为默认
 * 优先级:个人账本 > 共享账本;同类型按 updated_at 倒序
 */
async function pickFallbackLedger(openid) {
  const memberRes = await db.collection('ledger_members')
    .where({ openid, is_active: true })
    .limit(100)
    .get()
  if (memberRes.data.length === 0) return null
  const ledgerIds = memberRes.data.map(m => m.ledger_id)
  const ledgerRes = await db.collection('ledgers')
    .where({ _id: _.in(ledgerIds), is_deleted: false })
    .limit(100)
    .get()
  if (ledgerRes.data.length === 0) return null
  // 个人账本优先
  ledgerRes.data.sort((a, b) => {
    if (a.type === 'personal' && b.type !== 'personal') return -1
    if (a.type !== 'personal' && b.type === 'personal') return 1
    return new Date(b.updated_at) - new Date(a.updated_at)
  })
  return ledgerRes.data[0]
}

async function initDefaultLedger(openid, user, now) {
  // 1. 创建账本
  const insertRes = await db.collection('ledgers').add({
    data: {
      name: '我的账本',
      icon: 'wallet',
      color: '#4A90E2',
      currency: 'CNY',
      type: 'shared',
      owner_openid: openid,
      member_count: 1,
      is_deleted: false,
      created_at: now,
      updated_at: now
    }
  })
  const ledgerId = insertRes._id

  // 2. 写入成员
  await db.collection('ledger_members').add({
    data: {
      ledger_id: ledgerId,
      openid,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      role: 'owner',
      joined_at: now,
      is_active: true,
      created_at: now,
      updated_at: now
    }
  })

  // 3. 批量写入默认分类
  const allCats = [
    ...DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({ ...c, type: 'expense', sort: i })),
    ...DEFAULT_INCOME_CATEGORIES.map((c, i) => ({ ...c, type: 'income', sort: i }))
  ]
  await Promise.all(allCats.map(c =>
    db.collection('categories').add({
      data: {
        ledger_id: ledgerId,
        name: c.name,
        icon: c.icon,
        color: c.color,
        type: c.type,
        sort: c.sort,
        is_default: true,
        is_hidden: false,
        created_at: now,
        updated_at: now
      }
    })
  ))

  return {
    _id: ledgerId,
    name: '我的账本',
    icon: 'wallet',
    color: '#4A90E2',
    currency: 'CNY',
    type: 'shared',
    owner_openid: openid,
    member_count: 1
  }
}
