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
            // Google Auth 인스턴스 얻기 (최대 10회, 5초 시도)
            const authInstance = await dispatch('getGoogleAuthInstance');
            
            if (!authInstance) {
              throw new Error('Google 인증을 초기화할 수 없습니다.');
            }
            
            // Google 로그인 수행
            const googleUser = await authInstance.signIn();
            const profile = googleUser.getBasicProfile();
            const authResponse = googleUser.getAuthResponse();
            
            // 사용자 정보 구성
            const user = {
              id: profile.getId(),
              email: profile.getEmail(),
              name: profile.getName(),
              picture: profile.getImageUrl(),
              role: profile.getEmail().endsWith('@loca.kr') ? 'admin' : 'user' // 이메일 도메인에 따라 역할 지정
            };
            
            // 상태 업데이트
            commit('SET_TOKEN', authResponse.id_token);
            commit('SET_USER', user);
            commit('SET_USER_CHECKED', true);
            
            return user;
          } catch (error) {
            console.error('Google 로그인 오류:', error);
            throw error;
          } finally {
            commit('SET_LOADING', false);
          }
        },
        
        // Google Auth 인스턴스를 얻기 위한 헬퍼 액션
        getGoogleAuthInstance() {
          return new Promise((resolve) => {
            // 이미 초기화된 인스턴스 확인
            const checkInstance = () => {
              // 전역 함수를 통한 접근 시도
              if (window.getGoogleAuthInstance && window.getGoogleAuthInstance()) {
                return window.getGoogleAuthInstance();
              }
              
              // gapi 직접 접근 시도
              if (window.gapi && window.gapi.auth2) {
                try {
                  const authInstance = window.gapi.auth2.getAuthInstance();
                  if (authInstance) {
                    return authInstance;
                  }
                } catch (e) {
                  console.log('gapi 인스턴스 접근 실패:', e);
                }
              }
              
              return null;
            };
            
            // 첫 번째 시도
            let authInstance = checkInstance();
            if (authInstance) {
              resolve(authInstance);
              return;
            }
            
            // 인스턴스가 없으면 초기화 시도
            const initializeAuth = () => {
              if (!window.gapi || !window.gapi.auth2) {
                return false;
              }
              
              try {
                window.gapi.auth2.init({
                  client_id: '434460786285-svua7r71njstq0rdqmuacth5tlq6d49d.apps.googleusercontent.com',
                  scope: 'profile email'
                }).then(
                  (auth) => {
                    console.log('Google Auth 초기화 성공');
                    resolve(auth);
                  },
                  (error) => {
                    console.error('Google Auth 초기화 실패:', error);
                    resolve(null);
                  }
                );
                return true;
              } catch (e) {
                console.error('Google Auth 초기화 예외:', e);
                return false;
              }
            };
            
            // 이미 초기화되어 있으면 재사용
            if (initializeAuth()) {
              return;
            }
            
            // 아직 gapi가 로드되지 않았다면 이벤트 리스너 설정
            window.addEventListener('google-auth-initialized', () => {
              authInstance = checkInstance();
              if (authInstance) {
                resolve(authInstance);
              } else {
                // 이벤트는 발생했지만 인스턴스가 없으면 초기화 시도
                if (!initializeAuth()) {
                  resolve(null);
                }
              }
            }, { once: true });
            
            // 타임아웃 설정 (5초)
            setTimeout(() => {
              if (!checkInstance()) {
                console.warn('Google Auth 인스턴스 획득 시간 초과');
                resolve(null);
              }
            }, 5000);
          });
        },
        
        // 사용자 상태 체크
        async checkAuth({ commit, state }) {
          if (!state.token) {
            commit('SET_USER_CHECKED', true);
            return null;
          }
          
          try {
            // 토큰 검증 로직
            // 실제 서버 API가 구현되어 있으면 서버에 검증 요청
            // 임시로 토큰이 있으면 세션이 유효한 것으로 처리
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
                // 새 Google ID 서비스 사용해 로그아웃
                if (window.google && window.google.accounts) {
                window.google.accounts.id.disableAutoSelect();
                // 로그인 상태 제거
                window.google.accounts.id.revoke(localStorage.getItem('auth_token'), () => {
                    console.log('Google 로그아웃 성공');
                });
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