// 云函数：createRecord
// 创建账单
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
  const {
    ledger_id,
    type,
    amount,
    category_id,
    note = '',
    images = [],
    record_date
  } = event

  if (!ledger_id || !category_id || !type) {
    return fail('参数缺失')
  }
  if (!['expense', 'income'].includes(type)) {
    return fail('类型不合法')
  }
  if (note && note.length > 200) return fail('备注不能超过200个字符')
  if (Array.isArray(images) && images.length > 3) return fail('图片最多3张')
  const normalizedAmount = normalizeAmount(amount)
  if (!normalizedAmount) return fail('金额不合法')
  if (normalizedAmount > 99999999) return fail('金额超出限制')

  try {
    // 校验权限
    const memberRes = await db.collection('ledger_members')
      .where({ ledger_id, openid: OPENID, is_active: true })
      .get()
    if (memberRes.data.length === 0) return fail('无权限操作此账本')
    const member = memberRes.data[0]
    if (member.role === 'viewer') return fail('您仅有查看权限')

    // 查分类
    const catRes = await db.collection('categories').doc(category_id).get().catch(() => null)
    if (!catRes || !catRes.data) return fail('分类不存在')
    const category = catRes.data
    if (category.ledger_id !== ledger_id) return fail('分类与账本不匹配')

    const now = new Date()
    const recordDate = record_date ? new Date(record_date) : now

    const insertRes = await db.collection('records').add({
      data: {
        ledger_id,
        openid: OPENID,
        type,
        amount: normalizedAmount,
        category_id,
        category_name: category.name,
        category_icon: category.icon,
        category_color: category.color,
        note,
        images: Array.isArray(images) ? images : [],
        record_date: recordDate,
        creator_nickname: member.nickname,
        creator_avatar: member.avatar_url,
        is_deleted: false,
        created_at: now,
        updated_at: now
      }
    })

    return ok({ _id: insertRes._id })
  } catch (e) {
    console.error('createRecord 异常', e)
    return fail(e.message || '保存失败')
  }
}
