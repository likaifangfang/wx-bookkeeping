// 云函数：manageCategory
// action: create | update | hide
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./_shared')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { action, id, ledger_id, type, name, icon, color, sort } = event
  if (!action) return fail('缺少 action')

  try {
    const now = new Date()

    if (action === 'create') {
      if (!ledger_id || !type || !name) return fail('参数缺失')
      if (name.length > 10) return fail('分类名不能超过10个字符')
      if (icon && icon.length > 10) return fail('图标不合法')
      if (color && color.length > 10) return fail('颜色值不合法')
      if (!['expense', 'income'].includes(type)) return fail('类型不合法')
      // 校验是否成员
      const memberRes = await db.collection('ledger_members')
        .where({ ledger_id, openid: OPENID, is_active: true })
        .get()
      if (memberRes.data.length === 0) return fail('无权限')
      if (memberRes.data[0].role === 'viewer') return fail('您仅有查看权限')

      const insertRes = await db.collection('categories').add({
        data: {
          ledger_id,
          name,
          icon: icon || 'more',
          color: color || '#9CA3AF',
          type,
          sort: typeof sort === 'number' ? sort : 999,
          is_default: false,
          is_hidden: false,
          created_at: now,
          updated_at: now
        }
      })
      return ok({ _id: insertRes._id })
    }

    if (action === 'update' || action === 'hide') {
      if (!id) return fail('缺少 id')
      const catRes = await db.collection('categories').doc(id).get().catch(() => null)
      if (!catRes || !catRes.data) return fail('分类不存在')

      const memberRes = await db.collection('ledger_members')
        .where({ ledger_id: catRes.data.ledger_id, openid: OPENID, is_active: true })
        .get()
      if (memberRes.data.length === 0) return fail('无权限')
      if (memberRes.data[0].role === 'viewer') return fail('您仅有查看权限')

      const update = { updated_at: now }
      if (action === 'hide') {
        update.is_hidden = true
      } else {
        if (name !== undefined) {
          if (name.length > 10) return fail('分类名不能超过10个字符')
          update.name = name
        }
        if (icon !== undefined) {
          if (icon.length > 10) return fail('图标不合法')
          update.icon = icon
        }
        if (color !== undefined) {
          if (color.length > 10) return fail('颜色值不合法')
          update.color = color
        }
        if (sort !== undefined) update.sort = sort
      }
      await db.collection('categories').doc(id).update({ data: update })
      return ok({ _id: id })
    }

    return fail('未知 action')
  } catch (e) {
    console.error('manageCategory 异常', e)
    return fail(e.message || '操作失败')
  }
}
