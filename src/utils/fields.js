/**
 * 字段映射与数据模型转换 (PostgreSQL / Supabase 与前端模型互转)
 */

export function toDbFields(r) {
  const expiry = r.expiryDate || r.expiry_date || null
  const prod = r.productionDate || r.production_date || null

  let scanSegments = r.scanSegments ?? r.scan_segments ?? []
  if (typeof scanSegments === 'string') {
    try {
      scanSegments = JSON.parse(scanSegments)
    } catch {
      scanSegments = []
    }
  }

  return {
    code: r.code || '',
    name: r.name || '',
    category: r.category || '',
    specification: r.specification || '',
    manufacturer: r.manufacturer || '',
    unit: r.unit || '',
    stock_quantity: Number(r.stockQuantity ?? r.stock_quantity ?? 0),
    min_stock: Number(r.minStock ?? r.min_stock ?? 0),
    storage_condition: r.storageCondition || r.storage_condition || '',
    location: r.location || '',
    expiry_date: expiry,
    registration_number: r.registrationNumber || r.registration_number || '',
    notes: r.notes || '',
    scan_rule: r.scanRule || r.scan_rule || '',
    scan_segments: scanSegments,
    lot_number: r.lotNumber || r.lot_number || '',
    production_date: prod,
    raw_barcode: r.rawBarcode || r.raw_barcode || ''
  }
}

export function fromDbFields(r) {
  if (!r) return null
  return {
    id: r.id,
    code: r.code || '',
    name: r.name || '',
    category: r.category || '',
    specification: r.specification || '',
    manufacturer: r.manufacturer || '',
    unit: r.unit || '',
    stockQuantity: Number(r.stock_quantity || 0),
    minStock: Number(r.min_stock || 0),
    storageCondition: r.storage_condition || '',
    location: r.location || '',
    expiryDate: r.expiry_date || '',
    registrationNumber: r.registration_number || '',
    notes: r.notes || '',
    scanRule: r.scan_rule || '',
    scanSegments: r.scan_segments || [],
    lotNumber: r.lot_number || '',
    productionDate: r.production_date || '',
    createdAt: r.created_at || '',
    updatedAt: r.updated_at || '',
    rawBarcode: r.raw_barcode || ''
  }
}

export function toStockFields(r) {
  return {
    reagent_id: r.reagentId || r.reagent_id,
    type: r.type, // 'in' | 'out'
    quantity: Number(r.quantity || 0),
    lot_number: r.lotNumber || r.lot_number || '',
    expiry_date: r.expiryDate || r.expiry_date || null,
    note: r.note || '',
    operator: r.operator || '操作员',
    reagent_code: r.reagentCode || r.reagent_code || '',
    reagent_name: r.reagentName || r.reagent_name || ''
  }
}

export function fromStockFields(r) {
  if (!r) return null
  return {
    id: r.id,
    reagentId: r.reagent_id,
    type: r.type,
    quantity: Number(r.quantity || 0),
    lotNumber: r.lot_number || '',
    expiryDate: r.expiry_date || '',
    note: r.note || '',
    operator: r.operator || '',
    createdAt: r.created_at,
    reagentCode: r.reagent_code || '',
    reagentName: r.reagent_name || ''
  }
}
