import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PageDetailView from '../views/PageDetailView.vue'
import LogUpload from '../views/LogUpload.vue'
import LoginView from '../views/LoginView.vue'
import store from '../store'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/home',
    redirect: '/'
  },
  {
    path: '/upload',
    name: 'LogUpload',
    component: LogUpload,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/:subdomain/:pathMatch(.*)*',
    name: 'pageDetail',
    component: PageDetailView,
    props: route => ({
      subdomain: route.params.subdomain,
      pathMatch: route.params.pathMatch
    }),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guest: true }
  },
  {
    path: '/unauthorized',
    name: 'unauthorized',
    component: () => import('../views/UnauthorizedView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})


// 네비게이션 가드 수정
router.beforeEach(async (to, from, next) => {
  // 로딩 상태 설정
  store.commit('SET_LOADING', true);
  
  // 로그인 후 리디렉션을 위해 원래 경로 저장
  if (to.path !== '/login' && to.path !== '/unauthorized') {
    store.dispatch('setRedirectPath', to.fullPath);
  }
  
  // 인증 상태 확인 (강제로 다시 체크)
  let user = null;
  if (localStorage.getItem('auth_token')) {
    try {
      // 항상 사용자 정보 다시 확인
      user = await store.dispatch('checkAuth');
      console.log('라우터 가드 - 인증 상태:', user ? '인증됨' : '인증 안됨');
    } catch (error) {
      console.error('인증 확인 실패:', error);
    }
  }

  const isLoggedIn = !!user;
  const userRole = user ? user.role : null;
  
  console.log('라우터 가드 - 로그인 상태:', isLoggedIn, '권한:', userRole);
  
// router/index.js
router.beforeEach(async (to, from, next) => {
  store.commit('SET_LOADING', true);
  
  // 리다이렉트 경로 저장
  if (to.path !== '/login' && to.path !== '/unauthorized') {
    store.dispatch('setRedirectPath', to.fullPath);
  }
  
  try {
    // 인증 상태 확인
    const user = await store.dispatch('checkAuth');
    
    // 인증이 필요한 페이지
    if (to.matched.some(record => record.meta.requiresAuth)) {
      if (!user) {
        next('/login');
      }
      // 관리자 권한이 필요한 페이지
      else if (to.matched.some(record => record.meta.requiresAdmin)) {
        if (user.role === 'admin') {
          next();
        } else {
          next('/unauthorized');
        }
      } else {
        next();
      }
    }
    // 로그인 페이지에 이미 로그인한 사용자 접근 시
    else if (to.path === '/login' && user) {
      next('/');
    }
    else {
      next();
    }
  } catch (error) {
    console.error('라우터 가드 오류:', error);
    next('/login');
  } finally {
    // 로딩 상태 종료
    setTimeout(() => {
      store.commit('SET_LOADING', false);
    }, 300);
  }
});

export default router