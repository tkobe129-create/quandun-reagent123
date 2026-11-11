import { getDb } from './firebase.js'
import { toDbFields, fromDbFields, toStockFields, fromStockFields } from './fields.js'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore'

function resolveStore(storeName) {
  if (storeName === 'stockRecords' || storeName === 'stock_records') {
    return { table: 'stock_records', isStock: true, isReagents: false }
  }
  if (storeName === 'reagents') {
    return { table: 'reagents', isStock: false, isReagents: true }
  }
  return { table: storeName, isStock: false, isReagents: false }
}

// 文档字段与前端模型的互转：沿用 fields.js 的 snake_case 映射，
// 文档 id 即记录 id（迁移时沿用 Supabase 的数字 id，新建记录用 Firestore 自动 id）。
function toDocFields(store, data) {
  if (store.isReagents) return toDbFields(data)
  if (store.isStock) return toStockFields(data)
  return data
}

function fromDoc(store, id, data) {
  const raw = { id, ...data }
  if (store.isReagents) return fromDbFields(raw)
  if (store.isStock) return fromStockFields(raw)
  return raw
}

// 新增记录
export async function dbAdd(storeName, data) {
  const db = getDb()
  const store = resolveStore(storeName)
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, store.table), {
    ...toDocFields(store, data),
    created_at: now,
    updated_at: now
  })
  const snap = await getDoc(ref)
  return fromDoc(store, ref.id, snap.data())
}

// 更新记录
export async function dbPut(storeName, data) {
  const db = getDb()
  const store = resolveStore(storeName)
  const ref = doc(db, store.table, String(data.id))
  await setDoc(
    ref,
    { ...toDocFields(store, data), updated_at: new Date().toISOString() },
    { merge: true }
  )
  const snap = await getDoc(ref)
  return fromDoc(store, ref.id, snap.data())
}

// 获取单条记录
export async function dbGet(storeName, id) {
  const db = getDb()
  const store = resolveStore(storeName)
  const snap = await getDoc(doc(db, store.table, String(id)))
  if (!snap.exists()) throw new Error('记录不存在')
  return fromDoc(store, snap.id, snap.data())
}

// 获取所有记录
export async function dbGetAll(storeName) {
  const db = getDb()
  const store = resolveStore(storeName)
  const snap = await getDocs(collection(db, store.table))
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  if (store.isStock) {
    list.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  } else {
    list.sort((a, b) => {
      const na = Number(a.id)
      const nb = Number(b.id)
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
      return String(a.id).localeCompare(String(b.id))
    })
  }
  return list.map((r) => fromDoc(store, r.id, r))
}

// 删除记录
export async function dbDelete(storeName, id) {
  const db = getDb()
  const store = resolveStore(storeName)
  await deleteDoc(doc(db, store.table, String(id)))
  return true
}
