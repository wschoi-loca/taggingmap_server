<template>
  <div class="login-page">
    <div class="login-container">
      <h1>태깅맵 로그인</h1>
      <p class="subtitle">Google Workspace 계정으로 로그인하세요</p>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
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
      gapiLoaded: false
    };
  },
  mounted() {
    // Google API가 이미 로드되었는지 확인
    if (window.gapi && window.gapi.auth2) {
      this.gapiLoaded = true;
    }
    
    // gapi 로드 이벤트 리스너
    window.addEventListener('google-auth-initialized', () => {
      this.gapiLoaded = true;
    });
  },
  methods: {
    ...mapActions(['setUser', 'setToken']), // loginWithGoogle 대신 세분화된 액션 사용
    
    async handleLogin() {
      try {
        this.error = null;
        this.loading = true;
        
        if (!this.gapiLoaded && window.gapi) {
          // gapi는 로드됐지만 auth2는 초기화되지 않은 경우
          await this.loadGapiAuth2();
        } else if (!window.gapi) {
          throw new Error("Google API를 로드할 수 없습니다");
        }
        
        // Google 인증 인스턴스 가져오기
        const auth2 = this.getGoogleAuthInstance();
        if (!auth2) {
          throw new Error("Google 인증을 초기화할 수 없습니다");
        }
        
        // Google 로그인 실행
        const googleUser = await auth2.signIn();
        const profile = googleUser.getBasicProfile();
        const id_token = googleUser.getAuthResponse().id_token;
        
        // 유저 정보 구성
        const user = {
          id: profile.getId(),
          name: profile.getName(),
          email: profile.getEmail(),
          imageUrl: profile.getImageUrl()
        };
        
        // Vuex에 유저 정보와 토큰 저장
        this.setUser(user);
        this.setToken(id_token);
        
        // 저장된 경로가 있으면 해당 경로로, 없으면 홈으로
        const redirectPath = this.$store.state.auth.redirectPath || '/';
        this.$router.push(redirectPath);
      } catch (error) {
        console.error('로그인 실패:', error);
        this.error = '로그인에 실패했습니다. 다시 시도해주세요.';
      } finally {
        this.loading = false;
      }
    },
    
    getGoogleAuthInstance() {
      // 전역 함수 사용 시도
      if (window.getAuthInstance && window.getAuthInstance()) {
        return window.getAuthInstance();
      }
      
      // gapi 직접 접근
      if (window.gapi && window.gapi.auth2) {
        try {
          return window.gapi.auth2.getAuthInstance();
        } catch (e) {
          console.log('gapi 인스턴스 직접 접근 실패:', e);
          return null;
        }
      }
      
      return null;
    },
    
    loadGapiAuth2() {
      return new Promise((resolve, reject) => {
        if (!window.gapi) {
          reject(new Error('Google API가 로드되지 않았습니다'));
          return;
        }
        
        window.gapi.load('auth2', () => {
          try {
            // 이미 초기화된 인스턴스가 있는지 확인
            const existingAuth = window.gapi.auth2.getAuthInstance();
            if (existingAuth) {
              this.gapiLoaded = true;
              resolve(existingAuth);
              return;
            }
            
            // 없으면 초기화
            window.gapi.auth2.init({
              client_id: '434460786285-svua7r71njstq0rdqmuacth5tlq6d49d.apps.googleusercontent.com',
              scope: 'profile email'
            }).then(
              auth => {
                this.gapiLoaded = true;
                resolve(auth);
              },
              error => {
                reject(error);
              }
            );
          } catch (e) {
            reject(e);
          }
        });
      });
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

  .google-login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
  
  .error-message {
    color: #d93025;
    margin: 15px 0;
    padding: 10px;
    background-color: #fbe9e7;
    border-radius: 4px;
  }
  </style>