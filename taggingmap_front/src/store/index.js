import { createStore } from 'vuex'

const store = createStore({
  state: {
    token: localStorage.getItem('auth_token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    userChecked: false,
    loading: false,
    redirectPath: '/'
  },
  
  getters: {
    isAuthenticated: state => !!state.token && !!state.user,
    isAuthorized: state => state.user && state.user.role === 'admin',
    currentUser: state => state.user,
    isLoading: state => state.loading,
    redirectPath: state => state.redirectPath
  },
  
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token;
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    },
    SET_USER(state, user) {
      state.user = user;
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    },
    SET_USER_CHECKED(state, checked) {
      state.userChecked = checked;
    },
    SET_LOADING(state, loading) {
      state.loading = loading;
    },
    SET_REDIRECT_PATH(state, path) {
      state.redirectPath = path;
    },
    CLEAR_AUTH(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  },
  
  actions: {
    setRedirectPath({ commit }, path) {
      commit('SET_REDIRECT_PATH', path);
    },
    
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
        
        // 토큰 디코딩 및 검증
        try {
          console.log('[Auth] 토큰 검증 시작');
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const payload = JSON.parse(jsonPayload);
          console.log('[Auth] 토큰 페이로드 확인:', { 
            email: payload.email, 
            hd: payload.hd || '없음'
          });
          
          // 현재 시간과 만료 시간 비교
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            console.log('[Auth] 토큰 만료됨');
            throw new Error('토큰이 만료되었습니다');
          }

          // GWS 계정 확인 (hd 필드 사용)
          const isLotteCardGWS = payload.hd === 'lottecard.co.kr';
          const email = payload.email || '';
          
          // 특별 계정 확인 (wschoi-loca)
          const isSpecialUser = email.includes('wschoi-loca');
          
          // 인증 결정
          const isAuthorized = isLotteCardGWS || isSpecialUser;
          
          if (!isAuthorized) {
            console.warn('[Auth] 인증되지 않은 사용자:', email);
            throw new Error('lottecard.co.kr GWS 계정이 아닙니다');
          }
          
          console.log('[Auth] 인증됨:', { 
            email,
            isGWS: isLotteCardGWS,
            isSpecial: isSpecialUser
          });
          
          const user = {
            id: payload.sub,
            email: email,
            name: payload.name || email.split('@')[0],
            picture: payload.picture || null,
            role: 'admin' // 인증된 모든 사용자는 관리자 권한 부여
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
    
    async logout({ commit }) {
      try {
        // Google 로그인 상태 제거
        if (window.google && window.google.accounts) {
          window.google.accounts.id.disableAutoSelect();
        }
        
        // 로컬 상태 초기화
        commit('CLEAR_AUTH');
        commit('SET_USER_CHECKED', true);
        
        // Google 계정에서도 완전히 로그아웃
        const redirectUrl = encodeURIComponent(window.location.origin);
        window.location.href = `https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue=${redirectUrl}/login`;
      } catch (error) {
        console.error('로그아웃 오류:', error);
        commit('CLEAR_AUTH');
        commit('SET_USER_CHECKED', true);
        window.location.href = '/login';
      }
    }
  }
})

export default store