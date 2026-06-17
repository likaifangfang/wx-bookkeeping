// 云函数：getTempFileURL
// 中转获取云存储临时链接（绕过"仅创建者可读"限制）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const { ok, fail } = require('./_shared')

exports.main = async (event) => {
  const { fileList } = event
  if (!Array.isArray(fileList) || fileList.length === 0) {
    return fail('fileList 必须是非空数组')
  }
  if (fileList.length > 50) return fail('单次最多 50 个文件')

  try {
    const res = await cloud.getTempFileURL({ fileList })
    return ok(res.fileList)
  } catch (e) {
    console.error('getTempFileURL 异常', e)
    return fail(e.message || '获取失败')
  }
}
