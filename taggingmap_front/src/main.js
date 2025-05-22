// main.js (Vue 3 방식)
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store' // Vuex 스토어 추가

// vue3-google-oauth2 사용 (Vue 3 호환 라이브러리)
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

app.mount('#app')