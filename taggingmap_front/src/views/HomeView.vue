<!-- taggingmap_front/src/views/HomeView.vue -->
<template>
  <div class="home">
    <h2>태깅맵 목록</h2>
    
    <!-- 검색 및 필터링 섹션 -->
    <div class="filter-controls">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="페이지 타이틀 검색..." 
          @input="handleSearchInput"
        />
        <button 
          class="advanced-search-btn" 
          @click="toggleAdvancedSearch"
        >
          컬럼별 검색
        </button>
      </div>
    </div>
    
    <!-- 로딩 상태 -->
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>데이터를 불러오는 중입니다...</p>
    </div>
    
    <!-- 에러 상태 -->
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="fetchPageData" class="retry-button">다시 시도</button>
    </div>
    
    <!-- 데이터 없음 상태 -->
    <div v-else-if="Object.keys(groupedData).length === 0" class="no-data">
      <p>데이터가 없습니다.</p>
    </div>
    
    <!-- 페이지 목록 표시 -->
    <div v-else class="page-list">
      <!-- 적용된 필터 표시 -->
      <div v-if="hasActiveFilters" class="active-filters">
        <span class="filter-label">적용된 필터:</span>
        <div class="filter-tags">
          <div v-if="advancedSearchFilters.eventType" class="filter-tag">
            이벤트 타입: {{ advancedSearchFilters.eventType }}
            <button @click="removeFilter('eventType')" class="remove-filter">&times;</button>
          </div>
          <div 
            v-for="(value, key) in displayedFilters" 
            :key="key" 
            class="filter-tag"
          >
            {{ key }}: {{ value.anyValue ? '아무 값' : value.value }}
            <button @click="removeFilter(key)" class="remove-filter">&times;</button>
          </div>
        </div>
        <button class="clear-filters" @click="clearAllFilters">모든 필터 지우기</button>
      </div>
      
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
          <li v-for="(urlData, url) in urls" :key="url" class="url-item">
            <router-link 
              :to="generateDetailRouteWithUrlFilter(pageTitle, url)" 
              class="url-link" 
              :title="url"
            >
              {{ url }}
            </router-link>
            <span class="url-count">({{ urlData.distinctCount }}건)</span>
          </li>
        </ul>
      </div>
    </div>
    
    <!-- 페이지네이션 컨트롤 -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        @click="loadPreviousPage" 
        :disabled="currentPage <= 1" 
        class="pagination-button"
      >
        이전
      </button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button 
        @click="loadNextPage" 
        :disabled="currentPage >= totalPages" 
        class="pagination-button"
      >
        다음
      </button>
    </div>
    
    <!-- 고급 검색 모달 -->
    <div v-if="showAdvancedSearch" class="modal-overlay" @click.self="toggleAdvancedSearch">
      <div class="modal-content advanced-search-modal">
        <div class="modal-header">
          <h3>고급 검색</h3>
          <button class="close-button" @click="toggleAdvancedSearch">&times;</button>
        </div>
        <div class="modal-body">
          <!-- 이벤트 타입 필터 -->
          <div class="filter-group">
            <label>이벤트 시점:</label>
            <div class="button-group">
              <button 
                :class="['filter-button', advancedFilters.eventType === 'visibility' ? 'active' : '']"
                @click="advancedFilters.eventType = 'visibility'"
              >
                노출
              </button>
              <button 
                :class="['filter-button', advancedFilters.eventType === 'click' ? 'active' : '']"
                @click="advancedFilters.eventType = 'click'"
              >
                클릭
              </button>
            </div>
          </div>
          
          <!-- 필드별 검색 -->
          <div class="search-fields">
            <!-- 동적으로 검색 필드 생성 -->
            <div v-for="field in searchFields" :key="field" class="field-filter">
              <div class="field-name">{{ field }}:</div>
              <div class="field-options">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="advancedFilters.fields[field].anyValue"> 
                  아무값이나
                </label>
                <input 
                  type="text" 
                  v-model="advancedFilters.fields[field].value" 
                  :disabled="advancedFilters.fields[field].anyValue"
                  placeholder="포함 조건 입력"
                >
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="reset-button" @click="resetAdvancedFilters">초기화</button>
          <button class="apply-button" @click="applyAdvancedSearch">적용</button>
        </div>
      </div>
    </div>
    
    <!-- 디버그 정보 (개발 중에만 표시) -->
    <pre v-if="showDebug" class="debug-info">{{ debugInfo }}</pre>
  </div>
</template>

<script>
export default {
  name: 'HomeView',
  data() {
    // 검색 가능한 모든 필드 정의
    const fieldsList = [
      "EVENTNAME",
      "LABEL_TEXT",
      "PAGE_MKT_CONTS_ID",
      "PAGEPATH",
      "PAGETITLE",
      "CATEGORY_DEPTH1",
      "CATEGORY_DEPTH2",
      "CATEGORY_DEPTH3",
      "CATEGORY_DEPTH4",
      "CATEGORY_DEPTH5",
      "CATEGORY_DEPTH6",
      "CATEGORY_DEPTH7",
      "CATEGORY_DEPTH8",
      "CATEGORY_DEPTH9",
      "CATEGORY_DEPTH10",
      "CONTENT_NM",
      "SUB_CONTENT_ID",
      "SUB_CTS_ID1",
      "SUB_CTS_ID2",
      "SUB_CTS_ID3",
      "SUB_CTS_ID4",
      "SUB_CTS_ID5",
      "CONTENT_NM1",
      "CONTENT_NM2",
      "CONTENT_NM3",
      "HORIZONTAL_INDEX",
      "VERTICAL_INDEX",
      "popup_message",
      "popup_button",
      "popup_class",
      "AUTO_TAG_YN",
      "TIME"
    ];
    
    // 필드별 초기 검색 필터 객체 생성
    const initialFieldFilters = {};
    fieldsList.forEach(field => {
      initialFieldFilters[field] = { anyValue: false, value: '' };
    });
    
    return {
      groupedData: {},
      error: null,
      loading: true,
      currentPage: 1,
      totalPages: 0,
      itemsPerPage: 20,
      searchQuery: '',
      searchTimeout: null,
      showDebug: process.env.NODE_ENV === 'development',
      debugInfo: '',
      
      // 고급 검색 관련
      showAdvancedSearch: false,
      searchFields: fieldsList,
      advancedFilters: {
        eventType: '', // visibility 또는 click
        fields: JSON.parse(JSON.stringify(initialFieldFilters))
      },
      advancedSearchFilters: {
        eventType: '',
        fields: {}
      },
      initialFieldFilters: JSON.parse(JSON.stringify(initialFieldFilters))
    };
  },
  
  computed: {
    hasActiveFilters() {
      if (this.advancedSearchFilters.eventType) return true;
      
      for (const key in this.advancedSearchFilters.fields) {
        const filter = this.advancedSearchFilters.fields[key];
        if (filter.anyValue || filter.value) return true;
      }
      
      return false;
    },
    
    displayedFilters() {
      const filters = {};
      for (const key in this.advancedSearchFilters.fields) {
        const filter = this.advancedSearchFilters.fields[key];
        if (filter.anyValue || filter.value) {
          filters[key] = filter;
        }
      }
      return filters;
    }
  },
  
  created() {
    this.fetchPageData();
  },
  
  methods: {
    async fetchPageData() {
      try {
        this.loading = true;
        
        // 검색어 및 페이지네이션 파라미터 구성
        const params = new URLSearchParams({
          page: this.currentPage,
          limit: this.itemsPerPage
        });
        
        if (this.searchQuery) {
          params.append('search', this.searchQuery);
        }
        
        // 고급 검색 필터 추가
        if (this.advancedSearchFilters.eventType) {
          params.append('eventType', this.advancedSearchFilters.eventType);
        }
        
        // 필드별 필터 추가
        for (const field in this.advancedSearchFilters.fields) {
          const filter = this.advancedSearchFilters.fields[field];
          if (filter.anyValue) {
            params.append(`${field}_exists`, 'true');
          } else if (filter.value) {
            params.append(field, filter.value);
          }
        }
        
        const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/taggingMaps/summary?${params}`);
        
        if (!response.ok) {
          throw new Error(`API 응답 오류: ${response.status}`);
        }
        
        const { data, pagination } = await response.json();
        
        // 데이터를 적절한 형식으로 변환
        const formattedData = data.reduce((acc, item) => {
          const urls = {};
          
          // URL 데이터 구성
          if (item.urls && Array.isArray(item.urls)) {
            item.urls.forEach(urlItem => {
              if (urlItem.url) {
                urls[urlItem.url] = { 
                  distinctCount: urlItem.distinctCount || 0,
                  eventNames: urlItem.eventNames || []
                };
              }
            });
          }
          
          if (item.pagetitle) {
            acc[item.pagetitle] = urls;
          }
          
          return acc;
        }, {});
        
        // 데이터 및 페이지네이션 정보 업데이트
        this.groupedData = formattedData;
        this.currentPage = pagination.page;
        this.totalPages = Math.ceil(pagination.total / pagination.limit);
        
        // 디버깅 정보
        this.debugInfo = `요약 데이터 로드: ${data.length}개 페이지, 총 ${pagination.total}개 중 ${pagination.page}/${Math.ceil(pagination.total/pagination.limit)} 페이지`;
        
        if (Object.keys(this.groupedData).length === 0 && this.currentPage > 1) {
          // 현재 페이지에 데이터가 없으면 첫 페이지로 이동
          this.currentPage = 1;
          await this.fetchPageData();
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        this.error = `데이터 로드 실패: ${error.message}`;
        this.debugInfo = `오류: ${error.toString()}`;
      } finally {
        this.loading = false;
      }
    },
    
    // 검색 관련 메소드
    handleSearchInput() {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      
      this.searchTimeout = setTimeout(() => {
        this.currentPage = 1;  // 검색 시 첫 페이지로 이동
        this.fetchPageData();
      }, 500);  // 500ms 디바운스
    },
    
    // 고급 검색 모달 토글
    toggleAdvancedSearch() {
      this.showAdvancedSearch = !this.showAdvancedSearch;
      
      // 모달이 열릴 때 현재 적용된 필터로 초기화
      if (this.showAdvancedSearch) {
        this.advancedFilters.eventType = this.advancedSearchFilters.eventType || '';
        
        // 깊은 복사로 필드 필터 초기화
        this.advancedFilters.fields = JSON.parse(JSON.stringify(this.initialFieldFilters));
        
        // 현재 적용된 필터가 있으면 설정
        for (const field in this.advancedSearchFilters.fields) {
          if (this.advancedFilters.fields[field]) {
            this.advancedFilters.fields[field] = { 
              ...this.advancedSearchFilters.fields[field] 
            };
          }
        }
      }
    },
    
    // 고급 검색 필터 초기화
    resetAdvancedFilters() {
      this.advancedFilters.eventType = '';
      this.advancedFilters.fields = JSON.parse(JSON.stringify(this.initialFieldFilters));
    },
    
    // 고급 검색 적용
    applyAdvancedSearch() {
      // 깊은 복사로 현재 필터 상태 저장
      this.advancedSearchFilters.eventType = this.advancedFilters.eventType;
      this.advancedSearchFilters.fields = JSON.parse(JSON.stringify(this.advancedFilters.fields));
      
      // 검색 실행
      this.currentPage = 1;
      this.fetchPageData();
      this.toggleAdvancedSearch();
    },
    
    // 필터 제거
    removeFilter(key) {
      if (key === 'eventType') {
        this.advancedSearchFilters.eventType = '';
      } else {
        if (this.advancedSearchFilters.fields[key]) {
          this.advancedSearchFilters.fields[key] = { anyValue: false, value: '' };
        }
      }
      
      // 필터 변경 후 검색 실행
      this.currentPage = 1;
      this.fetchPageData();
    },
    
    // 모든 필터 초기화
    clearAllFilters() {
      this.advancedSearchFilters.eventType = '';
      this.advancedSearchFilters.fields = JSON.parse(JSON.stringify(this.initialFieldFilters));
      
      // 필터 초기화 후 검색 실행
      this.currentPage = 1;
      this.fetchPageData();
    },
    
    // 페이지네이션 처리
    loadNextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.fetchPageData();
        // 페이지 상단으로 스크롤
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    
    loadPreviousPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.fetchPageData();
        // 페이지 상단으로 스크롤
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    
    // 상세 페이지 라우트 생성 함수 (문서 루트의 PAGETITLE 사용)
    generateDetailRoute(pageTitle) {
      if (!pageTitle) return '/';
      
      // PAGETITLE 형식 (예: 'dmoweb3>front>satellite>main>discovery')를 
      // URL 경로 형식으로 변환 (예: '/dmoweb3/front/satellite/main/discovery')
      const urlPath = pageTitle.replace(/>/g, '/');
      
      return `/${urlPath}`;
    },
    
    // URL 필터가 적용된 상세 페이지 라우트 생성 함수
    generateDetailRouteWithUrlFilter(pageTitle, url) {
      if (!pageTitle || !url) return '/';
      
      const basePath = this.generateDetailRoute(pageTitle);
      
      // URL을 쿼리 파라미터로 인코딩하여 전달
      const encodedUrl = encodeURIComponent(url);
      
      // URL 정보와 이벤트 타입을 쿼리 파라미터로 포함
      return {
        path: basePath,
        query: {
          url: encodedUrl,
          // 해당 URL의 기본 이벤트 타입 (click 또는 visibility)
          eventType: this.groupedData[pageTitle][url].eventNames?.includes('click') ? 'click' : 'visibility'
        }
      };
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

h2 {
  margin-bottom: 20px;
  color: #333;
  border-bottom: 2px solid #eaeaea;
  padding-bottom: 10px;
}

.filter-controls {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
}

.search-box {
  flex: 1;
  min-width: 250px;
  display: flex;
  gap: 10px;
}

.search-box input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.advanced-search-btn {
  padding: 10px 15px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.advanced-search-btn:hover {
  background-color: #388E3C;
}

/* 활성 필터 표시 */
.active-filters {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 10px 15px;
  margin-bottom: 15px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.filter-label {
  font-weight: bold;
  margin-right: 5px;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  background-color: #e9ecef;
  border-radius: 16px;
  padding: 5px 10px;
  font-size: 14px;
}

.remove-filter {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  margin-left: 5px;
  padding: 0 5px;
}

.clear-filters {
  margin-left: auto;
  background-color: transparent;
  color: #dc3545;
  border: 1px solid #dc3545;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 14px;
  cursor: pointer;
}

.clear-filters:hover {
  background-color: #dc3545;
  color: white;
}

.loading-container {
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
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.page-group:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
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
  display: block;
}

.page-link:hover {
  color: #42b983;
  text-decoration: underline;
}

.url-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 300px;
  overflow-y: auto;
}

.url-item {
  padding: 10px 15px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s ease;
}

.url-item:last-child {
  border-bottom: none;
}

.url-item:hover {
  background-color: #f8f9fa;
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
  white-space: nowrap;
}

.error {
  color: #dc3545;
  padding: 15px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin-bottom: 20px;
}

.no-data {
  text-align: center;
  padding: 40px 0;
  color: #6c757d;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 15px;
}

.pagination-button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.pagination-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.pagination-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #6c757d;
}

.retry-button {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-button:hover {
  background-color: #218838;
}

/* 모달 스타일 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.close-button:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.reset-button {
  padding: 8px 16px;
  background-color: #f8f9fa;
  color: #6c757d;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.reset-button:hover {
  background-color: #e9ecef;
}

.apply-button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.apply-button:hover {
  background-color: #0056b3;
}

/* 고급 검색 모달 스타일 */
.advanced-search-modal {
  width: 90%;
  max-width: 800px;
}

.filter-group {
  margin-bottom: 20px;
}

.filter-group label {
  display: block;
  margin-bottom: 10px;
  font-weight: bold;
}

.button-group {
  display: flex;
  gap: 10px;
}

.filter-button {
  flex: 1;
  padding: 10px;
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.filter-button:hover {
  background-color: #e0e0e0;
}

.filter-button.active {
  background-color: #007bff;
  color: white;
  border-color: #0056b3;
}

.search-fields {
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 10px;
}

.field-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #eee;
}

.field-name {
  width: 180px;
  font-weight: 500;
  color: #495057;
}

.field-options {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 15px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 120px;
  user-select: none;
}

.field-options input[type="text"] {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.debug-info {
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #6c757d;
  margin-top: 20px;
  white-space: pre-wrap;
  overflow-x: auto;
}
</style>