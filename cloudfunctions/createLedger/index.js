// 云函数：createLedger
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } = require('./_shared')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { name, icon = 'wallet', color = '#4A90E2', type = 'shared' } = event
  if (!name) return fail('账本名不能为空')
  if (name.length > 20) return fail('账本名不能超过20个字符')
  if (icon && icon.length > 10) return fail('图标不合法')
  if (color && color.length > 10) return fail('颜色值不合法')
  if (!['personal', 'shared'].includes(type)) return fail('账本类型不合法')

  try {
    const userRes = await db.collection('users').where({ _openid: OPENID }).get()
    if (userRes.data.length === 0) return fail('请先登录')
    const user = userRes.data[0]

    const now = new Date()
    const insertRes = await db.collection('ledgers').add({
      data: {
        name,
        icon,
        color,
        currency: 'CNY',
        type,
        owner_openid: OPENID,
        member_count: 1,
        is_deleted: false,
        created_at: now,
        updated_at: now
      }
    })
    const ledgerId = insertRes._id

    await db.collection('ledger_members').add({
      data: {
        ledger_id: ledgerId,
        openid: OPENID,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        role: 'owner',
        joined_at: now,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    })

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

    return ok({
      _id: ledgerId,
      name, icon, color,
      currency: 'CNY',
      type,
      owner_openid: OPENID,
      member_count: 1
    })
  } catch (e) {
    console.error('createLedger 异常', e)
    return fail(e.message || '创建失败')
  }
}
