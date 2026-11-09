import { createRouter, createWebHistory } from 'vue-router'
import ReagentsView from '../views/ReagentsView.vue'
import StockView from '../views/StockView.vue'
import ReagentFormView from '../views/ReagentFormView.vue'
import RecordsView from '../views/RecordsView.vue'

const routes = [
  {
    path: '/',
    redirect: '/reagents'
  },
  {
    path: '/reagents',
    name: 'reagents',
    component: ReagentsView,
    meta: { title: '试剂库存' }
  },
  {
    path: '/stock',
    name: 'stock',
    component: StockView,
    meta: { title: '扫码出入库' }
  },
  {
    path: '/reagent-form',
    name: 'reagent-form',
    component: ReagentFormView,
    meta: { title: '试剂预录' }
  },
  {
    path: '/reagent/edit/:id',
    name: 'reagent-edit',
    component: ReagentFormView,
    meta: { title: '编辑试剂' }
  },
  {
    path: '/records',
    name: 'records',
    component: RecordsView,
    meta: { title: '出入库流水' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.afterEach((to) => {
  document.title = (to.meta.title ? `${to.meta.title} - ` : '') + '权盾智检试剂管理系统'
})

export default router
