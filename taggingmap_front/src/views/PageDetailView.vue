<template>
  <div class="page-detail">
    <transition name="toast-fade">
      <div v-if="toast.show" :class="['vue-toast', `vue-toast-${toast.type}`]">
        {{ toast.message }}
      </div>
    </transition>
    <!-- 헤더 섹션 -->
    <div class="header-section">
      <h1>{{ formattedPagetitle }}</h1>
      <div class="header-buttons">
        <button v-if="taggingMaps.length > 0" class="edit-btn" @click="startEdit">태깅맵 수정</button>
        <button v-if="taggingMaps.length > 0" class="delete-btn" @click="confirmDelete">태깅맵 삭제</button>
      </div>
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
            <li>Cloudinary에 저장된 태깅맵 이미지</li>
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

    <!-- 수정 모달 -->
    <div v-if="isEditing" class="modal-overlay">
      <div class="modal-content edit-modal">
        <div class="modal-header">
          <h3>태깅맵 수정</h3>
          <button class="close-button" @click="cancelEdit">&times;</button>
        </div>
        <div class="modal-body horizontal-layout">
          <!-- 스크린샷 교체 영역 (왼쪽) -->
          <div class="edit-image-section">
            <h4>스크린샷</h4>
            <div class="image-preview">
              <img :src="editImage || taggingMaps[0].image" alt="Screenshot" />
            </div>
            <input type="file" ref="imageInput" accept="image/*" @change="handleImageChange" />
            <button class="change-image-btn" @click="triggerImageSelect">이미지 변경</button>
          </div>
          <!-- 데이터 편집 영역 (오른쪽) -->
          <div class="edit-data-section">
            <h4>데이터 편집</h4>
            <!-- 로그 파싱 섹션 -->
            <div class="log-parsing-section">
              <h5>로그 파싱</h5>
              <div class="parsing-options">
                <div class="option-group">
                  <label>로그 형식</label>
                  <select v-model="logFormat">
                    <option value="android">안드로이드</option>
                    <option value="ios">iOS</option>
                  </select>
                </div>
              </div>
              <div class="log-input-area">
                <textarea 
                  v-model="logText" 
                  placeholder="여기에 로그를 붙여넣으세요. 안드로이드 또는 iOS 로그 형식에 맞게 입력해주세요."
                  rows="5"
                ></textarea>
              </div>
              <div class="parsing-actions">
                <button class="parse-btn" @click="parseLog" :disabled="!canParse">파싱하여 데이터 추가</button>
                <button class="clear-btn" @click="clearLogInput">입력 지우기</button>
              </div>
            </div>
            <div class="divider"></div>
            <div class="table-container">
              <table class="edit-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>SHOT_NUMBER</th>
                    <th v-for="column in editColumns" :key="column" class="column-header">
                      {{ column }}
                      <button 
                        class="remove-column-btn" 
                        @click="removeColumn(column)" 
                        title="컬럼 삭제"
                        v-if="!isRequiredColumn(column)"
                      >×</button>
                    </th>
                    <th class="column-add-cell">
                      <button class="add-column-btn" @click="addColumn" title="컬럼 추가">+</button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in editData" :key="row.uniqueId || index">
                    <td class="move-buttons-cell">
                      <button class="move-up-btn" @click="moveRow(index, 'up')" :disabled="index === 0" title="위로 이동">↑</button>
                      <button class="move-down-btn" @click="moveRow(index, 'down')" :disabled="index === editData.length-1" title="아래로 이동">↓</button>
                    </td>
                    <td>
                      <input type="number" v-model.number="row.SHOT_NUMBER" class="cell-input shot-number-input" min="0" @input="validateShotNumber(index)" />
                    </td>
                    <td v-for="column in editColumns" :key="`${index}-${column}`">
                      <input type="text" v-model="row[column]" class="cell-input" />
                    </td>
                    <td class="action-cell">
                      <button class="remove-row-btn" @click="removeRow(index)" title="로우 삭제">×</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="add-row-container">
                <button class="add-row-btn" @click="addRow">+ 로우 추가</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-button" @click="cancelEdit">취소</button>
          <button class="save-button" @click="saveChanges" :disabled="isSaving">
            <span v-if="isSaving">저장 중...</span>
            <span v-else>저장</span>
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
          <button :class="['filter-button', selectedEventType === 'visibility' ? 'active' : '']" @click="selectEventType('visibility')" :disabled="loading">노출</button>
          <button :class="['filter-button', selectedEventType === 'click' ? 'active' : '']" @click="selectEventType('click')" :disabled="loading">클릭</button>
        </div>
      </div>
      <!-- URL 필터 -->
      <div class="filter-group">
        <label for="url-select">URL:</label>
        <select id="url-select" v-model="selectedUrl" @change="handleUrlChange" :disabled="!selectedEventType || urls.length === 0">
          <option value="">URL 선택</option>
          <option v-for="url in urls" :key="url.url" :value="url.url">{{ url.url }}</option>
        </select>
      </div>
      <!-- 타임스탬프 필터 -->
      <div class="filter-group">
        <label for="time-select">타임스탬프:</label>
        <select id="time-select" v-model="selectedTimestamp" @change="handleTimestampChange" :disabled="!selectedUrl || times.length === 0">
          <option value="">타임스탬프 선택</option>
          <option v-for="time in times" :key="time.timestamp" :value="time.timestamp">
            {{ formatTimestamp(time.timestamp) }}{{ formatEventNames(time.eventNames) }}
          </option>
        </select>
      </div>
      <!-- 버튼 그룹 -->
      <div class="filter-group advanced-search-group">
        <div class="filter-buttons-container">
          <div class="button-with-indicator">
            <button class="advanced-search-btn" @click="toggleAdvancedSearch" :disabled="loading">컬럼별 필터</button>
            <small v-if="hasActiveAdvancedFilters" class="active-filters-indicator">필터 적용됨</small>
          </div>
          <button class="share-filter-btn" @click="shareFilters" title="현재 필터 설정 공유">
            <i class="fas fa-share-alt"></i> 필터 공유
          </button>
        </div>
      </div>
    </div>

    <!-- 적용된 필터 표시 -->
    <div v-if="hasActiveAdvancedFilters" class="active-filters">
      <span class="filter-label">적용된 필터:</span>
      <div class="filter-tags">
        <div v-for="(value, key) in displayedAdvancedFilters" :key="key" class="filter-tag">
          {{ key }}: {{ value.anyValue ? '아무 값' : value.value }}
          <button @click="removeAdvancedFilter(key)" class="remove-filter">&times;</button>
        </div>
      </div>
      <button class="clear-filters" @click="clearAllAdvancedFilters">모든 필터 지우기</button>
    </div>

    <!-- 로딩/에러/데이터 없음/데이터 표시 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>데이터를 불러오는 중입니다...</p>
    </div>
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="fetchPageData">다시 시도</button>
    </div>
    <div v-else-if="taggingMaps.length === 0" class="no-data">
      <p>선택한 조건에 맞는 데이터가 없습니다.</p>
    </div>
    <div v-else class="content-section">
      <!-- 이미지 섹션 -->
      <div class="image-section">
        <div class="sticky-container"> <!-- 새로운 스티키 컨테이너 -->
          <div class="image-container">
            <div class="zoom-controls absolute-top-right">
              <button @click="zoomOut" class="zoom-btn" :disabled="zoomLevel <= 0.05">
                <i class="fas fa-search-minus"></i>
              </button>
              <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
              <button @click="zoomIn" class="zoom-btn" :disabled="zoomLevel >= 7">
                <i class="fas fa-search-plus"></i>
              </button>
              <button class="zoom-btn reset" @click="resetZoom">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
            <div
              class="zoomable-image-wrapper"
              ref="zoomWrapper"
              @mousedown="startDrag"
              @mousemove="drag"
              @mouseup="endDrag"
              @mouseleave="endDrag"
              @touchstart="startDrag"
              @touchmove="drag"
              @touchend="endDrag"
              :style="imageWrapperStyle"
            >
              <img
                v-if="taggingMaps.length > 0 && taggingMaps[0].image"
                :src="taggingMaps[0].image"
                alt="태깅맵 이미지"
                class="zoomable-image"
                :style="zoomedImageStyle"
                ref="zoomImage"
                @wheel.prevent="handleWheel"
                @load="onImageLoad"
                draggable="false"
              />
              <p v-else class="no-image">이미지가 없습니다</p>
            </div>
          </div>
        </div>
      </div>
      <!-- 데이터 섹션 -->
      <div class="data-section">
        <!-- 테이블 스크롤 컨트롤 버튼 -->
        <div class="table-scroll-controls">
          <button class="scroll-btn scroll-left-btn" @click="scrollTableLeft" :disabled="isScrollLeftEnd">
            <i class="fas fa-chevron-left"></i>
          </button>
            <!-- 줄바꿈 모드 토글 버튼 추가 -->
          <button class="text-wrap-toggle" :class="{ active: isWrapMode }" @click="toggleWrapMode">
            <i class="fas fa-text-width"></i> 
            {{ isWrapMode ? '한 줄 모드' : '줄바꿈 모드' }}
          </button>
          <button class="scroll-btn scroll-right-btn" @click="scrollTableRight" :disabled="isScrollRightEnd">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        
        <!-- 스크롤 가능한 테이블 컨테이너 -->
        <div class="table-scroll-container" ref="tableScrollContainer">
          <table class="sticky-table" :class="{ 'wrap-mode': isWrapMode }">
            <thead>
              <tr>
                <th class="sticky-column sticky-header">SHOT_NUMBER</th>
                <th v-for="column in sortedColumns" :key="column" class="sticky-header">{{ column }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="data in sortedEventParams" :key="data.SHOT_NUMBER">
                <td class="sticky-column">{{ data.SHOT_NUMBER }}</td>
                <td v-for="column in sortedColumns" :key="`${data.SHOT_NUMBER}-${column}`">
                  {{ data[column] || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
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
            <div v-for="field in searchFields" :key="field" class="field-filter">
              <div class="field-name">{{ field }}:</div>
              <div class="field-options">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="advancedFilters.fields[field].anyValue"> 아무값이나
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
  </div>
</template>

<script>
import axios from 'axios';
// PageDetailView.vue의 data와 created, computed 섹션 수정
import PathMappingService from '@/services/PathMappingService';

export default {
  name: 'PageDetailView',
  props: {
    subdomain: String,
    pathMatch: Array
  },
  components: {
  },
  data() {
    return {
      taggingMaps: [],
      urls: [],
      times: [],
      pathMappings: {},
      selectedEventType: 'visibility', // 기본값을 'visibility'로 설정
      selectedUrl: '',
      selectedTimestamp: '',
      isPopupFilter: false, // 팝업 필터링 상태 (UI 요소는 제거했지만 기능은 유지)
      loading: true,
      error: null,
      preSelectedUrl: null,
      preSelectedEventType: null, // 변수명 통일

      // 필드 매핑 정의
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
        "ep_cd15_page_depth1": "PAGE_DEPTH1",
        "ep_cd16_page_depth2": "PAGE_DEPTH2",
        "ep_cd17_page_depth3": "PAGE_DEPTH3",
        "ep_page_depth4": "PAGE_DEPTH4",
        "ep_page_depth5": "PAGE_DEPTH5",
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
        // 나머지 필드는 필요에 따라 추가
      ],
      advancedFilters: {
        fields: {}
      },
      advancedSearchFilters: {
        fields: {}
      },
      initialAdvancedFilters: {},
      // 수정 관련 상태 변수
      isEditing: false,
      isSaving: false,
      editImage: null,
      editImageFile: null,
      editColumns: [],
      editData: [],
      // 로그 파싱 관련
      logFormat: 'android', // 기본값을 'android'로 변경
      logText: '',
      imageRealHeight: 0,
      // 이미지 확대 관련
      showImageModal: false,
      zoomLevel: 1,
      lastX: 0,
      lastY: 0,
      panPosition: { x: 0, y: 0 },
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      dragOrigin: { x: 0, y: 0 },
      naturalWidth: 0,
      naturalHeight: 0,
      imageOffsetX: 0,
      imageOffsetY: 0,
      // 토스트 상태 관리
      toast: {
        show: false,
        message: '',
        type: 'success',
        timer: null
      },
      // 테이블 스크롤 상태
      scrollPosition: {
        current: 1,
        total: 1
      },
      columnWidth: 180, // 기본 컬럼 너비 (픽셀)
      isScrollLeftEnd: true,
      isScrollRightEnd: false,
      isWrapMode: false,
      }
  },
  computed: {
    imageWrapperStyle() {
      return {
        height: this.imageRealHeight
          ? this.imageRealHeight + 'px'
          : '90vh', // 기본값
        width: "100%",  
        minHeight: '300px',
        overflow: 'visible',
        background: '#eee',
        display: 'flex',
        alignItems: "flex-start",
        justifyContent: "flex-start",
        position: 'relative',
        userSelect: 'none',
      };
    },
    zoomedImageStyle() {
      // width/height와 left/top을 모두 panPosition, zoomLevel로 적용!
      return {
        width: this.naturalWidth ? `${this.naturalWidth * this.zoomLevel}px` : "auto",
        height: this.naturalHeight ? `${this.naturalHeight * this.zoomLevel}px` : "auto",
        maxWidth: "none",
        maxHeight: "none",
        position: "relative",
        left: `${this.panPosition.x}px`,
        top: `${this.panPosition.y}px`,
        userSelect: "none",
        pointerEvents: "auto",
        transition: this.isDragging ? "none" : "transform 0.12s, left 0.12s, top 0.12s",
        cursor: this.isDragging ? 'grabbing' : 'grab',  // 추가: 드래그 중이면 grabbing, 아니면 grab
      };
    },
  
    // 파싱 버튼 활성화 여부
    canParse() {
      return this.logText.trim() !== '';
    },
    
    // URL 경로에서 PAGETITLE 형식 계산 (기존 코드)
    pagetitle() {
      let path = this.subdomain || '';
      
      if (this.pathMatch && this.pathMatch.length > 0) {
        path = path + '>' + this.pathMatch.join('>');
      }
      
      return path;
    },

    // 사용자 친화적인 한글 제목을 포함하는 형식으로 PAGETITLE 포맷팅
    // 수정된 formattedPagetitle 메서드 - 다양한 형식 고려
    // 사용자 친화적인 한글 제목을 포함하는 형식으로 PAGETITLE 포맷팅
    formattedPagetitle() {
      const englishTitle = this.pagetitle;
      
      console.log('현재 pagetitle:', englishTitle);
      console.log('사용 가능한 매핑 키:', Object.keys(this.pathMappings));
      
      // 1. 직접 매치 시도
      let koreanTitle = this.pathMappings[englishTitle];
      
      // 2. 직접 매치가 안되면 부분 경로 매치 시도
      if (!koreanTitle && englishTitle) {
        // 경로의 각 부분을 분리
        const pathParts = englishTitle.split('>');
        
        // 전체 경로에서 점점 짧게 자르면서 매핑 찾기
        for (let i = 0; i < pathParts.length; i++) {
          const partialPath = pathParts.slice(i).join('>');
          if (this.pathMappings[partialPath]) {
            koreanTitle = this.pathMappings[partialPath];
            console.log(`부분 경로 매치 성공: ${partialPath} -> ${koreanTitle}`);
            break;
          }
        }
        
        // 여전히 못 찾았다면 마지막 부분만 시도
        if (!koreanTitle && pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1];
          if (this.pathMappings[lastPart]) {
            koreanTitle = this.pathMappings[lastPart];
            console.log(`마지막 경로 부분 매치 성공: ${lastPart} -> ${koreanTitle}`);
          }
        }
      }
      
      // 한글 제목이 있으면 함께 표시, 없으면 영문만
      if (koreanTitle) {
        return `${englishTitle} | ${koreanTitle}`;
      }
      
      return englishTitle;
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
    },

    sortedEventParams() {
      if (!this.taggingMaps || this.taggingMaps.length === 0 || !this.taggingMaps[0].eventParams) return [];
      // SHOT_NUMBER 기준 오름차순 정렬
      return [...this.taggingMaps[0].eventParams].sort(
        (a, b) => Number(a.SHOT_NUMBER) - Number(b.SHOT_NUMBER)
      );
    },
  },
// created() 내부 (timestamp 우선 적용)
async created() {
  try {
    // 경로 매핑 데이터 로드
    this.pathMappings = await PathMappingService.loadMappings();
    console.log("경로 매핑 데이터 로드 완료:", Object.keys(this.pathMappings).length);
    console.log("매핑 데이터 내용:", this.pathMappings);
  } catch (error) {
    console.error('경로 매핑 데이터 로드 실패:', error);
    this.pathMappings = {};
  }

  // 쿼리 파라미터 확인 (timestamp 우선)
  const timestampParam = this.$route.query.timestamp;
  const urlParam = this.$route.query.url;
  const eventTypeParam = this.$route.query.eventType;
  const isPopupParam = this.$route.query.isPopup;

  if (timestampParam) {
    this.preSelectedTimestamp = decodeURIComponent(timestampParam);
  }
  if (urlParam) {
    this.preSelectedUrl = decodeURIComponent(urlParam);
  }
  if (eventTypeParam && ['visibility', 'click'].includes(eventTypeParam)) {
    this.preSelectedEventType = eventTypeParam;
    this.selectedEventType = eventTypeParam;
  }
  if (isPopupParam === 'true') {
    this.isPopupFilter = true;
  }

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
          this.times = timesResponse.data.sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
          );

          console.log('Times loaded with event names:', this.times);

          // === timestamp 우선 적용 ===
          // preSelectedTimestamp가 있을 경우, times에 있으면 무조건 우선 적용
          if (
            this.preSelectedTimestamp &&
            this.times.some(t => t.timestamp === this.preSelectedTimestamp)
          ) {
            this.selectedTimestamp = this.preSelectedTimestamp;
            this.preSelectedTimestamp = null; // 한 번 적용 후 초기화
            await this.fetchFilteredData();
            return; // 여기서 바로 반환! 아래 url 기준 로직은 타지 않도록
          }

          // url이 있으면 url 우선 적용(기존대로)
          // (아니면 최신순)
          if (this.times.length > 0) {
            const latestTime = this.times[0];
            if (latestTime && latestTime.timestamp) {
              this.selectedTimestamp = latestTime.timestamp;
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
      
      // 이벤트 이름 목록을 포맷팅하는 함수
      formatEventNames(eventNames) {
        if (!eventNames || eventNames.length === 0) return '';
        return ` | ${eventNames.join(' | ')}`;
      },

      // 필터 조건이 적용된 타임스탬프 목록 로드 메서드
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
          // 서버에서 이제 timestamp와 eventNames를 포함하여 반환
          const timesResponse = await axios.get(
            `${baseUrl}/api/times/${this.pagetitle}/${this.selectedEventType}/${encodedUrl}`,
            { params }
          );
          
          // 시간 데이터 처리 - 서버에서 반환된 형태 그대로 사용
          // (각 항목은 timestamp와 eventNames 배열을 포함)
          const timesData = timesResponse.data;
          
          // 시간 목록 정렬 (최신순)
          this.times = timesData.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
          );
          
          console.log('Filtered times loaded with event names:', this.times);
          
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
      /*openTableModal() {
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
      },*/

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
      },
      startEdit() {
        if (!this.taggingMaps || this.taggingMaps.length === 0) return;
        
        // 현재 컬럼 목록 복사
        this.editColumns = [...this.sortedColumns];
        
        // 깊은 복사로 데이터 복사
        this.editData = JSON.parse(JSON.stringify(this.taggingMaps[0].eventParams));
        
        // 수정 모드 활성화
        this.isEditing = true;
      },
      
      // 수정 취소
      cancelEdit() {
        if(confirm('수정을 취소하시겠습니까? 변경된 내용은 저장되지 않습니다.')) {
          this.isEditing = false;
          this.editImage = null;
          this.editImageFile = null;
          this.editColumns = [];
          this.editData = [];
        }
      },
      
      // 이미지 선택 창 열기
      triggerImageSelect() {
        this.$refs.imageInput.click();
      },
      
      // 이미지 변경 처리
      handleImageChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.editImageFile = file;
        
        // 이미지 미리보기
        const reader = new FileReader();
        reader.onload = e => {
          this.editImage = e.target.result;
        };
        reader.readAsDataURL(file);
      },
      
      // 컬럼 추가
      addColumn() {
        const newColumn = prompt('새 컬럼 이름을 입력하세요:');
        if (!newColumn || newColumn.trim() === '') return;
        
        const formattedColumn = newColumn.trim().toUpperCase();
        
        // 중복 확인
        if (this.editColumns.includes(formattedColumn)) {
          alert(`'${formattedColumn}' 컬럼이 이미 존재합니다.`);
          return;
        }
        
        // 컬럼 추가
        this.editColumns.push(formattedColumn);
        
        // 모든 로우에 새 컬럼 추가
        this.editData.forEach(row => {
          row[formattedColumn] = '';
        });
      },
      
      // 로우 추가
      addRow() {
        if (this.editData.length === 0) {
          // 데이터가 없는 경우 초기 로우 생성
          const currentTime = new Date().toISOString();
          const newRow = {
            SHOT_NUMBER: 0,
            EVENTNAME: this.selectedEventType === 'visibility' ? 'cts_view' : 'cts_click',
            PAGETITLE: this.taggingMaps[0]?.PAGETITLE || '',
            PAGEPATH: this.taggingMaps[0]?.URL || '',
            TIME: this.formatTime(currentTime)
          };
          
          // 모든 컬럼 초기화
          this.editColumns.forEach(column => {
            if (!['SHOT_NUMBER', 'EVENTNAME', 'PAGETITLE', 'PAGEPATH', 'TIME'].includes(column)) {
              newRow[column] = '';
            }
          });
          
          this.editData.push(newRow);
          return;
        }
        
        // 마지막 로우 가져오기
        const lastRow = this.editData[this.editData.length - 1];
        
        // 새 로우 생성
        const newRow = {
          SHOT_NUMBER: parseInt(lastRow.SHOT_NUMBER) + 1,
          EVENTNAME: lastRow.EVENTNAME || '',
          PAGETITLE: lastRow.PAGETITLE || '',
          PAGEPATH: lastRow.PAGEPATH || '',
          TIME: lastRow.TIME || ''
        };
        
        // 모든 컬럼 초기화
        this.editColumns.forEach(column => {
          if (!['SHOT_NUMBER', 'EVENTNAME', 'PAGETITLE', 'PAGEPATH', 'TIME'].includes(column)) {
            newRow[column] = '';
          }
        });
        
        // 로우 추가
        this.editData.push(newRow);
      },
      
      // 로우 삭제
      removeRow(index) {
        if (confirm('이 행을 삭제하시겠습니까?')) {
          this.editData.splice(index, 1);
          
          // SHOT_NUMBER 재정렬
          this.editData.forEach((row, idx) => {
            row.SHOT_NUMBER = idx;
          });
        }
      },
      
      validateShotNumber(index) {
        // 음수 방지
        if (this.editData[index].SHOT_NUMBER < 0) {
          this.editData[index].SHOT_NUMBER = 0;
        }
        // 중복 체크는 저장 시 일괄 처리
      },

      // 변경사항 저장
      async saveChanges() {
        try {
          if (!this.taggingMaps || this.taggingMaps.length === 0) return;

          // SHOT_NUMBER 중복 체크
          const shotNumbers = this.editData.map(row => row.SHOT_NUMBER);
          const hasDuplicates = shotNumbers.length !== new Set(shotNumbers).size;
          if (hasDuplicates) {
            alert('SHOT_NUMBER 값이 중복된 행이 있습니다. 모든 SHOT_NUMBER는 고유해야 합니다.');
            this.isSaving = false;
            return;
          }
          
          this.isSaving = true;
          const taggingMapId = this.taggingMaps[0]._id;
          
          const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
          const formData = new FormData();
          
          // 데이터 추가
          formData.append('eventParams', JSON.stringify(this.editData));
          
          // 이미지가 변경된 경우 추가
          if (this.editImageFile) {
            formData.append('image', this.editImageFile);
          }
          
          // 태깅맵 업데이트 요청
          const response = await axios.put(`${baseUrl}/api/taggingmaps/${taggingMapId}`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          if (response.status === 200) {
            // 수정 성공
            alert('태깅맵이 성공적으로 수정되었습니다.');
            this.isEditing = false;
            
            // 수정 상태 초기화
            this.editImage = null;
            this.editImageFile = null;
            this.editColumns = [];
            this.editData = [];
            
            // 현재 페이지 리로드
            this.fetchFilteredData();
          } else {
            throw new Error('수정 요청이 실패했습니다.');
          }
        } catch (error) {
          console.error('태깅맵 수정 중 오류:', error);
          alert(`수정 실패: ${error.message}`);
        } finally {
          this.isSaving = false;
        }
      },
      // 행 이동
      moveRow(index, direction) {
        if (direction === 'up' && index > 0) {
          // 위로 이동
          const temp = this.editData[index];
          this.editData.splice(index, 1);
          this.editData.splice(index - 1, 0, temp);
          // SHOT_NUMBER 업데이트
          this.updateShotNumbers();
        } else if (direction === 'down' && index < this.editData.length - 1) {
          // 아래로 이동
          const temp = this.editData[index];
          this.editData.splice(index, 1);
          this.editData.splice(index + 1, 0, temp);
          // SHOT_NUMBER 업데이트
          this.updateShotNumbers();
        }
      },
      
      // SHOT_NUMBER 업데이트
      updateShotNumbers() {
        this.editData.forEach((row, idx) => {
          row.SHOT_NUMBER = idx;
        });
      },

      // 로그 파일 선택 트리거
      triggerLogFileSelect() {
        this.$refs.logFileInput.click();
      },

      // 로그 파일 변경 처리
      handleLogFileChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.logFileName = file.name;
        
        const reader = new FileReader();
        reader.onload = e => {
          this.logFileContent = e.target.result;
        };
        reader.readAsText(file);
      },
      
      // 로그 파싱 (수정)
      parseLog() {
        try {
          if (!this.logText.trim()) {
            alert('파싱할 로그 내용이 없습니다.');
            return;
          }
          
          let parsedData = [];
          
          // 로그 형식에 따라 파싱
          if (this.logFormat === 'android') {
            parsedData = this.parseAndroidLog(this.logText);
          } else if (this.logFormat === 'ios') {
            parsedData = this.parseIOSLog(this.logText);
          }
          
          if (parsedData.length === 0) {
            alert('파싱할 데이터가 없거나 형식이 올바르지 않습니다.');
            return;
          }
          
          // 파싱된 데이터 추가
          this.addParsedDataToTable(parsedData);
          
          // 성공 메시지
          //alert(`${parsedData.length}개의 데이터가 성공적으로 파싱되어 추가되었습니다.`);
          
          // 입력 초기화
          this.clearLogInput();
          
        } catch (error) {
          console.error('로그 파싱 중 오류 발생:', error);
          alert(`로그 파싱 중 오류가 발생했습니다: ${error.message}`);
        }
      },
  
      
      // 안드로이드 로그 파싱
      parseAndroidLog(logText) {
        const rows = [];
        const lines = logText.split('\n').filter(line => line.trim());
        
        // logcat 로그에서 JSON 데이터 추출
        for (const line of lines) {
          try {
            // 로그에서 JSON 문자열 부분 추출
            const jsonStartIndex = line.indexOf('{"log_body"');
            if (jsonStartIndex === -1) continue;
            
            const jsonStr = line.substring(jsonStartIndex);
            const logData = JSON.parse(jsonStr);
            
            if (!logData.log_body || !logData.log_body.length) continue;
            
            for (const event of logData.log_body) {
              // 기본 데이터 준비
              let pagetitle = "";
              let url = "";
              
              if (logData.dt) {
                pagetitle = logData.dt;
              } else if (logData.screen_name) {
                pagetitle = logData.screen_name;
              }
              
              if (logData.dl) {
                url = logData.dl;
              }
              
              const time = logData.timestamp || new Date().toISOString();
              
              // 행 데이터 생성
              if (event.eventParams) {
                const row = {
                  uniqueId: this.nextUniqueId++,
                  SHOT_NUMBER: this.editData.length + rows.length,
                  EVENTNAME: event.en || '',
                  PAGEPATH: url,
                  PAGETITLE: pagetitle,
                  TIME: this.formatTime(time),
                };
                
                // 추가 파라미터 처리
                this.processEventParams(row, event.eventParams);
                
                // 상품 정보 처리
                if (event.eventParams.items && Array.isArray(event.eventParams.items)) {
                  for (const item of event.eventParams.items) {
                    if (item.item_id) row.ITEM_ID = item.item_id;
                    if (item.item_name) row.ITEM_NAME = item.item_name;
                    if (item.price) row.PRICE = item.price;
                    if (item.coupon) row.COUPON_YN = item.coupon;
                    if (item.discount) row.DISCOUNT = item.discount;
                    if (item.item_brand) row.ITEM_BRAND = item.item_brand;
                  }
                }
                
                rows.push(row);
              }
            }
          } catch (error) {
            console.error('안드로이드 로그 파싱 중 오류:', error, line);
            // 오류가 있는 라인은 건너뛰고 다음 라인 파싱 계속
          }
        }
        
        return rows;
      },
      
      // iOS 로그 파싱
      parseIOSLog(logText) {
        const rows = [];
        
        try {
          // iOS 로그는 일반적으로 JSON 형식이므로 바로 파싱
          const jsonObjects = this.extractJsonObjects(logText);
          
          for (const logData of jsonObjects) {
            if (!logData.log_body || !logData.log_body.length) continue;
            
            for (const event of logData.log_body) {
              // 기본 데이터 준비
              let pagetitle = "";
              let url = "";
              
              if (logData.dt) {
                pagetitle = logData.dt;
              } else if (logData.screen_name) {
                pagetitle = logData.screen_name;
              }
              
              if (logData.dl) {
                url = logData.dl;
              }
              
              const time = logData.timestamp || new Date().toISOString();
              
              // 행 데이터 생성
              if (event.eventParams) {
                const row = {
                  uniqueId: this.nextUniqueId++,
                  SHOT_NUMBER: this.editData.length + rows.length,
                  EVENTNAME: event.en || '',
                  PAGEPATH: url,
                  PAGETITLE: pagetitle,
                  TIME: this.formatTime(time),
                  SOURCE: 'AUTO'  // 자동 파싱이므로 AUTO 표시
                };
                
                // 추가 파라미터 처리
                this.processEventParams(row, event.eventParams);
                
                // 상품 정보 처리
                if (event.eventParams.items && Array.isArray(event.eventParams.items)) {
                  for (const item of event.eventParams.items) {
                    if (item.item_id) row.ITEM_ID = item.item_id;
                    if (item.item_name) row.ITEM_NAME = item.item_name;
                    if (item.price) row.PRICE = item.price;
                    if (item.coupon) row.COUPON_YN = item.coupon;
                    if (item.discount) row.DISCOUNT = item.discount;
                    if (item.item_brand) row.ITEM_BRAND = item.item_brand;
                  }
                }
                
                // LABEL_TEXT가 없으면 기본값 설정
                if (!row['LABEL_TEXT']) {
                  row['LABEL_TEXT'] = '(라벨 없음)';
                }
                
                rows.push(row);
              }
            }
          }
        } catch (error) {
          console.error('iOS 로그 파싱 중 오류:', error);
          throw new Error(`iOS 로그 파싱 실패: ${error.message}`);
        }
        
        return rows;
      },

      // 시간 형식 변환
      formatTime(timeStr) {
        try {
          const date = new Date(timeStr);
          return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        } catch (e) {
          return timeStr; // 변환 실패 시 원본 반환
        }
      },
      // processEventParams에서 필드맵핑 PageDetailView.vue의 methods 안에 추가
      normalizeFieldName(key) {
        // 1. 매핑 규칙이 존재하는 경우, 매핑된 값 반환
        if (this.fieldMappings[key]) {
          return this.fieldMappings[key];
        }
        
        // 2. 'cd'로 시작하는 키 처리 (e.g., cd123_user_id2 → USER_ID2)
        if (key.match(/^cd\d+_/)) {
          const cleanKey = key.replace(/cd\d+_/g, '');
          return cleanKey.toUpperCase();
        }
        
        // 3. 'ep_' 접두어가 있는 키 처리 (e.g., ep_new_tag → NEW_TAG)
        if (key.startsWith('ep_')) {
          const cleanKey = key.substring(3);
          return cleanKey.toUpperCase();
        }
        
        // 4. 그 외에는 그대로 대문자화하여 반환
        return key.toUpperCase();
      },
        // 이벤트 파라미터 처리
        processEventParams(targetRow, eventParams) {
        if (eventParams && typeof eventParams === 'object' && !Array.isArray(eventParams)) {
          for (const [key, value] of Object.entries(eventParams)) {
            if (key === 'items') continue;
            
            // normalizeFieldName 함수를 호출하여 변환된 키를 사용
            const normalizedKey = this.normalizeFieldName(key);
            
            if (typeof value === 'object' && value !== null) {
              targetRow[normalizedKey] = JSON.stringify(value);
            } else {
              targetRow[normalizedKey] = String(value);
            }
          }
        }
      },
      
       // JSON 객체 추출
      extractJsonObjects(text) {
        const jsonObjects = [];
        try {
          // 전체 텍스트가 단일 JSON인 경우
          const fullJson = JSON.parse(text);
          if (fullJson) {
            jsonObjects.push(fullJson);
            return jsonObjects;
          }
        } catch (e) {
          // 단일 JSON이 아니면 여러 JSON 객체를 찾기
          const jsonRegex = /\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}/g;
          const matches = text.match(jsonRegex);
          
          if (matches) {
            for (const match of matches) {
              try {
                const json = JSON.parse(match);
                if (json && json.log_body) {
                  jsonObjects.push(json);
                }
              } catch (e) {
                // 파싱 실패한 JSON은 무시
              }
            }
          }
        }
        return jsonObjects;
      },

      // 파싱된 데이터를 테이블에 추가
      addParsedDataToTable(parsedRows) {
        // 컬럼 추가 (기존에 없는 컬럼)
        parsedRows.forEach(row => {
          Object.keys(row).forEach(key => {
            if (key !== 'uniqueId' && key !== 'SHOT_NUMBER' && !this.editColumns.includes(key)) {
              this.editColumns.push(key);
            }
          });
        });
        
        // 모든 행의 데이터 추가
        this.editData.push(...parsedRows);
        
        // SHOT_NUMBER 재조정
        this.updateShotNumbers();
      },
      
      // 로그 입력 초기화
      clearLogInput() {
        this.logText = '';
      },

      // 컬럼 삭제
      removeColumn(columnName) {
        if (this.isRequiredColumn(columnName)) {
          alert('필수 컬럼은 삭제할 수 없습니다.');
          return;
        }
        
        if (confirm(`'${columnName}' 컬럼을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
          // editColumns 배열에서 컬럼 제거
          const columnIndex = this.editColumns.indexOf(columnName);
          if (columnIndex !== -1) {
            this.editColumns.splice(columnIndex, 1);
            
            // 모든 행에서 해당 컬럼 속성 제거
            this.editData.forEach(row => {
              delete row[columnName];
            });
          }
        }
      },

      // 필수 컬럼 체크
      isRequiredColumn(columnName) {
        // 삭제할 수 없는 필수 컬럼 목록
        const requiredColumns = ['SHOT_NUMBER', 'EVENTNAME', 'TIME'];
        return requiredColumns.includes(columnName);
      },
      // 이미지 모달 열기
      openImageZoomModal() {
        this.showImageModal = true;
        this.resetZoom();
        
        // 모달이 열린 후 키보드 이벤트 리스너 추가
        this.$nextTick(() => {
          document.addEventListener('keydown', this.handleKeyDown);
          
          // 드래그 기능 초기화
          const zoomContainer = this.$refs.zoomContainer;
          if (zoomContainer) {
            zoomContainer.addEventListener('mousedown', this.startDrag);
            zoomContainer.addEventListener('mousemove', this.drag);
            zoomContainer.addEventListener('mouseup', this.endDrag);
            zoomContainer.addEventListener('mouseleave', this.endDrag);
            
            // 모바일 터치 이벤트
            zoomContainer.addEventListener('touchstart', this.startDrag);
            zoomContainer.addEventListener('touchmove', this.drag);
            zoomContainer.addEventListener('touchend', this.endDrag);
          }
        });
      },
      
      // 이미지 모달 닫기
      closeImageModal() {
        this.showImageModal = false;
        
        // 이벤트 리스너 제거
        document.removeEventListener('keydown', this.handleKeyDown);
        
        const zoomContainer = this.$refs.zoomContainer;
        if (zoomContainer) {
          zoomContainer.removeEventListener('mousedown', this.startDrag);
          zoomContainer.removeEventListener('mousemove', this.drag);
          zoomContainer.removeEventListener('mouseup', this.endDrag);
          zoomContainer.removeEventListener('mouseleave', this.endDrag);
          
          zoomContainer.removeEventListener('touchstart', this.startDrag);
          zoomContainer.removeEventListener('touchmove', this.drag);
          zoomContainer.removeEventListener('touchend', this.endDrag);
        }
      },
      
      // 키보드 이벤트 처리
      handleKeyDown(e) {
        if (e.key === 'Escape') {
          this.closeImageModal();
        } else if (e.key === '+' || e.key === '=') {
          this.zoomIn();
        } else if (e.key === '-') {
          this.zoomOut();
        } else if (e.key === '0') {
          this.resetZoom();
        }
      },
      
      // 이미지 로드 시 자동 배율 조정 함수
      onImageLoad() {
        // 모달과 이미지 요소 참조 가져오기
        const modalEl = this.$refs.zoomWrapper;
        const imageEl = this.$refs.zoomImage;
        
        if (!modalEl || !imageEl) return;
        
        // 이미지 원본 크기 저장
        this.naturalWidth = imageEl.naturalWidth;
        this.naturalHeight = imageEl.naturalHeight;
        
        // 모달 가로 길이
        const modalWidth = modalEl.clientWidth;
        
        // 이미지와 모달의 가로 비율 계산
        const widthRatio = this.naturalWidth / modalWidth;
        
        // 비율에 따른 초기 배율 설정
        if (widthRatio > 3) {
          // 3배 이상 큰 경우 -> 30%로 설정
          this.zoomLevel = 0.3;
        } else if (widthRatio > 2) {
          // 2배 이상 큰 경우 -> 50%로 설정
          this.zoomLevel = 0.5;
        } else if (widthRatio > 1.5) {
          // 1.5배 이상 큰 경우 -> 70%로 설정
          this.zoomLevel = 0.7;
        } else {
          // 그 외의 경우 -> 100% 유지
          this.zoomLevel = 1;
        }
        
        // 이미지 실제 크기 저장 (필요시)
        this.imageRealHeight = this.naturalHeight * this.zoomLevel;
        
        // 로그 출력 (디버깅 용도)
        console.log(`이미지 크기: ${this.naturalWidth}x${this.naturalHeight}`);
        console.log(`모달 가로: ${modalWidth}, 비율: ${widthRatio}`);
        console.log(`초기 배율 설정: ${this.zoomLevel * 100}%`);
        
        // 추가 로깅 (요청한 정보)
        const now = new Date();
        const dateTime = now.toISOString().replace('T', ' ').substr(0, 19);
        console.log(`Loaded at: ${dateTime}, User: ${this.currentUser || 'wschoi-loca'}`);
        
        // 초기 위치 조정 (중앙 정렬)
        this.resetImagePosition();
      },

      // 이미지 위치 초기화 (중앙 정렬) 메서드
      resetImagePosition() {
        const modalEl = this.$refs.zoomWrapper;
        if (!modalEl) return;
        
        // 이미지 크기와 모달 크기를 고려하여 중앙 정렬
        const scaledWidth = this.naturalWidth * this.zoomLevel;
        const scaledHeight = this.naturalHeight * this.zoomLevel;
        
        // 중앙 정렬을 위한 오프셋 계산
        const offsetX = Math.max(0, (modalEl.clientWidth - scaledWidth) / 2);
        const offsetY = Math.max(0, (modalEl.clientHeight - scaledHeight) / 2);
        
        // 위치 업데이트
        this.panPosition = {
          x: offsetX,
          y: offsetY
        };
      },
      zoomIn() {
        if (this.zoomLevel < 7) this.zoomLevel = Math.min(7, this.zoomLevel + 0.1);
        this.fixPanBounds();
      },
      zoomOut() {
        if (this.zoomLevel > 0.05) {  // 최소 0.05(5%)까지 가능
          // 부드러운 축소를 위한 단계 조정
          let step;
          if (this.zoomLevel > 2) step = 0.2;      // 크게 축소
          else if (this.zoomLevel > 0.5) step = 0.1; // 중간 축소
          else step = 0.05;                        // 미세 축소
          
          this.zoomLevel = Math.max(0.05, this.zoomLevel - step);
        }
      },
      resetZoom() {
        // 모달과 이미지 요소 참조 가져오기
        const modalEl = this.$refs.zoomWrapper;
        const imageEl = this.$refs.zoomImage;
        
        if (!modalEl || !imageEl) {
          // 요소가 없으면 기본값으로 설정
          this.zoomLevel = 1;
          this.panPosition = { x: 0, y: 0 };
          return;
        }
        
        // 이미지 원본 크기 확인
        const imgWidth = this.naturalWidth || imageEl.naturalWidth;
        const imgHeight = this.naturalHeight || imageEl.naturalHeight;
        
        // 모달 가로 길이
        const modalWidth = modalEl.clientWidth;
        
        // 이미지와 모달의 가로 비율 계산
        const widthRatio = imgWidth / modalWidth;
        
        // 비율에 따른 초기 배율 설정
        if (widthRatio > 3) {
          // 3배 이상 큰 경우 -> 30%로 설정
          this.zoomLevel = 0.3;
        } else if (widthRatio > 2) {
          // 2배 이상 큰 경우 -> 50%로 설정
          this.zoomLevel = 0.5;
        } else if (widthRatio > 1.5) {
          // 1.5배 이상 큰 경우 -> 70%로 설정
          this.zoomLevel = 0.7;
        } else {
          // 그 외의 경우 -> 100% 유지
          this.zoomLevel = 1;
        }
        
        // 이미지 위치 초기화 (중앙 정렬)
        const scaledWidth = imgWidth * this.zoomLevel;
        const scaledHeight = imgHeight * this.zoomLevel;
        
        // 중앙 정렬을 위한 오프셋 계산
        const offsetX = Math.max(0, (modalWidth - scaledWidth) / 2);
        const offsetY = Math.max(0, (modalEl.clientHeight - scaledHeight) / 2);
        
        // 위치 업데이트
        this.panPosition = { x: offsetX, y: offsetY };
        
        // 로그 출력 (요청한 형식대로)
        const now = new Date();
        const formattedDate = now.getUTCFullYear() + '-' + 
            String(now.getUTCMonth() + 1).padStart(2, '0') + '-' + 
            String(now.getUTCDate()).padStart(2, '0') + ' ' + 
            String(now.getUTCHours()).padStart(2, '0') + ':' + 
            String(now.getUTCMinutes()).padStart(2, '0') + ':' + 
            String(now.getUTCSeconds()).padStart(2, '0');
            
        console.log(`Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${formattedDate}`);
        console.log(`Current User's Login: wschoi-loca`);
        console.log(`Applied zoom level: ${this.zoomLevel * 100}% (width ratio: ${widthRatio.toFixed(2)})`);
      },
      // startDrag 메서드 수정
      startDrag(event) {
        // 터치 이벤트 또는 마우스 이벤트 처리
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        
        // 무조건 드래그 가능하도록 설정 (배율에 상관없이)
        this.isDragging = true;
        this.lastX = clientX;
        this.lastY = clientY;
        
        // 커서 스타일 변경
        document.body.style.cursor = 'grabbing';
      },
      // drag 메서드 수정
      drag(event) {
        if (!this.isDragging) return;
        
        // 터치 이벤트 또는 마우스 이벤트 처리
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        
        // 이동 거리 계산
        const dx = clientX - this.lastX;
        const dy = clientY - this.lastY;
        
        // panPosition 업데이트 (배율에 상관없이 이동)
        this.panPosition.x += dx;
        this.panPosition.y += dy;
        
        // 현재 위치 저장
        this.lastX = clientX;
        this.lastY = clientY;
      },
      // endDrag 메서드 수정
      endDrag() {
        this.isDragging = false;
        document.body.style.cursor = '';  // 커서 스타일 복원
      },
      // 휠 이벤트 핸들러 수정
      // handleWheel 메서드 수정
      handleWheel(event) {
        event.preventDefault(); // 페이지 스크롤 방지
        
        if (event.ctrlKey) {
          // Ctrl+휠: 확대/축소
          if (event.deltaY > 0 && this.zoomLevel > 0.05) {
            // 축소
            const step = this.zoomLevel > 1 ? 0.1 : 0.05;
            this.zoomLevel = Math.max(0.05, this.zoomLevel - step);
          } else if (event.deltaY < 0 && this.zoomLevel < 7) {
            // 확대
            const step = this.zoomLevel < 1 ? 0.05 : 0.1;
            this.zoomLevel = Math.min(7, this.zoomLevel + step);
          }
        } else {
          // 일반 휠: 이미지 이동 (직접적으로 값 변경)
          const scrollSpeed = 20; // 스크롤 속도 조절
          
          // 수직 스크롤
          if (event.deltaY !== 0) {
            this.panPosition.y -= event.deltaY > 0 ? scrollSpeed : -scrollSpeed;
          }
          
          // 수평 스크롤 (Shift+휠 또는 수평 휠 이벤트)
          if (event.deltaX !== 0) {
            this.panPosition.x -= event.deltaX > 0 ? scrollSpeed : -scrollSpeed;
          } else if (event.shiftKey && event.deltaY !== 0) {
            this.panPosition.x -= event.deltaY > 0 ? scrollSpeed : -scrollSpeed;
          }
        }
      },
      fixPanBounds() {
        // zoomLevel이 바뀐 뒤에도 pan이 한계 넘지 않도록 보정
        const wrapper = this.$refs.zoomWrapper;
        const iw = this.naturalWidth * this.zoomLevel;
        const ih = this.naturalHeight * this.zoomLevel;
        if (wrapper) {
          const w = wrapper.clientWidth;
          const h = wrapper.clientHeight;
          const minX = Math.min(0, w - iw);
          const minY = Math.min(0, h - ih);
          this.panPosition.x = Math.max(minX, Math.min(0, this.panPosition.x));
          this.panPosition.y = Math.max(minY, Math.min(0, this.panPosition.y));
        } else {
          this.panPosition = { x: 0, y: 0 };
        }
      },
      /* 필터 공유 기능
      * 현재 페이지 URL과 필터 설정을 클립보드에 복사
      */
      shareFilters() {
        try {
          // 1. 현재 URL 가져오기
          const currentUrl = window.location.href;
          
          // 2. 필터 값들 수집
          const filters = {
            eventType: this.selectedEventType || '선택되지 않음',
            url: this.selectedUrl || '선택되지 않음',
            timestamp: this.selectedTimestamp 
              ? this.formatTimestamp(this.selectedTimestamp) + 
                (this.formatEventNames(this.getEventNamesForTimestamp(this.selectedTimestamp)) || '')
              : '선택되지 않음'
          };
          
          // 3. 공유 텍스트 생성
          let shareText = '🔍 태깅맵 필터 공유\n\n';
          shareText += `📌 URL: ${currentUrl}\n\n`;
          shareText += '📋 필터 설정:\n';
          
          // 필터 값 추가
          shareText += `- 이벤트 유형: ${filters.eventType === 'visibility' ? '노출' : filters.eventType === 'click' ? '클릭' : filters.eventType}\n`;
          shareText += `- URL: ${filters.url}\n`;
          shareText += `- 타임스탬프: ${filters.timestamp}\n`;
          
          // 4. 클립보드에 복사
          navigator.clipboard.writeText(shareText)
            .then(() => {
              // 성공 메시지 표시
              this.showToast('필터 설정이 클립보드에 복사되었습니다.', 'success');
              
              // 로그 출력 (요청한 형식대로)
              const now = new Date();
              const formattedDate = now.getUTCFullYear() + '-' + 
                  String(now.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getUTCDate()).padStart(2, '0') + ' ' + 
                  String(now.getUTCHours()).padStart(2, '0') + ':' + 
                  String(now.getUTCMinutes()).padStart(2, '0') + ':' + 
                  String(now.getUTCSeconds()).padStart(2, '0');
                  
              console.log(`Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${formattedDate}`);
              console.log(`Current User's Login: wschoi-loca`);
              console.log(`Filters shared: ${JSON.stringify(filters)}`);
            })
            .catch(err => {
              console.error('클립보드 복사 실패:', err);
              this.showToast('클립보드 복사에 실패했습니다.', 'error');
            });
        } catch (error) {
          console.error('필터 공유 중 오류:', error);
          this.showToast('필터 공유 중 오류가 발생했습니다.', 'error');
        }
      },

      /**
       * 타임스탬프에 해당하는 이벤트 이름 가져오기
       */
      getEventNamesForTimestamp(timestamp) {
        if (!timestamp) return null;
        
        const timeEntry = this.times.find(t => t.timestamp === timestamp);
        return timeEntry ? timeEntry.eventNames : null;
      },

      /**
       * 토스트 메시지 표시
       */
       showToast(message, type = 'success') {
        // 이미 표시 중인 토스트가 있으면 타이머 제거
        if (this.toast.timer) {
          clearTimeout(this.toast.timer);
        }
        
        // 토스트 상태 업데이트
        this.toast.message = message;
        this.toast.type = type;
        this.toast.show = true;
        
        // 로그 출력
        const now = new Date();
        const formattedDate = now.getUTCFullYear() + '-' + 
            String(now.getUTCMonth() + 1).padStart(2, '0') + '-' + 
            String(now.getUTCDate()).padStart(2, '0') + ' ' + 
            String(now.getUTCHours()).padStart(2, '0') + ':' + 
            String(now.getUTCMinutes()).padStart(2, '0') + ':' + 
            String(now.getUTCSeconds()).padStart(2, '0');
            
        console.log(`Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${formattedDate}`);
        console.log(`Current User's Login: wschoi-loca`);
        console.log(`Toast message: ${message} (${type})`);
        
        // 3초 후 토스트 숨기기
        this.toast.timer = setTimeout(() => {
          this.toast.show = false;
        }, 3000);
      },
      /**
       * 테이블을 왼쪽으로 스크롤 (컬럼 단위)
       */
      scrollTableLeft() {
        const container = this.$refs.tableScrollContainer;
        if (!container) return;
        
        // 현재 스크롤 위치에서 컬럼 너비만큼 왼쪽으로 이동
        container.scrollLeft -= this.columnWidth;
        
        // 스크롤 후 위치 업데이트
        this.$nextTick(() => {
          this.updateScrollPosition();
        });
      },
      
      /**
       * 테이블을 오른쪽으로 스크롤 (컬럼 단위)
       */
      scrollTableRight() {
        const container = this.$refs.tableScrollContainer;
        if (!container) return;
        
        // 현재 스크롤 위치에서 컬럼 너비만큼 오른쪽으로 이동
        container.scrollLeft += this.columnWidth;
        
        // 스크롤 후 위치 업데이트
        this.$nextTick(() => {
          this.updateScrollPosition();
        });
      },
      
      /**
       * 스크롤 위치 업데이트
       */
      updateScrollPosition() {
        const container = this.$refs.tableScrollContainer;
        if (!container) return;
        
        // 전체 스크롤 가능 너비
        const scrollWidth = container.scrollWidth - container.clientWidth;
        
        // 현재 스크롤 위치 계산
        this.isScrollLeftEnd = container.scrollLeft <= 0;
        this.isScrollRightEnd = container.scrollLeft >= scrollWidth;
        
        // 컬럼 기준 위치 계산 (첫번째 컬럼은 SHOT_NUMBER이므로 +1)
        const visibleColumns = Math.floor(container.clientWidth / this.columnWidth);
        const totalColumns = this.sortedColumns.length + 1; // SHOT_NUMBER 컬럼 포함
        
        // 현재 표시 중인 첫 번째 컬럼 (대략적인 계산)
        const currentColumn = Math.floor(container.scrollLeft / this.columnWidth) + 1;
        
        this.scrollPosition = {
          current: currentColumn,
          total: totalColumns - visibleColumns + 1 // 화면에 보이는 컬럼 수를 고려
        };
      },

      //줄 바꿈 모드 토글
      toggleWrapMode() {
        this.isWrapMode = !this.isWrapMode;
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
  overflow: visible;
}

.image-section {
  flex: 1;
  min-width: 300px;
  overflow: visible; /* 만약 hidden이나 auto로 설정되어 있다면 visible로 변경 */
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
  /* overflow-x: auto; 제거 - 이제 내부 컨테이너가 스크롤 담당 */
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

.header-buttons {
  display: flex;
  gap: 10px;
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

/* 수정 버튼 스타일 */
.edit-btn {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.edit-btn:hover {
  background-color: #0056b3;
}

/* 수정 모달 스타일 - PC 화면에 최적화 */
.edit-modal {
  width: 98%; /* 95%에서 98%로 증가 */
  max-width: 1800px; /* 1400px에서 1800px로 증가 */
  max-height: 95vh; /* 90vh에서 95vh로 증가 */
  overflow-y: auto;
}

/* 모달 바디 기본 스타일 */
.modal-body {
  padding: 25px; /* 패딩 증가 */
}

/* 스크린샷 영역 */
.edit-image-section {
  flex: 0 0 40%; /* 왼쪽 영역 너비 조정 (40%) */
  max-width: 40%;
}

.edit-image-section h4 {
  margin-bottom: 15px;
  color: #333;
}
 
.image-preview {
  margin-bottom: 15px;
  width: 100%;
  height: 100%; /* 고정 높이 설정 */
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.image-preview img {
  width: 100%; /* 가로 크기 100%로 설정 */
  height: 100%; /* 높이도 100%로 설정 */
  object-fit: cover; /* 비율을 유지하면서 영역을 꽉 채움 */
}

input[type="file"] {
  display: none;
}

.change-image-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.change-image-btn:hover {
  background-color: #5a6268;
}

/* 데이터 편집 영역 */
.edit-data-section h4 {
  margin-bottom: 15px;
  color: #333;
}

.edit-data-section {
  flex: 1; /* 남은 공간 모두 차지 */
  overflow: auto;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 25px;
  max-height: 600px; /* 500px에서 600px로 증가 */
  overflow-y: auto;
  border: 1px solid #eee; /* 테두리 추가 */
  border-radius: 8px; /* 둥근 모서리 추가 */
}

.edit-table {
  width: 100%;
  border-collapse: collapse;
}

.edit-table th {
  background-color: #f2f2f2;
  border: 1px solid #ddd;
  padding: 10px;
  position: sticky;
  top: 0;
  z-index: 10;
  text-align: left;
}

.edit-table td {
  border: 1px solid #ddd;
  padding: 5px;
}

.column-add-cell {
  width: 50px;
  text-align: center;
}

.add-column-btn {
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: bold;
  font-size: 16px;
  line-height: 1;
}

.add-column-btn:hover {
  background-color: #218838;
}

.cell-input {
  width: 100%;
  padding: 0.5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f8f9fa;
}

.cell-input:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.action-cell {
  width: 40px;
  text-align: center;
}

.remove-row-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: bold;
  font-size: 16px;
  line-height: 1;
}

.remove-row-btn:hover {
  background-color: #c82333;
}

.add-row-container {
  text-align: center;
  margin-top: 15px;
  margin-bottom: 10px;
}

.add-row-btn {
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
}

.add-row-btn:hover {
  background-color: #218838;
  transform: translateY(-1px);
}

.save-button {
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-button:hover:not(:disabled) {
  background-color: #218838;
}

.save-button:disabled {
  background-color: #8fd19e;
  cursor: not-allowed;
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
}

.modal-header {
  padding: 20px 25px; /* 패딩 증가 */
  border-bottom: 2px solid #eee; /* 테두리 두께 증가 */
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 24px; /* 폰트 크기 증가 */
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

.row-drag-handle {
  cursor: grab;
  font-size: 18px;
  color: #888;
  margin-right: 8px;
}
.row-drag-handle:active {
  cursor: grabbing;
}

.move-buttons-cell {
  white-space: nowrap;
}

.move-up-btn, .move-down-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  margin: 0 2px;
  font-size: 14px;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.move-up-btn:hover, .move-down-btn:hover {
  background-color: #e0e0e0;
}

.move-up-btn:disabled, .move-down-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 모바일 반응형 처리 */
@media (max-width: 768px) {
  .horizontal-layout {
    flex-direction: column;
  }
  
  .edit-image-section {
    flex: 0 0 100%;
    max-width: 100%;
    margin-bottom: 20px;
  }
}

/* 추가: 가로 레이아웃 스타일 강화 */
.modal-body.horizontal-layout {
  display: flex !important;
  flex-direction: row !important;
  gap: 20px !important;
}

.horizontal-layout .edit-image-section {
  flex: 0 0 40% !important;
  max-width: 40% !important;
  margin-right: 20px !important;
}

.horizontal-layout .edit-data-section {
  flex: 1 !important;
  overflow: auto !important;
}

/* 모바일 반응형 강화 */
@media (max-width: 768px) {
  .modal-body.horizontal-layout {
    flex-direction: column !important;
  }
  
  .horizontal-layout .edit-image-section {
    flex: 0 0 100% !important;
    max-width: 100% !important;
    margin-right: 0 !important;
    margin-bottom: 20px !important;
  }
}

/* 로그 파싱 섹션 스타일 */
.log-parsing-section {
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.log-parsing-section h5 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 16px;
}

.parsing-options {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 15px;
}

.option-group {
  flex: 1;
  min-width: 200px;
}

.option-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.log-input-area textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  resize: vertical;
}

.parsing-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.parse-btn {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
}

.parse-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.parse-btn:disabled {
  background-color: #b3d7ff;
  cursor: not-allowed;
}

.clear-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
}

.clear-btn:hover {
  background-color: #5a6268;
}

.divider {
  height: 1px;
  background-color: #e0e0e0;
  margin: 20px 0;
}

select {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ced4da;
  background-color: white;
}

.column-header {
  position: relative;
  padding-right: 30px; /* 삭제 버튼을 위한 공간 확보 */
}

.remove-column-btn {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  line-height: 1;
  opacity: 0.7;
  visibility: hidden; /* 기본적으로 숨김 */
}

.column-header:hover .remove-column-btn {
  visibility: visible; /* 헤더에 마우스 올릴 때만 표시 */
}

.remove-column-btn:hover {
  opacity: 1;
  background-color: #c82333;
}

/* 클릭 가능한 이미지 스타일 
.image-container {
  position: sticky;
  overflow: hidden;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.clickable-image {
  cursor: zoom-in;
  max-width: 100%;
  height: auto;
  display: block;
  transition: transform 0.2s;
}

.clickable-image:hover {
  transform: scale(1.02);
}

.image-zoom-hint {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  opacity: 0.8;
}
*/
/* 이미지 확대 모달 스타일 */
.image-modal {
  position: fixed;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 1400px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.image-zoom-container {
  position: relative;
  overflow: visible;
  width: 100%;
  height: 70vh;
  background-color: #f5f5f5;
  display: flex;
  align-items: flex-start;     /* 위쪽 정렬 */
  justify-content: flex-start; /* 왼쪽 정렬 */
}

.image-zoom-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  position: relative;
  transition: transform 0.1s ease-out;
  transform-origin: top left !important;
  cursor: grab;
}

.image-zoom-container img:active {
  cursor: grabbing;
}

.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px;
  gap: 10px;
  background-color: #f8f9fa;
  border-top: 1px solid #eee;
}

.zoom-btn {
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.zoom-btn:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.zoom-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-btn.reset {
  background-color: #007bff;
  color: white;
  border: none;
}

.zoom-btn.reset:hover {
  background-color: #0056b3;
}

.zoom-level {
  font-size: 14px;
  font-weight: bold;
  min-width: 60px;
  text-align: center;
}

/* 반응형 조정 */
@media (max-width: 768px) {
  .image-modal {
    width: 95%;
  }
  
  .image-zoom-container {
    height: 90vh;
  }
  
  .zoom-btn {
    width: 36px;
    height: 36px;
  }
}

.sticky-container {
  position: sticky;
  top: 20px;
  z-index: 10;
}

.image-container {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  background: #fafafa;
  overflow: hidden; /* 다시 hidden으로 변경! */
  min-width: 320px;
  min-height: 220px;
}

.zoomable-image-wrapper {
  overflow: visible;
  width: 100%;
  height: 95vh;
  min-height: 200px;
  max-height: 98vh;
  background: #eee;
  display: flex;
  align-items: flex-start;      /* 위쪽 정렬 */
  justify-content: flex-start;  /* 왼쪽 정렬 */
  position: relative;
  user-select: none;
  /*cursor: grab !important;  드래그 가능함을 나타내는 손 모양 커서 */
}

.zoomable-image-wrapper:active {
  cursor: grabbing; /* 드래그 중인 상태의 커서 */
}

.zoomable-image {
  position: relative;
  left: 0;
  top: 0;
  max-width: none;
  max-height: none;
  user-select: none;
  pointer-events: auto;
}

.zoomable-image:active {
  cursor: grabbing; /* 드래그 중인 상태의 커서 */
}

.absolute-top-right {
  position: absolute;
  top: 10px;
  right: 20px;
  z-index: 2;
  display: flex;
  gap: 6px;
  background: rgba(255,255,255,0.8);
  padding: 3px 7px;
  border-radius: 6px;
  box-shadow: 0 1px 5px rgba(0,0,0,0.03);
}
.zoom-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f0f0f0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.18s;
}
.zoom-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.zoom-btn.reset { background: #007bff; color: #fff;}
.zoom-btn.reset:hover { background: #0056b3; }
.zoom-btn:hover:not(:disabled) { background: #e0e0e0; }
.zoom-level { min-width: 48px; text-align: center; font-weight: bold; }
.no-image { color: #aaa; text-align: center; padding: 2em 0;}

/* 필터 버튼 컨테이너 */
.filter-buttons-container {
  display: flex;
  gap: 10px;
  align-items: center;
}


/* 필터 공유 버튼 스타일 수정 - 컬럼별 필터 버튼과 일치시킴 */
.share-filter-btn {
  background-color: #6A5ACD;  /* 보라색 계열 */
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.2s;
}

.share-filter-btn:hover {
  background-color: #5A4ABD;  /* 약간 더 어두운 보라색 */
}

.share-filter-btn i {
  font-size: 14px;
}
/* 버튼과 인디케이터 래퍼 */
.button-with-indicator {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

/* 필터 선택 표시자 스타일 */
.active-filters-indicator {
  position: absolute;
  bottom: -18px;
  left: 0;
  color: #dc3545;
  font-style: italic;
  font-size: 12px;
  white-space: nowrap;
}

/* 필터 버튼 컨테이너에 여백 추가 */
.filter-buttons-container {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 20px; /* 인디케이터를 위한 공간 확보 */
}

/* 버튼 그룹의 상대적 위치 설정 */
.advanced-search-group {
  position: relative;
  padding-bottom: 15px;
}

/* 토스트 메시지 스타일 */
/* Vue 컴포넌트 기반 토스트 스타일 */
.vue-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  min-width: 280px;
  padding: 15px 25px;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  font-size: 16px;
  z-index: 999999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.vue-toast-success {
  background-color: #4CAF50;
  border-left: 5px solid #2E7D32;
}

.vue-toast-error {
  background-color: #F44336;
  border-left: 5px solid #B71C1C;
}

/* 토스트 페이드 애니메이션 */
.toast-fade-enter-active, .toast-fade-leave-active {
  transition: opacity 0.5s, transform 0.5s;
}

.toast-fade-enter-from, .toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 전체 테이블 레이아웃 개선 */
.sticky-table {
  width: 100%;
  border-collapse: separate; /* collapse에서 separate로 변경 */
  border-spacing: 0; /* 셀 간격은 없애기 */
  table-layout: fixed; /* 고정 레이아웃으로 변경 */
}

/* 첫 번째 열 (SHOT_NUMBER) 너비 지정 */
.sticky-table th:first-child,
.sticky-table td:first-child {
  width: 150px; /* SHOT_NUMBER 열의 너비 설정 */
  min-width: 150px;
}

/* 나머지 열 기본 너비 설정 */
.sticky-table th:not(:first-child),
.sticky-table td:not(:first-child) {
  width: 180px; /* 기본 열 너비 */
  min-width: 180px;
}

/* 셀 내용 처리 방식 */
.sticky-table td, .sticky-table th {
  white-space: nowrap; /* 텍스트 줄바꿈 방지 */
  overflow: hidden;
  text-overflow: ellipsis; /* 내용이 너무 길면 ... 표시 */
  padding: 10px 15px;
  border: 1px solid #ddd;
}

/* 테이블 스크롤 컨테이너 - 수정된 버전 */
.table-scroll-container {
  width: 100%;
  overflow-x: auto;
  overflow-y: auto; /* 세로 스크롤도 허용 */
  max-height: 70vh; /* 테이블의 최대 높이 제한 */
  position: relative;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
/* 스티키 헤더 (상단 고정) - 우선순위 높임 */
.sticky-table thead tr th.sticky-header {
  position: sticky !important;
  top: 0 !important;
  background-color: #f2f2f2 !important;
  z-index: 10 !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1) !important;
}

/* 스티키 컬럼 (좌측 고정) - 우선순위 높임 */
.sticky-table td.sticky-column,
.sticky-table th.sticky-column {
  position: sticky !important;
  left: 0 !important;
  background-color: #f8f9fa !important;
  z-index: 5 !important;
  border-right: 2px solid #e9ecef !important;
}

/* 스티키 헤더이면서 스티키 컬럼인 경우 (좌상단 셀) - 우선순위 높임 */
.sticky-table th.sticky-header.sticky-column {
  z-index: 15 !important;
  background-color: #f2f2f2 !important;
}

/* 브라우저 호환성 개선 */
.sticky-table thead {
  position: relative; /* IE11 호환성 */
}

/* 모든 테이블 셀 기본 스타일 */
.sticky-table th, .sticky-table td {
  background-clip: padding-box; /* 배경색이 테두리까지 확장되지 않도록 함 */
}

/* 테이블 스크롤 컨트롤 버튼 */
.table-scroll-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 0 5px;
}

.scroll-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.scroll-btn:hover:not(:disabled) {
  background-color: #e9ecef;
  border-color: #ced4da;
}

.scroll-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scroll-indicator {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 14px;
  color: #495057;
}

/* 테이블 스크롤 애니메이션 */
.table-scroll-container {
  scroll-behavior: smooth;
}

/* 스티키 컬럼 스타일 강화 */
.sticky-column {
  left: 0;
  box-shadow: 2px 0 5px rgba(0,0,0,0.1);
}

/* 토글 가능한 줄바꿈 모드 */
.sticky-table.wrap-mode td {
  white-space: normal;
  word-break: break-word;
  height: auto;
  max-height: 150px;
  overflow-y: auto;
}

/* 토글 버튼 스타일 */
.text-wrap-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
  margin-right: 15px;
  transition: background-color 0.2s;
}

.text-wrap-toggle:hover {
  background-color: #e0e0e0;
}

.text-wrap-toggle.active {
  background-color: #007bff;
  color: white;
  border: 1px solid #0062cc;
}
</style>