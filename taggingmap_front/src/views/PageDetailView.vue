<template>
  <div class="page-detail">
    <div class="page-detail">
      <!-- 제목과 삭제 버튼을 함께 배치한 헤더 섹션 -->
      <div class="header-section">
        <h1>{{ formattedPagetitle }}</h1>
        <button v-if="taggingMaps.length > 0" 
          class="delete-btn" 
          @click="confirmDelete">
          태깅맵 삭제
        </button>
      </div>
      
      <!-- 삭제 확인 모달 -->
      <div v-if="showDeleteModal" class="modal-overlay">
        <div class="modal-content delete-modal">
          <div class="modal-header">
            <h3>태깅맵 삭제 확인</h3>
            <button class="close-button" @click="showDeleteModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <p class="warning-text">이 태깅맵 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <p>다음 데이터가 함께 삭제됩니다:</p>
            <ul class="delete-info">
              <li>MongoDB의 태깅맵 데이터</li>
              <li>Cloudinary에 저장된 이미지</li>
            </ul>
          </div>
          <div class="modal-footer">
            <button class="cancel-button" @click="showDeleteModal = false">취소</button>
            <button class="delete-confirm-button" @click="deleteTaggingMap" :disabled="isDeleting">
              <span v-if="isDeleting">삭제 중...</span>
              <span v-else>삭제</span>
            </button>
          </div>
        </div>
      </div>

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
              {{ formatTimestamp(time.timestamp) }} {{ time.hasPopup ? "(popup 포함)" : "" }}
            </option>
          </select>
        </div>
        
        <!-- 고급 검색 버튼 추가 -->
        <div class="filter-group advanced-search-group">
          <button 
            class="advanced-search-btn"
            @click="toggleAdvancedSearch"
            :disabled="loading"
          >
            고급 검색
          </button>
          <small v-if="hasActiveAdvancedFilters" class="active-filters-indicator">
            필터 적용됨
          </small>
        </div>
      </div>

      <!-- 적용된 필터 표시 영역 (필터 섹션 바로 아래) -->
      <div v-if="hasActiveAdvancedFilters" class="active-filters">
        <span class="filter-label">적용된 필터:</span>
        <div class="filter-tags">
          <div 
            v-for="(value, key) in displayedAdvancedFilters" 
            :key="key" 
            class="filter-tag"
          >
            {{ key }}: {{ value.anyValue ? '아무 값' : value.value }}
            <button @click="removeAdvancedFilter(key)" class="remove-filter">&times;</button>
          </div>
        </div>
        <button class="clear-filters" @click="clearAllAdvancedFilters">모든 필터 지우기</button>
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
          <!-- 원본 이미지 보기 버튼 추가 -->
          <div class="section-header">
            <button class="view-full-btn" @click="openImageModal">
              원본 이미지 새 창에서 보기
            </button>
          </div>
          <img :src="taggingMaps[0].image" alt="Captured Image" />
        </div>
        
        <div class="data-section">
          <!-- 전체 표 보기 버튼 추가 -->
          <div class="section-header">
            <button class="view-full-btn" @click="openTableModal">
              전체 표 새 창에서 보기
            </button>
          </div>
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
  </div>
  <!-- 고급 검색 모달 -->
  <div v-if="showAdvancedSearch" class="modal-overlay" @click.self="toggleAdvancedSearch">
    <div class="modal-content advanced-search-modal">
      <div class="modal-header">
        <h3>고급 검색</h3>
        <button class="close-button" @click="toggleAdvancedSearch">&times;</button>
      </div>
      <div class="modal-body">
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
      
      // 컬럼 정렬 순서
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
      ],
      // 삭제 기능 관련 추가
      showDeleteModal: false,
      isDeleting: false,
      // 고급 검색 관련 추가
      showAdvancedSearch: false,
      searchFields: [
        "LABEL_TEXT",
        "CATEGORY_DEPTH1",
        "CATEGORY_DEPTH2",
        "CATEGORY_DEPTH3",
        "CONTENT_NM",
        "PAGE_MKT_CONTS_ID",
        "SUB_CTS_ID1",
        "EVENTNAME",
        "HORIZONTAL_INDEX",
        "VERTICAL_INDEX",
        "POPUP_MESSAGE",
        "POPUP_BUTTON",
        "POPUP_CLASS"
        // 나머지 필드는 필요에 따라 추가
      ],
      advancedFilters: {
        fields: {}
      },
      advancedSearchFilters: {
        fields: {}
      },
      initialAdvancedFilters: {}
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
    },
    
    // 고급 검색 관련 computed 추가
    hasActiveAdvancedFilters() {
      for (const key in this.advancedSearchFilters.fields) {
        const filter = this.advancedSearchFilters.fields[key];
        if (filter.anyValue || filter.value) return true;
      }
      return false;
    },
    
    displayedAdvancedFilters() {
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
    
    // 고급 검색 필드 초기화
    this.initAdvancedFilters();
    
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
        this.selectedTimestamp = ''; // selectedTime -> selectedTimestamp 수정
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

      async handleEventTypeChange(autoSwitch = false) { 
        try {
          this.selectedUrl = '';
          this.selectedTimestamp = '';
          this.times = [];
          this.taggingMaps = [];
          
          const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
          
          // 쿼리 파라미터 구성 (고급 검색 필터 포함)
          const params = {
            isPopup: this.isPopupFilter
          };
          
          // 고급 검색 필터가 적용된 경우 파라미터에 추가
          if (this.hasActiveAdvancedFilters) {
            for (const field in this.advancedSearchFilters.fields) {
              const filter = this.advancedSearchFilters.fields[field];
              if (filter.anyValue) {
                params[`${field}_exists`] = 'true';
              } else if (filter.value) {
                params[field] = filter.value;
              }
            }
          }
          
          // URL 목록 가져오기
          const urlsResponse = await axios.get(
            `${baseUrl}/api/urls/${this.pagetitle}/${this.selectedEventType}`,
            { params }
          );
          
          // null URL 필터링
          this.urls = urlsResponse.data.filter(url => url.url !== null);
          
          // URLs이 없고, 현재 이벤트 타입이 visibility이며, 자동 전환이 활성화된 경우
          if (this.urls.length === 0 && this.selectedEventType === 'visibility' && autoSwitch) {
            console.log('No visibility data found, switching to click events');
            this.selectedEventType = 'click';
            
            // 클릭 이벤트로 다시 시도
            const clickUrlsResponse = await axios.get(
              `${baseUrl}/api/urls/${this.pagetitle}/click`,
              { params }
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
          
          // 쿼리 파라미터 구성 (고급 검색 필터 포함)
          const params = {
            isPopup: this.isPopupFilter
          };
          
          // 고급 검색 필터가 적용된 경우 파라미터에 추가
          if (this.hasActiveAdvancedFilters) {
            for (const field in this.advancedSearchFilters.fields) {
              const filter = this.advancedSearchFilters.fields[field];
              if (filter.anyValue) {
                params[`${field}_exists`] = 'true';
              } else if (filter.value) {
                params[field] = filter.value;
              }
            }
          }
          
          // 시간 목록 가져오기
          const timesResponse = await axios.get(
            `${baseUrl}/api/times/${this.pagetitle}/${this.selectedEventType}/${encodedUrl}`,
            { params }
          );
          
          // 시간 데이터 처리
          const timesData = timesResponse.data;
          
          // 서버에서 이미 필터링된 결과를 반환하므로 별도의 팝업 필터링 로직 제거
          
          // 시간 목록 정렬 (최신순) - 서버에서 정렬되어 있어도 한번 더 클라이언트에서 확인
          this.times = timesData.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          );
          
          console.log('Times loaded:', this.times.length);
          
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
      
      // 필터 조건이 적용된 URL 목록 로드 메서드 추가
      async refreshUrlsWithFilters() {
        try {
          this.loading = true;
          this.selectedUrl = '';
          this.selectedTimestamp = '';
          this.times = [];
          this.taggingMaps = [];
          
          const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
          
          // URL 목록 요청 파라미터에 고급 검색 필터 추가
          const params = {
            isPopup: this.isPopupFilter
          };
          
          // 고급 검색 필터 추가
          for (const field in this.advancedSearchFilters.fields) {
            const filter = this.advancedSearchFilters.fields[field];
            if (filter.anyValue) {
              params[`${field}_exists`] = 'true';
            } else if (filter.value) {
              params[field] = filter.value;
            }
          }
          
          // 필터가 적용된 URL 목록 가져오기
          const urlsResponse = await axios.get(
            `${baseUrl}/api/urls/${this.pagetitle}/${this.selectedEventType}`,
            { params }
          );
          
          // null URL 필터링
          this.urls = urlsResponse.data.filter(url => url.url !== null);
          
          // URL 선택 처리
          if (this.urls.length > 0) {
            this.selectedUrl = this.urls[0].url;
            
            // 선택된 URL로 필터링된 시간 목록 가져오기
            await this.handleUrlChangeWithFilters();
          } else {
            this.loading = false;
          }
        } catch (error) {
          console.error('Error fetching filtered URLs:', error);
          this.error = '필터링된 URL 목록을 불러오는데 실패했습니다.';
          this.loading = false;
        }
      },
      
      // 필터 조건이 적용된 타임스탬프 목록 로드 메서드 추가
      async handleUrlChangeWithFilters() {
        try {
          this.selectedTimestamp = '';
          this.taggingMaps = [];
          
          const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
          const encodedUrl = encodeURIComponent(this.selectedUrl);
          
          // 타임스탬프 목록 요청 파라미터에 고급 검색 필터 추가
          const params = {
            isPopup: this.isPopupFilter
          };
          
          // 고급 검색 필터 추가
          for (const field in this.advancedSearchFilters.fields) {
            const filter = this.advancedSearchFilters.fields[field];
            if (filter.anyValue) {
              params[`${field}_exists`] = 'true';
            } else if (filter.value) {
              params[field] = filter.value;
            }
          }
          
          // 필터가 적용된 시간 목록 가져오기
          const timesResponse = await axios.get(
            `${baseUrl}/api/times/${this.pagetitle}/${this.selectedEventType}/${encodedUrl}`,
            { params }
          );
          
          // 시간 데이터 처리
          const timesData = timesResponse.data;
          
          // 시간 목록 정렬 (최신순)
          this.times = timesData.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          );
          
          // 기본 timestamp 설정 (최신 시간)
          if (this.times.length > 0) {
            const latestTime = this.times[0];
            if (latestTime && latestTime.timestamp) {
              this.selectedTimestamp = latestTime.timestamp;
              
              // 필터링된 데이터 가져오기
              await this.fetchFilteredData();
            } else {
              this.loading = false;
            }
          } else {
            this.loading = false;
          }
          
        } catch (error) {
          console.error('Error fetching filtered times:', error);
          this.error = '필터링된 시간 목록을 불러오는데 실패했습니다.';
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
        // 고급 검색 필터도 초기화
        this.advancedSearchFilters.fields = JSON.parse(JSON.stringify(this.initialAdvancedFilters));
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
      },
      
      // 모달 대신 새 창에서 이미지 보기
      openImageModal() {
        if (!this.taggingMaps || this.taggingMaps.length === 0) return;
        
        const imageUrl = this.taggingMaps[0].image;
        if (!imageUrl) return;
        
        // 새 창으로 이미지 열기
        const newWindow = window.open('', '_blank', 'width=1000,height=800');
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>원본 이미지</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              .container { max-width: 100%; text-align: center; }
              img { max-width: 100%; height: auto; }
              h1 { margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>원본 이미지</h1>
              <img src="${imageUrl}" alt="원본 이미지" />
            </div>
          </body>
          </html>
        `);
        newWindow.document.close();
      },
      
      // 모달 대신 새 창에서 표 보기
      openTableModal() {
        if (!this.taggingMaps || this.taggingMaps.length === 0 || !this.sortedColumns) return;
        
        // 테이블 HTML 생성
        let tableHTML = `
          <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr>
                <th style="border:1px solid #ddd; padding:8px; background-color:#f2f2f2;">SHOT_NUMBER</th>
        `;
        
        // 테이블 헤더 추가
        this.sortedColumns.forEach(column => {
          tableHTML += `<th style="border:1px solid #ddd; padding:8px; background-color:#f2f2f2;">${column}</th>`;
        });
        
        tableHTML += `</tr></thead><tbody>`;
        
        // 테이블 본문 추가
        this.taggingMaps[0].eventParams.forEach(data => {
          tableHTML += `<tr><td style="border:1px solid #ddd; padding:8px;">${data.SHOT_NUMBER || '-'}</td>`;
          
          this.sortedColumns.forEach(column => {
            tableHTML += `<td style="border:1px solid #ddd; padding:8px;">${data[column] || '-'}</td>`;
          });
          
          tableHTML += `</tr>`;
        });
        
        tableHTML += `</tbody></table>`;
        
        // 새 창으로 테이블 열기
        const newWindow = window.open('', '_blank', 'width=1200,height=800');
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>전체 데이터 표</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              .container { width: 100%; overflow-x: auto; }
              h1 { margin-bottom: 20px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { position: sticky; top: 0; background-color: #f2f2f2; }
              tr:nth-child(even) { background-color: #f8f9fa; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>전체 데이터 표</h1>
              ${tableHTML}
            </div>
          </body>
          </html>
        `);
        newWindow.document.close();
      },

      // 삭제 확인 모달 표시
      confirmDelete() {
        this.showDeleteModal = true;
      },
      
      // 태깅맵 삭제 처리
      async deleteTaggingMap() {
        try {
          if (!this.taggingMaps || this.taggingMaps.length === 0 || !this.taggingMaps[0]._id) {
            this.showDeleteModal = false;
            this.$router.push('/');
            return;
          }
          
          this.isDeleting = true;
          const taggingMapId = this.taggingMaps[0]._id;
          const imageUrl = this.taggingMaps[0].image || '';
          
          const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
          const response = await axios.delete(`${baseUrl}/api/taggingmaps/${taggingMapId}`, {
            data: {
              imageUrl: imageUrl
            }
          });
          
          if (response.status === 200) {
            // 삭제 성공
            this.showDeleteModal = false;
            
            // 성공 메시지 표시 (알림 라이브러리가 있다면 사용)
            alert('태깅맵이 성공적으로 삭제되었습니다.');
            
            // 메인 페이지로 이동
            this.$router.push('/');
          } else {
            throw new Error(`삭제 요청 실패: ${response.status}`);
          }
        } catch (error) {
          console.error('태깅맵 삭제 중 오류 발생:', error);
          alert(`삭제 실패: ${error.message}`);
        } finally {
          this.isDeleting = false;
          this.showDeleteModal = false;
        }
      },
      
      // 고급 검색 필드 초기화
      initAdvancedFilters() {
        const initialFields = {};
        this.searchFields.forEach(field => {
          initialFields[field] = { anyValue: false, value: '' };
        });
        
        this.initialAdvancedFilters = JSON.parse(JSON.stringify(initialFields));
        this.advancedFilters.fields = JSON.parse(JSON.stringify(initialFields));
        this.advancedSearchFilters.fields = JSON.parse(JSON.stringify(initialFields));
      },
      
      // 고급 검색 모달 토글
      toggleAdvancedSearch() {
        this.showAdvancedSearch = !this.showAdvancedSearch;
        
        // 모달이 열릴 때 현재 적용된 필터로 초기화
        if (this.showAdvancedSearch) {
          // 깊은 복사로 필드 필터 초기화
          this.advancedFilters.fields = JSON.parse(JSON.stringify(this.initialAdvancedFilters));
          
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
        this.advancedFilters.fields = JSON.parse(JSON.stringify(this.initialAdvancedFilters));
      },
      
      // 고급 검색 적용 - 수정됨
      applyAdvancedSearch() {
        // 깊은 복사로 현재 필터 상태 저장
        this.advancedSearchFilters.fields = JSON.parse(JSON.stringify(this.advancedFilters.fields));
        
        // 모달 닫기
        this.showAdvancedSearch = false;
        
        // 필터 조건이 변경되었으므로 URL 목록부터 다시 로드
        this.refreshUrlsWithFilters();
      },
      
      // 필터 제거 - 수정됨
      removeAdvancedFilter(key) {
        if (this.advancedSearchFilters.fields[key]) {
          this.advancedSearchFilters.fields[key] = { anyValue: false, value: '' };
        }
        
        // 필터가 변경되었으므로 URL 목록부터 다시 로드
        this.refreshUrlsWithFilters();
      },
      
      // 모든 필터 초기화 - 수정됨
      clearAllAdvancedFilters() {
        for (const key in this.advancedSearchFilters.fields) {
          this.advancedSearchFilters.fields[key] = { anyValue: false, value: '' };
        }
        
        // 필터가 초기화되었으므로 URL 목록부터 다시 로드
        this.refreshUrlsWithFilters();
      },
      
      // 필터링된 데이터 가져오기
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
          
          // 기본 파라미터 설정
          const params = {
            pagetitle: this.pagetitle,
            eventtype: this.selectedEventType,
            url: url,
            timestamp: this.selectedTimestamp,
            isPopup: this.isPopupFilter
          };
          
          // 고급 검색 필터 추가
          for (const field in this.advancedSearchFilters.fields) {
            const filter = this.advancedSearchFilters.fields[field];
            if (filter.anyValue) {
              params[`${field}_exists`] = 'true';
            } else if (filter.value) {
              params[field] = filter.value;
            }
          }
          
          // 필터링된 데이터 가져오기
          const filteredResponse = await axios.get(`${baseUrl}/api/taggingmaps/filtered`, {
            params,
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
  flex: 1.5;
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

/* 섹션 헤더 스타일 */
.section-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

/* 전체 보기 버튼 스타일 */
.view-full-btn {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.view-full-btn:hover {
  background-color: #0056b3;
}

/* 헤더 섹션 스타일 */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 2px solid #eaeaea;
  padding-bottom: 15px;
}

.header-section h1 {
  margin: 0;
  border-bottom: none;
  padding-bottom: 0;
}

/* 삭제 버튼 스타일 */
.delete-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.delete-btn:hover {
  background-color: #c82333;
}

/* 모달 오버레이 스타일 */
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
  max-width: 500px;
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
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.warning-text {
  color: #dc3545;
  font-weight: bold;
  margin-bottom: 15px;
}

.delete-info {
  margin-left: 20px;
  color: #555;
}

.cancel-button {
  padding: 8px 16px;
  background-color: #f8f9fa;
  color: #6c757d;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-button:hover {
  background-color: #e9ecef;
}

.delete-confirm-button {
  padding: 8px 16px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.delete-confirm-button:hover:not(:disabled) {
  background-color: #c82333;
}

.delete-confirm-button:disabled {
  background-color: #e9a0a8;
  cursor: not-allowed;
}

/* 고급 검색 관련 스타일 */
.advanced-search-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end; /* 중앙 정렬에서 오른쪽 정렬로 변경 */
  padding: 0 5px;
}

.advanced-search-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  padding: 0 5px;
}

.advanced-search-btn:hover {
  background-color: #388E3C;
}

.active-filters-indicator {
  margin-top: 5px;
  color: #dc3545;
  font-style: italic;
}

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

/* 고급 검색 모달 스타일 */
.advanced-search-modal {
  width: 90%;
  max-width: 800px;
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

/* 적용 및 초기화, 취소 버튼 스타일 */
.reset-button, .cancel-button {
  padding: 6px 12px; /* 패딩 축소 */
  background-color: #f8f9fa;
  color: #6c757d;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px; /* 폰트 크기 최적화 */
}

.reset-button:hover, .cancel-button:hover {
  background-color: #e9ecef;
}

.apply-button, .delete-confirm-button {
  padding: 6px 12px; /* 패딩 축소 */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px; /* 폰트 크기 최적화 */
}

.apply-button {
  background-color: #4CAF50;
}

.apply-button:hover {
  background-color: #388E3C;
}

.delete-confirm-button {
  background-color: #dc3545;
}

.delete-confirm-button:hover:not(:disabled) {
  background-color: #c82333;
}

.delete-confirm-button:disabled {
  background-color: #e9a0a8;
  cursor: not-allowed;
}
</style>