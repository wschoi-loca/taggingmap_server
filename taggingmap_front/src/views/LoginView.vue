<template>
  <div class="login-page">
    <div class="login-container">
      <h1>태깅맵 로그인</h1>
      <p class="subtitle">Google Workspace 계정으로 로그인하세요</p>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <!-- Google 로그인 버튼 -->
      <button @click="handleLogin" class="google-login-btn" :disabled="loading">
        <img src="@/assets/google-icon.svg" alt="Google" />
        {{ loading ? '로그인 중...' : 'Google Workspace로 로그인' }}
      </button>
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
      loading: false,
      autoPromptTriggered: false
    };
  },
  mounted() {
    // 3초 후 자동 로그인 시도 (사용자 경험을 위해 약간의 지연 추가)
    this.triggerAutoLogin();
  },
  methods: {
    ...mapActions(['loginWithGoogle']),
    
    triggerAutoLogin() {
      if (this.autoPromptTriggered) return;
      
      // 이미 자동 로그인을 시도했음을 표시
      this.autoPromptTriggered = true;
      
      setTimeout(() => {
        if (!this.$store.getters.isAuthenticated && !this.loading) {
          console.log('자동 로그인 시도');
          this.handleLogin();
        }
      }, 1000); // 1초 지연
    },
    
    async handleLogin() {
      try {
        this.error = null;
        this.loading = true;
        
        // Google 로그인 시도
        await this.loginWithGoogle();
        
        // 저장된 경로가 있으면 해당 경로로, 없으면 홈으로
        const redirectPath = this.$store.getters.redirectPath;
        this.$router.push(redirectPath);
      } catch (error) {
        console.error('로그인 실패:', error);
        this.error = '로그인에 실패했습니다. 다시 시도해주세요.';
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