import { createStore } from 'vuex'

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
              // vue3-google-oauth2 라이브러리 사용
              const googleAuth = this._vm.$gAuth;
              
              if (!googleAuth) {
                throw new Error('Google 인증을 초기화할 수 없습니다.');
              }
              
              const googleUser = await googleAuth.signIn();
              
              if (!googleUser) {
                throw new Error('Google 로그인 실패');
              }
              
              const idToken = googleUser.getAuthResponse().id_token;
              
              // 서버에 인증 요청
              const response = await fetch('/api/auth/google', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ idToken })
              });
              
              // 나머지 코드는 동일하게 유지
            } catch (error) {
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
        }
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