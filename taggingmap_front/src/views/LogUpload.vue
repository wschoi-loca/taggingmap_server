<template>
    <div class="log-upload">
      <h1 class="page-title">태깅맵 로그 업로드</h1>
      
      <!-- 단계 진행바 - 클릭 가능하도록 수정 -->
      <div class="progress-steps">
        <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }" @click="goToStep(1)">
          <div class="step-number">1</div>
          <div class="step-title">로그 입력</div>
        </div>
        <div class="step-connector"></div>
        <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2, disabled: !canGoToStep(2) }" @click="canGoToStep(2) && goToStep(2)">
          <div class="step-number">2</div>
          <div class="step-title">데이터 편집</div>
        </div>
        <div class="step-connector"></div>
        <div class="step" :class="{ active: currentStep >= 3, completed: currentStep > 3, disabled: !canGoToStep(3) }" @click="canGoToStep(3) && goToStep(3)">
          <div class="step-number">3</div>
          <div class="step-title">업로드</div>
        </div>
      </div>
      
      <!-- 1단계: 로그 입력 폼 -->
      <div v-if="currentStep === 1" class="step-container">
        <div class="form-group">
          <label for="platform">플랫폼 선택:</label>
          <select id="platform" v-model="platform" class="form-control">
            <option value="android">Android</option>
            <option value="ios">iOS</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="logInput">로그 데이터 입력:</label>
          <textarea 
            id="logInput" 
            v-model="logInput" 
            class="form-control log-textarea"
            placeholder="Android 또는 iOS 로그를 여기에 붙여넣으세요..."
          ></textarea>
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" v-model="addScreenshot"> 
            스크린샷 첨부 (선택사항)
          </label>
          <div v-if="addScreenshot" class="mt-2">
            <input type="file" @change="handleFileUpload" accept="image/*" class="form-control-file">
            <div v-if="previewUrl" class="mt-2">
              <img :src="previewUrl" alt="Screenshot preview" class="img-preview">
            </div>
          </div>
        </div>
        
        <div class="button-group">
          <button @click="parseLog" class="btn btn-primary" :disabled="isProcessing || !logInput.trim()">
            {{ isProcessing ? '처리 중...' : '로그 파싱하기' }}
          </button>
          <button @click="clearInput" class="btn btn-secondary ml-2">
            지우기
          </button>
        </div>
      </div>
      
      <!-- 2단계: 파싱 결과 편집 - 양쪽 분할 레이아웃 -->
      <div v-if="currentStep === 2" class="step-container">
        <div class="alert" :class="{'alert-success': !hasError, 'alert-danger': hasError}" v-if="statusMessage">
          {{ statusMessage }}
        </div>
        
        <!-- 태깅맵 데이터 개수 경고 표시 -->
        <div class="alert alert-warning" v-if="editableParsedResult.length > 1">
          <strong>주의!</strong> 태깅맵 데이터는 1개만 업로드 가능합니다. 
          현재 {{ editableParsedResult.length }}개의 데이터가 있습니다. 
          업로드할 데이터를 제외한 나머지는 삭제해주세요.
        </div>
        
        <div v-if="!hasError && editableParsedResult.length > 0" class="split-layout">
          <!-- 왼쪽: 스크린샷 미리보기 -->
          <div class="left-panel">
            <div class="screenshot-container">
              <h3>스크린샷 미리보기</h3>
              <div v-if="previewUrl" class="screenshot-preview">
                <img :src="previewUrl" alt="Screenshot preview">
              </div>
              <div v-else class="no-screenshot">
                <i class="fas fa-image"></i>
                <p>스크린샷이 첨부되지 않았습니다</p>
                <div class="mt-3">
                  <input type="file" @change="handleFileUpload" accept="image/*" class="form-control-file">
                </div>
              </div>
            </div>
          </div>
          
          <!-- 오른쪽: 데이터 편집 패널 -->
          <div class="right-panel">
            <div class="data-editor">
              <div v-for="(entry, entryIndex) in editableParsedResult" :key="`entry-${entryIndex}`" class="data-card">
                <div class="card-header">
                  <h3>태깅맵 데이터 #{{ entryIndex + 1 }}</h3>
                  <div class="card-actions">
                    <button @click="duplicateEntry(entryIndex)" class="btn-icon" title="복제">
                      <i class="fas fa-copy"></i>
                    </button>
                    <button @click="removeEntry(entryIndex)" class="btn-icon btn-danger-icon" title="삭제">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group col-md-4">
                    <label>이벤트 타입:</label>
                    <select v-model="entry.EVENTTYPE" class="form-control">
                      <option value="visibility">visibility</option>
                      <option value="click">click</option>
                      <option value="popup_click">popup_click</option>
                    </select>
                  </div>
                  
                  <div class="form-group col-md-4">
                    <label>페이지 타이틀:</label>
                    <input type="text" v-model="entry.PAGETITLE" class="form-control" placeholder="페이지 타이틀">
                  </div>
                  
                  <div class="form-group col-md-4">
                    <label>URL:</label>
                    <input type="text" v-model="entry.URL" class="form-control" placeholder="페이지 URL">
                  </div>
                </div>
                
                <!-- 이벤트 파라미터 테이블 관련 컨트롤 -->
                <div class="table-controls">
                  <div class="left-controls">
                    <h4>이벤트 파라미터</h4>
                  </div>
                  <div class="right-controls">
                    <button @click="showColumnManager(entryIndex)" class="btn btn-sm btn-outline-secondary">
                      <i class="fas fa-columns"></i> 컬럼 관리
                    </button>
                    <button @click="addEventParam(entryIndex)" class="btn btn-sm btn-outline-primary">
                      <i class="fas fa-plus"></i> 파라미터 추가
                    </button>
                  </div>
                </div>
                
                <!-- 향상된 이벤트 파라미터 테이블 -->
                <div class="event-params-table">
                  <div class="table-responsive">
                    <table class="table table-bordered table-hover">
                      <thead>
                        <tr>
                          <th class="th-actions">작업</th>
                          <th v-for="column in visibleColumns" :key="column" :class="['th-' + column.toLowerCase()]">
                            {{ getColumnDisplayName(column) }}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(param, paramIndex) in entry.eventParams" :key="`param-${entryIndex}-${paramIndex}`">
                            <td class="td-actions">
                                <div class="action-buttons">
                                    <button @click="editEventParam(entryIndex, paramIndex)" class="btn-icon" title="편집">
                                    <i class="fas fa-edit"></i> 편집
                                    </button>
                                    <button @click="duplicateEventParam(entryIndex, paramIndex)" class="btn-icon" title="복제">
                                    <i class="fas fa-copy"></i> 복제
                                    </button>
                                    <button @click="removeEventParam(entryIndex, paramIndex)" class="btn-icon" title="삭제">
                                    <i class="fas fa-trash"></i> 삭제
                                    </button>
                                </div>
                            </td>
                          <td v-for="column in visibleColumns" :key="`${paramIndex}-${column}`">
                            <template v-if="isEditingCell && editingCell.entryIndex === entryIndex && editingCell.paramIndex === paramIndex && editingCell.column === column">
                              <input 
                                v-model="param[column]" 
                                class="form-control form-control-sm"
                                @blur="isEditingCell = false" 
                                @keyup.enter="isEditingCell = false"
                                v-focus
                              >
                            </template>
                            <template v-else>
                              <div 
                                class="editable-cell" 
                                @click="startEditingCell(entryIndex, paramIndex, column, param[column])"
                              >
                                {{ param[column] || '-' }}
                              </div>
                            </template>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <!-- 구분선 -->
                <hr v-if="entryIndex < editableParsedResult.length - 1">
              </div>
            </div>
          </div>
        </div>
        
        <div class="button-group mt-4">
          <button @click="goToStep(1)" class="btn btn-secondary">이전</button>
          <button @click="prepareForUpload" class="btn btn-primary ml-2" 
            :disabled="editableParsedResult.length === 0 || editableParsedResult.length > 1">
            다음
          </button>
        </div>
        
        <!-- 태깅맵 데이터 개수 안내 메시지 -->
        <div v-if="editableParsedResult.length > 1" class="alert alert-info mt-3">
          <p><strong>알림:</strong> 여러 태깅맵 데이터를 하나로 병합하려면 동일한 이벤트 타입, URL, 페이지 타이틀을 가진 데이터로 수정해주세요.</p>
        </div>
      </div>
      
      <!-- 3단계: 업로드 확인 -->
      <div v-if="currentStep === 3" class="step-container">
        <div class="upload-summary">
          <h3>업로드 요약</h3>
          
          <div class="summary-item">
            <strong>총 태깅맵 항목:</strong> {{ editableParsedResult.length }}개
          </div>
          
          <div class="summary-item">
            <strong>이벤트 타입:</strong> {{ eventTypeSummary }}
          </div>
          
          <div class="summary-item">
            <strong>페이지 타이틀:</strong> {{ editableParsedResult[0]?.PAGETITLE || '없음' }}
          </div>
          
          <div class="summary-item">
            <strong>URL:</strong> {{ editableParsedResult[0]?.URL || '없음' }}
          </div>
          
          <div class="summary-item">
            <strong>총 이벤트 파라미터:</strong> {{ totalEventParams }}개
          </div>
          
          <div class="summary-item">
            <strong>스크린샷:</strong> {{ addScreenshot ? '첨부됨' : '첨부되지 않음' }}
          </div>
        </div>
        
        <div class="button-group mt-4">
          <button @click="goToStep(2)" class="btn btn-secondary">수정</button>
          <button @click="uploadData" class="btn btn-success ml-2" :disabled="isUploading">
            {{ isUploading ? '업로드 중...' : '태깅맵 업로드' }}
          </button>
        </div>
      </div>
      
      <!-- 업로드 완료 화면 -->
      <div v-if="currentStep === 4" class="step-container">
        <div class="upload-result">
          <div class="success-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <h3>업로드 완료!</h3>
          <p>{{ statusMessage }}</p>
          <div class="button-group mt-4">
            <button @click="resetForm" class="btn btn-primary">새 로그 파싱하기</button>
            <router-link to="/" class="btn btn-secondary ml-2">홈으로</router-link>
          </div>
        </div>
      </div>
      
      <!-- 이벤트 파라미터 상세 편집 모달 -->
      <div v-if="showParamEditor" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h4>이벤트 파라미터 상세 편집</h4>
            <button @click="closeParamEditor" class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group col-md-6">
                <label>SHOT_NUMBER:</label>
                <input type="number" v-model.number="currentParam.SHOT_NUMBER" class="form-control" min="0">
              </div>
              <div class="form-group col-md-6">
                <label>EVENTNAME:</label>
                <select v-model="currentParam.EVENTNAME" class="form-control">
                  <option value="cts_click">cts_click</option>
                  <option value="cts_view">cts_view</option>
                  <option value="popup_click">popup_click</option>
                </select>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group col-md-6">
                <label>LABEL_TEXT:</label>
                <input type="text" v-model="currentParam.LABEL_TEXT" class="form-control">
              </div>
              <div class="form-group col-md-6">
                <label>PAGEPATH:</label>
                <input type="text" v-model="currentParam.PAGEPATH" class="form-control">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group col-md-6">
                <label>PAGETITLE:</label>
                <input type="text" v-model="currentParam.PAGETITLE" class="form-control">
              </div>
              <div class="form-group col-md-6">
                <label>TIME:</label>
                <input type="text" v-model="currentParam.TIME" class="form-control">
              </div>
            </div>
            
            <hr>
            <h5>추가 필드</h5>
            
            <!-- 동적 필드 추가 -->
            <div class="param-fields">
              <div v-for="(value, key) in currentParam" :key="key" class="form-group">
                <template v-if="!['SHOT_NUMBER', 'EVENTNAME', 'LABEL_TEXT', 'PAGEPATH', 'PAGETITLE', 'TIME'].includes(key)">
                  <label>{{ key }}:</label>
                  <div class="field-with-actions">
                    <input type="text" v-model="currentParam[key]" class="form-control">
                    <button @click="removeField(key)" class="btn-icon" title="필드 삭제">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </template>
              </div>
            </div>
            
            <!-- 새 필드 추가 -->
            <div class="add-field-form">
              <div class="form-row">
                <div class="form-group col-md-5">
                  <input type="text" v-model="newFieldName" class="form-control" placeholder="필드 이름">
                </div>
                <div class="form-group col-md-5">
                  <input type="text" v-model="newFieldValue" class="form-control" placeholder="필드 값">
                </div>
                <div class="form-group col-md-2">
                  <button @click="addField" class="btn btn-primary btn-block" :disabled="!newFieldName">추가</button>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="saveParamChanges" class="btn btn-primary">저장</button>
            <button @click="closeParamEditor" class="btn btn-secondary">취소</button>
          </div>
        </div>
      </div>
      
      <!-- 컬럼 관리 모달 -->
      <div v-if="showColumnManagerModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h4>컬럼 관리</h4>
            <button @click="closeColumnManager" class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="column-list">
              <div v-for="column in allColumns" :key="column" class="column-item">
                <label>
                  <input type="checkbox" v-model="selectedColumns" :value="column">
                  {{ getColumnDisplayName(column) }}
                </label>
              </div>
            </div>
            
            <hr>
            
            <!-- 새 컬럼 추가 -->
            <div class="form-row">
              <div class="form-group col-md-9">
                <input type="text" v-model="newColumnName" class="form-control" placeholder="새 컬럼 이름">
              </div>
              <div class="form-group col-md-3">
                <button @click="addNewColumn" class="btn btn-primary btn-block" :disabled="!newColumnName.trim()">
                  컬럼 추가
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="applyColumnChanges" class="btn btn-primary">적용</button>
            <button @click="closeColumnManager" class="btn btn-secondary">취소</button>
          </div>
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
          "TIME", 
          "CNO"
        ],
        
        // 기본 표시 컬럼 (수정)
        defaultVisibleColumns: ["SHOT_NUMBER", "EVENTNAME", "CATEGORY_DEPTH1", "CATEGORY_DEPTH2", "CATEGORY_DEPTH3","LABEL_TEXT", "CONTENT_NM", "PAGE_MKT_CONTS_ID", "TIME"],
        
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
      // 단계 이동 관련 메소드
      goToStep(step) {
        if (this.canGoToStep(step)) {
          this.currentStep = step;
        }
      },
      
      canGoToStep(step) {
        if (step === 1) return true;
        if (step === 2) return this.editableParsedResult.length > 0;
        if (step === 3) return this.editableParsedResult.length === 1; // 태깅맵이 1개일 때만 업로드 단계로 이동 가능
        if (step === 4) return false; // 업로드 완료 단계는 이동 불가능
        return false;
      },
      
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
          
          // 동일한 이벤트명, 페이지 경로, 페이지 타이틀을 갖는 로그 항목을 그룹화
          const groupedLogs = this.groupLogsByEventAndPath(parsedLogs);
          
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
          
          // 결과 메시지에 데이터 개수 관련 안내 추가
          let resultMessage = '로그 파싱 완료! 데이터를 확인하고 필요한 경우 수정하세요.';
          if (this.editableParsedResult.length > 1) {
            resultMessage += ' 태깅맵 데이터는 1개만 업로드 가능합니다. 필요없는 데이터는 삭제해주세요.';
          }
          
          this.statusMessage = resultMessage;
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
      
      // 동일한 이벤트명(en), 페이지 경로(dl), 페이지 타이틀(dt)를 가진 로그 항목 그룹화
      groupLogsByEventAndPath(logs) {
        const eventGroups = {};
        
        for (const log of logs) {
          // 그룹화 키 생성: "이벤트타입_URL_페이지타이틀"
          const groupKey = `${log.EVENTTYPE}_${log.URL}_${log.PAGETITLE}`;
          
          if (!eventGroups[groupKey]) {
            // 새 그룹 생성
            eventGroups[groupKey] = {
              TIME: log.TIME,
              EVENTTYPE: log.EVENTTYPE,
              PAGETITLE: log.PAGETITLE,
              URL: log.URL,
              eventParams: [],
              timestamp: log.timestamp
            };
          }
          
          // 이벤트 파라미터 합치기
          eventGroups[groupKey].eventParams = [...eventGroups[groupKey].eventParams, ...log.eventParams];
        }
        
        // 객체를 배열로 변환
        return Object.values(eventGroups);
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
      // 데이터 개수 확인
      if (this.editableParsedResult.length > 1) {
        alert("태깅맵 데이터는 1개만 업로드 가능합니다. 필요없는 데이터는 삭제해주세요.");
        return;
      }
      
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
      
      // 데이터 개수 확인
      if (this.editableParsedResult.length > 1) {
        this.hasError = true;
        this.statusMessage = '태깅맵 데이터는 1개만 업로드 가능합니다. 필요없는 데이터는 삭제해주세요.';
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
          
          // 스크린샷 첨부
          if (this.selectedFile) {
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
.log-upload {
  max-width: 1500px; /* 너비 확장 (1200px → 1500px) */
  margin: 0 auto;
  padding: 30px 40px; /* 패딩 증가 */
  font-family: Arial, sans-serif;
}

.page-title {
  text-align: center;
  margin-bottom: 35px;
  color: #333;
  font-size: 28px; /* 제목 크기 증가 */
}

/* 단계 진행바 스타일 */
.progress-steps {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 50px; /* 여백 증가 */
  position: relative;
  max-width: 900px; /* 진행바 최대 너비 설정 */
  margin-left: auto;
  margin-right: auto;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
  cursor: pointer;
  transition: all 0.2s;
}

.step:hover:not(.disabled) .step-number {
  background-color: #0056b3;
  transform: scale(1.05);
}

.step.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.step-number {
  width: 50px; /* 크기 증가 */
  height: 50px; /* 크기 증가 */
  background-color: #ddd;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px; /* 폰트 크기 증가 */
  margin-bottom: 12px;
  transition: all 0.2s;
}

.step-title {
  font-size: 16px; /* 폰트 크기 증가 */
  font-weight: 500;
}

.step-connector {
  flex: 1;
  height: 4px; /* 두께 증가 */
  background-color: #ddd;
  margin: 0 15px;
}

.step.active .step-number {
  background-color: #007bff;
  color: white;
}

.step.completed .step-number {
  background-color: #28a745;
  color: white;
}

.step-container {
  background-color: #fff;
  border-radius: 10px; /* 둥근 모서리 증가 */
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.1); /* 그림자 강화 */
  padding: 30px; /* 패딩 증가 */
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 25px; /* 여백 증가 */
}

label {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.form-control {
  display: block;
  width: 100%;
  padding: 12px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 5px;
  transition: border-color 0.2s;
}

.form-control:focus {
  border-color: #007bff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.form-control-sm {
  padding: 8px;
  font-size: 14px;
}

.log-textarea {
  min-height: 300px; /* 높이 증가 */
  font-family: monospace;
  white-space: pre;
  resize: vertical;
  font-size: 14px;
  line-height: 1.5;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  margin-top: 30px;
}

.btn {
  display: inline-block;
  padding: 12px 24px; /* 크기 증가 */
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  border-radius: 5px;
  transition: all 0.2s;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 14px;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0069d9;
  transform: translateY(-2px); /* 호버 시 약간 위로 이동 */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-primary:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover {
  background-color: #218838;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-outline-primary {
  color: #007bff;
  background-color: transparent;
  border: 1px solid #007bff;
}

.btn-outline-primary:hover {
  background-color: #007bff;
  color: white;
}

.btn-outline-secondary {
  color: #6c757d;
  background-color: transparent;
  border: 1px solid #6c757d;
}

.btn-outline-secondary:hover {
  background-color: #6c757d;
  color: white;
}

.btn-icon {
  background: #f5f5f5 !important;
  border: 1px solid #ddd !important;
  cursor: pointer !important;
  color: #333 !important;
  font-size: 16px !important;
  width: 36px !important;
  height: 36px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 4px !important;
  margin: 0 2px !important;
  padding: 0 !important;
}

.btn-icon:hover {
  background-color: #e9e9e9 !important;
  transform: scale(1.05) !important;
}

.btn-icon i {
  font-size: 14px !important;
}

.btn-danger-icon {
  color: #dc3545;
}

.btn-danger-icon:hover {
  color: #bd2130;
  background-color: #ffeaea;
}

.ml-2 {
  margin-left: 15px; /* 여백 증가 */
}

.mt-2 {
  margin-top: 15px;
}

.mt-3 {
  margin-top: 20px;
}

.mt-4 {
  margin-top: 30px;
}

.alert {
  padding: 18px; /* 패딩 증가 */
  border-radius: 6px;
  margin-bottom: 25px;
  font-size: 16px;
}

.alert-success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.alert-danger {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.alert-warning {
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
}

.alert-info {
  background-color: #d1ecf1;
  border: 1px solid #bee5eb;
  color: #0c5460;
}

/* 분할 레이아웃 - PC 환경 최적화 */
.split-layout {
  display: flex;
  gap: 30px; /* 간격 증가 */
}

.left-panel {
  flex: 0 0 400px; /* 너비 증가 (300px → 400px) */
  min-width: 350px; /* 최소 너비 설정 */
}

.right-panel {
  flex: 1;
  min-width: 0;
}

/* 스크린샷 컨테이너 */
.screenshot-container {
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #eee;
  padding: 20px;
  height: calc(100vh - 300px); /* 화면 높이에 맞게 조정 */
  max-height: 800px; /* 최대 높이 제한 */
  position: sticky;
  top: 20px;
  overflow-y: auto;
}

.screenshot-container h3 {
  font-size: 20px;
  margin-bottom: 20px;
  color: #333;
  text-align: center;
}

.screenshot-preview {
  display: flex;
  justify-content: center;
}

.screenshot-preview img {
  max-width: 100%;
  max-height: calc(100vh - 400px); /* 화면 높이에 맞게 조정 */
  border-radius: 6px;
  border: 1px solid #ddd;
  object-fit: contain;
}

.no-screenshot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px; /* 높이 증가 */
  color: #6c757d;
  border: 2px dashed #ddd;
  border-radius: 6px;
}

.no-screenshot i {
  font-size: 60px; /* 아이콘 크기 증가 */
  margin-bottom: 15px;
}

/* 데이터 편집 UI */
.data-editor {
  width: 100%;
}

.data-card {
  margin-bottom: 40px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.07);
  padding: 25px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.card-header h3 {
  margin: 0;
  font-size: 22px; /* 크기 증가 */
  color: #333;
}

.card-actions {
  display: flex;
  gap: 15px;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  margin-right: -15px;
  margin-left: -15px;
}

.form-row > .form-group {
  padding-right: 15px;
  padding-left: 15px;
}

.col-md-4 {
  flex: 0 0 33.333333%;
  max-width: 33.333333%;
}

.col-md-5 {
  flex: 0 0 41.666667%;
  max-width: 41.666667%;
}

.col-md-6 {
  flex: 0 0 50%;
  max-width: 50%;
}

.col-md-3 {
  flex: 0 0 25%;
  max-width: 25%;
}

.col-md-9 {
  flex: 0 0 75%;
  max-width: 75%;
}

.col-md-2 {
  flex: 0 0 16.666667%;
  max-width: 16.666667%;
}

/* 테이블 컨트롤 */
.table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 25px 0 15px;
}

.table-controls h4 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.right-controls {
  display: flex;
  gap: 15px;
}

/* 테이블 스타일 개선 - PC 환경 최적화 */
.event-params-table {
  margin-top: 15px;
  overflow-x: auto;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.table-responsive {
  overflow-x: auto;
  max-height: calc(100vh - 450px); /* 화면 높이에 맞게 조정 */
}

.table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #dee2e6;
  font-size: 14px;
}

.table th, .table td {
  padding: 12px 16px; /* 패딩 증가 */
  text-align: left;
  border: 1px solid #dee2e6;
}

.table th {
  background-color: #f8f9fa;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  font-size: 15px;
}

.th-shot_number, .td-shot_number {
  width: 80px; /* 너비 증가 */
}

.th-time, .td-time {
  width: 150px;
}

.th-eventname, .td-eventname {
  width: 120px;
}

.th-label_text, .td-label_text {
  width: 180px;
}

.th-actions, .td-actions {
  width: 140px !important;
  min-width: 140px !important;
  white-space: nowrap !important;
}

.action-buttons {
  display: flex !important;
  justify-content: space-around !important;
  gap: 5px !important;
  visibility: visible !important;
}

.table-hover tbody tr:hover {
  background-color: #f1f9ff;
}

.editable-cell {
  cursor: pointer;
  padding: 6px;
  min-height: 30px; /* 최소 높이 증가 */
  display: flex;
  align-items: center;
}

.editable-cell:hover {
  background-color: #e9ecef;
  border-radius: 4px;
}

hr {
  margin: 30px 0;
  border: 0;
  border-top: 1px dashed #ddd;
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
  background-color: #fff;
  border-radius: 10px;
  width: 90%;
  max-width: 800px; /* 너비 증가 */
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15); /* 그림자 강화 */
}

.modal-header {
  padding: 20px 25px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f8f9fa;
}

.modal-header h4 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px; /* 크기 증가 */
  cursor: pointer;
  color: #6c757d;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:hover {
  color: #333;
  background-color: #eee;
}

.modal-body {
  padding: 25px;
  max-height: 65vh;
  overflow-y: auto;
}

.modal-footer {
  padding: 20px 25px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  background-color: #f8f9fa;
}

/* 컬럼 관리 스타일 */
.column-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); /* 너비 증가 */
  gap: 15px;
  margin-bottom: 25px;
}

.column-item {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 6px;
  transition: all 0.2s;
}

.column-item:hover {
  background-color: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.05);
}

.column-item label {
  display: flex;
  align-items: center;
  margin-bottom: 0;
  cursor: pointer;
  font-weight: normal;
}

.column-item input[type="checkbox"] {
  margin-right: 10px;
  width: 18px;
  height: 18px;
}

/* 필드 관리 스타일 */
.field-with-actions {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.field-with-actions .form-control {
  flex: 1;
  margin-right: 15px;
}

.param-fields {
  margin: 20px 0;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 6px;
  max-height: 300px; /* 높이 증가 */
  overflow-y: auto;
}

.add-field-form {
  margin-top: 25px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px dashed #ddd;
}

/* 업로드 요약 및 결과 스타일 */
.upload-summary {
  padding: 30px;
  background-color: #f8f9fa;
  border-radius: 10px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.summary-item {
  margin-bottom: 15px;
  padding: 15px;
  border-bottom: 1px solid #eee;
  font-size: 16px;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-item strong {
  display: inline-block;
  min-width: 180px; /* 너비 증가 */
  font-weight: 600;
}

.upload-result {
  text-align: center;
  padding: 50px; /* 패딩 증가 */
}

.success-icon {
  font-size: 80px; /* 크기 증가 */
  color: #28a745;
  margin-bottom: 30px;
}

.upload-result h3 {
  font-size: 28px; /* 크기 증가 */
  margin-bottom: 20px;
  color: #333;
}

.upload-result p {
  font-size: 18px;
  margin-bottom: 40px;
  color: #555;
}

/* 이미지 스타일 */
.img-preview {
  max-width: 100%;
  border-radius: 6px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
  max-height: 400px; /* 높이 증가 */
}

/* PC 전용 미디어 쿼리 - 큰 화면에서의 최적화 */
@media (min-width: 1600px) {
  .log-upload {
    max-width: 1700px;
  }
  
  .left-panel {
    flex: 0 0 450px; /* 더 큰 스크린샷 영역 */
  }
  
  .screenshot-container {
    max-height: 900px;
  }
  
  .table-responsive {
    max-height: calc(100vh - 400px);
  }
}

/* 작은 화면 대응 (PC 환경의 작은 화면) */
@media (max-width: 1200px) {
  .split-layout {
    flex-direction: column;
  }
  
  .left-panel {
    flex: 0 0 100%;
    margin-bottom: 30px;
  }
  
  .right-panel {
    flex: 0 0 100%;
  }
  
  .screenshot-container {
    height: auto;
    max-height: 500px;
  }
}

/* 유틸리티 클래스 */
.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.text-muted {
  color: #6c757d;
}

.text-danger {
  color: #dc3545;
}

.text-success {
  color: #28a745;
}

.border-top {
  border-top: 1px solid #dee2e6;
}

.border-bottom {
  border-bottom: 1px solid #dee2e6;
}

/* 애니메이션 효과 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-overlay {
  animation: fadeIn 0.3s ease-in-out;
}

.alert {
  animation: fadeIn 0.4s ease-in-out;
}

/* 테이블 셀 상태 스타일 */
.table td.has-error {
  background-color: #fff3f3;
}

.table td.has-warning {
  background-color: #fff9e6;
}

.table td.is-required {
  font-weight: bold;
}

.table td.empty-cell {
  color: #aaa;
  font-style: italic;
}

/* 토스트 메시지 스타일 */
.toast {
  position: fixed;
  top: 30px;
  right: 30px;
  padding: 18px 25px;
  border-radius: 6px;
  background-color: #333;
  color: white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  z-index: 1100;
  animation: fadeIn 0.3s ease-in-out;
  font-size: 16px;
}

.toast-success {
  background-color: #28a745;
}

.toast-error {
  background-color: #dc3545;
}

.toast-warning {
  background-color: #ffc107;
  color: #333;
}
</style>