<template>
  <div class="stock-page">
    <!-- In / Out Tab Switcher -->
    <div class="tab-switch-box">
      <button
        :class="['switch-btn', 'btn-in', { active: activeTab === 'in' }]"
        @click="switchTab('in')"
      >
        <span class="icon">📥</span>
        <span>扫码入库</span>
      </button>
      <button
        :class="['switch-btn', 'btn-out', { active: activeTab === 'out' }]"
        @click="switchTab('out')"
      >
        <span class="icon">📤</span>
        <span>扫码出库</span>
      </button>
    </div>

    <!-- Quick Scan Action Hero Banner -->
    <div class="scan-hero-card" :class="`hero-${activeTab}`">
      <div class="hero-left">
        <h2 class="hero-title">
          {{ activeTab === 'in' ? '试剂入库扫码' : '试剂出库扫码' }}
        </h2>
        <p class="hero-desc">
          {{ activeTab === 'in' ? '扫描 GS1 / 条码自动识别试剂并录入效期批号' : '扫描试剂条码出库，系统自动核验可用库存' }}
        </p>
      </div>
      <button class="hero-scan-btn" @click="showScanner = true">
        <span class="btn-icon">📷</span>
        <span>开启扫码</span>
      </button>
    </div>

    <!-- Matched Reagent & Quick Input Form Card -->
    <div class="form-card" v-if="matchedReagent || manualSelectMode">
      <div class="form-card-header">
        <div class="header-left">
          <span class="match-badge" :class="matchBadgeClass">
            {{ matchBadgeText }}
          </span>
          <h3 class="matched-name">{{ matchedReagent ? matchedReagent.name : '选择试剂' }}</h3>
        </div>
        <button class="clear-match-btn" @click="clearMatch">重选</button>
      </div>

      <!-- Reagent basic info pill -->
      <div v-if="matchedReagent" class="matched-meta">
        <span>GTIN: <code class="font-mono">{{ matchedReagent.code }}</code></span>
        <span>规格: {{ matchedReagent.specification || '-' }}</span>
        <span>当前库存: <b>{{ matchedReagent.stockQuantity }}</b> {{ matchedReagent.unit || '盒' }}</span>
        <span v-if="activeTab === 'out'" class="available-stock-hint">
          当前可用: <b>{{ getAvailableStock(matchedReagent.id) }}</b>
        </span>
      </div>

      <!-- If manual selection is active -->
      <div v-if="!matchedReagent && manualSelectMode" class="reagent-select-box">
        <label class="form-label">手动检索试剂：</label>
        <select v-model="selectedReagentId" class="form-select" @change="onManualSelect">
          <option value="">-- 请选择要操作的试剂 --</option>
          <option v-for="r in reagentList" :key="r.id" :value="r.id">
            {{ r.name }} (编码:{{ r.code }} | 库存:{{ r.stockQuantity }})
          </option>
        </select>
      </div>

      <!-- Form Inputs -->
      <div v-if="matchedReagent" class="form-inputs">
        <div class="form-row">
          <label class="form-label">
            {{ activeTab === 'in' ? '入库数量' : '出库数量' }} <span class="text-danger">*</span>
          </label>
          <div class="quantity-control">
            <button class="qty-btn" @click="stepQty(-1)">-</button>
            <input
              v-model.number="form.quantity"
              type="number"
              min="1"
              :max="activeTab === 'out' ? getAvailableStock(matchedReagent.id) : 9999"
              class="qty-input"
            />
            <button class="qty-btn" @click="stepQty(1)">+</button>
            <span class="qty-unit">{{ matchedReagent.unit || '盒' }}</span>
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">试剂批号 (Lot No.)</label>
          <input
            v-model="form.lotNumber"
            type="text"
            placeholder="自动提取或手动录入批号"
            class="form-input"
          />
        </div>

        <div class="form-row-grid">
          <div class="form-row">
            <label class="form-label">有效期至 (Expiry)</label>
            <input
              v-model="form.expiryDate"
              type="date"
              class="form-input"
            />
          </div>
          <div class="form-row">
            <label class="form-label">生产日期 (Mfg)</label>
            <input
              v-model="form.productionDate"
              type="date"
              class="form-input"
            />
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">备注说明</label>
          <input
            v-model="form.note"
            type="text"
            placeholder="可选填入库批次说明 / 领用科室等"
            class="form-input"
          />
        </div>

        <!-- Add to Pending Button -->
        <button
          class="add-pending-btn"
          :class="`btn-${activeTab}`"
          :disabled="isOutOfStock"
          @click="addToPending"
        >
          {{ isOutOfStock ? '❌ 出库数量超过可用库存' : '+ 加入待提交清单' }}
        </button>
      </div>
    </div>

    <!-- Empty match prompt -->
    <div v-else class="empty-prompt-card">
      <div class="prompt-icon">📷</div>
      <p class="prompt-text">点击上方“开启扫码”扫描试剂条码</p>
      <button class="manual-pick-link" @click="manualSelectMode = true">
        试剂无法扫码？点击手动选择试剂
      </button>
    </div>

    <!-- Pending Items Section -->
    <div class="pending-section" v-if="pendingList.length > 0">
      <div class="pending-header">
        <h3 class="pending-title">
          <span>待提交清单</span>
          <span class="pending-count">({{ pendingList.length }} 项)</span>
        </h3>
        <button class="clear-all-pending" @click="pendingList = []">清空清单</button>
      </div>

      <div class="pending-list">
        <div
          v-for="(item, idx) in pendingList"
          :key="item.uid"
          class="pending-item"
        >
          <div class="item-left">
            <span :class="['item-badge', item.type === 'in' ? 'badge-in' : 'badge-out']">
              {{ item.type === 'in' ? '入库' : '出库' }}
            </span>
            <div class="item-info">
              <div class="item-name">{{ item.reagentName }}</div>
              <div class="item-sub">
                <span v-if="item.lotNumber">批号: {{ item.lotNumber }}</span>
                <span v-if="item.expiryDate">效期: {{ item.expiryDate }}</span>
              </div>
            </div>
          </div>

          <div class="item-right">
            <div class="item-qty">
              <b>{{ item.type === 'in' ? '+' : '-' }}{{ item.quantity }}</b> {{ item.unit }}
            </div>
            <button class="del-btn" @click="removePending(idx)" title="移除此条">✕</button>
          </div>
        </div>
      </div>

      <!-- Batch Submit Floating Bar -->
      <div class="batch-submit-box">
        <div class="submit-summary">
          <span>共 <b>{{ pendingList.length }}</b> 条操作</span>
          <span>总计 <b>{{ totalPendingQty }}</b> 盒/件</span>
        </div>
        <button
          class="submit-all-btn"
          :disabled="submitting"
          @click="batchSubmit"
        >
          {{ submitting ? '正在批量提交...' : '确认批量提交' }}
        </button>
      </div>
    </div>

    <!-- Camera Scanner Component -->
    <CameraScanner
      v-if="showScanner"
      :sampleReagents="reagentList"
      @scan="handleScanResult"
      @close="showScanner = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { dbGetAll, dbAdd, dbPut } from '../utils/db.js'
import { cleanFNC1, matchReagentByScan } from '../utils/scanner.js'
import { toast } from '../utils/toast.js'
import CameraScanner from '../components/CameraScanner.vue'

const route = useRoute()

const activeTab = ref('in') // 'in' | 'out'
const reagentList = ref([])
const showScanner = ref(false)
const manualSelectMode = ref(false)
const selectedReagentId = ref('')
const matchedReagent = ref(null)
const matchInfo = ref(null)
const submitting = ref(false)

const form = ref({
  quantity: 1,
  lotNumber: '',
  expiryDate: '',
  productionDate: '',
  note: ''
})

const pendingList = ref([])

async function loadReagents() {
  try {
    reagentList.value = await dbGetAll('reagents')
  } catch (err) {
    toast.error('获取试剂列表失败: ' + (err.message || ''))
  }
}

function switchTab(tab) {
  activeTab.value = tab
}

const matchBadgeClass = computed(() => {
  if (!matchInfo.value) return 'badge-gray'
  if (matchInfo.value.priority === 1) return 'badge-primary'
  if (matchInfo.value.priority === 2) return 'badge-success'
  return 'badge-warning'
})

const matchBadgeText = computed(() => {
  if (!matchInfo.value) return '手动指定'
  if (matchInfo.value.priority === 1) return 'GS1规则匹配'
  if (matchInfo.value.priority === 2) return 'GTIN编码匹配'
  return '简单条码匹配'
})

// 计算试剂当前可用库存 (扣除当前待出库的暂扣数量)
function getAvailableStock(reagentId) {
  const reagent = reagentList.value.find(r => r.id === reagentId)
  if (!reagent) return 0
  const currentStock = reagent.stockQuantity || 0
  const pendingOut = pendingList.value
    .filter(p => p.reagentId === reagentId && p.type === 'out')
    .reduce((sum, p) => sum + p.quantity, 0)
  return Math.max(0, currentStock - pendingOut)
}

const isOutOfStock = computed(() => {
  if (activeTab.value !== 'out') return false
  if (!matchedReagent.value) return false
  const available = getAvailableStock(matchedReagent.value.id)
  return Number(form.value.quantity) > available || available <= 0
})

const totalPendingQty = computed(() => {
  return pendingList.value.reduce((sum, p) => sum + p.quantity, 0)
})

function stepQty(delta) {
  const next = Number(form.value.quantity || 1) + delta
  if (next < 1) return
  if (activeTab.value === 'out' && matchedReagent.value) {
    const available = getAvailableStock(matchedReagent.value.id)
    if (next > available) {
      toast.warning(`出库数量不可超过可用库存 (${available})`)
      return
    }
  }
  form.value.quantity = next
}

// 扫码识别处理
async function handleScanResult(code) {
  showScanner.value = false
  const cleaned = cleanFNC1(code)

  try {
    const result = await matchReagentByScan(cleaned, reagentList.value)
    if (result && result.reagent) {
      matchedReagent.value = result.reagent
      matchInfo.value = result
      manualSelectMode.value = false

      // 自动填充提取的字段
      if (result.fields.lotNumber) form.value.lotNumber = result.fields.lotNumber
      if (result.fields.expiryDateFormatted) form.value.expiryDate = result.fields.expiryDateFormatted
      if (result.fields.productionDateFormatted) form.value.productionDate = result.fields.productionDateFormatted
      form.value.quantity = 1

      toast.success(`识别成功: ${result.reagent.name}`)
    } else {
      clearMatch()
      toast.warning('未识别到匹配试剂，您可尝试手动选择或到“试剂预录”添加新试剂')
      manualSelectMode.value = true
    }
  } catch (err) {
    toast.error('匹配试剂失败: ' + (err.message || ''))
  }
}

function onManualSelect() {
  if (!selectedReagentId.value) return
  const r = reagentList.value.find(item => item.id === Number(selectedReagentId.value))
  if (r) {
    matchedReagent.value = r
    matchInfo.value = null
    form.value.quantity = 1
  }
}

function clearMatch() {
  matchedReagent.value = null
  matchInfo.value = null
  selectedReagentId.value = ''
  form.value = {
    quantity: 1,
    lotNumber: '',
    expiryDate: '',
    productionDate: '',
    note: ''
  }
}

// 加入待提交列表
function addToPending() {
  if (!matchedReagent.value) {
    toast.warning('请先扫描或选择试剂')
    return
  }

  const qty = Number(form.value.quantity)
  if (!qty || qty <= 0) {
    toast.warning('请输入有效数量')
    return
  }

  // 出库库存核验
  if (activeTab.value === 'out') {
    const available = getAvailableStock(matchedReagent.value.id)
    if (qty > available) {
      toast.error(`出库数量(${qty})超过可用库存(${available})，无法添加`)
      return
    }
  }

  pendingList.value.push({
    uid: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    reagentId: matchedReagent.value.id,
    reagentName: matchedReagent.value.name,
    reagentCode: matchedReagent.value.code,
    specification: matchedReagent.value.specification,
    unit: matchedReagent.value.unit || '盒',
    type: activeTab.value,
    quantity: qty,
    lotNumber: form.value.lotNumber || '',
    expiryDate: form.value.expiryDate || '',
    productionDate: form.value.productionDate || '',
    note: form.value.note || ''
  })

  toast.success(`已添加【${matchedReagent.value.name}】到待提交清单`)
  clearMatch()
}

function removePending(idx) {
  pendingList.value.splice(idx, 1)
}

// 批量提交
async function batchSubmit() {
  if (pendingList.value.length === 0) {
    toast.warning('待提交清单为空')
    return
  }

  submitting.value = true
  try {
    for (const item of pendingList.value) {
      // 1. 写入出入库记录 (stock_records)
      await dbAdd('stock_records', {
        reagentId: item.reagentId,
        type: item.type,
        quantity: item.quantity,
        lotNumber: item.lotNumber,
        expiryDate: item.expiryDate || null,
        note: item.note,
        operator: '操作员',
        reagentCode: item.reagentCode,
        reagentName: item.reagentName
      })

      // 2. 更新试剂库存 (reagents)
      const reagent = reagentList.value.find(r => r.id === item.reagentId)
      if (reagent) {
        if (item.type === 'in') {
          reagent.stockQuantity = (reagent.stockQuantity || 0) + item.quantity
          if (item.lotNumber) reagent.lotNumber = item.lotNumber
          if (item.expiryDate) reagent.expiryDate = item.expiryDate
          if (item.productionDate) reagent.productionDate = item.productionDate
        } else {
          reagent.stockQuantity = Math.max(0, (reagent.stockQuantity || 0) - item.quantity)
        }
        await dbPut('reagents', reagent)
      }
    }

    toast.success(`成功提交 ${pendingList.value.length} 条记录，库存已同步更新！`)
    pendingList.value = []
    await loadReagents()
  } catch (err) {
    toast.error('提交失败: ' + (err.message || ''))
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await loadReagents()

  // 如果路由带有 query 参数，预设出入库类型和选中试剂
  if (route.query.type === 'in' || route.query.type === 'out') {
    activeTab.value = route.query.type
  }
  if (route.query.reagentId) {
    const target = reagentList.value.find(r => r.id === Number(route.query.reagentId))
    if (target) {
      matchedReagent.value = target
    }
  }
})
</script>

<style scoped>
.stock-page {
  padding: 12px 16px;
}

/* In / Out Switch Buttons */
.tab-switch-box {
  display: flex;
  background: #e2e8f0;
  border-radius: var(--radius-md);
  padding: 4px;
  gap: 4px;
  margin-bottom: 12px;
}

.switch-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: var(--radius-sm);
  border: none;
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.switch-btn.active.btn-in {
  background: var(--success);
  color: #fff;
  box-shadow: var(--shadow-sm);
}

.switch-btn.active.btn-out {
  background: #ea580c;
  color: #fff;
  box-shadow: var(--shadow-sm);
}

/* Scan Hero Card */
.scan-hero-card {
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  color: #fff;
  box-shadow: var(--shadow-md);
}

.hero-in {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
}

.hero-out {
  background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
}

.hero-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}

.hero-desc {
  font-size: 12px;
  opacity: 0.9;
  max-width: 240px;
  line-height: 1.4;
}

.hero-scan-btn {
  background: #fff;
  color: #0f172a;
  border: none;
  border-radius: var(--radius-md);
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  transition: transform 0.1s;
}

.hero-scan-btn:active {
  transform: scale(0.96);
}

/* Form Card */
.form-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}

.form-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.match-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
}

.matched-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.3;
}

.clear-match-btn {
  background: #f1f5f9;
  border: 1px solid var(--border);
  color: #64748b;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.matched-meta {
  background: #f8fafc;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: var(--text-muted);
  margin-bottom: 14px;
}

.available-stock-hint {
  color: #ea580c;
}

.reagent-select-box {
  margin-bottom: 12px;
}

.form-inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-row-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.form-input, .form-select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  outline: none;
  background: #fff;
}

.form-input:focus, .form-select:focus {
  border-color: var(--primary);
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qty-btn {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: #f8fafc;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
}

.qty-input {
  width: 80px;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.qty-unit {
  font-size: 13px;
  color: var(--text-muted);
}

.add-pending-btn {
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border: none;
  border-radius: var(--radius-md);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}

.add-pending-btn.btn-in {
  background: var(--success);
}

.add-pending-btn.btn-out {
  background: #ea580c;
}

.add-pending-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

/* Empty Prompt */
.empty-prompt-card {
  text-align: center;
  padding: 30px 16px;
  background: #f8fafc;
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.prompt-icon {
  font-size: 32px;
  margin-bottom: 6px;
}

.prompt-text {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.manual-pick-link {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
}

/* Pending Items List */
.pending-section {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px;
  box-shadow: var(--shadow-sm);
}

.pending-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.pending-title {
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pending-count {
  font-size: 12px;
  color: var(--text-muted);
}

.clear-all-pending {
  background: none;
  border: none;
  color: var(--danger);
  font-size: 12px;
  cursor: pointer;
}

.pending-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.pending-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f8fafc;
  border-radius: var(--radius-sm);
  border: 1px solid #f1f5f9;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.item-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.badge-in {
  background: #ecfdf5;
  color: #059669;
}

.badge-out {
  background: #fff7ed;
  color: #ea580c;
}

.item-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.item-sub {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  gap: 8px;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-qty {
  font-size: 14px;
  color: var(--text-main);
}

.del-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
}

.del-btn:hover {
  color: var(--danger);
}

/* Batch Submit bar */
.batch-submit-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.submit-summary {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  color: var(--text-muted);
}

.submit-all-btn {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.submit-all-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.font-mono {
  font-family: monospace;
}
</style>
