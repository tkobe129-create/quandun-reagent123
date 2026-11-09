/**
 * 日期与效期处理工具函数
 */

export function formatDate(val) {
  if (!val) return '-'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return String(val)
  }
}

export function formatDateTime(val) {
  if (!val) return '-'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${hh}:${mm}`
  } catch {
    return String(val)
  }
}

/**
 * 计算距离有效期的剩余天数
 * @param {string|Date} expiryDate
 * @returns {number|null} 剩余天数 (正数表示未过期，负数表示已过期，null 表示无数值)
 */
export function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const exp = new Date(expiryDate)
    exp.setHours(0, 0, 0, 0)
    if (isNaN(exp.getTime())) return null
    const diffTime = exp.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

/**
 * 判断试剂效期状态:
 * 'expired': 已过期 (<= 0天)
 * 'near': 近效期预警 (1 ~ 30天)
 * 'normal': 正常效期 (> 30天)
 * 'unknown': 未设置效期
 */
export function getExpiryStatus(expiryDate) {
  const days = getDaysUntilExpiry(expiryDate)
  if (days === null) return { status: 'unknown', text: '未设效期', days: null, badgeClass: 'badge-gray' }
  if (days <= 0) return { status: 'expired', text: `已过期 ${Math.abs(days)} 天`, days, badgeClass: 'badge-danger' }
  if (days <= 30) return { status: 'near', text: `近效期(${days}天)`, days, badgeClass: 'badge-warning' }
  return { status: 'normal', text: `余 ${days} 天`, days, badgeClass: 'badge-success' }
}
