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
  
  // 인증이 필요한 페이지에 접근하는 경우
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isLoggedIn) {
      // 로그인 페이지로 리디렉션
      console.log('인증 필요 - 로그인으로 이동');
      next('/login');
    }
    // 관리자 권한이 필요한 페이지
    else if (to.matched.some(record => record.meta.requiresAdmin)) {
      if (userRole === 'admin' || userRole === 'superadmin') {
        console.log('관리자 권한 확인 - 접근 허용');
        next(); // 관리자 권한 있음
      } else {
        console.log('관리자 권한 필요 - 권한 부족');
        next('/unauthorized'); // 권한 부족 페이지로 이동
      }
    } else {
      console.log('일반 인증 필요 - 접근 허용');
      next(); // 인증된 일반 사용자
    }
  }
  // 로그인 페이지에 이미 로그인한 사용자가 접근하는 경우
  else if (to.matched.some(record => record.meta.guest) && isLoggedIn) {
    console.log('이미 로그인됨 - 홈으로 리다이렉트');
    next('/'); // 홈으로 리디렉션
  } 
  else {
    console.log('인증 불필요 - 정상 진행');
    next(); // 인증이 필요없는 페이지는 그대로 진행
  }
  
  // 로딩 상태 해제
  setTimeout(() => {
    store.commit('SET_LOADING', false);
  }, 300);
});

export default router