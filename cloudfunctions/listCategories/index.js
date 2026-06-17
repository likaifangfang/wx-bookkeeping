// 云函数：listCategories
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const { ok, fail } = require('./_shared')

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { ledger_id } = event
  if (!ledger_id) return fail('缺少 ledger_id')

  try {
    const memberRes = await db.collection('ledger_members')
      .where({ ledger_id, openid: OPENID, is_active: true })
      .get()
    if (memberRes.data.length === 0) return fail('无权限访问此账本')

    const res = await db.collection('categories')
      .where({ ledger_id, is_hidden: false })
      .orderBy('sort', 'asc')
      .limit(100)
      .get()

    const expense = res.data.filter(c => c.type === 'expense')
    const income = res.data.filter(c => c.type === 'income')
    return ok({ expense, income })
  } catch (e) {
    console.error('listCategories 异常', e)
    return fail(e.message || '加载失败')
  }
}
