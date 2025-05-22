<template>
    <header class="app-header">
      <div class="logo">태깅맵</div>
      <div class="user-section">
        <template v-if="isLoggedIn">
          <div class="user-profile">
            <img :src="user.picture" alt="프로필" />
            <span>{{ user.name }}</span>
          </div>
          <button @click="logout" class="logout-btn">로그아웃</button>
        </template>
        <router-link v-else to="/login" class="login-link">로그인</router-link>
      </div>
    </header>
  </template>
  
  <script>
  import { mapGetters } from 'vuex'
  
  export default {
    computed: {
      ...mapGetters(['isLoggedIn', 'user'])
    },
    methods: {
      async logout() {
        await this.$gAuth.signOut()
        this.$store.commit('clearAuth')
        this.$router.push('/login')
      }
    }
  }
  </script>