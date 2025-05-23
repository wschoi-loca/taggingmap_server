<template>
  <div class="login-page">
    <div class="login-container">
      <h1>태깅맵 로그인</h1>
      <p class="subtitle">Google Workspace 계정으로 로그인하세요</p>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <!-- Google 제공 로그인 버튼을 표시할 div -->
      <div id="g_id_signin" class="google-signin-container"></div>
      
      <!-- 기존 버튼은 숨김 또는 제거 -->
      <!-- <button @click="handleLogin" class="google-login-btn" :disabled="loading">
        <img src="@/assets/google-icon.svg" alt="Google" />
        {{ loading ? '로그인 중...' : 'Google Workspace로 로그인' }}
      </button> -->
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';

export default {
  name: 'LoginView',
  data() {
    return {
      error: null,
      loading: false
    };
  },
  mounted() {
    this.initGoogleSignIn();
    
    // Google 인증 성공 이벤트 리스너
    window.addEventListener('google-auth-success', this.handleGoogleAuthSuccess);
  },
  beforeUnmount() {
    // 컴포넌트 파괴 시 리스너 제거
    window.removeEventListener('google-auth-success', this.handleGoogleAuthSuccess);
  },
  methods: {
    ...mapActions(['setUser', 'setToken']),
    
    initGoogleSignIn() {
      // 구글 클라이언트 초기화 (google.accounts.id가 로드된 후)
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: '434460786285-svua7r71njstq0rdqmuacth5tlq6d49d.apps.googleusercontent.com',
          callback: handleGoogleCredentialResponse,
          auto_select: false
        });
        
        // 버튼 렌더링
        window.google.accounts.id.renderButton(
          document.getElementById('g_id_signin'),
          { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', width: 250 }
        );
        
        // 원클릭 로그인 표시 (선택사항)
        // window.google.accounts.id.prompt();
      } else {
        // Google 라이브러리가 아직 로드되지 않았으면 대기
        setTimeout(this.initGoogleSignIn, 100);
      }
    },
    
    handleGoogleAuthSuccess(event) {
      // JWT 토큰 획득
      const idToken = event.detail.credential;
      
      try {
        this.loading = true;
        this.error = null;
        
        // JWT 토큰 디코딩 (간단한 방법)
        const base64Url = idToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        
        // 사용자 정보 추출
        const user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          role: payload.email.endsWith('@loca.kr') ? 'admin' : 'user'
        };
        
        // Vuex에 저장
        this.setUser(user);
        this.setToken(idToken);
        
        // 리다이렉트
        const redirectPath = this.$store.state.auth.redirectPath || '/';
        this.$router.push(redirectPath);
      } catch (error) {
        console.error('로그인 처리 중 오류:', error);
        this.error = '로그인 정보 처리 중 오류가 발생했습니다.';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  background-color: #f8f9fa;
}

.login-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h1 {
  margin-bottom: 10px;
  color: #333;
}

.subtitle {
  color: #666;
  margin-bottom: 30px;
}

.google-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px;
  margin-top: 20px;
  background-color: #ffffff;
  color: rgba(0, 0, 0, 0.75);
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.google-login-btn:hover {
  background-color: #f8f9fa;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.google-login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.google-login-btn img {
  width: 18px;
  height: 18px;
  margin-right: 10px;
}

.error-message {
  color: #d93025;
  margin: 15px 0;
  padding: 10px;
  background-color: #fbe9e7;
  border-radius: 4px;
}

.google-signin-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>