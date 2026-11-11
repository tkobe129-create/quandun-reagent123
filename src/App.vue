<template>
  <div class="app-wrapper">
    <!-- Top Header -->
    <header class="app-header">
      <div class="header-left">
        <div class="header-logo">
          <svg class="logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0"/>
            <path d="M5.52 16h12.96"/>
          </svg>
        </div>
        <div class="header-titles">
          <h1 class="header-title">权盾智检</h1>
          <span class="header-sub">检验科试剂管理系统</span>
        </div>
      </div>

      <div class="header-right">
        <span class="status-indicator" title="Firebase 云端服务正常运行">
          <span class="status-dot"></span>
          <span class="status-text">Firebase 在线</span>
        </span>
      </div>
    </header>

    <!-- Main Viewport Content -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Bottom Mobile Tab Bar -->
    <nav class="tab-bar">
      <router-link to="/reagents" class="tab-item" :class="{ active: currentTab === 'reagents' }">
        <span class="tab-icon">🧪</span>
        <span class="tab-label">试剂库存</span>
      </router-link>

      <router-link to="/stock" class="tab-item" :class="{ active: currentTab === 'stock' }">
        <span class="tab-icon">📷</span>
        <span class="tab-label">扫码出入库</span>
      </router-link>

      <router-link to="/reagent-form" class="tab-item" :class="{ active: currentTab === 'reagent-form' }">
        <span class="tab-icon">➕</span>
        <span class="tab-label">试剂预录</span>
      </router-link>

      <router-link to="/records" class="tab-item" :class="{ active: currentTab === 'records' }">
        <span class="tab-icon">📋</span>
        <span class="tab-label">流水记录</span>
      </router-link>
    </nav>

    <!-- Global Toast Alert Container -->
    <ToastContainer />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ToastContainer from './components/ToastContainer.vue'

const route = useRoute()

const currentTab = computed(() => {
  if (route.path.startsWith('/reagent-form') || route.path.startsWith('/reagent/edit')) {
    return 'reagent-form'
  }
  if (route.path.startsWith('/stock')) return 'stock'
  if (route.path.startsWith('/records')) return 'records'
  return 'reagents'
})
</script>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.logo-svg {
  width: 20px;
  height: 20px;
}

.header-titles {
  display: flex;
  flex-direction: column;
}

.header-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.2;
}

.header-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 3px 8px;
  border-radius: 12px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.status-text {
  font-size: 11px;
  font-weight: 600;
  color: #065f46;
}

/* Bottom Tab Navigation */
.tab-icon {
  font-size: 18px;
  line-height: 1;
  margin-bottom: 2px;
}

.tab-label {
  font-size: 11px;
}

/* Page transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
