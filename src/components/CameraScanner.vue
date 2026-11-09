<template>
  <div class="camera-scanner-modal">
    <div class="scanner-header">
      <div class="scanner-title">
        <span class="pulse-dot"></span>
        <span>摄像头实时扫码</span>
      </div>
      <button class="close-btn" @click="handleClose" title="关闭扫码器">✕</button>
    </div>

    <!-- Scanner viewport container -->
    <div class="scanner-body">
      <div id="qr-reader" class="qr-reader-container" v-show="activeMode === 'camera'"></div>

      <!-- Scanning overlay & laser line animation -->
      <div class="scanner-overlay" v-if="activeMode === 'camera' && isScanning">
        <div class="scan-target-box">
          <div class="scan-line"></div>
          <span class="corner top-left"></span>
          <span class="corner top-right"></span>
          <span class="corner bottom-left"></span>
          <span class="corner bottom-right"></span>
        </div>
        <p class="scan-tip">将试剂条码 / GS1 二维码对准框内</p>
      </div>

      <!-- Error / Permission notification -->
      <div v-if="cameraError && activeMode === 'camera'" class="camera-error-box">
        <div class="error-icon">⚠️</div>
        <div class="error-msg">{{ cameraError }}</div>
        <div class="error-sub">提示：浏览器调用摄像头需要 <b>HTTPS</b> 或 <b>localhost</b> 安全上下文环境，并请点击允许相机权限。</div>
        <button class="retry-btn" @click="startScanner">重试开启摄像头</button>
      </div>

      <!-- Fallback: Manual Barcode Input & Test Barcodes -->
      <div v-if="activeMode === 'manual'" class="manual-input-box">
        <label class="manual-label">输入或粘贴条码 / GS1 码：</label>
        <textarea
          v-model="manualBarcode"
          class="manual-textarea"
          rows="3"
          placeholder="例如：(01)06970150901226(11)251206(17)270606(10)LOT202601"
          @keyup.enter="submitManual"
        ></textarea>
        <button class="submit-manual-btn" :disabled="!manualBarcode.trim()" @click="submitManual">
          确认识别该条码
        </button>

        <!-- Quick Demo Barcodes for Testing -->
        <div class="quick-samples">
          <div class="samples-title">快速测试样例（点击填入）：</div>
          <div class="sample-chips">
            <button
              v-for="(sample, idx) in sampleBarcodes"
              :key="idx"
              class="sample-chip"
              @click="useSample(sample.code)"
            >
              {{ sample.name }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Scanner Footer Toolbar -->
    <div class="scanner-footer">
      <div class="mode-tabs">
        <button
          :class="['mode-tab', { active: activeMode === 'camera' }]"
          @click="switchMode('camera')"
        >
          📷 摄像头扫码
        </button>
        <button
          :class="['mode-tab', { active: activeMode === 'manual' }]"
          @click="switchMode('manual')"
        >
          ⌨️ 手动输入/测试
        </button>
      </div>

      <div v-if="activeMode === 'camera'" class="camera-controls">
        <button
          v-if="hasTorch"
          class="ctrl-btn"
          :class="{ active: torchOn }"
          @click="toggleTorch"
        >
          {{ torchOn ? '💡 关手电筒' : '🔦 开手电筒' }}
        </button>
        <button
          v-if="cameras.length > 1"
          class="ctrl-btn"
          @click="switchCamera"
        >
          🔄 翻转镜头
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const props = defineProps({
  sampleReagents: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['scan', 'close'])

const activeMode = ref('camera') // 'camera' | 'manual'
const manualBarcode = ref('')
const isScanning = ref(false)
const cameraError = ref('')
const cameras = ref([])
const currentCameraIndex = ref(0)
const hasTorch = ref(false)
const torchOn = ref(false)

let html5QrCode = null

// 常用样例条码生成（从已有的试剂数据库动态提取或预置）
const sampleBarcodes = ref([
  {
    name: '安图清洗液 (GS1)',
    code: '(01)06970150901226(11)260115(17)280115(10)AT20260115(21)SN889021'
  },
  {
    name: '幽门螺旋杆菌 (GS1)',
    code: '(01)06936155800513(10)HP20260301(11)260301(17)280228(21)SN001234'
  },
  {
    name: '肺炎衣原体 (GS1)',
    code: '(01)06974985320238(11)260210(17)270810(10)CP20260201'
  },
  {
    name: '简单条码 (无GS1)',
    code: '06970150901226'
  }
])

function playBeep() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(80)
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    // ignore audio autoplay restriction
  }
}

async function startScanner() {
  cameraError.value = ''
  isScanning.value = false

  try {
    await nextTick()
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('qr-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.ITF
        ],
        verbose: false
      })
    }

    try {
      cameras.value = await Html5Qrcode.getCameras()
    } catch {
      cameras.value = []
    }

    const config = {
      fps: 12,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
        const qrboxWidth = Math.floor(minEdge * 0.75)
        const qrboxHeight = Math.floor(qrboxWidth * 0.65)
        return { width: qrboxWidth, height: qrboxHeight }
      },
      aspectRatio: 1.333333
    }

    // 优先选择环境后置摄像头 (environment)
    let cameraSource = { facingMode: 'environment' }
    if (cameras.value.length > 0) {
      // 查找包含 back / rear / 后置 的摄像头
      const backCam = cameras.value.find(c => /back|rear|environment|后/i.test(c.label))
      if (backCam) {
        cameraSource = backCam.id
      } else {
        cameraSource = cameras.value[currentCameraIndex.value % cameras.value.length].id
      }
    }

    await html5QrCode.start(
      cameraSource,
      config,
      (decodedText) => {
        playBeep()
        emit('scan', decodedText)
      },
      () => {
        // on scan frame error (quietly ignore)
      }
    )

    isScanning.value = true

    // 检查手电筒功能
    try {
      const runningTrack = html5QrCode.getRunningTrackCapabilities?.()
      hasTorch.value = !!runningTrack?.torch
    } catch {
      hasTorch.value = false
    }
  } catch (err) {
    console.warn('Camera start error:', err)
    isScanning.value = false
    cameraError.value = err.message || '无法启动摄像头或未授权相机访问权限'
  }
}

async function stopScanner() {
  if (html5QrCode && isScanning.value) {
    try {
      await html5QrCode.stop()
    } catch (e) {
      console.warn('Error stopping scanner:', e)
    }
    isScanning.value = false
  }
}

async function switchMode(mode) {
  activeMode.value = mode
  if (mode === 'camera') {
    await startScanner()
  } else {
    await stopScanner()
  }
}

async function switchCamera() {
  if (cameras.value.length <= 1) return
  currentCameraIndex.value = (currentCameraIndex.value + 1) % cameras.value.length
  await stopScanner()
  await startScanner()
}

async function toggleTorch() {
  if (!html5QrCode || !hasTorch.value) return
  try {
    torchOn.value = !torchOn.value
    await html5QrCode.applyVideoConstraints({
      advanced: [{ torch: torchOn.value }]
    })
  } catch (err) {
    console.warn('Failed to toggle torch:', err)
  }
}

function submitManual() {
  if (!manualBarcode.value.trim()) return
  playBeep()
  emit('scan', manualBarcode.value.trim())
}

function useSample(code) {
  manualBarcode.value = code
  submitManual()
}

function handleClose() {
  stopScanner()
  emit('close')
}

onMounted(() => {
  startScanner()
})

onBeforeUnmount(() => {
  stopScanner()
})
</script>

<style scoped>
.camera-scanner-modal {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: #000;
  display: flex;
  flex-direction: column;
}

.scanner-header {
  padding: 14px 18px;
  background: rgba(15, 23, 42, 0.95);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.scanner-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.8; }
}

.close-btn {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanner-body {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.qr-reader-container {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
}

:deep(video) {
  object-fit: cover !important;
  width: 100% !important;
  height: 100% !important;
}

/* Scanner overlay box and laser line */
.scanner-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.scan-target-box {
  width: 260px;
  height: 170px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  position: relative;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  overflow: hidden;
}

.scan-line {
  position: absolute;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0) 0%, #38bdf8 50%, rgba(56, 189, 248, 0) 100%);
  box-shadow: 0 0 8px #38bdf8;
  animation: scanMove 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes scanMove {
  0% { top: 0%; }
  50% { top: 96%; }
  100% { top: 0%; }
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: #38bdf8;
  border-style: solid;
}

.top-left { top: -1px; left: -1px; border-width: 3px 0 0 3px; border-top-left-radius: 6px; }
.top-right { top: -1px; right: -1px; border-width: 3px 3px 0 0; border-top-right-radius: 6px; }
.bottom-left { bottom: -1px; left: -1px; border-width: 0 0 3px 3px; border-bottom-left-radius: 6px; }
.bottom-right { bottom: -1px; right: -1px; border-width: 0 3px 3px 0; border-bottom-right-radius: 6px; }

.scan-tip {
  margin-top: 18px;
  color: #fff;
  font-size: 13px;
  background: rgba(15, 23, 42, 0.7);
  padding: 6px 14px;
  border-radius: 20px;
}

/* Error prompt */
.camera-error-box {
  padding: 24px 20px;
  background: #1e293b;
  color: #fff;
  border-radius: 12px;
  text-align: center;
  max-width: 320px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
}

.error-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.error-msg {
  font-size: 15px;
  font-weight: 600;
  color: #f87171;
  margin-bottom: 8px;
}

.error-sub {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 16px;
}

.retry-btn {
  background: #2563eb;
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

/* Manual input fallback */
.manual-input-box {
  width: 90%;
  max-width: 440px;
  background: #1e293b;
  border-radius: 14px;
  padding: 20px;
  color: #fff;
}

.manual-label {
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
  display: block;
  margin-bottom: 8px;
}

.manual-textarea {
  width: 100%;
  background: #0f172a;
  border: 1px solid #334155;
  color: #38bdf8;
  border-radius: 8px;
  padding: 10px;
  font-size: 13px;
  font-family: monospace;
  resize: none;
  outline: none;
  box-sizing: border-box;
}

.manual-textarea:focus {
  border-color: #38bdf8;
}

.submit-manual-btn {
  width: 100%;
  margin-top: 12px;
  background: #2563eb;
  color: #fff;
  border: none;
  padding: 10px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.submit-manual-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-samples {
  margin-top: 16px;
  border-top: 1px solid #334155;
  padding-top: 12px;
}

.samples-title {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
}

.sample-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sample-chip {
  background: #334155;
  color: #e2e8f0;
  border: 1px solid #475569;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.sample-chip:hover {
  background: #475569;
  border-color: #38bdf8;
  color: #fff;
}

/* Footer Controls */
.scanner-footer {
  padding: 12px 16px calc(12px + var(--safe-bottom));
  background: rgba(15, 23, 42, 0.95);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mode-tabs {
  display: flex;
  background: #334155;
  border-radius: 8px;
  padding: 3px;
}

.mode-tab {
  flex: 1;
  background: none;
  border: none;
  color: #94a3b8;
  padding: 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
}

.mode-tab.active {
  background: #0284c7;
  color: #fff;
}

.camera-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.ctrl-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
}

.ctrl-btn.active {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #000;
}
</style>
