import { getSupabase } from './supabase.js'
import { toDbFields, fromDbFields, toStockFields, fromStockFields } from './fields.js'

function resolveStore(storeName) {
  if (storeName === 'stockRecords' || storeName === 'stock_records') {
    return { table: 'stock_records', isStock: true, isReagents: false }
  }
  if (storeName === 'reagents') {
    return { table: 'reagents', isStock: false, isReagents: true }
  }
  return { table: storeName, isStock: false, isReagents: false }
}

// 新增记录
export async function dbAdd(storeName, data) {
  const sb = getSupabase()
  const { table, isStock, isReagents } = resolveStore(storeName)

  let fields
  if (isReagents) {
    fields = toDbFields(data)
  } else if (isStock) {
    fields = toStockFields(data)
  } else {
    fields = data
  }

  const { data: result, error } = await sb.from(table).insert(fields).select().single()
  if (error) throw error

  if (isReagents) return fromDbFields(result)
  if (isStock) return fromStockFields(result)
  return result
}

// 更新记录
export async function dbPut(storeName, data) {
  const sb = getSupabase()
  const { table, isStock, isReagents } = resolveStore(storeName)

  let fields
  if (isReagents) {
    fields = toDbFields(data)
  } else if (isStock) {
    fields = toStockFields(data)
  } else {
    fields = data
  }

  const { data: result, error } = await sb.from(table).update(fields).eq('id', data.id).select().single()
  if (error) throw error

  if (isReagents) return fromDbFields(result)
  if (isStock) return fromStockFields(result)
  return result
}

// 获取单条记录
export async function dbGet(storeName, id) {
  const sb = getSupabase()
  const { table, isStock, isReagents } = resolveStore(storeName)

  const { data, error } = await sb.from(table).select('*').eq('id', id).single()
  if (error) throw error

  if (isReagents) return fromDbFields(data)
  if (isStock) return fromStockFields(data)
  return data
}

// 获取所有记录
export async function dbGetAll(storeName) {
  const sb = getSupabase()
  const { table, isStock, isReagents } = resolveStore(storeName)

  let query = sb.from(table).select('*')
  if (isStock) {
    query = query.order('id', { ascending: false })
  } else {
    query = query.order('id', { ascending: true })
  }

  const { data, error } = await query
  if (error) throw error

  if (isReagents) return data.map(fromDbFields)
  if (isStock) return data.map(fromStockFields)
  return data
}

// 删除记录
export async function dbDelete(storeName, id) {
  const sb = getSupabase()
  const { table } = resolveStore(storeName)

  const { error } = await sb.from(table).delete().eq('id', id)
  if (error) throw error
  return true
}
