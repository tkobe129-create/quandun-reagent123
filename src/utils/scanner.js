import { dbGetAll } from './db.js'

export const AI_DESC = {
  '01': 'GTIN',
  '10': '批号',
  '11': '生产日期',
  '17': '有效期至',
  '21': '序列号',
  '37': '数量',
  '240': '附加产品标识',
  '241': '客户方代码',
  '410': '发货方',
  '411': '收货方',
  '414': '标识码',
  '417': '供货方',
  '420': '收货方名称'
}

export const GS1_AI_MAP = {
  '01': { desc: 'GTIN', len: 14, color: 'seg-01' },
  '10': { desc: '批号', len: 0, color: 'seg-10' },
  '11': { desc: '生产日期', len: 6, color: 'seg-11' },
  '12': { desc: '有效期', len: 6, color: 'seg-12' },
  '13': { desc: '包装日期', len: 6, color: 'seg-13' },
  '15': { desc: '保质期', len: 6, color: 'seg-15' },
  '17': { desc: '有效期至', len: 6, color: 'seg-17' },
  '20': { desc: '产品变体', len: 2, color: 'seg-20' },
  '21': { desc: '序列号', len: 0, color: 'seg-21' },
  '22': { desc: 'HIBCC', len: 0, color: 'seg-22' },
  '240': { desc: '附加产品标识', len: 0, color: 'seg-240' },
  '241': { desc: '客户部件号', len: 0, color: 'seg-241' },
  '250': { desc: '二级序列号', len: 0, color: 'seg-250' },
  '251': { desc: '引用源实体', len: 0, color: 'seg-251' },
  '30': { desc: '可变数量', len: 0, color: 'seg-30' },
  '310': { desc: '净重(kg)', len: 6, color: 'seg-310' },
  '311': { desc: '净长(m)', len: 6, color: 'seg-311' },
  '312': { desc: '净宽(m)', len: 6, color: 'seg-312' },
  '313': { desc: '净高(m)', len: 6, color: 'seg-313' },
  '314': { desc: '净面积(m2)', len: 6, color: 'seg-314' },
  '315': { desc: '净体积(L)', len: 6, color: 'seg-315' },
  '316': { desc: '净体积(m3)', len: 6, color: 'seg-316' }
}

export function cleanFNC1(code) {
  if (!code) return ''
  return code
    .replace(/[\x1D]D/g, '')
    .replace(/[\x1D\]d]/gi, '')
    .replace(/\x1D/g, '')
    .trim()
}

/**
 * 解析条码（支持带括号 GS1 与不带括号流式 GS1）
 * 格式示例 1: (01)(06954414719413)(11)(251206)(17)(270606)(10)(AB25100721H000502)
 * 格式示例 2: (01)06954414719413(11)251206(17)270606(10)AB25100721H000502
 */
export function parseBarcode(raw) {
  if (!raw || !raw.trim()) return []
  const cleaned = cleanFNC1(raw)

  const parsedSegments = []
  // 匹配带括号的 AI 格式，兼容 (01)(xxxx) 和 (01)xxxx
  const bracketRegex = /\((\d{2,4})\)\(?([^\(]*)\)?/g
  let match
  let hasBracket = false

  while ((match = bracketRegex.exec(cleaned)) !== null) {
    hasBracket = true
    const ai = match[1]
    let data = match[2]
    if (data.endsWith(')')) data = data.slice(0, -1)
    const start = match.index
    const end = start + match[0].length
    const info = GS1_AI_MAP[ai] || { desc: '未知(' + ai + ')', len: 0, color: 'seg-other' }
    parsedSegments.push({
      ai,
      desc: info.desc,
      color: info.color,
      start,
      end,
      value: data,
      fullMatch: match[0]
    })
  }

  // 如果没有括号，尝试按标准连续 GS1-128 AI 规则解析常见字段 (01, 11, 17, 10, 21)
  if (!hasBracket && cleaned.length >= 16 && cleaned.startsWith('01')) {
    let index = 0
    let safetyCount = 0
    while (index < cleaned.length && safetyCount < 10) {
      safetyCount++
      const sub = cleaned.substring(index)
      let foundAi = null
      let valLen = 0

      if (sub.startsWith('01') && sub.length >= 16) {
        foundAi = '01'
        valLen = 14
      } else if (sub.startsWith('11') && sub.length >= 8) {
        foundAi = '11'
        valLen = 6
      } else if (sub.startsWith('17') && sub.length >= 8) {
        foundAi = '17'
        valLen = 6
      } else if (sub.startsWith('10')) {
        foundAi = '10'
        // 批号通常持续到下一个已知 AI 或字符串末尾
        const remaining = sub.substring(2)
        const nextAiMatch = remaining.search(/(11|17|21)\d{6}/)
        valLen = nextAiMatch > 0 ? nextAiMatch : remaining.length
      } else if (sub.startsWith('21')) {
        foundAi = '21'
        valLen = sub.length - 2
      } else {
        break
      }

      if (foundAi) {
        const info = GS1_AI_MAP[foundAi] || { desc: '未知(' + foundAi + ')', len: 0, color: 'seg-other' }
        const valStart = index + foundAi.length
        const valEnd = valStart + valLen
        const value = cleaned.substring(valStart, valEnd)
        parsedSegments.push({
          ai: foundAi,
          desc: info.desc,
          color: info.color,
          start: index,
          end: valEnd,
          value,
          fullMatch: foundAi + value
        })
        index = valEnd
      } else {
        break
      }
    }
  }

  if (parsedSegments.length === 0) {
    parsedSegments.push({
      ai: '',
      desc: '完整条码',
      color: 'seg-other',
      start: 0,
      end: cleaned.length,
      value: cleaned,
      fullMatch: cleaned
    })
  }

  return parsedSegments
}

/**
 * 根据切割规则提取字段
 * @param {string} scanResult - 扫码结果字符串
 * @param {string|Array} scanSegments - 切割规则 (JSON字符串或对象数组)
 * @returns {object} { lotNumber, productionDate, productionDateFormatted, expiryDate, expiryDateFormatted, gtin, serialNumber }
 */
export function extractFieldsByRules(scanResult, scanSegments) {
  if (!scanResult) return {}
  const fields = {}

  // 1. 若条码带有 (AI) 结构，优先从括号语义结构中提取
  if (scanResult.includes('(') && scanResult.includes(')')) {
    const segments = parseBarcode(scanResult)
    for (const seg of segments) {
      if (!seg.ai) continue
      const val = seg.value
      if (seg.ai === '01') fields.gtin = val
      if (seg.ai === '10') fields.lotNumber = val
      if (seg.ai === '11') {
        fields.productionDate = val
        if (val.length === 6) {
          fields.productionDateFormatted = '20' + val.substring(0, 2) + '-' + val.substring(2, 4) + '-' + val.substring(4, 6)
        } else if (val.length === 8 && /^\d{8}$/.test(val)) {
          fields.productionDateFormatted = val.substring(0, 4) + '-' + val.substring(4, 6) + '-' + val.substring(6, 8)
        }
      }
      if (seg.ai === '17') {
        fields.expiryDate = val
        if (val.length === 6) {
          fields.expiryDateFormatted = '20' + val.substring(0, 2) + '-' + val.substring(2, 4) + '-' + val.substring(4, 6)
        } else if (val.length === 8 && /^\d{8}$/.test(val)) {
          fields.expiryDateFormatted = val.substring(0, 4) + '-' + val.substring(4, 6) + '-' + val.substring(6, 8)
        }
      }
      if (seg.ai === '21') fields.serialNumber = val
    }
    if (fields.lotNumber || fields.expiryDate || fields.productionDate) {
      return fields
    }
  }

  // 2. 按预设规则切割提取
  if (scanSegments) {
    try {
      let rules = scanSegments
      if (typeof rules === 'string') {
        rules = JSON.parse(rules)
      }
      if (Array.isArray(rules)) {
        for (const rule of rules) {
          if (rule.start === undefined || !rule.len) continue
          let value = scanResult.substring(rule.start, rule.start + rule.len)
          // 若切割包含 AI 标识前缀，去掉 AI 标识得到纯净值
          if (rule.ai && value.startsWith(rule.ai)) {
            value = value.substring(rule.ai.length)
          }
          switch (rule.ai) {
            case '01':
              if (!fields.gtin) fields.gtin = value
              break
            case '10':
              if (!fields.lotNumber) fields.lotNumber = value
              break
            case '11':
              if (!fields.productionDate) {
                fields.productionDate = value
                if (value.length === 6) {
                  fields.productionDateFormatted = '20' + value.substring(0, 2) + '-' + value.substring(2, 4) + '-' + value.substring(4, 6)
                } else if (value.length === 8 && /^\d{8}$/.test(value)) {
                  fields.productionDateFormatted = value.substring(0, 4) + '-' + value.substring(4, 6) + '-' + value.substring(6, 8)
                }
              }
              break
            case '17':
              if (!fields.expiryDate) {
                fields.expiryDate = value
                if (value.length === 6) {
                  fields.expiryDateFormatted = '20' + value.substring(0, 2) + '-' + value.substring(2, 4) + '-' + value.substring(4, 6)
                } else if (value.length === 8 && /^\d{8}$/.test(value)) {
                  fields.expiryDateFormatted = value.substring(0, 4) + '-' + value.substring(4, 6) + '-' + value.substring(6, 8)
                }
              }
              break
            case '21':
              if (!fields.serialNumber) fields.serialNumber = value
              break
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return fields
}

/**
 * 扫码匹配试剂（三级优先级）：
 *   1. scanRule 包含匹配（有GS1切割规则）
 *   2. code (GTIN) 包含匹配（有切割规则）
 *   3. 简单条码匹配（无切割规则，手动输入批号/效期）
 *
 * @param {string} scanResult - 扫码结果
 * @param {Array} [cachedReagents] - 可选的已缓存试剂列表，提升移动端连续扫码性能
 * @returns {object|null} { reagent, fields, priority, matchType }
 */
export async function matchReagentByScan(scanResult, cachedReagents = null) {
  if (!scanResult) return null
  const cleaned = cleanFNC1(scanResult)
  const reagents = cachedReagents || (await dbGetAll('reagents'))

  // 优先级 1: 通过 scanRule 匹配 (有 GS1 切割规则)
  const withRule = reagents.filter(r => r.scanRule && r.scanRule.trim())
  for (const r of withRule) {
    if (cleaned.includes(r.scanRule)) {
      const fields = extractFieldsByRules(cleaned, r.scanSegments)
      return { reagent: r, fields, priority: 1, matchType: 'scanRule' }
    }
  }

  // 优先级 2: 通过 code (GTIN) 匹配 (有切割规则)
  const withCode = reagents.filter(r => r.code && r.code.trim())
  for (const r of withCode) {
    if (cleaned.includes(r.code)) {
      const fields = extractFieldsByRules(cleaned, r.scanSegments)
      return { reagent: r, fields, priority: 2, matchType: 'code' }
    }
  }

  // 优先级 3: 简单条码匹配（无 GS1 结构，或者未配置切割规则）
  const simpleMatch = reagents.filter(r => r.code && r.code.trim() && (!r.scanSegments || (Array.isArray(r.scanSegments) && r.scanSegments.length === 0)))
  for (const r of simpleMatch) {
    if (cleaned === r.code || cleaned.includes(r.code)) {
      return { reagent: r, fields: {}, priority: 3, matchType: 'simple' }
    }
  }

  return null
}
