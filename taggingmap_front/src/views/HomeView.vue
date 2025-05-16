<!-- taggingmap_front/src/views/HomeView.vue -->
<template>
  <div class="home">
    <h2>태깅맵 목록</h2>
    <div v-if="loading">로딩중...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="taggingMaps.length === 0">데이터가 없습니다.</div>
    <div v-else>
      <div v-for="taggingMap in taggingMaps" :key="taggingMap._id" class="page-data">
        <div class="image-section">
          <!-- 페이지 타이틀 클릭 시 상세 페이지로 이동 -->
          <h3 class="page-title">
            <router-link 
              :to="generateDetailRoute(taggingMap)" 
              class="page-link"
            >
              {{ getValue(taggingMap.eventParams, 'PAGETITLE') }}
            </router-link>
          </h3>
          <img v-if="taggingMap.image" :src="taggingMap.image" alt="Captured Image" />
          <p v-else>이미지 없음</p>
        </div>
        <table v-if="Array.isArray(taggingMap.eventParams) && taggingMap.eventParams.length > 0">
          <thead>
            <tr>
              <th>SHOT_NUMBER</th>
              <th>EVENTNAME</th>
              <th>PAGETITLE</th>
              <th>TIME</th>
              <th>LABEL_TEXT</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(data, index) in taggingMap.eventParams" :key="index">
              <td>{{ data.SHOT_NUMBER || '-' }}</td>
              <td>{{ data.EVENTNAME || '-' }}</td>
              <td>{{ data.PAGETITLE || '-' }}</td>
              <td>{{ data.TIME || '-' }}</td>
              <td>{{ data.LABEL_TEXT || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else>태깅 데이터 없음</p>
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
        
        // 디버깅용 정보
        this.debugInfo = `API 응답: ${data.length}개의 항목 로드됨`;
      } catch (error) {
        console.error('Error fetching taggingMaps:', error);
        this.error = `데이터 로드 실패: ${error.message}`;
        this.debugInfo = `오류: ${error.toString()}`;
      } finally {
        this.loading = false;
      }
    },
    getValue(dataArray, key) {
      if (Array.isArray(dataArray) && dataArray.length > 0) {
        return dataArray[0][key] || '-';
      }
      return '-';
    },
    // 새로 추가: 상세 페이지 라우트 생성 함수
    generateDetailRoute(taggingMap) {
      if (!taggingMap.eventParams || taggingMap.eventParams.length === 0) {
        return '/';
      }
      
      const pageTitle = taggingMap.eventParams[0].PAGETITLE;
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
}

.page-data {
  border: 1px solid #eee;
  margin-bottom: 20px;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.image-section {
  margin-bottom: 15px;
}

.page-title {
  cursor: pointer;
  margin-bottom: 10px;
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

.error {
  color: red;
  font-weight: bold;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
}

img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}
</style>