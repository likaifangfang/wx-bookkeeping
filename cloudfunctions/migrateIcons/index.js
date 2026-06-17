// 云函数：migrateIcons
// 一次性数据迁移:把所有 categories 和 records 的旧 icon key 替换成 emoji
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { ok, fail } = require('./_shared')

const ICON_MAP = {
  // 支出
  food: '🍔',
  car: '🚗',
  shopping: '🛒',
  game: '🎮',
  home: '🏠',
  medical: '💊',
  book: '📚',
  phone: '📱',
  gift: '🎁',
  more: '📌',
  // 收入
  salary: '💰',
  bonus: '🎉',
  invest: '📈',
  refund: '↩️',
  redbag: '🧧'
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  const ADMIN_OPENIDS = ['ogPw63S5lSbtqryMY8g8lGZ5CLtY']
  if (!ADMIN_OPENIDS.includes(OPENID)) {
    return fail('无权限执行此操作')
  }

  try {
    let catUpdated = 0
    let recUpdated = 0

    // 迁移 categories
    for (const [oldKey, emoji] of Object.entries(ICON_MAP)) {
      const res = await db.collection('categories')
        .where({ icon: oldKey })
        .update({ data: { icon: emoji, updated_at: new Date() } })
      catUpdated += res.stats.updated
    }

    // 迁移 records 的冗余 category_icon 字段
    for (const [oldKey, emoji] of Object.entries(ICON_MAP)) {
      const res = await db.collection('records')
        .where({ category_icon: oldKey })
        .update({ data: { category_icon: emoji, updated_at: new Date() } })
      recUpdated += res.stats.updated
    }

    return ok({
      categories_updated: catUpdated,
      records_updated: recUpdated
    })
  } catch (e) {
    console.error('migrateIcons 异常', e)
    return fail(e.message || '迁移失败')
  }
}
