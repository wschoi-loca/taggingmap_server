<template>
  <div class="login-page">
    <div class="login-container">
      <h1>태깅맵 로그인</h1>
      <p class="subtitle">Google Workspace 계정으로 로그인하세요</p>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <button @click="handleLogin" class="google-login-btn">
        <img src="@/assets/google-icon.svg" alt="Google" />
        Google Workspace로 로그인
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
      error: null
    };
  },
  methods: {
    ...mapActions(['loginWithGoogle']),
    async handleLogin() {
      try {
        this.error = null;
        
        // gapi 직접 참조 대신 vue3-google-oauth2 플러그인 사용
        await this.loginWithGoogle();
        
        // 저장된 경로가 있으면 해당 경로로, 없으면 홈으로
        const redirectPath = this.$store.state.auth.redirectPath || '/';
        this.$router.push(redirectPath);
      } catch (error) {
        console.error('로그인 실패:', error);
        this.error = '로그인에 실패했습니다. 다시 시도해주세요.';
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
  </style>