/**
 * Firebase 初始化（Firestore + 匿名登录）
 *
 * 配置来自 Firebase 控制台注册的 Web 应用（项目由 tkobe129@gmail.com 创建）。
 * 网页端直接连 Firestore，不经过自建后端。
 * apiKey 是 Firebase Web 应用的公开标识（与之前 Supabase 的 anon key 同类），
 * 真正的访问控制靠 Firestore 安全规则，不靠这个 key 保密。
 *
 * 写库保护：规则要求 request.auth != null 才能写。页面用匿名登录
 * （signInAnonymously，无需用户输账号密码，登录态缓存在浏览器里），
 * 写操作前先 ensureAuth()。读操作是公开的，不强制等登录——这样即使
 * 匿名登录还没在控制台启用，列表也能正常显示，只是写会失败。
 * 注意：匿名登录须先在 Firebase 控制台 Authentication → 登录方式里启用，
 * 否则 signInAnonymously 会报 auth/operation-not-allowed。
 */
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB5LD7rVGYNXMQXCWGvCEQqDrIdqhI0hz0',
  authDomain: 'quandun-reagent.firebaseapp.com',
  projectId: 'quandun-reagent',
  storageBucket: 'quandun-reagent.firebasestorage.app',
  messagingSenderId: '410415085763',
  appId: '1:410415085763:web:b63fe75d6208788dab8a76'
}

let app = null
let db = null
let authPromise = null

function getApp() {
  if (!app) app = initializeApp(FIREBASE_CONFIG)
  return app
}

export function getDb() {
  if (!db) db = getFirestore(getApp())
  return db
}

// 保证已匿名登录（只登录一次，后续复用同一登录态；失败时清空缓存，允许重试）。
export function ensureAuth() {
  if (!authPromise) {
    authPromise = (async () => {
      const auth = getAuth(getApp())
      if (!auth.currentUser) await signInAnonymously(auth)
      return auth.currentUser
    })().catch((e) => {
      authPromise = null
      throw e
    })
  }
  return authPromise
}

export function getFirebaseConfig() {
  return FIREBASE_CONFIG
}
