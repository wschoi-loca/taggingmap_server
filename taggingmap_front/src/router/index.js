// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PageDetailView from '../views/PageDetailView.vue'

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
    path: '/:subdomain/:pathMatch(.*)*',
    name: 'pageDetail',
    component: PageDetailView,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router