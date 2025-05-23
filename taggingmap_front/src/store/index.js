// store/index.js
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
      // 인증 상태 확인 (페이지 로드마다 호출)
      async checkAuth({ commit, state }) {
        try {
          if (state.userChecked && state.user) {
            return state.user;
          }
  
          const token = localStorage.getItem('auth_token');
          
          if (!token) {
            commit('CLEAR_AUTH');
            commit('SET_USER_CHECKED', true);
            return null;
          }
          
          // JWT 토큰 검증
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(atob(base64));
            
            // 토큰 만료 확인
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
              throw new Error('토큰이 만료되었습니다');
            }
            
            // ★ 중요: GWS 도메인 확인 (hd 필드)
            const isGwsUser = payload.hd === 'lottecard.co.kr' || (payload.email && payload.email.endsWith('@loca.kr'));
            
            if (!isGwsUser) {
              console.warn('GWS 사용자가 아닙니다:', payload);
              throw new Error('GWS 사용자가 아닙니다');
            }
            
            // 사용자 정보 및 권한 설정
            const user = {
              id: payload.sub,
              email: payload.email,
              name: payload.name || payload.email.split('@')[0],
              picture: payload.picture,
              role: isGwsUser ? 'admin' : 'user'
            };
            
            // 상태 업데이트
            commit('SET_TOKEN', token);
            commit('SET_USER', user);
            commit('SET_USER_CHECKED', true);
            
            return user;
          } catch (error) {
            console.error('토큰 검증 오류:', error);
            commit('CLEAR_AUTH');
            commit('SET_USER_CHECKED', true);
            return null;
          }
        } catch (error) {
          console.error('인증 확인 오류:', error);
          commit('CLEAR_AUTH');
          commit('SET_USER_CHECKED', true);
          return null;
        }
      }
    }
  });