import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// 앱 시작 전 인증 상태 확인
async function initApp() {
  // auth 검증 실행
  try {
    console.log('[초기화] 인증 상태 확인 시작');
    await store.dispatch('checkAuth');
    console.log('[초기화] 인증 상태 확인 완료');
  } catch (error) {
    console.error('[초기화] 인증 확인 오류', error);
  }
  
  // 앱 생성 및 마운트
  createApp(App).use(store).use(router).mount('#app')
}

// 앱 초기화
initApp();