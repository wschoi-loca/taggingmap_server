<template>
    <div class="home">
      <h1>태깅맵 페이지 목록</h1>
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>페이지 목록을 불러오는 중입니다...</p>
      </div>
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="fetchPages">다시 시도</button>
      </div>
      <div v-else class="page-list">
        <div v-for="page in pages" :key="page.pagetitle" class="page-item">
          <router-link :to="formatPageUrl(page.pagetitle)">
            {{ page.pagetitle }}
          </router-link>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import axios from 'axios';
  
  export default {
    name: 'HomeView',
    data() {
      return {
        pages: [],
        loading: true,
        error: null
      }
    },
    created() {
      this.fetchPages();
    },
    methods: {
      async fetchPages() {
        try {
          this.loading = true;
          this.error = null;
          
          const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
          const response = await axios.get(`${baseUrl}/api/pagetitles`);
          this.pages = response.data;
          this.loading = false;
        } catch (error) {
          console.error('Error fetching pages:', error);
          this.error = '페이지 목록을 불러오는데 실패했습니다.';
          this.loading = false;
        }
      },
      formatPageUrl(pagetitle) {
        // PAGETITLE을 URL 형식으로 변환
        const pageParts = pagetitle.split('>');
        
        // 서브도메인 추출 로직
        // URL 데이터가 있는 문서를 찾거나 기본값 사용
        const subdomain = this.extractSubdomainFromPagetitle(pagetitle);
        
        return `/${subdomain}/${pageParts.join('/')}`;
      },
      extractSubdomainFromPagetitle(pagetitle) {
        // 현재는 모든 페이지에 대해 'dmoweb3' 반환
        // 실제 구현에서는 DB에서 해당 PAGETITLE의 URL을 찾아 서브도메인 추출
        return 'dmoweb3';
      }
    }
  }
  </script>
  
  <style scoped>
  .home {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  h1 {
    margin-bottom: 30px;
    color: #333;
    border-bottom: 2px solid #eaeaea;
    padding-bottom: 15px;
  }
  
  .page-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 15px;
  }
  
  .page-item {
    background-color: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 5px;
    padding: 15px;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .page-item:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  
  .page-item a {
    color: #495057;
    text-decoration: none;
    display: block;
    font-weight: 500;
  }
  
  .loading, .error {
    text-align: center;
    padding: 40px 0;
  }
  
  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border-left-color: #09f;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  button {
    padding: 8px 16px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background-color: #0069d9;
  }
  </style>