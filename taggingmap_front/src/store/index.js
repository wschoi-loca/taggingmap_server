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
        // 새로운 Google 로그인 액션 (OAuth 리다이렉트 방식)
        async loginWithGoogle({ commit }) {
            commit('SET_LOADING', true);
            
            try {
            // 로그아웃 상태 확인
            if (window.google && window.google.accounts) {
                try {
                window.google.accounts.id.disableAutoSelect();
                } catch (e) {
                console.warn('Auto select disable error:', e);
                }
            }
            
            // API에서 로그인 URL 가져오기
            const response = await fetch('/api/auth/google-login-url');
            const data = await response.json();
            
            if (data.url) {
                // Google 로그인 페이지로 리다이렉트
                window.location.href = data.url;
                return; // 페이지 이동으로 처리 종료
            } else {
                throw new Error('로그인 URL을 가져오는데 실패했습니다');
            }
            } catch (error) {
            console.error('Google 로그인 오류:', error);
            commit('SET_LOADING', false);
            throw error;
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
        // 로그아웃 처리 (store/index.js)
        async logout({ commit }) {
            try {
            // 로컬 상태 초기화
            commit('CLEAR_AUTH');
            commit('SET_USER_CHECKED', true);
            
            // 계정 완전 로그아웃을 위해 Google 로그아웃 페이지로 이동
            // 이렇게 하면 다음 로그인 시 반드시 계정 선택 화면이 표시됨
            const redirectTo = encodeURIComponent(window.location.origin);
            window.location.href = `https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue=${redirectTo}`;
            } catch (e) {
            console.warn('로그아웃 오류:', e);
            // 로컬 로그아웃은 항상 수행
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