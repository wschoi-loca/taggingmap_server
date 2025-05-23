<template>
  <div class="login-page">
    <div class="login-container">
      <h1>태깅맵 로그인</h1>
      <p class="subtitle">Google Workspace 계정으로 로그인하세요</p>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <!-- Google 로그인 버튼 -->
      <button @click="redirectToGoogleLogin" class="google-login-btn" :disabled="loading">
        <img src="@/assets/google-icon.svg" alt="Google" />
        {{ loading ? '로그인 중...' : 'Google Workspace로 로그인' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoginView',
  data() {
    return {
      error: null,
      loading: false
    };
  },
  mounted() {
    // URL에서 로그인 결과 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const loginFailed = urlParams.get('login_failed');
    
    if (loginFailed) {
      this.error = '로그인에 실패했습니다. 다시 시도해주세요.';
    }
    
    // 자동 로그인 시도 (3초 대기 후)
    setTimeout(() => {
      if (!this.$store.getters.isAuthenticated) {
        this.redirectToGoogleLogin();
      }
    }, 3000);
  },
  methods: {
    redirectToGoogleLogin() {
      this.loading = true;
      
      // 현재 URL을 저장 (로그인 후 리다이렉트용)
      const redirectPath = this.$store.getters.redirectPath || '/';
      localStorage.setItem('redirect_after_login', redirectPath);
      
      // Google OAuth 인증 URL 생성
      const clientId = '434460786285-svua7r71njstq0rdqmuacth5tlq6d49d.apps.googleusercontent.com';
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth/google/callback`);
      const scope = encodeURIComponent('email profile');
      const responseType = 'code';
      
      // 계정 단위 로그인을 강제하는 파라미터
      const accessType = 'online';
      const prompt = 'select_account';  // 항상 계정 선택 화면 표시
      
      // Google 로그인 페이지로 리다이렉트
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&access_type=${accessType}&prompt=${prompt}`;
      
      window.location.href = authUrl;
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

.google-signin-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.error-message {
  color: #d93025;
  margin: 15px 0;
  padding: 10px;
  background-color: #fbe9e7;
  border-radius: 4px;
}
</style>