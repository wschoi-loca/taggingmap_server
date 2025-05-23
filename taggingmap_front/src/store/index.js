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
        SET_TOKEN(state, token) {
          state.token = token
          localStorage.setItem('auth_token', token)
        },
        SET_USER(state, user) {
          state.user = user
          localStorage.setItem('user', JSON.stringify(user))
        },
        CLEAR_AUTH(state) {
          state.token = null
          state.user = null
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
        },
        SET_USER_CHECKED(state, status) {
          state.userChecked = status
        },
        SET_REDIRECT_PATH(state, path) {
          state.redirectPath = path
        },
        SET_LOADING(state, status) {
          state.loading = status
        }
      },
      actions: {
        // 새로운 Google 로그인 액션 (간소화 및 안정화)
        async loginWithGoogle({ commit, dispatch }) {
          commit('SET_LOADING', true);
          
          try {
            // Google Auth 인스턴스 얻기
            const authInstance = gAuthInstance;
            
            if (!authInstance && window.google && window.google.accounts) {
              // 새 Google Identity Services API 사용
              const response = await new Promise((resolve) => {
                window.googleAuthCallback = (response) => {
                  resolve(response);
                };
                
                window.google.accounts.id.prompt((notification) => {
                  if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    // 사용자에게 로그인 UI가 표시되지 않음
                    resolve(null);
                  }
                });
              });
              
              if (!response) {
                throw new Error('Google 로그인 실패: 사용자 응답 없음');
              }
              
              const credential = response.credential;
              
              // JWT 토큰 디코딩
              const base64Url = credential.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));
              
              const payload = JSON.parse(jsonPayload);
              
              // 사용자 정보 구성
              const user = {
                id: payload.sub,
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                role: payload.email.endsWith('@loca.kr') ? 'admin' : 'user'
              };
              
              // 상태 업데이트
              commit('SET_TOKEN', credential);
              commit('SET_USER', user);
              commit('SET_USER_CHECKED', true);
              
              return user;
            } else {
              throw new Error('Google 인증을 초기화할 수 없습니다');
            }
          } catch (error) {
            console.error('Google 로그인 오류:', error);
            throw error;
          } finally {
            commit('SET_LOADING', false);
          }
        },
        
        // 사용자 상태 체크
        async checkAuth({ commit, state }) {
          if (!state.token) {
            commit('SET_USER_CHECKED', true);
            return null;
          }
          
          try {
            // 토큰 검증 로직
            if (state.token && state.user) {
              commit('SET_USER_CHECKED', true);
              return state.user;
            } else {
              throw new Error('유효한 사용자 정보가 없습니다');
            }
          } catch (error) {
            console.error('인증 검증 오류:', error);
            commit('CLEAR_AUTH');
            commit('SET_USER_CHECKED', true);
            return null;
          }
        },
        
        // 로그아웃 처리
        async logout({ commit }) {
          try {
            // Google 로그아웃
            if (window.google && window.google.accounts) {
              window.google.accounts.id.disableAutoSelect();
            }
          } catch (e) {
            console.warn('Google 로그아웃 오류:', e);
          } finally {
            // 항상 로컬 상태는 초기화
            commit('CLEAR_AUTH');
            commit('SET_USER_CHECKED', true);
          }
        },
        
        // 사용자 설정
        setUser({ commit }, user) {
          commit('SET_USER', user);
        },
        
        // 토큰 설정
        setToken({ commit }, token) {
          commit('SET_TOKEN', token);
        },
        
        // 리다이렉트 경로 설정
        setRedirectPath({ commit }, path) {
          commit('SET_REDIRECT_PATH', path);
        }
      },
      getters: {
        isAuthenticated: state => !!state.token,
        userRole: state => state.user ? state.user.role : null,
        userName: state => state.user ? state.user.name : null,
        userEmail: state => state.user ? state.user.email : null,
        userPicture: state => state.user ? state.user.picture : null,
        isAdmin: state => state.user && (state.user.role === 'admin' || state.user.role === 'superadmin'),
        authLoading: state => state.loading,
        redirectPath: state => state.redirectPath || '/'
      }
    }
  }
})