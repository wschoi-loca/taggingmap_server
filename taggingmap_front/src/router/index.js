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
    meta: { requiresAuth: true }
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

// 네비게이션 가드 - 라우트 접근 전에 인증 확인
router.beforeEach(async (to, from, next) => {
  // 로딩 상태 설정
  store.commit('SET_LOADING', true);
  
  // 로그인 후 리디렉션을 위해 원래 경로 저장
  if (to.path !== '/login' && to.path !== '/unauthorized') {
    store.dispatch('setRedirectPath', to.fullPath);
  }
  
  try {
    // 인증 상태 확인
    const user = await store.dispatch('checkAuth');
    const isLoggedIn = !!user;
    const userRole = user ? user.role : null;
    
    console.log('라우터 가드 - 로그인 상태:', isLoggedIn, '권한:', userRole);
    
    // 인증이 필요한 페이지에 접근하는 경우
    if (to.matched.some(record => record.meta.requiresAuth)) {
      if (!isLoggedIn) {
        console.log('인증 필요 - 로그인으로 이동');
        next('/login');
      }
      // 관리자 권한이 필요한 페이지
      else if (to.matched.some(record => record.meta.requiresAdmin)) {
        if (userRole === 'admin') {
          console.log('관리자 권한 확인 - 접근 허용');
          next();
        } else {
          console.log('관리자 권한 필요 - 권한 부족');
          next('/unauthorized');
        }
      } else {
        console.log('일반 인증 필요 - 접근 허용');
        next();
      }
    }
    // 로그인 페이지에 이미 로그인한 사용자가 접근하는 경우
    else if (to.path === '/login' && isLoggedIn) {
      console.log('이미 로그인됨 - 홈으로 리다이렉트');
      next('/');
    } 
    else {
      console.log('인증 불필요 - 정상 진행');
      next();
    }
  } catch (error) {
    console.error('라우터 가드 오류:', error);
    next('/login');
  } finally {
    // 로딩 상태 해제
    setTimeout(() => {
      store.commit('SET_LOADING', false);
    }, 300);
  }
});

export default router