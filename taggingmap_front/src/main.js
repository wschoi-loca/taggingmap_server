import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// Google ID 서비스 초기화 (setGoogleAuthInstance 사용 제거)
if (typeof window !== 'undefined') {
  window.onload = () => {
    if (window.google && window.google.accounts) {
      try {
        window.google.accounts.id.initialize({
          client_id: '434460786285-svua7r71njstq0rdqmuacth5tlq6d49d.apps.googleusercontent.com',
          callback: (response) => {
            if (window.googleAuthCallback) {
              window.googleAuthCallback(response);
            }
          }
        });
        console.log('Google Identity Services 초기화 완료');
      } catch (e) {
        console.error('Google Identity Services 초기화 실패:', e);
      }
    }
  };
}

createApp(App).use(store).use(router).mount('#app')