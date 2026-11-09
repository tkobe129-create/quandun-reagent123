<template>
  <div class="toast-container" v-if="toasts.length > 0">
    <div
      v-for="t in toasts"
      :key="t.id"
      :class="['toast', `toast-${t.type}`]"
      @click="removeToast(t.id)"
    >
      <span class="toast-icon">
        <template v-if="t.type === 'success'">✓</template>
        <template v-else-if="t.type === 'error'">✕</template>
        <template v-else-if="t.type === 'warning'">⚠️</template>
        <template v-else>ℹ️</template>
      </span>
      <span class="toast-text">{{ t.message }}</span>
    </div>
  </div>
</template>

<script setup>
import { toasts, removeToast } from '../utils/toast.js'
</script>

<style scoped>
.toast-icon {
  font-weight: bold;
}
.toast-text {
  flex: 1;
}
</style>
