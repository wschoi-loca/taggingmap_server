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
              {{ formatTimestamp(time.timestamp) }}{{ formatEventNames(time.eventNames) }}
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
            컬럼별 필터
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
  name: 'LogUpload',
  directives: {
    focus: {
      inserted(el) {
        el.focus();
      }
    }
  },
  data() {
    return {
      currentStep: 1,
      platform: 'android',
      logInput: '',
      parsedResult: null,
      editableParsedResult: [],
      statusMessage: '',
      hasError: false,
      isProcessing: false,
      isUploading: false,
      addScreenshot: false,
      selectedFile: null,
      previewUrl: null,
      
      // 필드 매핑 규칙
      fieldMappings: {
        "ep_category": "EVENTCATEGORY",
        "ep_action": "EVENTACTION",
        "ep_label": "EVENTLABEL",
        "ep_label_text": "LABEL_TEXT",
        "ep_category_depth1": "CATEGORY_DEPTH1",
        "ep_category_depth2": "CATEGORY_DEPTH2",
        "ep_category_depth3": "CATEGORY_DEPTH3",
        "ep_category_depth4": "CATEGORY_DEPTH4",
        "ep_category_depth5": "CATEGORY_DEPTH5",
        "ep_category_depth6": "CATEGORY_DEPTH6",
        "ep_category_depth7": "CATEGORY_DEPTH7",
        "ep_category_depth8": "CATEGORY_DEPTH8",
        "ep_category_depth9": "CATEGORY_DEPTH9",
        "ep_category_depth10": "CATEGORY_DEPTH10",
        "ep_cd25_srch_keyword": "SEAK",
        "ep_srch_keyword_type": "SRCH_KEYWORD_TYPE",
        "ep_srch_result": "SEAK_SUS",
        "ep_cd27_srch_res_clk_nm": "SEAK_TP",
        "ep_cd12_card_name": "CARD_NAME",
        "ep_cd64_card_apply_code": "CARD_CODE",
        "ep_cd65_card_apply_kind": "PAGE_CARDAPL_KND",
        "ep_cd13_fn_pd_nm": "PAGE_FN_PD_NM",
        "ep_cd17_fn_loan_amt": "PAGE_FN_LOAN_AMT",
        "ep_cd19_rvo_egm_stt_rt": "PAGE_RVO_EGM_STT_RT",
        "ep_cd20_rvo_egm_stt_te": "PAGE_RVO_EGM_STT_TE",
        "ep_cd48_pd_apply_nm": "PAGE_PD_APL_LVL",
        "ep_cd14_cts_nm": "CONTENT_NM",
        "ep_content_nm1": "CONTENT_NM1",
        "ep_content_nm2": "CONTENT_NM2",
        "ep_content_nm3": "CONTENT_NM3",
        "ep_cd42_cts_id": "PAGE_MKT_CONTS_ID",
        "ep_cd79_sub_cts_id": "SUB_CONTENT_ID",
        "ep_sub_cts_id1": "SUB_CONTENT_ID1",
        "ep_sub_cts_id2": "SUB_CONTENT_ID2",
        "ep_sub_cts_id3": "SUB_CONTENT_ID3",
        "ep_sub_cts_id4": "SUB_CONTENT_ID4",
        "ep_sub_cts_id5": "SUB_CONTENT_ID5",
        "ep_horizontal_index": "HORIZONTAL_INDEX",
        "ep_cd101_cts_group1": "CTS_GROUP1",
        "ep_cd102_cts_group2": "CTS_GROUP2",
        "ep_cd103_cts_group3": "CTS_GROUP3",
        "ep_cd104_cts_group4": "CTS_GROUP4",
        "ep_cd105_cts_group5": "CTS_GROUP5",
        "ep_cd106_cts_group6": "CTS_GROUP6",
        "ep_cd107_cts_group7": "CTS_GROUP7",
        "ep_cd108_cts_group8": "CTS_GROUP8",
        "ep_cd109_cts_group9": "CTS_GROUP9",
        "ep_cd110_cts_group10": "CTS_GROUP10",
        "ep_cd111_cts_group11": "CTS_GROUP11",
        "ep_cd112_cts_group12": "CTS_GROUP12",
        "ep_cd113_cts_group13": "CTS_GROUP13",
        "ep_popup_class": "popup_class",
        "ep_popup_message": "popup_message",
        "ep_popup_button": "popup_button",
        "ep_auto_tag_yn": "AUTO_TAG_YN",
        "dl": "PAGEPATH",
        "dt": "PAGETITLE"
      },
      
      // 컬럼 정렬 순서
      columnOrder: [
        "SHOT_NUMBER", // 기본 컬럼을 맨 앞에 추가
        "TIME", 
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
        "SUB_CONTENT_ID1",
        "SUB_CONTENT_ID2",
        "SUB_CONTENT_ID3",
        "SUB_CONTENT_ID4",
        "SUB_CONTENT_ID5",
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
        "CNO"
      ],
      
      // 기본 표시 컬럼 (수정)
      defaultVisibleColumns: ["SHOT_NUMBER", "EVENTNAME", "LABEL_TEXT", "CONTENT_NM", "PAGE_MKT_CONTS_ID", "TIME"],
      
      // 이벤트 파라미터 편집용
      showParamEditor: false,
      currentEntryIndex: null,
      currentParamIndex: null,
      currentParam: {},
      paramBackup: {},
      newFieldName: '',
      newFieldValue: '',
      
      // 컬럼 관리
      showColumnManagerModal: false,
      allColumns: [], // 실제 데이터에서 동적으로 채워질 것임
      selectedColumns: [], // 기본 컬럼으로 초기화될 것임
      columnDisplayNames: {
      },
      newColumnName: '',
      managingEntryIndex: null,
      
      // 셀 편집
      isEditingCell: false,
      editingCell: {
        entryIndex: null,
        paramIndex: null,
        column: null,
        originalValue: null
      }
    };
  },
  created() {
    // 기본 선택 컬럼 설정
    this.selectedColumns = [...this.defaultVisibleColumns];
  },
  computed: {
    visibleColumns() {
      // 선택된 컬럼을 정렬 순서에 맞게 반환
      return this.selectedColumns
        .slice()
        .sort((a, b) => {
          const indexA = this.columnOrder.indexOf(a);
          const indexB = this.columnOrder.indexOf(b);
          return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });
    },
    
    eventTypeSummary() {
      const counts = { visibility: 0, click: 0, popup_click: 0 };
      this.editableParsedResult.forEach(entry => {
        counts[entry.EVENTTYPE] = (counts[entry.EVENTTYPE] || 0) + 1;
      });
      
      const summary = [];
      if (counts.visibility) summary.push(`visibility (${counts.visibility}개)`);
      if (counts.click) summary.push(`click (${counts.click}개)`);
      if (counts.popup_click) summary.push(`popup_click (${counts.popup_click}개)`);
      
      return summary.join(', ');
    },
    
    totalEventParams() {
      return this.editableParsedResult.reduce(
        (total, entry) => total + entry.eventParams.length, 0
      );
    }
  },
  methods: {
    async parseLog() {
      if (!this.logInput.trim()) {
        this.hasError = true;
        this.statusMessage = '로그 데이터를 입력해주세요.';
        return;
      }
      
      this.isProcessing = true;
      this.hasError = false;
      this.statusMessage = '로그를 파싱하는 중...';
      
      try {
        // 플랫폼에 따라 다른 파싱 로직 적용
        let parsedLogs = [];
        if (this.platform === 'android') {
          parsedLogs = this.parseAndroidLog(this.logInput);
        } else {
          parsedLogs = this.parseIOSLog(this.logInput);
        }
        
        // 동일한 URL을 가진 로그 항목을 그룹화
        const groupedLogs = this.groupLogsByUrl(parsedLogs);
        
        // 깊은 복사를 통해 편집 가능한 결과 생성
        this.editableParsedResult = JSON.parse(JSON.stringify(groupedLogs));
        
        // 현재 시간으로 TIME 및 timestamp 업데이트
        const now = new Date();
        const isoNow = now.toISOString();
        const formattedTime = this.formatTime(isoNow);
        
        // 모든 필드를 수집하여 allColumns 업데이트
        const allFields = new Set(['SHOT_NUMBER', 'EVENTNAME', 'LABEL_TEXT', 'PAGEPATH', 'PAGETITLE', 'TIME']);
        
        this.editableParsedResult.forEach(entry => {
          entry.TIME = isoNow;
          entry.timestamp = isoNow;
          
          entry.eventParams.forEach(param => {
            param.TIME = formattedTime;
            
            // 필수 필드가 없는 경우 기본값 설정
            if (!Object.prototype.hasOwnProperty.call(param, 'SHOT_NUMBER')) {
              param.SHOT_NUMBER = 0;
            }
            if (!Object.prototype.hasOwnProperty.call(param, 'EVENTNAME')) {
              param.EVENTNAME = 'cts_click';
            }
            if (!Object.prototype.hasOwnProperty.call(param, 'LABEL_TEXT')) {
              param.LABEL_TEXT = '(라벨 없음)';
            }
            
            // 모든 필드를 수집
            Object.keys(param).forEach(key => {
              allFields.add(key);
            });
          });
          
          // SHOT_NUMBER 순서대로 정렬
          entry.eventParams.sort((a, b) => a.SHOT_NUMBER - b.SHOT_NUMBER);
          
          // SHOT_NUMBER 재설정
          entry.eventParams.forEach((param, idx) => {
            param.SHOT_NUMBER = idx;
          });
        });
        
        // allColumns 업데이트 (컬럼 정렬 순서 적용)
        this.allColumns = Array.from(allFields)
          .sort((a, b) => {
            const indexA = this.columnOrder.indexOf(a);
            const indexB = this.columnOrder.indexOf(b);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
          });
        
        this.statusMessage = '로그 파싱 완료! 데이터를 확인하고 필요한 경우 수정하세요.';
        this.currentStep = 2;
      } catch (error) {
        console.error('로그 파싱 중 오류 발생:', error);
        this.hasError = true;
        this.statusMessage = `로그 파싱 실패: ${error.message}`;
        this.parsedResult = null;
      } finally {
        this.isProcessing = false;
      }
    },
    
    // 동일한 URL을 가진 로그 항목 그룹화
    groupLogsByUrl(logs) {
      const urlGroups = {};
      
      for (const log of logs) {
        const url = log.URL;
        
        if (!urlGroups[url]) {
          // 새 URL 그룹 생성
          urlGroups[url] = {
            TIME: log.TIME,
            EVENTTYPE: log.EVENTTYPE,
            PAGETITLE: log.PAGETITLE,
            URL: log.URL,
            eventParams: [],
            timestamp: log.timestamp
          };
        }
        
        // 이벤트 파라미터 합치기
        urlGroups[url].eventParams = [...urlGroups[url].eventParams, ...log.eventParams];
      }
      
      // 객체를 배열로 변환
      return Object.values(urlGroups);
    },
    
    parseAndroidLog(logText) {
      // Android 로그 파싱 로직
      const logEntries = [];
      const lines = logText.split('\n').filter(line => line.trim());
      
      // logcat 로그에서 JSON 데이터 추출
      for (const line of lines) {
        try {
          // 로그에서 JSON 문자열 부분 추출 (RDP status: 데이터 전송에 성공하였습니다. 이후)
          const jsonStartIndex = line.indexOf('{"log_body"');
          if (jsonStartIndex === -1) continue;
          
          const jsonStr = line.substring(jsonStartIndex);
          const logData = JSON.parse(jsonStr);
          
          if (!logData.log_body || !logData.log_body.length) continue;
          
          for (const event of logData.log_body) {
            // MongoDB 스키마에 맞게 변환
            const eventType = this.determineEventType(event.en);
            let pagetitle = "";
            let url = "";
            
            // dl, dt 필드를 매핑 규칙에 따라 처리
            if (logData.dt) {
              pagetitle = logData.dt;
            } else if (logData.screen_name) {
              pagetitle = logData.screen_name;
            }
            
            if (logData.dl) {
              url = logData.dl;
            }
            
            const time = logData.timestamp || new Date().toISOString();
            
            // eventParams 배열 생성
            const eventParams = [];
            if (event.eventParams) {
              let shotNumber = 0;
              
              // 주요 필드 첫 번째 항목으로 추가
              const mainParam = {
                SHOT_NUMBER: shotNumber++,
                EVENTNAME: event.en || '',
                PAGEPATH: url,
                PAGETITLE: pagetitle,
                TIME: this.formatTime(time)
              };
              
              // 나머지 eventParams 필드 추가 (매핑 규칙 적용)
              this.processEventParams(mainParam, event.eventParams);
              
              // 상품 정보 처리 (items 배열이 있는 경우)
              if (event.eventParams && event.eventParams.items && Array.isArray(event.eventParams.items)) {
                for (const item of event.eventParams.items) {
                  // 상품 정보 필드 추가
                  if (item.item_id) mainParam.item_id = item.item_id;
                  if (item.item_name) mainParam.item_name = item.item_name;
                  if (item.price) mainParam.price = item.price;
                  if (item.coupon) mainParam.coupon_yn = item.coupon;
                  if (item.discount) mainParam.discount = item.discount;
                  if (item.item_brand) mainParam.item_brand = item.item_brand;
                }
              }
              
              eventParams.push(mainParam);
            }
            
            // 결과 객체 생성
            const entry = {
              TIME: time,
              EVENTTYPE: eventType,
              PAGETITLE: pagetitle,
              URL: url,
              eventParams: eventParams,
              timestamp: time
            };
            
            logEntries.push(entry);
          }
        } catch (error) {
          console.error('안드로이드 로그 파싱 중 오류:', error, line);
          // 오류가 있는 라인은 건너뛰고 다음 라인 파싱 계속
        }
      }
      
      // 결과가 없으면 오류 발생
      if (logEntries.length === 0) {
        throw new Error('유효한 로그 데이터를 찾을 수 없습니다.');
      }
      
      return logEntries;
    },
    
    // 이벤트 파라미터 처리 및 매핑
    processEventParams(mainParam, eventParamsObj) {
      // eventParams 객체의 각 키-값 쌍을 처리
      for (const [key, value] of Object.entries(eventParamsObj)) {
        if (key === 'items' && Array.isArray(value)) {
          // items 배열은 별도로 처리됨
          continue;
        }
        
        // 매핑 규칙 적용
        const normalizedKey = this.normalizeFieldName(key);
        
        // 정규화된 키가 유효한 경우에만 추가
        if (normalizedKey) {
          mainParam[normalizedKey] = value;
        }
      }
    },
    
    parseIOSLog(logText) {
      // iOS 로그 파싱 로직
      const logEntries = [];
      
      try {
        // iOS 로그는 일반적으로 JSON 형식이므로 바로 파싱
        // 여러 줄일 경우 각각 JSON으로 파싱 시도
        const jsonObjects = this.extractJsonObjects(logText);
        
        for (const jsonObj of jsonObjects) {
          const logData = jsonObj;
          
          if (!logData.log_body || !logData.log_body.length) continue;
          
          for (const event of logData.log_body) {
            // MongoDB 스키마에 맞게 변환
            const eventType = this.determineEventType(event.en);
            let pagetitle = "";
            let url = "";
            
            // dl, dt 필드를 매핑 규칙에 따라 처리
            if (logData.dt) {
              pagetitle = logData.dt;
            } else if (logData.screen_name) {
              pagetitle = logData.screen_name;
            }
            
            if (logData.dl) {
              url = logData.dl;
            }
            
            const time = logData.timestamp || new Date().toISOString();
            
            // eventParams 배열 생성
            const eventParams = [];
            if (event.eventParams) {
              let shotNumber = 0;
              
              // 주요 필드 첫 번째 항목으로 추가
              const mainParam = {
                SHOT_NUMBER: shotNumber++,
                EVENTNAME: event.en || '',
                PAGEPATH: url,
                PAGETITLE: pagetitle,
                TIME: this.formatTime(time)
              };
              
              // 나머지 eventParams 필드 추가 (매핑 규칙 적용)
              this.processEventParams(mainParam, event.eventParams);
              
              // 상품 정보 처리 (items 배열이 있는 경우)
              if (event.eventParams && event.eventParams.items && Array.isArray(event.eventParams.items)) {
                for (const item of event.eventParams.items) {
                  // 상품 정보 필드 추가
                  if (item.item_id) mainParam.item_id = item.item_id;
                  if (item.item_name) mainParam.item_name = item.item_name;
                  if (item.price) mainParam.price = item.price;
                  if (item.coupon) mainParam.coupon_yn = item.coupon;
                  if (item.discount) mainParam.discount = item.discount;
                  if (item.item_brand) mainParam.item_brand = item.item_brand;
                }
              }
              
              // LABEL_TEXT가 없으면 기본값 설정
              if (!mainParam['LABEL_TEXT']) {
                mainParam['LABEL_TEXT'] = '(라벨 없음)';
              }
              
              eventParams.push(mainParam);
            }
            
            // 결과 객체 생성
            const entry = {
              TIME: time,
              EVENTTYPE: eventType,
              PAGETITLE: pagetitle,
              URL: url,
              eventParams: eventParams,
              timestamp: time
            };
            
            logEntries.push(entry);
          }
        }
      } catch (error) {
        console.error('iOS 로그 파싱 중 오류:', error);
        throw new Error(`iOS 로그 파싱 실패: ${error.message}`);
      }
      
      // 결과가 없으면 오류 발생
      if (logEntries.length === 0) {
        throw new Error('유효한 로그 데이터를 찾을 수 없습니다.');
      }
      
      return logEntries;
    },
    
    // JSON 객체 추출 헬퍼 함수
    extractJsonObjects(text) {
      const jsonObjects = [];
      let startIndex = text.indexOf('{');
      
      while (startIndex !== -1) {
        try {
          // 중괄호 균형을 맞추어 JSON 끝 찾기
          let openBraces = 0;
          let endIndex = startIndex;
          
          for (let i = startIndex; i < text.length; i++) {
            if (text[i] === '{') openBraces++;
            else if (text[i] === '}') openBraces--;
            
            if (openBraces === 0) {
              endIndex = i + 1;
              break;
            }
          }
          
          const jsonStr = text.substring(startIndex, endIndex);
          const jsonObj = JSON.parse(jsonStr);
          jsonObjects.push(jsonObj);
          
          // 다음 JSON 찾기
          startIndex = text.indexOf('{', endIndex);
        } catch (error) {
          // 파싱 실패 시 다음 중괄호부터 시도
          startIndex = text.indexOf('{', startIndex + 1);
        }
      }
      
      return jsonObjects;
    },
    
    // 이벤트 타입 결정 헬퍼 함수
    determineEventType(eventName) {
      if (!eventName) return 'unknown';
      
      if (eventName.includes('click')) return 'click';
      if (eventName.includes('view')) return 'visibility';
      if (eventName.includes('popup')) return 'popup_click';
      
      // 기본값은 'visibility'로 설정
      return 'visibility';
    },
    
    // 필드명 정규화 헬퍼 함수 (매핑 규칙 적용)
    normalizeFieldName(key) {
      // 매핑 규칙이 존재하는 경우
      if (this.fieldMappings[key]) {
        return this.fieldMappings[key];
      }
      
      // cd123_user_id2 → USER_ID2 형태의 필드 처리
      if (key.match(/^cd\d+_/)) {
        // 숫자와 언더스코어 제거
        const cleanKey = key.replace(/cd\d+_/g, '');
        // 대문자로 변환
        return cleanKey.toUpperCase();
      }
      
      // ep_ 접두어가 있는 필드 처리
      if (key.startsWith('ep_')) {
        const cleanKey = key.substring(3);
        return cleanKey.toUpperCase();
      }
      
      // 그 외에는 그대로 대문자화하여 반환
      return key.toUpperCase();
    },
    
    // 시간 포맷팅 헬퍼 함수 (YYYYMMDD_HHMMSS 형식)
    formatTime(isoTime) {
      try {
        const date = new Date(isoTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
      } catch (e) {
        return isoTime; // 파싱 실패시 원본 반환
      }
    },
    
    // 컬럼 표시 이름 가져오기
    getColumnDisplayName(column) {
      return this.columnDisplayNames[column] || column;
    },
    
    // 컬럼 관리 모달 관련
    showColumnManager(entryIndex) {
      this.managingEntryIndex = entryIndex;
      
      // 현재 항목의 모든 필드를 allColumns에 추가
      const entry = this.editableParsedResult[entryIndex];
      const paramFields = new Set();
      
      // 모든 이벤트 파라미터의 모든 필드 수집
      entry.eventParams.forEach(param => {
        Object.keys(param).forEach(key => {
          paramFields.add(key);
        });
      });
      
      // 기존 컬럼에 없는 필드 추가
      paramFields.forEach(field => {
        if (!this.allColumns.includes(field)) {
          this.allColumns.push(field);
        }
      });
      
      // 컬럼 정렬 순서 적용
      this.allColumns.sort((a, b) => {
        const indexA = this.columnOrder.indexOf(a);
        const indexB = this.columnOrder.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });
      
      this.showColumnManagerModal = true;
    },
    
    closeColumnManager() {
      this.showColumnManagerModal = false;
      this.managingEntryIndex = null;
      this.newColumnName = '';
    },
    
    addNewColumn() {
      const columnName = this.newColumnName.trim().toUpperCase();
      
      if (!columnName) return;
      
      // 이미 존재하는 컬럼인지 확인
      if (this.allColumns.includes(columnName)) {
        alert(`'${columnName}' 컬럼이 이미 존재합니다.`);
        return;
      }
      
      // 새 컬럼 추가
      this.allColumns.push(columnName);
      this.selectedColumns.push(columnName);
      
      // 표시 이름 설정
      if (!this.columnDisplayNames[columnName]) {
        this.columnDisplayNames[columnName] = columnName;
      }
      
      // 모든 파라미터에 새 컬럼 필드 추가
      if (this.managingEntryIndex !== null) {
        const entry = this.editableParsedResult[this.managingEntryIndex];
        entry.eventParams.forEach(param => {
          if (!Object.prototype.hasOwnProperty.call(param, columnName)) {
            param[columnName] = '';
          }
        });
      }
      
      // 컬럼 정렬 순서 적용
      this.allColumns.sort((a, b) => {
        const indexA = this.columnOrder.indexOf(a);
        const indexB = this.columnOrder.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });
      
      this.newColumnName = '';
    },
    
    applyColumnChanges() {
      // 선택된 컬럼이 없으면 기본 컬럼 선택
      if (this.selectedColumns.length === 0) {
        this.selectedColumns = [...this.defaultVisibleColumns];
      }
      
      this.showColumnManagerModal = false;
      this.managingEntryIndex = null;
    },
    
    // 이벤트 파라미터 관리 함수들
    addEventParam(entryIndex) {
      const now = new Date();
      const formattedTime = this.formatTime(now.toISOString());
      const entry = this.editableParsedResult[entryIndex];
      
      // 새 SHOT_NUMBER 계산 (최대값 + 1)
      const maxShotNumber = entry.eventParams.length > 0 
        ? Math.max(...entry.eventParams.map(p => p.SHOT_NUMBER)) 
        : -1;
      
      const newParam = {
        SHOT_NUMBER: maxShotNumber + 1,
        EVENTNAME: entry.eventParams[0]?.EVENTNAME || 'cts_click',
        PAGEPATH: entry.URL,
        PAGETITLE: entry.PAGETITLE,
        TIME: formattedTime,
        LABEL_TEXT: '(새 항목)'
      };
      
      // 모든 표시 중인 컬럼에 대해 빈 값 추가
      this.allColumns.forEach(column => {
        if (!Object.prototype.hasOwnProperty.call(newParam, column)) {
          newParam[column] = '';
        }
      });
      
      entry.eventParams.push(newParam);
    },
    
    editEventParam(entryIndex, paramIndex) {
      this.currentEntryIndex = entryIndex;
      this.currentParamIndex = paramIndex;
      this.currentParam = JSON.parse(JSON.stringify(this.editableParsedResult[entryIndex].eventParams[paramIndex]));
      this.paramBackup = JSON.parse(JSON.stringify(this.currentParam));
      this.showParamEditor = true;
    },
    
    duplicateEventParam(entryIndex, paramIndex) {
      const entry = this.editableParsedResult[entryIndex];
      const param = entry.eventParams[paramIndex];
      const newParam = JSON.parse(JSON.stringify(param));
      
      // 새 SHOT_NUMBER 계산 (최대값 + 1)
      const maxShotNumber = Math.max(...entry.eventParams.map(p => p.SHOT_NUMBER));
      newParam.SHOT_NUMBER = maxShotNumber + 1;
      
      entry.eventParams.push(newParam);
    },
    
    saveParamChanges() {
      if (this.currentEntryIndex !== null && this.currentParamIndex !== null) {
        this.editableParsedResult[this.currentEntryIndex].eventParams[this.currentParamIndex] = 
          JSON.parse(JSON.stringify(this.currentParam));
      }
      this.closeParamEditor();
    },
    
    closeParamEditor() {
      this.showParamEditor = false;
      this.currentEntryIndex = null;
      this.currentParamIndex = null;
      this.currentParam = {};
      this.newFieldName = '';
      this.newFieldValue = '';
    },
    
    addField() {
      if (!this.newFieldName.trim()) return;
      
      // 필드명을 대문자로 변환
      const fieldName = this.newFieldName.trim().toUpperCase();
      
      // 이미 존재하는 필드인지 확인
      if (Object.prototype.hasOwnProperty.call(this.currentParam, fieldName)) {
        alert(`'${fieldName}' 필드가 이미 존재합니다.`);
        return;
      }
      
      // 새 필드 추가
      this.$set(this.currentParam, fieldName, this.newFieldValue);
      
      // allColumns에 없으면 추가
      if (!this.allColumns.includes(fieldName)) {
        this.allColumns.push(fieldName);
        
        // 컬럼 정렬 순서 적용
        this.allColumns.sort((a, b) => {
          const indexA = this.columnOrder.indexOf(a);
          const indexB = this.columnOrder.indexOf(b);
          return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });
      }
      
      // 입력 필드 초기화
      this.newFieldName = '';
      this.newFieldValue = '';
    },
    
    removeField(fieldName) {
      if (confirm(`'${fieldName}' 필드를 삭제하시겠습니까?`)) {
        this.$delete(this.currentParam, fieldName);
      }
    },
    
    removeEventParam(entryIndex, paramIndex) {
      if (confirm('이 이벤트 파라미터를 삭제하시겠습니까?')) {
        this.editableParsedResult[entryIndex].eventParams.splice(paramIndex, 1);
        
        // SHOT_NUMBER 재정렬
        this.editableParsedResult[entryIndex].eventParams.forEach((param, idx) => {
          param.SHOT_NUMBER = idx;
        });
      }
    },
    
    // 항목 복제
    duplicateEntry(entryIndex) {
      const entry = JSON.parse(JSON.stringify(this.editableParsedResult[entryIndex]));
      this.editableParsedResult.splice(entryIndex + 1, 0, entry);
    },
    
    // 항목 삭제
    removeEntry(entryIndex) {
      if (confirm('이 태깅맵 항목을 삭제하시겠습니까?')) {
        this.editableParsedResult.splice(entryIndex, 1);
      }
    },
    
    // 업로드 준비
    prepareForUpload() {
      // 업로드 전 마지막 확인 단계로 이동
      this.currentStep = 3;
    },
    
    // 파일 업로드 핸들러
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      this.selectedFile = file;
      
      // 이미지 미리보기
      const reader = new FileReader();
      reader.onload = e => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    
    // 셀 편집 시작
    startEditingCell(entryIndex, paramIndex, column, value) {
      this.isEditingCell = true;
      this.editingCell = {
        entryIndex,
        paramIndex,
        column,
        originalValue: value
      };
    },
    
    // 태깅맵 업로드 메서드
    async uploadData() {
      if (!this.editableParsedResult || this.editableParsedResult.length === 0) {
        this.hasError = true;
        this.statusMessage = '업로드할 데이터가 없습니다.';
        return;
      }
      
      this.isUploading = true;
      this.statusMessage = '태깅맵 데이터 업로드 중...';
      
      try {
        // 각 항목별로 업로드
        const baseUrl = '';
        const uploadPromises = [];
        
        for (const entry of this.editableParsedResult) {
          // 현재 시간으로 TIME 및 timestamp 업데이트
          const now = new Date();
          const isoNow = now.toISOString();
          const formattedTime = this.formatTime(isoNow);
          
          entry.TIME = isoNow;
          entry.timestamp = isoNow;
          
          entry.eventParams.forEach(param => {
            param.TIME = formattedTime;
          });
          
          const formData = new FormData();
          
          // 기본 필드 추가
          formData.append('TIME', entry.TIME);
          formData.append('EVENTTYPE', entry.EVENTTYPE);
          formData.append('PAGETITLE', entry.PAGETITLE);
          formData.append('URL', entry.URL);
          formData.append('timestamp', entry.timestamp);
          formData.append('eventParams', JSON.stringify(entry.eventParams));
          
          // 스크린샷 첨부 (첫 번째 항목에만 첨부)
          if (this.selectedFile && uploadPromises.length === 0) {
            formData.append('image', this.selectedFile);
          }
          
          console.log('Uploading data:', {
            url: `${baseUrl}/api/taggingMaps`,
            eventParams: entry.eventParams.length
          });
          
          // 업로드 요청
          const uploadPromise = axios.post(`${baseUrl}/api/taggingMaps`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          uploadPromises.push(uploadPromise);
        }
        
        // 모든 업로드 완료 대기
        await Promise.all(uploadPromises);
        
        this.statusMessage = `${this.editableParsedResult.length}개의 태깅맵 항목이 성공적으로 업로드되었습니다!`;
        this.currentStep = 4;
      } catch (error) {
        console.error('태깅맵 업로드 중 오류:', error);
        this.hasError = true;
        this.statusMessage = `업로드 실패: ${error.response?.data || error.message}`;
      } finally {
        this.isUploading = false;
      }
    },
    
    // 입력 초기화
    clearInput() {
      this.logInput = '';
      this.parsedResult = null;
      this.editableParsedResult = [];
      this.statusMessage = '';
      this.hasError = false;
      this.selectedFile = null;
      this.previewUrl = null;
    },
    
    // 폼 완전 리셋
    resetForm() {
      this.clearInput();
      this.currentStep = 1;
    }
  }
};
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
  align-items: flex-end;
}

.advanced-search-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
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