import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import '@fortawesome/fontawesome-free/css/all.css'
import axios from 'axios'

// ===== Axios 전역 설정 =====
// API 기본 URL 설정
axios.defaults.baseURL = process.env.VUE_APP_API_BASE_URL || window.location.origin;

// 개발 환경에서 CORS 및 쿠키 설정
if (process.env.VUE_APP_ENV === 'development') {
  axios.defaults.withCredentials = true;
  console.log('[환경설정] 개발 환경 감지');
  console.log('[환경설정] API Base URL:', axios.defaults.baseURL);
}

// 요청 인터셉터 - 모든 요청에 인증 토큰 추가
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 401 오류 시 로그아웃 처리
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch('logout');
      router.push('/login');
    }
    return Promise.reject(error);
  }
);

// Vue 전역에서 axios 사용 가능하도록 설정
const app = createApp(App);
app.config.globalProperties.$http = axios;

// ===== 환경정보 로깅 =====
console.log('=== 태깅맵 애플리케이션 시작 ===');
console.log('환경:', process.env.VUE_APP_ENV || 'unknown');
console.log('API 서버:', process.env.VUE_APP_API_BASE_URL || window.location.origin);
console.log('Google Client ID:', process.env.VUE_APP_GOOGLE_CLIENT_ID || 'not set');
console.log('=====================================');

// ===== 앱 초기화 함수 =====
async function initApp() {
  try {
    console.log('[초기화] 인증 상태 확인 시작');
    
    // 환경별 초기화 작업
    if (process.env.VUE_APP_ENV === 'development') {
      console.log('[개발모드] 디버깅 활성화');
      // 개발 환경 전용 설정
      app.config.performance = true;
    }
    
    // auth 검증 실행
    await store.dispatch('checkAuth');
    console.log('[초기화] 인증 상태 확인 완료');
    
  } catch (error) {
    console.error('[초기화] 인증 확인 오류', error);
    
    // 개발 환경에서는 더 자세한 오류 정보 표시
    if (process.env.VUE_APP_ENV === 'development') {
      console.error('[개발모드] 상세 오류 정보:', {
        message: error.message,
        stack: error.stack,
        config: error.config
      });
    }
  }
  
  // 앱 생성 및 마운트
  app.use(store).use(router).mount('#app');
}

// 앱 초기화
initApp();