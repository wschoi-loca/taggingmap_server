import { createStore } from 'vuex'
import axios from 'axios'

const store = createStore({
  state: {
    token: localStorage.getItem('auth_token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    userChecked: false,
    loading: false,
    redirectPath: '/',
    apiBaseUrl: process.env.VUE_APP_API_BASE_URL || window.location.origin,
    environment: process.env.VUE_APP_ENV || 'unknown'
  },
  
  getters: {
    isAuthenticated: state => !!state.token && !!state.user,
    isAuthorized: state => state.user && state.user.role === 'admin',
    currentUser: state => state.user,
    isLoading: state => state.loading,
    redirectPath: state => state.redirectPath,
    apiBaseUrl: state => state.apiBaseUrl,
    isDevelopment: state => state.environment === 'development',
    isProduction: state => state.environment === 'production'
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
    
    async checkAuth({ commit, state, getters }) {
      try {
        console.log(`[Auth - ${state.environment}] 인증 확인 시작`);
        
        // 이미 확인됐으면 현재 상태 반환
        if (state.userChecked && state.user) {
          console.log(`[Auth - ${state.environment}] 사용자 확인됨:`, state.user.email);
          return state.user;
        }

        const token = localStorage.getItem('auth_token');
        
        // 토큰이 없으면 인증되지 않음
        if (!token) {
          console.log(`[Auth - ${state.environment}] 토큰 없음`);
          commit('CLEAR_AUTH');
          commit('SET_USER_CHECKED', true);
          return null;
        }
        
        // 서버 API를 통한 토큰 검증 (환경변수 사용)
        try {
          console.log(`[Auth - ${state.environment}] 서버 토큰 검증 시도:`, state.apiBaseUrl);
          
          const response = await axios.get(`${state.apiBaseUrl}/api/auth/verify`, {
            headers: {
              Authorization: `Bearer ${token}`
            },
            timeout: 10000 // 10초 타임아웃
          });
          
          if (response.data && response.data.user) {
            const user = response.data.user;
            console.log(`[Auth - ${state.environment}] 서버 검증 성공:`, user.email);
            
            commit('SET_TOKEN', token);
            commit('SET_USER', user);
            commit('SET_USER_CHECKED', true);
            return user;
          }
        } catch (serverError) {
          console.warn(`[Auth - ${state.environment}] 서버 검증 실패, 로컬 검증 시도:`, serverError.message);
          
          // 서버 검증 실패 시 로컬 토큰 검증으로 폴백
        }
        
        // 로컬 토큰 디코딩 및 검증 (기존 로직)
        try {
          console.log(`[Auth - ${state.environment}] 로컬 토큰 검증 시작`);
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const payload = JSON.parse(jsonPayload);
          console.log(`[Auth - ${state.environment}] 토큰 페이로드 확인:`, { 
            email: payload.email, 
            hd: payload.hd || '없음'
          });
          
          // 현재 시간과 만료 시간 비교
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            console.log(`[Auth - ${state.environment}] 토큰 만료됨`);
            throw new Error('토큰이 만료되었습니다');
          }

          // GWS 계정 확인 (hd 필드 사용)
          const isLotteCardGWS = payload.hd === 'lottecard.co.kr';
          const email = payload.email || '';
          
          // 특별 계정 확인 (wschoi-loca)
          const isSpecialUser = email.includes('wschoi-loca');
          
          // 개발 환경에서는 더 유연한 인증 (선택사항)
          const isDev = getters.isDevelopment;
          const isDevTestUser = isDev && (email.includes('test') || email.includes('dev'));
          
          // 인증 결정
          const isAuthorized = isLotteCardGWS || isSpecialUser || isDevTestUser;
          
          if (!isAuthorized) {
            console.warn(`[Auth - ${state.environment}] 인증되지 않은 사용자:`, email);
            throw new Error('lottecard.co.kr GWS 계정이 아닙니다');
          }
          
          console.log(`[Auth - ${state.environment}] 인증됨:`, { 
            email,
            isGWS: isLotteCardGWS,
            isSpecial: isSpecialUser,
            isDevTest: isDevTestUser,
            environment: state.environment
          });
          
          const user = {
            id: payload.sub,
            email: email,
            name: payload.name || email.split('@')[0],
            picture: payload.picture || null,
            role: 'admin', // 인증된 모든 사용자는 관리자 권한 부여
            verified_at: new Date().toISOString(),
            verification_method: 'local_token'
          };
          
          console.log(`[Auth - ${state.environment}] 사용자 정보 설정:`, user);
          
          // 상태 업데이트
          commit('SET_TOKEN', token);
          commit('SET_USER', user);
          commit('SET_USER_CHECKED', true);
          
          return user;
        } catch (error) {
          console.error(`[Auth - ${state.environment}] 토큰 검증 오류:`, error);
          commit('CLEAR_AUTH');
          commit('SET_USER_CHECKED', true);
          return null;
        }
      } catch (error) {
        console.error(`[Auth - ${state.environment}] 인증 확인 오류:`, error);
        commit('CLEAR_AUTH');
        commit('SET_USER_CHECKED', true);
        return null;
      }
    },
    
    async logout({ commit, state, getters }) {
      try {
        console.log(`[Auth - ${state.environment}] 로그아웃 시작`);
        
        // 서버에 로그아웃 요청 (선택사항)
        try {
          await axios.post(`${state.apiBaseUrl}/api/auth/logout`, {}, {
            headers: {
              Authorization: `Bearer ${state.token}`
            },
            timeout: 5000
          });
          console.log(`[Auth - ${state.environment}] 서버 로그아웃 완료`);
        } catch (error) {
          console.warn(`[Auth - ${state.environment}] 서버 로그아웃 실패:`, error.message);
        }
        
        // Google 로그인 상태 제거
        if (window.google && window.google.accounts) {
          window.google.accounts.id.disableAutoSelect();
        }
        
        // 로컬 상태 초기화
        commit('CLEAR_AUTH');
        commit('SET_USER_CHECKED', true);
        
        console.log(`[Auth - ${state.environment}] 로컬 상태 초기화 완료`);
        
        // 개발 환경에서는 바로 로그인 페이지로
        if (getters.isDevelopment) {
          window.location.href = '/login';
          return;
        }
        
        // 운영 환경에서는 Google 계정에서도 완전히 로그아웃
        const redirectUrl = encodeURIComponent(window.location.origin);
        window.location.href = `https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue=${redirectUrl}/login`;
      } catch (error) {
        console.error(`[Auth - ${state.environment}] 로그아웃 오류:`, error);
        commit('CLEAR_AUTH');
        commit('SET_USER_CHECKED', true);
        window.location.href = '/login';
      }
    },
    
    // 새로운 액션: 환경 정보 로깅
    logEnvironmentInfo({ state, getters }) {
      console.log('=== Vuex Store 환경 정보 ===');
      console.log('환경:', state.environment);
      console.log('API 서버:', state.apiBaseUrl);
      console.log('개발 모드:', getters.isDevelopment);
      console.log('운영 모드:', getters.isProduction);
      console.log('인증 상태:', getters.isAuthenticated);
      console.log('===========================');
    },
    
    // 새로운 액션: API 헬스체크
    async checkApiHealth({ state }) {
      try {
        console.log(`[Health Check] API 서버 상태 확인: ${state.apiBaseUrl}`);
        const response = await axios.get(`${state.apiBaseUrl}/api/health`, {
          timeout: 5000
        });
        console.log(`[Health Check] API 서버 정상:`, response.data);
        return true;
      } catch (error) {
        console.error(`[Health Check] API 서버 오류:`, error.message);
        return false;
      }
    }
  }
})

export default store