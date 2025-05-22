import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store, { setGoogleAuthInstance } from './store' // 스토어 및 설정 함수 가져오기
import vue3GoogleOauth from 'vue3-google-oauth2'

const app = createApp(App)

// 구글 OAuth 설정
const gauthOption = {
  clientId: '434460786285-svua7r71njstq0rdqmuacth5tlq6d49d.apps.googleusercontent.com',
  scope: 'profile email',
  prompt: 'select_account'
}

// 플러그인 등록
app.use(router)
app.use(store)
app.use(vue3GoogleOauth, gauthOption)

// Google 인증 인스턴스를 스토어에서 사용할 수 있도록 설정
const gAuth = app.config.globalProperties.$gAuth
if (gAuth) {
  setGoogleAuthInstance(gAuth)
}

app.mount('#app')