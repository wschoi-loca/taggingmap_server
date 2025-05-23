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
  // LoginView.vue methods 수정
  methods: {
    redirectToGoogleLogin() {
      // 이미 로그인된 경우 바로 리다이렉트
      if (this.$store.getters.isAuthenticated) {
        const redirectPath = this.$store.getters.redirectPath || '/';
        this.$router.push(redirectPath);
        return;
      }
      
      this.loading = true;
      
      // 로그인 리다이렉트 루프 방지 (마지막 리다이렉트 시간 확인)
      const lastRedirect = localStorage.getItem('last_login_redirect');
      const now = Date.now();
      
      if (lastRedirect && (now - parseInt(lastRedirect)) < 5000) {
        // 5초 이내 중복 리다이렉트 방지
        console.log('로그인 리다이렉트 무시 (중복 방지)');
        this.loading = false;
        return;
      }
      
      // 현재 시간 저장
      localStorage.setItem('last_login_redirect', now.toString());
      
      // 현재 URL을 저장
      const redirectPath = this.$store.getters.redirectPath || '/';
      localStorage.setItem('redirect_after_login', redirectPath);
      
      // Google OAuth URL 생성 및 리다이렉트
      const clientId = '434460786285-svua7r71njstq0rdqmuacth5tlq6d49d.apps.googleusercontent.com';
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth/google/callback`);
      const scope = encodeURIComponent('email profile');
      const responseType = 'code';
      const accessType = 'online';
      const prompt = 'consent'; // 계정 권한에 집중
      
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