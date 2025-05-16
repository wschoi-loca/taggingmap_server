<!-- taggingmap_front/src/views/HomeView.vue -->
<template>
  <div class="home">
    <h2>태깅맵 목록</h2>
    <div v-if="loading">로딩중...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="Object.keys(groupedData).length === 0">데이터가 없습니다.</div>
    <div v-else class="page-list">
      <!-- PAGETITLE 목록 -->
      <div v-for="(urls, pageTitle) in groupedData" :key="pageTitle" class="page-group">
        <!-- 페이지 타이틀 -->
        <h3 class="page-title">
          <router-link 
            :to="generateDetailRoute(pageTitle)" 
            class="page-link"
          >
            {{ pageTitle }}
          </router-link>
        </h3>

        <!-- URL 목록 -->
        <ul class="url-list">
          <li v-for="(count, url) in urls" :key="url" class="url-item">
            <a :href="url" target="_blank" class="url-link" :title="url">
              {{ shortenUrl(url) }}
            </a>
            <span class="url-count">({{ count }}건)</span>
          </li>
        </ul>
      </div>
    </div>
    <pre style="text-align: left; margin-top: 20px;">{{ debugInfo }}</pre>
  </div>
</template>

<script>
export default {
  name: 'HomeView',
  data() {
    return {
      taggingMaps: [],
      groupedData: {},
      error: null,
      loading: true,
      debugInfo: ''
    };
  },
  created() {
    this.fetchTaggingMaps();
  },
  methods: {
    async fetchTaggingMaps() {
      try {
        this.loading = true;
        const response = await fetch('/api/taggingMaps');
        
        if (!response.ok) {
          throw new Error(`API 응답 오류: ${response.status}`);
        }
        
        const data = await response.json();
        this.taggingMaps = data;
        
        // PAGETITLE별로 URL을 그룹화
        this.groupDataByPageTitle(data);
        
        // 디버깅용 정보
        this.debugInfo = `API 응답: ${data.length}개의 항목, ${Object.keys(this.groupedData).length}개의 고유 페이지 타이틀 로드됨`;
      } catch (error) {
        console.error('Error fetching taggingMaps:', error);
        this.error = `데이터 로드 실패: ${error.message}`;
        this.debugInfo = `오류: ${error.toString()}`;
      } finally {
        this.loading = false;
      }
    },
    
    // PAGETITLE별로 URL 그룹화 및 중복 제거
    groupDataByPageTitle(data) {
      const groupedData = {};
      
      data.forEach(item => {
        if (!item.PAGETITLE) return;
        
        const pageTitle = item.PAGETITLE;
        const url = item.URL;
        
        if (!groupedData[pageTitle]) {
          groupedData[pageTitle] = {};
        }
        
        // URL별 카운트 증가
        if (!groupedData[pageTitle][url]) {
          groupedData[pageTitle][url] = 1;
        } else {
          groupedData[pageTitle][url]++;
        }
      });
      
      // 페이지 타이틀 알파벳순 정렬
      this.groupedData = Object.keys(groupedData)
        .sort()
        .reduce((acc, pageTitle) => {
          acc[pageTitle] = groupedData[pageTitle];
          return acc;
        }, {});
    },
    
    // URL 단축 표시 (가독성을 위해)
    shortenUrl(url) {
      if (!url) return '';
      
      try {
        const parsedUrl = new URL(url);
        let path = parsedUrl.pathname;
        
        // 경로가 너무 길면 축약
        if (path.length > 30) {
          path = path.substring(0, 27) + '...';
        }
        
        // 쿼리 파라미터가 있으면 축약 표시
        return `${path}${parsedUrl.search ? '?' + parsedUrl.search.substring(1, 15) + (parsedUrl.search.length > 15 ? '...' : '') : ''}`;
      } catch (e) {
        return url.length > 50 ? url.substring(0, 47) + '...' : url;
      }
    },
    
    // 수정: 상세 페이지 라우트 생성 함수 (문서 루트의 PAGETITLE 사용)
    generateDetailRoute(pageTitle) {
      if (!pageTitle) return '/';
      
      // PAGETITLE 형식 (예: 'dmoweb3>front>satellite>main>discovery')를 
      // URL 경로 형식으로 변환 (예: '/dmoweb3/front/satellite/main/discovery')
      const urlPath = pageTitle.replace(/>/g, '/');
      
      return `/${urlPath}`;
    }
  }
};
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.page-group {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.page-title {
  margin: 0;
  padding: 12px 15px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.page-link {
  color: #2c3e50;
  text-decoration: none;
  font-weight: bold;
}

.page-link:hover {
  color: #42b983;
  text-decoration: underline;
}

.url-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.url-item {
  padding: 10px 15px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.url-item:last-child {
  border-bottom: none;
}

.url-link {
  color: #0366d6;
  text-decoration: none;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 85%;
}

.url-link:hover {
  text-decoration: underline;
}

.url-count {
  color: #6c757d;
  font-size: 0.85em;
  margin-left: 8px;
}

.error {
  color: #dc3545;
  padding: 15px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

pre {
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  overflow: auto;
}
</style>