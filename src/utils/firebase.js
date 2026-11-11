/**
 * Firebase 初始化（Firestore）
 *
 * 配置来自 Firebase 控制台注册的 Web 应用（项目由 tkobe129@gmail.com 创建）。
 * 网页端直接连 Firestore，不经过自建后端。
 * apiKey 是 Firebase Web 应用的公开标识（与之前 Supabase 的 anon key 同类），
 * 真正的访问控制靠 Firestore 安全规则，不靠这个 key 保密。
 */
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB5LD7rVGYNXMQXCWGvCEQqDrIdqhI0hz0',
  authDomain: 'quandun-reagent.firebaseapp.com',
  projectId: 'quandun-reagent',
  storageBucket: 'quandun-reagent.firebasestorage.app',
  messagingSenderId: '410415085763',
  appId: '1:410415085763:web:b63fe75d6208788dab8a76'
}

let db = null

export function getDb() {
  if (!db) {
    const app = initializeApp(FIREBASE_CONFIG)
    db = getFirestore(app)
  }
  return db
}

export function getFirebaseConfig() {
  return FIREBASE_CONFIG
}
