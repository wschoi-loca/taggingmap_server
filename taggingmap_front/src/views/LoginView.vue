<template>
  <div class="login-page">
    <div class="login-container">
      <h1>태깅맵 로그인</h1>
      <p class="subtitle">Google Workspace 계정(로카넷 계정으로 구글 로그인)으로</p>
      <p class="subtitle">로그인하세요</p>
      <p class="subtitle2">계정권한 문의: 카드Biz 최원석</p>
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <!-- Google 로그인 버튼 -->
      <button @click="redirectToGoogleLogin" class="google-login-btn" :disabled="loading">
        <img src="@/assets/google-icon.svg" alt="Google" />
        {{ loading ? '로그인 중...' : '로카넷 구글 계정으로 로그인' }}
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
    // LoginView.vue의 로그인 버튼 클릭 함수
    redirectToGoogleLogin() {
      this.loading = true;
      
      // 로그인 후 리다이렉트할 경로 저장
      const redirectPath = this.$store.getters.redirectPath || '/';
      localStorage.setItem('redirect_after_login', redirectPath);
      
      // Google OAuth 인증 URL 구성
      const clientId = '434460786285-svua7r71njstq0rdqmuacth5tlq6d49d.apps.googleusercontent.com';
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth/google/callback`);
      const scope = encodeURIComponent('email profile');
      const responseType = 'code';
      const accessType = 'online';
      const prompt = 'select_account'; // 계정 선택 화면 표시
      
      // Google OAuth 2.0 인증 서버로 리다이렉트
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

.google-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 16px;
  background-color: white;
  color: #757575;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s, box-shadow 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  margin-top: 20px;
  position: relative;
  outline: none;
}

.google-login-btn:hover {
  background-color: #f8f9fa;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
}

.google-login-btn:active {
  background-color: #f1f3f4;
}

.google-login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.google-login-btn img {
  width: 18px;
  height: 18px;
  margin-right: 12px;
}

.subtitle2 {
  color: #888;
  font-size: 14px;
  margin-top: -20px;
  margin-bottom: 25px;
}
</style>