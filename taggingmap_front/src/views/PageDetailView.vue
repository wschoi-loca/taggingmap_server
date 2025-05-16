<template>
    <div class="page-detail">
      <h1>{{ formattedPagetitle }}</h1>
      
      <!-- 필터 섹션 -->
      <div class="filter-section">
        <!-- EVENTNAME 필터 -->
        <div class="filter-group">
          <label>이벤트 유형:</label>
          <div class="radio-group">
            <label v-for="event in eventNames" :key="event.eventname">
              <input 
                type="radio" 
                :value="event.eventname" 
                v-model="selectedEventName"
                @change="handleEventNameChange"
              >
              {{ event.eventname }}
            </label>
          </div>
        </div>
        
        <!-- URL 필터 -->
        <div class="filter-group">
          <label for="url-select">URL:</label>
          <select 
            id="url-select" 
            v-model="selectedUrl" 
            @change="handleUrlChange"
            :disabled="!selectedEventName || urls.length === 0"
          >
            <option value="">URL 선택</option>
            <option v-for="url in urls" :key="url.url" :value="url.url">
              {{ url.url }}
            </option>
          </select>
        </div>
        
        <!-- TIME 필터 -->
        <div class="filter-group">
          <label for="time-select">캡처 시간:</label>
          <select 
            id="time-select" 
            v-model="selectedTime"
            @change="fetchFilteredData"
            :disabled="!selectedUrl || times.length === 0"
          >
            <option value="">시간 선택</option>
            <option v-for="time in times" :key="time.timestamp" :value="time.time">
              {{ formatTime(time.timestamp) }}
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
                <th>EVENTNAME</th>
                <th>LABEL_TEXT</th>
                <th>CONTENT_NM</th>
                <th>PAGE_MKT_CONTS_ID</th>
                <th>SUB_CONTENT_ID</th>
                <th>HORIZONTAL_INDEX</th>
                <th>VERTICAL_INDEX</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="data in taggingMaps[0].eventParams" :key="data.SHOT_NUMBER">
                <td>{{ data.SHOT_NUMBER }}</td>
                <td>{{ data.EVENTNAME }}</td>
                <td>{{ data.LABEL_TEXT || '-' }}</td>
                <td>{{ data.CONTENT_NM || '-' }}</td>
                <td>{{ data.PAGE_MKT_CONTS_ID || '-' }}</td>
                <td>{{ data.SUB_CONTENT_ID || '-' }}</td>
                <td>{{ data.HORIZONTAL_INDEX || '-' }}</td>
                <td>{{ data.VERTICAL_INDEX || '-' }}</td>
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
        eventNames: [],
        urls: [],
        times: [],
        selectedEventName: '',
        selectedUrl: '',
        selectedTime: '',
        loading: true,
        error: null
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
      }
    },
    created() {
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
      async fetchPageData() {
        try {
          this.loading = true;
          this.error = null;
          
          const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
          
          // 1. 해당 PAGETITLE의 EVENTNAME 목록 가져오기
          const eventNamesResponse = await axios.get(`${baseUrl}/api/eventnames/${this.pagetitle}`);
          this.eventNames = eventNamesResponse.data;
          
          // 기본 EVENTNAME 설정 (cts_view 우선, 없으면 첫번째)
          if (this.eventNames.length > 0) {
            const ctsView = this.eventNames.find(e => e.eventname === 'cts_view');
            this.selectedEventName = ctsView ? ctsView.eventname : this.eventNames[0].eventname;
            
            // 선택된 EVENTNAME으로 URL 목록 가져오기
            await this.handleEventNameChange();
          } else {
            this.loading = false;
          }
          
        } catch (error) {
          console.error('Error fetching page data:', error);
          this.error = '페이지 데이터를 불러오는데 실패했습니다.';
          this.loading = false;
        }
      },
      
      async handleEventNameChange() {
        try {
          this.selectedUrl = '';
          this.selectedTime = '';
          this.times = [];
          this.taggingMaps = [];
          
          const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
          
          // 2. 선택된 EVENTNAME의 URL 목록 가져오기
          const urlsResponse = await axios.get(
            `${baseUrl}/api/urls/${this.pagetitle}/${this.selectedEventName}`
          );
          this.urls = urlsResponse.data;
          
          // 기본 URL 설정 (있으면 첫번째)
          if (this.urls.length > 0) {
            this.selectedUrl = this.urls[0].url;
            
            // 선택된 URL로 TIME 목록 가져오기
            await this.handleUrlChange();
          }
          
        } catch (error) {
          console.error('Error fetching URLs:', error);
          this.error = 'URL 목록을 불러오는데 실패했습니다.';
        }
      },
      
      async handleUrlChange() {
        try {
          this.selectedTime = '';
          this.taggingMaps = [];
          
          const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
          const encodedUrl = encodeURIComponent(this.selectedUrl);
          
          // 3. 선택된 URL의 TIME 목록 가져오기
          const timesResponse = await axios.get(
            `${baseUrl}/api/times/${this.pagetitle}/${this.selectedEventName}/${encodedUrl}`
          );
          this.times = timesResponse.data;
          
          // 기본 TIME 설정 (최신 시간)
          if (this.times.length > 0) {
            this.selectedTime = this.times[0].time;
            
            // 필터링된 데이터 가져오기
            await this.fetchFilteredData();
          }
          
        } catch (error) {
          console.error('Error fetching times:', error);
          this.error = '시간 목록을 불러오는데 실패했습니다.';
        }
      },
      
      async fetchFilteredData() {
        try {
          if (!this.selectedEventName || !this.selectedUrl || !this.selectedTime) {
            return;
          }
          
          this.loading = true;
          
          const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
          const encodedUrl = encodeURIComponent(this.selectedUrl);
          
          // 4. 필터링된 데이터 가져오기
          const filteredResponse = await axios.get(`${baseUrl}/api/taggingmaps/filtered`, {
            params: {
              pagetitle: this.pagetitle,
              eventname: this.selectedEventName,
              url: encodedUrl,
              time: this.selectedTime
            }
          });
          
          this.taggingMaps = filteredResponse.data;
          this.loading = false;
          
        } catch (error) {
          console.error('Error fetching filtered data:', error);
          this.error = '필터링된 데이터를 불러오는데 실패했습니다.';
          this.loading = false;
        }
      },
      
      resetFilters() {
        this.eventNames = [];
        this.urls = [];
        this.times = [];
        this.selectedEventName = '';
        this.selectedUrl = '';
        this.selectedTime = '';
        this.taggingMaps = [];
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
  
  .filter-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: bold;
  }
  
  .radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .radio-group label {
    display: flex;
    align-items: center;
    font-weight: normal;
    margin-bottom: 0;
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