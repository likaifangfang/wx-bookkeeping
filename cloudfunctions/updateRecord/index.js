// 云函数：updateRecord
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./_shared')

function normalizeAmount(amount) {
  const num = Number(amount)
  if (isNaN(num) || num <= 0) return null
  return Math.round(num * 100) / 100
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { id, type, amount, category_id, note, images, record_date } = event
  if (!id) return fail('缺少 id')

  try {
    const recRes = await db.collection('records').doc(id).get().catch(() => null)
    if (!recRes || !recRes.data || recRes.data.is_deleted) return fail('记录不存在')
    const record = recRes.data

    // 仅作者本人可编辑（共享账本下其他成员不可改）
    if (record.openid !== OPENID) return fail('无权限编辑此记录')

    const update = { updated_at: new Date() }
    if (type) {
      if (!['expense', 'income'].includes(type)) return fail('类型不合法')
      update.type = type
    }
    if (amount !== undefined) {
      const a = normalizeAmount(amount)
      if (!a) return fail('金额不合法')
      if (a > 99999999) return fail('金额超出限制')
      update.amount = a
    }
    if (note !== undefined) {
      if (note.length > 200) return fail('备注不能超过200个字符')
      update.note = note
    }
    if (Array.isArray(images)) {
      if (images.length > 3) return fail('图片最多3张')
      update.images = images
    }
    if (record_date) update.record_date = new Date(record_date)
    if (category_id) {
      const catRes = await db.collection('categories').doc(category_id).get().catch(() => null)
      if (!catRes || !catRes.data) return fail('分类不存在')
      if (catRes.data.ledger_id !== record.ledger_id) return fail('分类与账本不匹配')
      update.category_id = category_id
      update.category_name = catRes.data.name
      update.category_icon = catRes.data.icon
      update.category_color = catRes.data.color
    }

    await db.collection('records').doc(id).update({ data: update })
    return ok({ _id: id })
  } catch (e) {
    console.error('updateRecord 异常', e)
    return fail(e.message || '更新失败')
  }
}
