// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PageDetailView from '../views/PageDetailView.vue'
// 업로드 컴포넌트 임포트
import LogUpload from '../views/LogUpload.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/home',
    redirect: '/'
  },
  {
    path: '/upload',
    name: 'LogUpload',
    component: LogUpload
  },
  {
    // 첫번째 경로 세그먼트를 subdomain으로 캡처
    path: '/:subdomain/:pathMatch(.*)*',
    name: 'pageDetail',
    component: PageDetailView,
    props: route => ({
      subdomain: route.params.subdomain,
      pathMatch: route.params.pathMatch
    })
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router