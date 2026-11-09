/**
 * Supabase 连接和初始化
 */
import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://jtshtmhjplhapdwnulbk.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0c2h0bWhqcGxoYXBkd251bGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NzYwMzUsImV4cCI6MjA5MzU1MjAzNX0.WfM2DIRstmsHQN5l7oQ51pHajBZ5a9TySKnV_hbtxEY'

function getSupabaseUrl() {
  if (import.meta.env?.VITE_SUPABASE_URL) {
    return import.meta.env.VITE_SUPABASE_URL
  }
  // 在本地开发与沙箱测试环境中，通过同源 /api/supabase 代理请求，避免浏览器沙箱跨域与出口代理受阻
  if (import.meta.env?.DEV && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin + '/api/supabase'
  }
  return DEFAULT_SUPABASE_URL
}

let supabase = null

export function initSupabase() {
  if (!supabase) {
    const url = getSupabaseUrl()
    supabase = createClient(url, SUPABASE_ANON_KEY)
  }
  return supabase
}

export function getSupabase() {
  if (!supabase) return initSupabase()
  return supabase
}
