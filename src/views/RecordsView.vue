<template>
  <div class="records-page">
    <!-- Header Summary Stats -->
    <div class="stats-row">
      <div class="stat-box">
        <span class="stat-num text-success">+{{ inQtySum }}</span>
        <span class="stat-lbl">累计入库件数 ({{ inCount }}次)</span>
      </div>
      <div class="stat-box">
        <span class="stat-num text-danger">-{{ outQtySum }}</span>
        <span class="stat-lbl">累计出库件数 ({{ outCount }}次)</span>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="filter-bar">
      <div class="type-pills">
        <button
          :class="['type-pill', { active: filterType === 'all' }]"
          @click="filterType = 'all'"
        >
          全部记录
        </button>
        <button
          :class="['type-pill', 'pill-in', { active: filterType === 'in' }]"
          @click="filterType = 'in'"
        >
          📥 入库流水
        </button>
        <button
          :class="['type-pill', 'pill-out', { active: filterType === 'out' }]"
          @click="filterType = 'out'"
        >
          📤 出库流水
        </button>
      </div>

      <div class="search-wrap">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索试剂名称 / 批号 / 编码 / 操作人..."
          class="record-search"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">✕</button>
      </div>
    </div>

    <!-- Loading / Empty / List state -->
    <div v-if="loading" class="state-box">
      <div class="spinner"></div>
      <p>正在读取出入库流水记录...</p>
    </div>

    <div v-else-if="filteredRecords.length === 0" class="state-box">
      <div class="empty-icon">📋</div>
      <p>暂无符合条件的出入库记录</p>
    </div>

    <div v-else class="record-list">
      <div
        v-for="rec in filteredRecords"
        :key="rec.id"
        class="record-card"
      >
        <div class="rec-top">
          <div class="rec-title-wrap">
            <span :class="['rec-badge', rec.type === 'in' ? 'badge-in' : 'badge-out']">
              {{ rec.type === 'in' ? '入库' : '出库' }}
            </span>
            <span class="rec-name">{{ rec.reagentName || '试剂#' + rec.reagentId }}</span>
          </div>
          <div class="rec-qty font-bold" :class="rec.type === 'in' ? 'text-success' : 'text-danger'">
            {{ rec.type === 'in' ? '+' : '-' }}{{ rec.quantity }}
          </div>
        </div>

        <div class="rec-meta">
          <div class="meta-item" v-if="rec.reagentCode">
            <span class="k">试剂编码:</span>
            <span class="v font-mono">{{ rec.reagentCode }}</span>
          </div>
          <div class="meta-item" v-if="rec.lotNumber">
            <span class="k">试剂批号:</span>
            <span class="v font-mono">{{ rec.lotNumber }}</span>
          </div>
          <div class="meta-item" v-if="rec.expiryDate">
            <span class="k">有效期至:</span>
            <span class="v">{{ formatDate(rec.expiryDate) }}</span>
          </div>
          <div class="meta-item" v-if="rec.note">
            <span class="k">备注说明:</span>
            <span class="v">{{ rec.note }}</span>
          </div>
        </div>

        <div class="rec-bottom">
          <span class="rec-operator">操作人: {{ rec.operator || '操作员' }}</span>
          <span class="rec-time">{{ formatDateTime(rec.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { dbGetAll } from '../utils/db.js'
import { formatDate, formatDateTime } from '../utils/date.js'
import { toast } from '../utils/toast.js'

const records = ref([])
const loading = ref(true)
const filterType = ref('all') // 'all' | 'in' | 'out'
const searchQuery = ref('')

async function loadRecords() {
  loading.value = true
  try {
    records.value = await dbGetAll('stock_records')
  } catch (err) {
    toast.error('加载记录失败: ' + (err.message || ''))
  } finally {
    loading.value = false
  }
}

const inCount = computed(() => records.value.filter(r => r.type === 'in').length)
const outCount = computed(() => records.value.filter(r => r.type === 'out').length)

const inQtySum = computed(() =>
  records.value.filter(r => r.type === 'in').reduce((sum, r) => sum + (r.quantity || 0), 0)
)
const outQtySum = computed(() =>
  records.value.filter(r => r.type === 'out').reduce((sum, r) => sum + (r.quantity || 0), 0)
)

const filteredRecords = computed(() => {
  let list = records.value

  if (filterType.value === 'in') {
    list = list.filter(r => r.type === 'in')
  } else if (filterType.value === 'out') {
    list = list.filter(r => r.type === 'out')
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(r =>
      (r.reagentName && r.reagentName.toLowerCase().includes(q)) ||
      (r.reagentCode && r.reagentCode.toLowerCase().includes(q)) ||
      (r.lotNumber && r.lotNumber.toLowerCase().includes(q)) ||
      (r.operator && r.operator.toLowerCase().includes(q)) ||
      (r.note && r.note.toLowerCase().includes(q))
    )
  }

  return list
})

onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.records-page {
  padding: 12px 16px;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.stat-box {
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  text-align: center;
}

.stat-num {
  font-size: 20px;
  font-weight: 800;
  display: block;
}

.stat-lbl {
  font-size: 11px;
  color: var(--text-muted);
}

.text-success { color: var(--success); }
.text-danger { color: var(--danger); }

/* Filter bar */
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.type-pills {
  display: flex;
  background: #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 3px;
  gap: 4px;
}

.type-pill {
  flex: 1;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 600;
  padding: 7px;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.type-pill.active {
  background: #fff;
  color: var(--text-main);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.type-pill.active.pill-in {
  color: var(--success);
}

.type-pill.active.pill-out {
  color: var(--danger);
}

.search-wrap {
  position: relative;
}

.record-search {
  width: 100%;
  padding: 8px 30px 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  outline: none;
  background: #fff;
  box-sizing: border-box;
}

.clear-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}

/* Record Card List */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  box-shadow: var(--shadow-sm);
}

.rec-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.rec-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.rec-badge {
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
  background: #fef2f2;
  color: #dc2626;
}

.rec-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.rec-qty {
  font-size: 16px;
}

.rec-meta {
  background: #f8fafc;
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  gap: 6px;
}

.meta-item .k {
  color: var(--text-muted);
}

.meta-item .v {
  color: var(--text-main);
}

.rec-bottom {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
  border-top: 1px dashed var(--border);
  padding-top: 6px;
}

/* State Box */
.state-box {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
  font-size: 14px;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e8f0;
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.font-mono {
  font-family: monospace;
}

.font-bold {
  font-weight: 700;
}
</style>
