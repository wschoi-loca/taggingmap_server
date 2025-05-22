import { createStore } from 'vuex'

// 전역 변수로 Google Auth 인스턴스에 접근하기 위한 설정
let gAuthInstance = null;

// 애플리케이션 시작 시 호출할 함수
export function setGoogleAuthInstance(instance) {
  gAuthInstance = instance;
}

export default createStore({
  modules: {
    auth: {
      state: {
        token: localStorage.getItem('auth_token') || null,
        user: JSON.parse(localStorage.getItem('user')) || null,
        userChecked: false,
        redirectPath: null,
        loading: false
      },
      mutations: {
        setToken(state, token) {
          state.token = token
          localStorage.setItem('auth_token', token)
        },
        setUser(state, user) {
          state.user = user
          localStorage.setItem('user', JSON.stringify(user))
        },
        clearAuth(state) {
          state.token = null
          state.user = null
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
        },
        setUserChecked(state, status) {
          state.userChecked = status
        },
        setRedirectPath(state, path) {
          state.redirectPath = path
        },
        setLoading(state, status) {
          state.loading = status
        }
      },
      actions: {
        async loginWithGoogle({ commit }) {
            try {
              // 로딩 상태 설정
              commit('setLoading', true);
              
              // 전역 변수를 통해 gAuth 인스턴스 접근
              if (!gAuthInstance) {
                // 글로벌 gapi 객체 사용
                if (window.gapi && window.gapi.auth2) {
                  const authInstance = window.gapi.auth2.getAuthInstance();
                  if (!authInstance) {
                    throw new Error('Google Auth 인스턴스를 찾을 수 없습니다.');
                  }
                  
                  // Google Sign-In으로 로그인
                  const googleUser = await authInstance.signIn();
                  const authResponse = googleUser.getAuthResponse();
                  const idToken = authResponse.id_token;
                  
                  // 서버에 인증 요청 및 처리
                  const response = await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken })
                  });
                  
                  if (!response.ok) {
                    throw new Error('서버 인증 실패: ' + response.status);
                  }
                  
                  const data = await response.json();
                  commit('setToken', data.token);
                  commit('setUser', data.user);
                  commit('setUserChecked', true);
                  commit('setLoading', false);
                  return data.user;
                } else {
                  throw new Error('Google API가 로드되지 않았습니다.');
                }
              } else {
                // vue3-google-oauth2 인스턴스 사용
                const googleUser = await gAuthInstance.signIn();
                // 위와 동일한 로직 계속...
              }
            } catch (error) {
              commit('setLoading', false);
              console.error('Google 로그인 오류:', error);
              throw error;
            }
          },

        async checkAuth({ commit, state }) {
          try {
            // 토큰이 없으면 처리하지 않음
            if (!state.token) {
              commit('setUserChecked', true)
              return null
            }
            
            // 서버에 토큰 유효성 확인 요청
            const response = await fetch('/api/auth/check', {
              headers: {
                'Authorization': `Bearer ${state.token}`
              }
            })
            
            if (!response.ok) {
              throw new Error('인증 실패')
            }
            
            const data = await response.json()
            commit('setUser', data.user)
            commit('setUserChecked', true)
            return data.user
          } catch (error) {
            console.error('인증 확인 오류:', error)
            // 인증 실패시 로그인 정보 초기화
            commit('clearAuth')
            commit('setUserChecked', true)
            throw error
          }
        },
        
        async logout({ commit }) {
          try {
            // Google 로그아웃
            if (window.gapi && window.gapi.auth2) {
              const authInstance = window.gapi.auth2.getAuthInstance()
              if (authInstance) {
                await authInstance.signOut()
              }
            }
            
            // 로컬 인증 상태 초기화
            commit('clearAuth')
            commit('setUserChecked', true)
          } catch (error) {
            console.error('로그아웃 오류:', error)
            throw error
          }
        },
        
      },
      getters: {
        isAuthenticated: state => !!state.token,
        userRole: state => state.user ? state.user.role : null,
        userName: state => state.user ? state.user.name : null,
        userEmail: state => state.user ? state.user.email : null,
        userPicture: state => state.user ? state.user.picture : null,
        isAdmin: state => state.user && (state.user.role === 'admin' || state.user.role === 'superadmin')
      }
    }
  }
})