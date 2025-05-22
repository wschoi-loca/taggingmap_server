// store/auth.js
export default {
    state: {
      token: localStorage.getItem('auth_token') || null,
      user: JSON.parse(localStorage.getItem('user')) || null
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
      }
    },
    getters: {
      isLoggedIn: state => !!state.token,
      user: state => state.user
    }
  }