import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PageDetailView from '../views/PageDetailView.vue'
import LogUpload from '../views/LogUpload.vue'
import LoginView from '../views/LoginView.vue' // 로그인 화면 추가
import store from '../store' // Vuex 스토어 임포트

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true } // 인증 필요
  },
  {
    path: '/home',
    redirect: '/'
  },
  {
    path: '/upload',
    name: 'LogUpload',
    component: LogUpload,
    meta: { requiresAuth: true, requiresAdmin: true } // 관리자 권한 필요
  },
  {
    // 첫번째 경로 세그먼트를 subdomain으로 캡처
    path: '/:subdomain/:pathMatch(.*)*',
    name: 'pageDetail',
    component: PageDetailView,
    props: route => ({
      subdomain: route.params.subdomain,
      pathMatch: route.params.pathMatch
    }),
    meta: { requiresAuth: true } // 인증 필요
  },
  // 로그인 라우트 추가
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guest: true } // 비로그인 사용자용
  },
  // 권한 부족 라우트
  {
    path: '/unauthorized',
    name: 'unauthorized',
    component: () => import('../views/UnauthorizedView.vue') // 권한 부족시 표시할 화면
  },
  // 404 페이지
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 네비게이션 가드 설정 - 라우트 접근 전에 인증 확인
router.beforeEach(async (to, from, next) => {
  // 로딩 상태 설정
  store.commit('setLoading', true);
  
  // 로그인 후 리디렉션을 위해 원래 경로 저장
  if (to.path !== '/login' && to.path !== '/unauthorized') {
    store.commit('setRedirectPath', to.fullPath);
  }
  
  const isLoggedIn = store.getters.isAuthenticated;
  
  // 첫 로드시 토큰이 있으면 사용자 정보 확인
  if (!store.state.auth.userChecked && localStorage.getItem('auth_token')) {
    try {
      await store.dispatch('checkAuth');
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }
  
  // 인증이 필요한 페이지에 접근하는 경우
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isLoggedIn) {
      // 로그인 페이지로 리디렉션
      next('/login');
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
    next('/'); // 홈으로 리디렉션
  } 
  else {
    next(); // 인증이 필요없는 페이지는 그대로 진행
  }
  
  // 로딩 상태 해제 (비동기 작업이 있으므로 작은 딜레이 추가)
  setTimeout(() => {
    store.commit('setLoading', false);
  }, 300);
});

export default router