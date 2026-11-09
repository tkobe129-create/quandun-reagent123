<template>
  <div class="reagent-form-page">
    <div class="page-top-nav">
      <router-link to="/reagents" class="back-link">← 返回试剂列表</router-link>
      <h2 class="form-title">{{ isEdit ? '编辑试剂资料' : '试剂预录（新增试剂）' }}</h2>
    </div>

    <!-- Scan Barcode Hero Box -->
    <div class="barcode-helper-card">
      <div class="helper-top">
        <div class="helper-title">
          <span>条码自动解析与切割规则生成</span>
        </div>
        <button class="helper-scan-btn" @click="showScanner = true">
          📷 扫码提取规则
        </button>
      </div>

      <div class="barcode-input-row">
        <input
          v-model="barcodeRaw"
          type="text"
          placeholder="扫描或粘贴 GS1 条码，如 (01)06970150901226(11)251206(17)270606..."
          class="raw-input"
          @input="onBarcodeRawInput"
        />
        <button
          class="parse-btn"
          :disabled="!barcodeRaw.trim()"
          @click="autoParseBarcode"
        >
          解析规则
        </button>
      </div>

      <!-- Segment Visualization -->
      <div v-if="parsedSegments.length > 0" class="segments-preview">
        <div class="seg-preview-title">解析分段预览：</div>
        <div class="seg-chips">
          <div
            v-for="(seg, idx) in parsedSegments"
            :key="idx"
            :class="['seg-badge', `seg-${seg.ai || 'other'}`]"
          >
            <span class="seg-ai">[{{ seg.ai || '条码' }}] {{ seg.desc }}</span>
            <span class="seg-val font-mono">{{ seg.value }}</span>
            <span class="seg-range">位置: {{ seg.start }}-{{ seg.end }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Reagent Form -->
    <form class="reagent-form" @submit.prevent="saveReagent">
      <div class="form-section-title">基本信息</div>

      <div class="form-group">
        <label class="label">试剂名称 <span class="text-danger">*</span></label>
        <input
          v-model="form.name"
          type="text"
          required
          placeholder="例如：浓缩清洗液（安图机用）"
          class="input"
        />
      </div>

      <div class="form-group">
        <label class="label">GTIN 码 / 编码 <span class="text-danger">*</span></label>
        <input
          v-model="form.code"
          type="text"
          required
          placeholder="例如：06970150901226"
          class="input font-mono"
        />
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="label">试剂分类</label>
          <input
            v-model="form.category"
            type="text"
            list="category-suggestions"
            placeholder="如：免疫、生化、分子"
            class="input"
          />
          <datalist id="category-suggestions">
            <option value="免疫" />
            <option value="生化" />
            <option value="分子诊断" />
            <option value="血液" />
            <option value="体液" />
            <option value="微生物" />
            <option value="质控品" />
            <option value="耗材" />
          </datalist>
        </div>

        <div class="form-group">
          <label class="label">规格型号</label>
          <input
            v-model="form.specification"
            type="text"
            placeholder="如：500ml*4 或 100人份"
            class="input"
          />
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="label">生产厂家</label>
          <input
            v-model="form.manufacturer"
            type="text"
            placeholder="如：安图生物"
            class="input"
          />
        </div>

        <div class="form-group">
          <label class="label">包装单位</label>
          <input
            v-model="form.unit"
            type="text"
            placeholder="如：盒、瓶、支"
            class="input"
          />
        </div>
      </div>

      <div class="form-section-title">库存与货位</div>

      <div class="form-grid-2">
        <div class="form-group" v-if="!isEdit">
          <label class="label">初始库存数量</label>
          <input
            v-model.number="form.stockQuantity"
            type="number"
            min="0"
            class="input"
          />
        </div>

        <div class="form-group">
          <label class="label">最低安全库存</label>
          <input
            v-model.number="form.minStock"
            type="number"
            min="0"
            class="input"
          />
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="label">存储条件</label>
          <select v-model="form.storageCondition" class="input">
            <option value="">未指定</option>
            <option value="室温">室温</option>
            <option value="2-8℃冷藏">2-8℃冷藏</option>
            <option value="-20℃冷冻">-20℃冷冻</option>
            <option value="避光干燥">避光干燥</option>
          </select>
        </div>

        <div class="form-group">
          <label class="label">存放货位</label>
          <input
            v-model="form.location"
            type="text"
            placeholder="如：冰箱B区-02层"
            class="input"
          />
        </div>
      </div>

      <div class="form-section-title">扫码匹配与GS1切割规则</div>

      <div class="form-group">
        <label class="label">扫码匹配规则 (scanRule)</label>
        <input
          v-model="form.scanRule"
          type="text"
          placeholder="通常为试剂 GTIN 码，用于优先匹配"
          class="input font-mono"
        />
      </div>

      <div class="form-group">
        <label class="label">切割规则 JSON (scanSegments)</label>
        <textarea
          v-model="scanSegmentsText"
          rows="4"
          class="input font-mono text-xs"
          placeholder="[{ ai: '01', desc: 'GTIN', start: 0, len: 16 }, ...]"
        ></textarea>
      </div>

      <div class="form-section-title">其他备注</div>

      <div class="form-group">
        <label class="label">医疗器械注册证号</label>
        <input
          v-model="form.registrationNumber"
          type="text"
          placeholder="如：国械注准2022xxxx"
          class="input"
        />
      </div>

      <div class="form-group">
        <label class="label">补充备注</label>
        <textarea
          v-model="form.notes"
          rows="2"
          placeholder="其他注意事项或说明..."
          class="input"
        ></textarea>
      </div>

      <!-- Action Buttons -->
      <div class="form-actions">
        <button
          type="submit"
          class="submit-btn"
          :disabled="saving"
        >
          {{ saving ? '正在保存...' : (isEdit ? '保存试剂修改' : '确认新增试剂') }}
        </button>
      </div>
    </form>

    <!-- Camera Scanner Modal -->
    <CameraScanner
      v-if="showScanner"
      @scan="handleScan"
      @close="showScanner = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { dbGet, dbAdd, dbPut } from '../utils/db.js'
import { parseBarcode } from '../utils/scanner.js'
import { toast } from '../utils/toast.js'
import CameraScanner from '../components/CameraScanner.vue'

const route = useRoute()
const router = useRouter()

const isEdit = ref(false)
const editId = ref(null)
const saving = ref(false)
const showScanner = ref(false)

const barcodeRaw = ref('')
const parsedSegments = ref([])
const scanSegmentsText = ref('')

const form = ref({
  name: '',
  code: '',
  category: '',
  specification: '',
  manufacturer: '',
  unit: '盒',
  stockQuantity: 0,
  minStock: 2,
  storageCondition: '室温',
  location: '',
  expiryDate: '',
  registrationNumber: '',
  notes: '',
  scanRule: '',
  scanSegments: []
})

// 自动解析条码生成切割规则
function autoParseBarcode() {
  if (!barcodeRaw.value.trim()) return
  const raw = barcodeRaw.value.trim()
  const segments = parseBarcode(raw)
  parsedSegments.value = segments

  // 自动填充 scanRule（GTIN）
  const gtinSeg = segments.find(s => s.ai === '01')
  if (gtinSeg) {
    form.value.scanRule = gtinSeg.value
    if (!form.value.code) {
      form.value.code = gtinSeg.value
    }
  }

  // 自动生成切割规则
  const rules = segments.map(s => {
    return {
      ai: s.ai,
      desc: s.desc,
      start: s.start,
      len: s.end - s.start
    }
  })
  form.value.scanSegments = rules
  scanSegmentsText.value = JSON.stringify(rules, null, 2)
  toast.success('条码解析成功，已自动生成切割规则')
}

function onBarcodeRawInput() {
  if (barcodeRaw.value.includes('(') && barcodeRaw.value.includes(')')) {
    autoParseBarcode()
  }
}

function handleScan(code) {
  showScanner.value = false
  barcodeRaw.value = code
  autoParseBarcode()
}

async function loadEditData(id) {
  try {
    const data = await dbGet('reagents', id)
    if (data) {
      form.value = { ...data }
      if (data.code) form.value.code = data.code
      if (data.scanSegments) {
        scanSegmentsText.value = JSON.stringify(data.scanSegments, null, 2)
      }
    }
  } catch (err) {
    toast.error('读取试剂详情失败: ' + (err.message || ''))
  }
}

async function saveReagent() {
  if (!form.value.code.trim()) {
    toast.warning('请输入 GTIN 码 / 编码')
    return
  }
  if (!form.value.name.trim()) {
    toast.warning('请输入试剂名称')
    return
  }

  // 解析切割规则 JSON
  if (scanSegmentsText.value.trim()) {
    try {
      form.value.scanSegments = JSON.parse(scanSegmentsText.value)
    } catch {
      toast.error('切割规则 JSON 格式错误，请检查语法')
      return
    }
  }

  saving.value = true
  try {
    if (isEdit.value) {
      form.value.id = editId.value
      await dbPut('reagents', form.value)
      toast.success('试剂资料更新成功！')
    } else {
      await dbAdd('reagents', form.value)
      toast.success('试剂新增成功！')
    }

    setTimeout(() => {
      router.push('/reagents')
    }, 1000)
  } catch (err) {
    toast.error('保存失败: ' + (err.message || ''))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (route.params.id) {
    isEdit.value = true
    editId.value = Number(route.params.id)
    loadEditData(editId.value)
  }
})
</script>

<style scoped>
.reagent-form-page {
  padding: 12px 16px 40px;
}

.page-top-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}

.back-link {
  color: var(--primary);
  font-size: 13px;
  text-decoration: none;
  font-weight: 500;
}

.form-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
}

/* Barcode Helper Card */
.barcode-helper-card {
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px;
  margin-bottom: 16px;
}

.helper-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.helper-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}

.helper-scan-btn {
  background: var(--primary);
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.barcode-input-row {
  display: flex;
  gap: 8px;
}

.raw-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-family: monospace;
  outline: none;
  background: #fff;
}

.parse-btn {
  background: #e2e8f0;
  color: #1e293b;
  border: none;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.parse-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.segments-preview {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.seg-preview-title {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.seg-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.seg-ai {
  font-weight: 700;
}

.seg-val {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.7);
  padding: 1px 4px;
  border-radius: 4px;
  margin: 2px 0;
}

.seg-range {
  font-size: 10px;
  opacity: 0.8;
}

/* Form Styles */
.reagent-form {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  border-left: 3px solid var(--primary);
  padding-left: 6px;
  margin-top: 8px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  outline: none;
  background: #fff;
  box-sizing: border-box;
}

.input:focus {
  border-color: var(--primary);
}

.text-xs {
  font-size: 11px;
}

.form-actions {
  margin-top: 14px;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.font-mono {
  font-family: monospace;
}
</style>
