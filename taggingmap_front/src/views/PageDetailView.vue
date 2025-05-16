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
            :class="['filter-button', selectedEventName === 'cts_view' ? 'active' : '']"
            @click="selectEventType('cts_view')"
          >
            노출
          </button>
          <button 
            :class="['filter-button', selectedEventName === 'cts_click' ? 'active' : '']"
            @click="selectEventType('cts_click')"
          >
            클릭
          </button>
        </div>
      </div>
      
      <!-- 팝업 필터 추가 -->
      <div class="filter-group">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            v-model="isPopupFilter"
            @change="handlePopupFilterChange"
          >
          팝업 이벤트만 보기
        </label>
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
    
    <!-- 내용은 기존과 동일 -->
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
      selectedEventName: 'cts_view',
      selectedUrl: '',
      selectedTime: '',
      isPopupFilter: false, // 팝업 필터링 상태
      loading: true,
      error: null,
      preSelectedUrl: null,
      preSelectedEventName: null
    }
  },
  // computed, created 등 기존 코드 유지...
  methods: {
    // 팝업 필터 변경 처리
    async handlePopupFilterChange() {
      this.selectedUrl = '';
      this.selectedTime = '';
      this.taggingMaps = [];
      await this.handleEventNameChange();
    },
    
    // 이벤트 타입 선택 핸들러
    selectEventType(eventName) {
      if (this.selectedEventName === eventName) return;
      this.selectedEventName = eventName;
      this.handleEventNameChange();
    },
    
    async fetchPageData() {
      try {
        this.loading = true;
        this.error = null;
        
        // 사전 선택된 이벤트 이름이 있으면 적용
        if (this.preSelectedEventName) {
          this.selectedEventName = this.preSelectedEventName;
        }
        
        // URL 목록 가져오기
        await this.handleEventNameChange();
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
        
        // URL 목록 가져오기 - 팝업 필터링 파라미터 추가
        const urlsResponse = await axios.get(
          `${baseUrl}/api/urls/${this.pagetitle}/${this.selectedEventName}`, {
            params: {
              isPopup: this.isPopupFilter
            }
          }
        );
        this.urls = urlsResponse.data;
        
        // URL 선택 로직
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
          this.preSelectedEventName = null;
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
        this.selectedTime = '';
        this.taggingMaps = [];
        
        const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
        const encodedUrl = encodeURIComponent(this.selectedUrl);
        
        // 선택된 URL의 TIME 목록 가져오기 - 팝업 필터링 파라미터 추가
        const timesResponse = await axios.get(
          `${baseUrl}/api/times/${this.pagetitle}/${this.selectedEventName}/${encodedUrl}`, {
            params: {
              isPopup: this.isPopupFilter
            }
          }
        );
        this.times = timesResponse.data;
        
        // 기본 TIME 설정 (최신 시간)
        if (this.times.length > 0) {
          this.selectedTime = this.times[0].time;
          
          // 필터링된 데이터 가져오기
          await this.fetchFilteredData();
        } else {
          this.loading = false;
        }
      } catch (error) {
        console.error('Error fetching times:', error);
        this.error = '시간 목록을 불러오는데 실패했습니다.';
        this.loading = false;
      }
    },
    
    async fetchFilteredData() {
      try {
        if (!this.selectedEventName || !this.selectedUrl || !this.selectedTime) {
          this.loading = false;
          return;
        }
        
        this.loading = true;
        
        const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
        const encodedUrl = encodeURIComponent(this.selectedUrl);
        
        // 필터링된 데이터 가져오기 - 팝업 필터링 파라미터 추가
        const filteredResponse = await axios.get(`${baseUrl}/api/taggingmaps/filtered`, {
          params: {
            pagetitle: this.pagetitle,
            eventname: this.selectedEventName,
            url: encodedUrl,
            time: this.selectedTime,
            isPopup: this.isPopupFilter
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
      this.urls = [];
      this.times = [];
      this.selectedEventName = 'cts_view';
      this.selectedUrl = '';
      this.selectedTime = '';
      this.isPopupFilter = false; // 팝업 필터 초기화
      this.taggingMaps = [];
    },
    
    formatTime(isoTime) {
      const date = new Date(isoTime);
      return date.toLocaleString();
    }
  }
}
</script>

<style scoped>
/* 기존 CSS 유지... */

/* 체크박스 레이블 스타일 */
.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  margin-right: 8px;
}
</style>