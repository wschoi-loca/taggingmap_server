// router/index.js
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
    path: '/:subdomain/:path*',
    name: 'pageDetail',
    component: PageDetailView,
    props: route => ({
      subdomain: route.params.subdomain,
      path: route.params.path || '',
      pathMatch: route.params.pathMatch || []
    })
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router