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

// 세션 체크 약속 - 한 번만 실행되도록
let authCheckPromise = null;

// 네비게이션 가드 설정 - 라우트 접근 전에 인증 확인
router.beforeEach(async (to, from, next) => {
  // 로딩 상태 설정
  store.commit('SET_LOADING', true);
  
  // 인증 정보 초기 로드 (한 번만 실행)
  if (!store.state.auth.userChecked) {
    if (!authCheckPromise) {
      authCheckPromise = store.dispatch('checkAuth')
        .catch(error => {
          console.error('Auth check failed:', error);
          return null;
        });
    }
    
    await authCheckPromise;
  }
  
  const isLoggedIn = store.getters.isAuthenticated;
  
  // 로그인이 필요한 페이지에 접근하는 경우
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isLoggedIn) {
      // 로그인 페이지로 리디렉션하기 전에 현재 경로 저장
      store.dispatch('setRedirectPath', to.fullPath);
      
      // 즉시 로그인 페이지로 이동
      next({ name: 'login' });
    }
    // 관리자 권한이 필요한 페이지
    else if (to.matched.some(record => record.meta.requiresAdmin)) {
      const userRole = store.getters.userRole;
      if (userRole === 'admin' || userRole === 'superadmin') {
        next(); // 관리자 권한 있음
      } else {
        next('/unauthorized'); // 권한 부족 페이지로 이동
      }
    } else {
      next(); // 인증된 일반 사용자
    }
  }
  // 로그인 페이지에 이미 로그인한 사용자가 접근하는 경우
  else if (to.matched.some(record => record.meta.guest) && isLoggedIn) {
    // 저장된 리다이렉트 경로가 있으면 해당 경로로, 없으면 홈으로
    const redirectPath = store.getters.redirectPath;
    next(redirectPath);
  } 
  else {
    next(); // 인증이 필요없는 페이지는 그대로 진행
  }
  
  // 라우트 이동이 완료된 후 로딩 상태 해제
  router.afterEach(() => {
    setTimeout(() => {
      store.commit('SET_LOADING', false);
    }, 300);
  });
});

export default router