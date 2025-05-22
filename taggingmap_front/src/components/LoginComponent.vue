<template>
    <div class="login-container">
      <button @click="handleLogin" class="google-login-btn">
        <img src="@/assets/google-icon.svg" alt="Google" />
        Google Workspace로 로그인
      </button>
    </div>
  </template>
  
  <script>
  export default {
    methods: {
      async handleLogin() {
        try {
          const googleUser = await this.$gAuth.signIn()
          if (googleUser) {
            const idToken = googleUser.getAuthResponse().id_token
            
            // 백엔드로 ID 토큰 전송
            const response = await this.$http.post('/api/auth/google', { idToken })
            
            // 서버에서 받은 사용자 정보와 JWT 토큰 저장
            this.$store.commit('setUser', response.data.user)
            this.$store.commit('setToken', response.data.token)
            
            // 로그인 후 리디렉션
            this.$router.push('/')
          }
        } catch (error) {
          console.error('로그인 중 오류 발생:', error)
          alert('로그인에 실패했습니다.')
        }
      }
    }
  }
  </script>