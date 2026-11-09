<template>
  <div class="reagents-page">
    <!-- Top Warning Metric Cards -->
    <div class="metrics-grid">
      <div
        class="metric-card"
        :class="{ active: filterWarning === 'all' }"
        @click="filterWarning = 'all'"
      >
        <div class="metric-val text-primary">{{ reagents.length }}</div>
        <div class="metric-label">全部试剂</div>
      </div>
      <div
        class="metric-card"
        :class="{ active: filterWarning === 'low_stock' }"
        @click="filterWarning = filterWarning === 'low_stock' ? 'all' : 'low_stock'"
      >
        <div class="metric-val text-danger">{{ lowStockCount }}</div>
        <div class="metric-label">低库存预警</div>
      </div>
      <div
        class="metric-card"
        :class="{ active: filterWarning === 'near_expiry' }"
        @click="filterWarning = filterWarning === 'near_expiry' ? 'all' : 'near_expiry'"
      >
        <div class="metric-val text-warning">{{ nearExpiryCount }}</div>
        <div class="metric-label">近效期(30天)</div>
      </div>
      <div
        class="metric-card"
        :class="{ active: filterWarning === 'expired' }"
        @click="filterWarning = filterWarning === 'expired' ? 'all' : 'expired'"
      >
        <div class="metric-val text-muted">{{ expiredCount }}</div>
        <div class="metric-label">已过期</div>
      </div>
    </div>

    <!-- Search Bar & Filters -->
    <div class="search-section">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索试剂名称 / GTIN编码 / 厂家 / 货位..."
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">✕</button>
      </div>

      <!-- Category Filter Pills -->
      <div class="category-scroll" v-if="categories.length > 1">
        <button
          class="cat-pill"
          :class="{ active: selectedCategory === '' }"
          @click="selectedCategory = ''"
        >
          全部分类
        </button>
        <button
          v-for="cat in categories"
          :key="cat"
          class="cat-pill"
          :class="{ active: selectedCategory === cat }"
          @click="selectedCategory = selectedCategory === cat ? '' : cat"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <!-- Loading / Empty / List state -->
    <div v-if="loading" class="state-box">
      <div class="spinner"></div>
      <p>正在同步 Supabase 试剂数据...</p>
    </div>

    <div v-else-if="filteredReagents.length === 0" class="state-box">
      <div class="empty-icon">📦</div>
      <p>没有找到符合条件的试剂</p>
      <button class="reset-filter-btn" @click="resetFilters">重置筛选条件</button>
    </div>

    <div v-else class="reagent-list">
      <div
        v-for="r in filteredReagents"
        :key="r.id"
        class="reagent-card"
      >
        <div class="card-header">
          <div class="reagent-title-box">
            <h3 class="reagent-name">{{ r.name }}</h3>
            <span v-if="r.category" class="badge badge-gray">{{ r.category }}</span>
          </div>
          <div class="card-badges">
            <!-- Stock Status Badge -->
            <span
              v-if="r.stockQuantity <= (r.minStock || 0)"
              class="badge badge-danger"
            >
              ⚠️ 缺货 ({{ r.stockQuantity }}/{{ r.minStock }})
            </span>
            <span v-else class="badge badge-success">
              库存: {{ r.stockQuantity }} {{ r.unit || '盒' }}
            </span>

            <!-- Expiry Status Badge -->
            <span
              v-if="r.expiryDate"
              :class="['badge', getExpiryStatus(r.expiryDate).badgeClass]"
            >
              {{ getExpiryStatus(r.expiryDate).text }}
            </span>
          </div>
        </div>

        <div class="card-details">
          <div class="detail-row">
            <span class="detail-label">GTIN/编码:</span>
            <span class="detail-value font-mono">{{ r.code || '-' }}</span>
          </div>
          <div class="detail-row" v-if="r.specification">
            <span class="detail-label">规格型号:</span>
            <span class="detail-value">{{ r.specification }}</span>
          </div>
          <div class="detail-row" v-if="r.manufacturer">
            <span class="detail-label">生产厂家:</span>
            <span class="detail-value">{{ r.manufacturer }}</span>
          </div>
          <div class="detail-row" v-if="r.location || r.storageCondition">
            <span class="detail-label">存放位置:</span>
            <span class="detail-value">
              {{ r.location || '未设货位' }}
              <template v-if="r.storageCondition"> ({{ r.storageCondition }})</template>
            </span>
          </div>
        </div>

        <!-- Card Actions -->
        <div class="card-actions">
          <button class="action-btn btn-stock-in" @click="quickStock(r, 'in')">
            + 快捷入库
          </button>
          <button
            class="action-btn btn-stock-out"
            :disabled="r.stockQuantity <= 0"
            @click="quickStock(r, 'out')"
          >
            - 快捷出库
          </button>
          <button class="action-btn btn-detail" @click="showDetail(r)">
            详情
          </button>
          <router-link :to="`/reagent/edit/${r.id}`" class="action-btn btn-edit">
            编辑
          </router-link>
        </div>
      </div>
    </div>

    <!-- Reagent Detail Modal -->
    <div v-if="selectedReagent" class="modal-overlay" @click.self="selectedReagent = null">
      <div class="modal-sheet">
        <div class="sheet-header">
          <h2 class="sheet-title">{{ selectedReagent.name }}</h2>
          <button class="sheet-close" @click="selectedReagent = null">✕</button>
        </div>

        <div class="sheet-body">
          <div class="info-group">
            <div class="info-item">
              <span class="info-k">GTIN 码：</span>
              <span class="info-v font-mono">{{ selectedReagent.code || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">分类：</span>
              <span class="info-v">{{ selectedReagent.category || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">规格：</span>
              <span class="info-v">{{ selectedReagent.specification || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">单位：</span>
              <span class="info-v">{{ selectedReagent.unit || '盒' }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">当前库存：</span>
              <span class="info-v font-bold">{{ selectedReagent.stockQuantity }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">安全库存：</span>
              <span class="info-v">{{ selectedReagent.minStock }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">生产厂家：</span>
              <span class="info-v">{{ selectedReagent.manufacturer || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">存储条件：</span>
              <span class="info-v">{{ selectedReagent.storageCondition || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">货位：</span>
              <span class="info-v">{{ selectedReagent.location || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">有效期：</span>
              <span class="info-v">{{ formatDate(selectedReagent.expiryDate) }}</span>
            </div>
            <div class="info-item">
              <span class="info-k">注册证号：</span>
              <span class="info-v">{{ selectedReagent.registrationNumber || '-' }}</span>
            </div>
            <div class="info-item" v-if="selectedReagent.notes">
              <span class="info-k">备注：</span>
              <span class="info-v">{{ selectedReagent.notes }}</span>
            </div>
          </div>

          <!-- Barcode Cutting Rules Visualization -->
          <div class="rule-box" v-if="selectedReagent.scanSegments && selectedReagent.scanSegments.length > 0">
            <h4 class="rule-title">GS1 条码切割规则</h4>
            <div class="rule-segments">
              <span
                v-for="(seg, idx) in selectedReagent.scanSegments"
                :key="idx"
                :class="['seg-badge', `seg-${seg.ai}`]"
              >
                <b>[{{ seg.ai }}] {{ seg.desc }}</b>
                <small>起始:{{ seg.start }} 长度:{{ seg.len }}</small>
              </span>
            </div>
          </div>
        </div>

        <div class="sheet-footer">
          <router-link :to="`/reagent/edit/${selectedReagent.id}`" class="sheet-action-btn">
            编辑试剂资料
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { dbGetAll } from '../utils/db.js'
import { getExpiryStatus, formatDate } from '../utils/date.js'
import { toast } from '../utils/toast.js'

const router = useRouter()

const reagents = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('')
const filterWarning = ref('all') // 'all' | 'low_stock' | 'near_expiry' | 'expired'
const selectedReagent = ref(null)

async function loadData() {
  loading.value = true
  try {
    reagents.value = await dbGetAll('reagents')
  } catch (err) {
    toast.error('加载试剂数据失败: ' + (err.message || ''))
  } finally {
    loading.value = false
  }
}

// Categories list
const categories = computed(() => {
  const set = new Set()
  reagents.value.forEach(r => {
    if (r.category && r.category.trim()) {
      set.add(r.category.trim())
    }
  })
  return Array.from(set)
})

// Metric calculations
const lowStockCount = computed(() => {
  return reagents.value.filter(r => r.stockQuantity <= (r.minStock || 0)).length
})

const nearExpiryCount = computed(() => {
  return reagents.value.filter(r => {
    const st = getExpiryStatus(r.expiryDate)
    return st.status === 'near'
  }).length
})

const expiredCount = computed(() => {
  return reagents.value.filter(r => {
    const st = getExpiryStatus(r.expiryDate)
    return st.status === 'expired'
  }).length
})

// Filtered Reagents
const filteredReagents = computed(() => {
  let list = reagents.value

  // Category filter
  if (selectedCategory.value) {
    list = list.filter(r => r.category === selectedCategory.value)
  }

  // Warning filter
  if (filterWarning.value === 'low_stock') {
    list = list.filter(r => r.stockQuantity <= (r.minStock || 0))
  } else if (filterWarning.value === 'near_expiry') {
    list = list.filter(r => getExpiryStatus(r.expiryDate).status === 'near')
  } else if (filterWarning.value === 'expired') {
    list = list.filter(r => getExpiryStatus(r.expiryDate).status === 'expired')
  }

  // Search keyword filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(r =>
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.code && r.code.toLowerCase().includes(q)) ||
      (r.manufacturer && r.manufacturer.toLowerCase().includes(q)) ||
      (r.location && r.location.toLowerCase().includes(q)) ||
      (r.specification && r.specification.toLowerCase().includes(q))
    )
  }

  return list
})

function resetFilters() {
  searchQuery.value = ''
  selectedCategory.value = ''
  filterWarning.value = 'all'
}

function showDetail(r) {
  selectedReagent.value = r
}

function quickStock(r, type) {
  // Navigate to stock page with pre-selected reagent query param
  router.push({
    path: '/stock',
    query: {
      type,
      reagentId: r.id
    }
  })
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.reagents-page {
  padding: 12px 16px;
}

/* Metric warning cards */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.metric-card {
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 4px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.metric-card.active {
  background: var(--primary-light);
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.metric-val {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.metric-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.text-primary { color: var(--primary); }
.text-danger { color: var(--danger); }
.text-warning { color: var(--warning); }
.text-muted { color: var(--text-muted); }

/* Search and category filters */
.search-section {
  margin-bottom: 12px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 14px;
  color: var(--text-muted);
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 34px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 14px;
  background: #fff;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-light);
}

.clear-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
}

.category-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 8px 0 4px;
  scrollbar-width: none;
}
.category-scroll::-webkit-scrollbar {
  display: none;
}

.cat-pill {
  white-space: nowrap;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
}

.cat-pill.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

/* Reagent Card */
.reagent-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reagent-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.reagent-title-box {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.reagent-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.3;
}

.card-badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.card-details {
  background: #f8fafc;
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.detail-row {
  display: flex;
  gap: 6px;
}

.detail-label {
  color: var(--text-muted);
  flex-shrink: 0;
}

.detail-value {
  color: var(--text-main);
  word-break: break-all;
}

.font-mono {
  font-family: monospace;
}

.card-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  flex: 1;
  padding: 7px 4px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.btn-stock-in {
  background: var(--success-light);
  color: var(--success);
  border-color: #a7f3d0;
}

.btn-stock-out {
  background: #fff7ed;
  color: #ea580c;
  border-color: #fed7aa;
}

.btn-stock-out:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-detail {
  background: #f1f5f9;
  color: #475569;
  border-color: #e2e8f0;
}

.btn-edit {
  background: var(--primary-light);
  color: var(--primary);
  border-color: #bfdbfe;
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

.reset-filter-btn {
  margin-top: 12px;
  padding: 6px 14px;
  border-radius: 20px;
  background: var(--primary);
  color: #fff;
  border: none;
  font-size: 12px;
  cursor: pointer;
}

/* Modal detail styling */
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
  margin-bottom: 14px;
}

.sheet-title {
  font-size: 16px;
  font-weight: 700;
}

.sheet-close {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-muted);
  cursor: pointer;
}

.info-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed var(--border);
  padding-bottom: 6px;
}

.info-k {
  color: var(--text-muted);
}

.info-v {
  color: var(--text-main);
  text-align: right;
  max-width: 65%;
  word-break: break-all;
}

.rule-box {
  margin-top: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.rule-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-main);
}

.rule-segments {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.sheet-footer {
  margin-top: 20px;
}

.sheet-action-btn {
  display: block;
  width: 100%;
  text-align: center;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--primary);
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
}
</style>
