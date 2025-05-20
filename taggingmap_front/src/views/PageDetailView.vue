<template>
  <div class="page-detail">
    <h1>{{ formattedPagetitle }}</h1>
    
    <!-- 필터 섹션 -->
    <div class="filter-section">
      <!-- 이벤트 유형 필터 -->
      <div class="filter-group">
        <label>이벤트 유형:</label>
        <div class="button-group">
          <button 
            :class="['filter-button', selectedEventType === 'visibility' ? 'active' : '']"
            @click="selectEventType('visibility')"
            :disabled="loading"
          >
            노출
          </button>
          <button 
            :class="['filter-button', selectedEventType === 'click' ? 'active' : '']"
            @click="selectEventType('click')"
            :disabled="loading"
          >
            클릭
          </button>
        </div>
      </div>
      
      <!-- URL 필터 -->
      <div class="filter-group">
        <label for="url-select">URL:</label>
        <select 
        id="url-select" 
        v-model="selectedUrl" 
        @change="handleUrlChange"
        :disabled="!selectedEventType || urls.length === 0"
        >
          <option value="">URL 선택</option>
          <option v-for="url in urls" :key="url.url" :value="url.url">
            {{ url.url }}
          </option>
        </select>
      </div>
      
      <!-- 타임스탬프 필터 -->
      <div class="filter-group">
        <label for="time-select">타임스탬프:</label>
        <select 
          id="time-select" 
          v-model="selectedTimestamp"
          @change="handleTimestampChange"
          :disabled="!selectedUrl || times.length === 0"
        >
          <option value="">타임스탬프 선택</option>
          <option v-for="time in times" :key="time.timestamp" :value="time.timestamp">
            {{ formatTimestamp(time.timestamp) }} {{ time.hasPopup ? "    (popup 데이터)" : "" }}
          </option>
        </select>
      </div>
    </div>     
    <!-- 로딩 상태 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>데이터를 불러오는 중입니다...</p>
    </div>
    
    <!-- 에러 상태 -->
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="fetchPageData">다시 시도</button>
    </div>
    
    <!-- 데이터 없음 상태 -->
    <div v-else-if="taggingMaps.length === 0" class="no-data">
      <p>선택한 조건에 맞는 데이터가 없습니다.</p>
    </div>
    
    <!-- 데이터 표시 -->
    <div v-else class="content-section">
      <div class="image-section">
        <img :src="taggingMaps[0].image" alt="Captured Image" />
      </div>
      
      <div class="data-section">
        <table>
          <thead>
            <tr>
              <th>SHOT_NUMBER</th>
              <th v-for="column in sortedColumns" :key="column">{{ column }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="data in taggingMaps[0].eventParams" :key="data.SHOT_NUMBER">
              <td>{{ data.SHOT_NUMBER }}</td>
              <td v-for="column in sortedColumns" :key="`${data.SHOT_NUMBER}-${column}`">
                {{ data[column] || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'PageDetailView',
  props: {
    subdomain: String,
    pathMatch: Array
  },
  data() {
    return {
      taggingMaps: [],
      urls: [],
      times: [],
      selectedEventType: 'visibility', // 기본값을 'visibility'로 설정
      selectedUrl: '',
      selectedTimestamp: '',
      isPopupFilter: false, // 팝업 필터링 상태 (UI 요소는 제거했지만 기능은 유지)
      loading: true,
      error: null,
      preSelectedUrl: null,
      preSelectedEventType: null, // 변수명 통일
      columnOrder: [
      "EVENTNAME",
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
      "LABEL_TEXT",
      "CONTENT_NM",
      "PAGE_MKT_CONTS_ID",
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
      "POPUP_MESSAGE",
      "POPUP_BUTTON",
      "POPUP_CLASS",
      "AUTO_TAG_YN",
      "PAGETITLE",
      "PAGETITLE",
      "ep_cd77_cur_page_title",
      "PAGEPATH",
      "CD123_CUR_PAGE_FULLURL",
      "CTS_GROUP1",
      "CTS_GROUP2",
      "CTS_GROUP3",
      "CTS_GROUP4",
      "CTS_GROUP5",
      "CTS_GROUP6",
      "CTS_GROUP7",
      "CTS_GROUP8",
      "CTS_GROUP9",
      "CTS_GROUP10",
      "CTS_GROUP11",
      "CTS_GROUP12",
      "CTS_GROUP13",
      "PAGE_DEPTH1",
      "PAGE_DEPTH2",
      "PAGE_DEPTH3",
      "PAGE_DEPTH4",
      "PAGE_DEPTH5",
      "SEAK",
      "SRCH_KEYWORD_TYPE",
      "SEAK_SUS",
      "SEAK_TP",
      "CARD_NAME",
      "CARD_CODE",
      "PAGE_CARDAPL_CODE",
      "PAGE_CARDAPL_KND",
      "PAGE_FN_PD_NM",
      "PAGE_FN_LOAN_AMT",
      "PAGE_RVO_EGM_STT_RT",
      "PAGE_RVO_EGM_STT_TE",
      "PAGE_PD_APL_LVL",
      "item_id",
      "item_name",
      "price",
      "coupon_yn",
      "discount",
      "item_brand",
      "CHANNEL_TYPE",
      "EVENTCATEGORY",
      "EVENTACTION",
      "EVENTLABEL",
      "CNO",
      ]
    }
  },
  computed: {
    // URL 경로에서 PAGETITLE 형식 계산
    pagetitle() {
      let path = this.subdomain || '';
      
      if (this.pathMatch && this.pathMatch.length > 0) {
        path = path + '>' + this.pathMatch.join('>');
      }
      
      return path;
    },
    
    // 사용자 친화적 형태로 PAGETITLE 포맷팅
    formattedPagetitle() {
      return this.pagetitle.replace(/>/g, '>');
    },

    // 정렬된 컬럼 목록 계산
    sortedColumns() {
      if (!this.taggingMaps || this.taggingMaps.length === 0 || !this.taggingMaps[0].eventParams) {
        return [];
      }
      
      // 모든 데이터에서 사용된 모든 키 수집
      const allKeys = new Set();
      this.taggingMaps[0].eventParams.forEach(param => {
        Object.keys(param).forEach(key => {
          if (key !== 'SHOT_NUMBER') { // SHOT_NUMBER는 별도로 표시되므로 제외
            allKeys.add(key);
          }
        });
      });
      
      // columnOrder에 따라 키 정렬
      return Array.from(allKeys).sort((a, b) => {
        const indexA = this.columnOrder.indexOf(a);
        const indexB = this.columnOrder.indexOf(b);
        
        // 순서 목록에 없는 키는 맨 뒤로
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        // 순서 목록에 있는 키는 해당 순서대로
        return indexA - indexB;
      });
    }
  },
  created() {
    // URL 쿼리 파라미터 확인
    const urlParam = this.$route.query.url;
    const eventTypeParam = this.$route.query.eventType; // 파라미터 이름 변경
    const isPopupParam = this.$route.query.isPopup;
    
    // 쿼리 파라미터가 있으면 저장
    if (urlParam) {
      this.preSelectedUrl = decodeURIComponent(urlParam);
    }
    
    // 이벤트 타입 쿼리 파라미터가 view 또는 click인 경우만 적용
    if (eventTypeParam && ['visibility', 'click'].includes(eventTypeParam)) {
      this.preSelectedEventType = eventTypeParam;
      this.selectedEventType = eventTypeParam;
    }
    
    // 팝업 필터 쿼리 파라미터 확인
    if (isPopupParam === 'true') {
      this.isPopupFilter = true;
    }
    
    this.fetchPageData();
  },

  watch: {
    // 경로가 변경되면 데이터 다시 로드
    '$route.params'() {
      this.resetFilters();
      this.fetchPageData();
    }
  },
  methods: {
    // 팝업 필터 변경 처리
    async handlePopupFilterChange() {
      this.selectedUrl = '';
      this.selectedTime = '';
      this.taggingMaps = [];
      await this.handleEventTypeChange(); // 메서드명 변경
    },
    
    async fetchPageData() {
      try {
        this.loading = true;
        this.error = null;
        
        // 사전 선택된 이벤트 타입이 있으면 적용
        if (this.preSelectedEventType) {
          this.selectedEventType = this.preSelectedEventType;
        } else {
          // 기본값은 visibility로 설정
          this.selectedEventType = 'visibility';
        }
        
        // URL 목록 가져오기
        await this.handleEventTypeChange(true); // 자동 전환 플래그 추가
      } catch (error) {
        console.error('Error fetching page data:', error);
        this.error = '페이지 데이터를 불러오는데 실패했습니다.';
        this.loading = false;
      }
    },

    // 이벤트 타입 변경 핸들러
    selectEventType(eventType) {
      if (this.selectedEventType === eventType) return;
      this.selectedEventType = eventType;
      this.handleEventTypeChange(false); // 자동 전환 없음
    },

    async handleEventTypeChange(autoSwitch = false) { // autoSwitch 파라미터 추가
      try {
        this.selectedUrl = '';
        this.selectedTimestamp = '';
        this.times = [];
        this.taggingMaps = [];
        
        const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
        
        // URL 목록 가져오기
        const urlsResponse = await axios.get(
          `${baseUrl}/api/urls/${this.pagetitle}/${this.selectedEventType}`, {
            params: {
              isPopup: this.isPopupFilter
            }
          }
        );
        
        // null URL 필터링
        this.urls = urlsResponse.data.filter(url => url.url !== null);
        
        // URLs이 없고, 현재 이벤트 타입이 visibility이며, 자동 전환이 활성화된 경우
        if (this.urls.length === 0 && this.selectedEventType === 'visibility' && autoSwitch) {
          console.log('No visibility data found, switching to click events');
          this.selectedEventType = 'click';
          
          // 클릭 이벤트로 다시 시도
          const clickUrlsResponse = await axios.get(
            `${baseUrl}/api/urls/${this.pagetitle}/click`, {
              params: {
                isPopup: this.isPopupFilter
              }
            }
          );
          
          // null URL 필터링
          this.urls = clickUrlsResponse.data.filter(url => url.url !== null);
        }
        
        // 팝업 필터가 켜져 있고 URL 결과가 없을 경우 사용자에게 알림
        if (this.urls.length === 0 && this.isPopupFilter) {
          this.error = '선택한 페이지에 팝업 이벤트가 포함된 태깅맵이 없습니다.';
          this.loading = false;
          return;
        }
            
        // URL 선택 처리
        if (this.urls.length > 0) {
          if (this.preSelectedUrl && this.urls.find(u => u.url === this.preSelectedUrl)) {
            this.selectedUrl = this.preSelectedUrl;
          } else {
            this.selectedUrl = this.urls[0].url;
          }
          
          // 선택된 URL로 시간 목록 가져오기
          await this.handleUrlChange();
          
          // 사전 선택된 URL 처리 후 변수 초기화
          this.preSelectedUrl = null;
          this.preSelectedEventType = null;
        } else {
          this.loading = false;
        }
      } catch (error) {
        console.error('Error fetching URLs:', error);
        this.error = 'URL 목록을 불러오는데 실패했습니다.';
        this.loading = false;
      }
    },
    

    async handleUrlChange() {
      try {
        this.selectedTimestamp = '';
        this.taggingMaps = [];
        
        const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
        const encodedUrl = encodeURIComponent(this.selectedUrl);
        
        // 시간 목록 가져오기
        const timesResponse = await axios.get(
          `${baseUrl}/api/times/${this.pagetitle}/${this.selectedEventType}/${encodedUrl}`, {
            params: {
              isPopup: this.isPopupFilter
            }
          }
        );
        
        // 시간 데이터에 팝업 포함 여부 확인
        const timesData = timesResponse.data;
        
        // 서버에서 hasPopup 필드가 없는 경우, 클라이언트에서 처리
        // 각 타임스탬프에 대해 추가 API 호출로 팝업 여부 확인
        const processedTimes = await Promise.all(timesData.map(async (timeItem) => {
          // 이미 hasPopup 필드가 있으면 그대로 사용
          if (typeof timeItem.hasPopup !== 'undefined') {
            return timeItem;
          }
          
          try {
            // 해당 타임스탬프에 대한 태깅맵 데이터 가져오기
            const taggingMapResponse = await axios.get(`${baseUrl}/api/taggingmaps/filtered`, {
              params: {
                pagetitle: this.pagetitle,
                eventtype: this.selectedEventType,
                url: this.selectedUrl,
                timestamp: timeItem.timestamp
              }
            });
            
            // 태깅맵 데이터에서 팝업 이벤트 확인
            const hasPopupEvent = taggingMapResponse.data.length > 0 && 
                                 taggingMapResponse.data[0].eventParams.some(param => 
                                   param.EVENTNAME === 'popup_view' || param.EVENTNAME === 'popup_click'
                                 );
            
            return {
              ...timeItem,
              hasPopup: hasPopupEvent
            };
          } catch (err) {
            console.error('Error checking popup for timestamp:', timeItem.timestamp, err);
            return {
              ...timeItem,
              hasPopup: false // 에러 발생 시 기본값
            };
          }
        }));
        
        // 시간 목록 정렬 (최신순) - 서버에서 정렬되어 있어도 한번 더 클라이언트에서 확인
        this.times = processedTimes.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        console.log('Times loaded with popup info:', this.times.length);
        
        // 기본 timestamp 설정 (최신 시간)
        if (this.times.length > 0) {
          // timestamp가 있는지 명시적으로 확인
          const latestTime = this.times[0];
          if (latestTime && latestTime.timestamp) {
            this.selectedTimestamp = latestTime.timestamp;
            console.log('Auto-selected timestamp:', this.selectedTimestamp);
            
            // 필터링된 데이터 가져오기
            await this.fetchFilteredData();
          } else {
            console.error('Latest time object does not have timestamp:', latestTime);
            this.loading = false;
          }
        } else {
          this.loading = false;
        }
        
      } catch (error) {
        console.error('Error fetching times:', error);
        this.error = '시간 목록을 불러오는데 실패했습니다.';
        this.loading = false;
      }
    },
    
    // 타임스탬프 변경 핸들러 추가
    async handleTimestampChange() {
      if (!this.selectedTimestamp) return;
      await this.fetchFilteredData();
    },
    
    async fetchFilteredData() {
      try {
        if (!this.selectedEventType || !this.selectedUrl || !this.selectedTimestamp) {
          this.loading = false;
          return;
        }
        
        this.loading = true;
        
        const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
        let url = this.selectedUrl;
        
        // URL 디코딩 처리
        while (url.includes('%')) {
          const decodedUrl = decodeURIComponent(url);
          if (decodedUrl === url) break;
          url = decodedUrl;
        }
        
        // 필터링된 데이터 가져오기 - timestamp 파라미터 사용
        const filteredResponse = await axios.get(`${baseUrl}/api/taggingmaps/filtered`, {
          params: {
            pagetitle: this.pagetitle,
            eventtype: this.selectedEventType,
            url: url,
            timestamp: this.selectedTimestamp, // time 대신 timestamp 사용
            isPopup: this.isPopupFilter
          },
          timeout: 30000
        });
        
        this.taggingMaps = filteredResponse.data;
    
        // 데이터가 로드된 후 콘솔에 사용 가능한 키 출력 (디버깅용)
        if (this.taggingMaps.length > 0 && this.taggingMaps[0].eventParams && this.taggingMaps[0].eventParams.length > 0) {
          console.log('Available columns:', Object.keys(this.taggingMaps[0].eventParams[0]));
        }
        
        this.loading = false;
        
      } catch (error) {
        console.error('Error fetching filtered data:', error);
        this.error = '필터링된 데이터를 불러오는데 실패했습니다.';
        this.loading = false;
      }
    },
    
    resetFilters() {
      this.urls = [];
      this.times = [];
      this.selectedEventType = 'visibility'; // 기본값 변경
      this.selectedUrl = '';
      this.selectedTimestamp = '';
      this.isPopupFilter = false;
      this.taggingMaps = [];
    },
    
    // 타임스탬프 포맷팅 함수
    formatTimestamp(timestamp) {
      if (!timestamp) return '';
      try {
        const date = new Date(timestamp);
        
        // 유효한 날짜인지 확인
        if (isNaN(date.getTime())) {
          return timestamp;
        }
        
        // 날짜와 시간 포맷팅 (YYYY-MM-DD HH:MM:SS)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      } catch (error) {
        console.error('Error formatting timestamp:', error);
        return timestamp;
      }
    },
    
    formatTime(isoTime) {
      // ISO 시간을 사용자 친화적 형식으로 변환 (예: "2025-05-13 20:07:00")
      const date = new Date(isoTime);
      return date.toLocaleString();
    }
  }
}
</script>

<style scoped>
.page-detail {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 20px;
  color: #333;
  border-bottom: 2px solid #eaeaea;
  padding-bottom: 15px;
}

.filter-section {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.filter-group {
  flex: 1;
  min-width: 250px;
}

.checkbox-container {
  flex: 0.5;
  min-width: 200px;
  display: flex;
  align-items: center;
}

.filter-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: normal !important;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  margin-right: 8px;
}

.button-group {
  display: flex;
  gap: 10px;
}

.filter-button {
  padding: 8px 16px;
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-weight: normal;
  flex: 1;
  transition: all 0.2s ease;
}

.filter-button:hover {
  background-color: #e0e0e0;
}

.filter-button.active {
  background-color: #007bff;
  color: white;
  border: 1px solid #0062cc;
}

select {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ced4da;
}

.content-section {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.image-section {
  flex: 1;
  min-width: 300px;
}

.image-section img {
  max-width: 100%;
  height: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.data-section {
  flex: 2;
  min-width: 500px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
  position: sticky;
  top: 0;
}

tr:nth-child(even) {
  background-color: #f8f9fa;
}

.loading, .error, .no-data {
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
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  opacity: 0.9;
}
</style>