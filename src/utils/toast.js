import { ref } from 'vue'

export const toasts = ref([])

let nextId = 1

export function showToast(message, type = 'info', duration = 2500) {
  const id = nextId++
  const toast = { id, message, type }
  toasts.value.push(toast)

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
  return id
}

export function removeToast(id) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

export const toast = {
  success: (msg, duration) => showToast(msg, 'success', duration),
  error: (msg, duration) => showToast(msg, 'error', duration),
  warning: (msg, duration) => showToast(msg, 'warning', duration),
  info: (msg, duration) => showToast(msg, 'info', duration)
}
