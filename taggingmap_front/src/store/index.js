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
        // store/index.js의 checkAuth 액션 수정
        async checkAuth({ commit, state }) {
            try {
            // 이미 확인됐으면 현재 상태 반환
            if (state.userChecked && state.user) {
                console.log('[Auth] 사용자 확인됨:', state.user.email);
                return state.user;
            }
        
            const token = localStorage.getItem('auth_token');
            
            // 토큰이 없으면 인증되지 않음
            if (!token) {
                console.log('[Auth] 토큰 없음');
                commit('CLEAR_AUTH');
                commit('SET_USER_CHECKED', true);
                return null;
            }
            
            // 토큰 디코딩 및 검증 (디버깅 로그 추가)
            try {
                console.log('[Auth] 토큰 검증 시작');
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                
                const payload = JSON.parse(jsonPayload);
                console.log('[Auth] 토큰 페이로드 확인:', { email: payload.email });
                
                // 현재 시간과 만료 시간 비교 (exp는 초 단위)
                const now = Math.floor(Date.now() / 1000);
                if (payload.exp && payload.exp < now) {
                console.log('[Auth] 토큰 만료됨');
                throw new Error('토큰이 만료되었습니다');
                }
        
                // 이메일 기반으로 권한 확인 및 설정 (wschoi-loca 계정 처리)
                const email = payload.email || '';
                console.log('[Auth] 이메일 확인:', email);
                
                // choiwonseok 계정 
                const isAdmin = email.includes('choiwonseok') ;
                console.log('[Auth] 관리자 여부:', isAdmin);
                
                const user = {
                id: payload.sub,
                email: email,
                name: payload.name || email.split('@')[0],
                picture: payload.picture || null,
                role: isAdmin ? 'admin' : 'user'
                };
                
                console.log('[Auth] 사용자 정보 설정:', user);
                
                // 상태 업데이트
                commit('SET_TOKEN', token);
                commit('SET_USER', user);
                commit('SET_USER_CHECKED', true);
                
                return user;
            } catch (error) {
                console.error('[Auth] 토큰 검증 오류:', error);
                commit('CLEAR_AUTH');
                commit('SET_USER_CHECKED', true);
                return null;
            }
            } catch (error) {
            console.error('[Auth] 인증 확인 오류:', error);
            commit('CLEAR_AUTH');
            commit('SET_USER_CHECKED', true);
            return null;
            }
        },
        
        // 로그아웃 처리
        // 로그아웃 처리 (store/index.js)
        // store/index.js의 logout 액션 수정
        async logout({ commit }) {
            try {
            // Google 로그인 상태 제거
            if (window.google && window.google.accounts) {
                window.google.accounts.id.disableAutoSelect();
            }
            
            // 로컬 상태 초기화
            commit('CLEAR_AUTH');
            commit('SET_USER_CHECKED', true);
            
            // 세션 쿠키 제거
            document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
            
            // Google 계정에서도 완전히 로그아웃
            const redirectUrl = encodeURIComponent(window.location.origin);
            window.location.href = `https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue=${redirectUrl}/login`;
            
            } catch (error) {
            console.error('로그아웃 오류:', error);
            
            // 오류가 발생하더라도 로컬 상태는 초기화
            commit('CLEAR_AUTH');
            commit('SET_USER_CHECKED', true);
            
            // 홈페이지로 이동
            window.location.href = '/login';
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