<!-- src/views/LogUpload.vue -->
<template>
    <div class="log-upload">
      <h1 class="page-title">태깅맵 로그 업로드</h1>
      
      <!-- 단계 진행바 -->
      <div class="progress-steps">
        <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
          <div class="step-number">1</div>
          <div class="step-title">로그 입력</div>
        </div>
        <div class="step-connector"></div>
        <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
          <div class="step-number">2</div>
          <div class="step-title">데이터 편집</div>
        </div>
        <div class="step-connector"></div>
        <div class="step" :class="{ active: currentStep >= 3, completed: currentStep > 3 }">
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
      
      <!-- 2단계: 파싱 결과 편집 -->
      <div v-if="currentStep === 2" class="step-container">
        <div class="alert" :class="{'alert-success': !hasError, 'alert-danger': hasError}">
          {{ statusMessage }}
        </div>
        
        <div v-if="!hasError && editableParsedResult.length > 0" class="parsed-data-editor">
          <div v-for="(entry, entryIndex) in editableParsedResult" :key="`entry-${entryIndex}`" class="data-card">
            <div class="card-header">
              <h3>태깅맵 데이터 #{{ entryIndex + 1 }}</h3>
              <div class="card-actions">
                <button @click="duplicateEntry(entryIndex)" class="btn-icon" title="복제">
                  <i class="fa fa-copy"></i>
                </button>
                <button @click="removeEntry(entryIndex)" class="btn-icon" title="삭제">
                  <i class="fa fa-trash"></i>
                </button>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group col-md-4">
                <label>이벤트 타입:</label>
                <select v-model="entry.EVENTTYPE" class="form-control">
                  <option value="visibility">visibility</option>
                  <option value="click">click</option>
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
            
            <div class="section-title">
              <h4>이벤트 파라미터</h4>
              <button @click="addEventParam(entryIndex)" class="btn btn-sm btn-outline-primary">
                파라미터 추가 +
              </button>
            </div>
            
            <div class="event-params-table">
              <table class="table">
                <thead>
                  <tr>
                    <th width="80">순번</th>
                    <th width="140">이벤트명</th>
                    <th>라벨 텍스트</th>
                    <th width="100">작업</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(param, paramIndex) in entry.eventParams" :key="`param-${entryIndex}-${paramIndex}`">
                    <td>
                      <input type="number" v-model.number="param.SHOT_NUMBER" class="form-control form-control-sm" min="0">
                    </td>
                    <td>
                      <input type="text" v-model="param.EVENTNAME" class="form-control form-control-sm">
                    </td>
                    <td>
                      <input type="text" v-model="param.LABEL_TEXT" class="form-control form-control-sm">
                    </td>
                    <td>
                      <div class="btn-group">
                        <button @click="editEventParam(entryIndex, paramIndex)" class="btn btn-sm btn-info">
                          상세
                        </button>
                        <button @click="removeEventParam(entryIndex, paramIndex)" class="btn btn-sm btn-danger">
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- 구분선 -->
            <hr v-if="entryIndex < editableParsedResult.length - 1">
          </div>
        </div>
        
        <div class="button-group mt-4">
          <button @click="currentStep = 1" class="btn btn-secondary">이전</button>
          <button @click="prepareForUpload" class="btn btn-primary ml-2" :disabled="editableParsedResult.length === 0">
            다음
          </button>
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
          <button @click="currentStep = 2" class="btn btn-secondary">수정</button>
          <button @click="uploadData" class="btn btn-success ml-2" :disabled="isUploading">
            {{ isUploading ? '업로드 중...' : '태깅맵 업로드' }}
          </button>
        </div>
      </div>
      
      <!-- 업로드 완료 화면 -->
      <div v-if="currentStep === 4" class="step-container">
        <div class="upload-result">
          <div class="success-icon">
            <i class="fa fa-check-circle"></i>
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
            <div class="form-group">
              <label>SHOT_NUMBER:</label>
              <input type="number" v-model.number="currentParam.SHOT_NUMBER" class="form-control" min="0">
            </div>
            
            <div class="form-group">
              <label>EVENTNAME:</label>
              <input type="text" v-model="currentParam.EVENTNAME" class="form-control">
            </div>
            
            <div class="form-group">
              <label>LABEL_TEXT:</label>
              <input type="text" v-model="currentParam.LABEL_TEXT" class="form-control">
            </div>
            
            <!-- 동적 필드 추가 -->
            <div class="param-fields">
              <div v-for="(value, key) in currentParam" :key="key" class="form-group">
                <template v-if="!['SHOT_NUMBER', 'EVENTNAME', 'LABEL_TEXT', 'PAGEPATH', 'PAGETITLE', 'TIME'].includes(key)">
                  <label>{{ key }}:</label>
                  <div class="field-with-actions">
                    <input type="text" v-model="currentParam[key]" class="form-control">
                    <button @click="removeField(key)" class="btn-icon" title="필드 삭제">
                      <i class="fa fa-times"></i>
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
    </div>
  </template>
  
  <script>
  import axios from 'axios';
  
  export default {
    name: 'LogUpload',
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
        
        // 이벤트 파라미터 편집용
        showParamEditor: false,
        currentEntryIndex: null,
        currentParamIndex: null,
        currentParam: {},
        paramBackup: {},
        newFieldName: '',
        newFieldValue: ''
      };
    },
    computed: {
      eventTypeSummary() {
        const counts = { visibility: 0, click: 0 };
        this.editableParsedResult.forEach(entry => {
          counts[entry.EVENTTYPE] = (counts[entry.EVENTTYPE] || 0) + 1;
        });
        
        const summary = [];
        if (counts.visibility) summary.push(`visibility (${counts.visibility}개)`);
        if (counts.click) summary.push(`click (${counts.click}개)`);
        
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
          if (this.platform === 'android') {
            this.parsedResult = this.parseAndroidLog(this.logInput);
          } else {
            this.parsedResult = this.parseIOSLog(this.logInput);
          }
          
          // 깊은 복사를 통해 편집 가능한 결과 생성
          this.editableParsedResult = JSON.parse(JSON.stringify(this.parsedResult));
          
          // 현재 시간으로 TIME 및 timestamp 업데이트
          const now = new Date();
          const isoNow = now.toISOString();
          const formattedTime = this.formatTime(isoNow);
          
          this.editableParsedResult.forEach(entry => {
            entry.TIME = isoNow;
            entry.timestamp = isoNow;
            
            entry.eventParams.forEach(param => {
              param.TIME = formattedTime;
            });
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
              const pagetitle = logData.dt || logData.screen_name || '';
              const url = logData.dl || '';
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
                
                // 나머지 eventParams 필드 추가
                for (const [key, value] of Object.entries(event.eventParams)) {
                  // ep_ 접두어 제거 및 필드 이름 정규화
                  const fieldName = key.startsWith('ep_') 
                    ? this.normalizeFieldName(key.substring(3)) 
                    : this.normalizeFieldName(key);
                  
                  mainParam[fieldName] = value;
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
              const pagetitle = logData.dt || logData.screen_name || '';
              const url = logData.dl || '';
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
                
                // 나머지 eventParams 필드 추가
                for (const [key, value] of Object.entries(event.eventParams)) {
                  // ep_ 접두어 제거 및 필드 이름 정규화
                  const fieldName = key.startsWith('ep_') 
                    ? this.normalizeFieldName(key.substring(3)) 
                    : this.normalizeFieldName(key);
                  
                  // LABEL_TEXT가 없으면 cd14_cts_nm 또는 label 값으로 설정
                  if (fieldName === 'CD14_CTS_NM' || fieldName === 'LABEL') {
                    mainParam['LABEL_TEXT'] = mainParam['LABEL_TEXT'] || value;
                  }
                  
                  mainParam[fieldName] = value;
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
        
        // 기본값은 'visibility'로 설정
        return 'visibility';
      },
      
      // 필드명 정규화 헬퍼 함수
      normalizeFieldName(key) {
        // cd123_user_id2 → USER_ID2
        // cd4_lgn_yn → LGN_YN
        
        // 숫자와 언더스코어 제거
        const cleanKey = key.replace(/cd\d+_/g, '');
        
        // 대문자로 변환
        return cleanKey.toUpperCase();
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
      
      // 이벤트 파라미터 관리 함수들
      addEventParam(entryIndex) {
        const now = new Date();
        const formattedTime = this.formatTime(now.toISOString());
        const entry = this.editableParsedResult[entryIndex];
        
        const newParam = {
          SHOT_NUMBER: entry.eventParams.length,
          EVENTNAME: entry.eventParams[0]?.EVENTNAME || 'cts_click',
          PAGEPATH: entry.URL,
          PAGETITLE: entry.PAGETITLE,
          TIME: formattedTime,
          LABEL_TEXT: '(새 항목)'
        };
        
        entry.eventParams.push(newParam);
      },
      
      editEventParam(entryIndex, paramIndex) {
        this.currentEntryIndex = entryIndex;
        this.currentParamIndex = paramIndex;
        this.currentParam = JSON.parse(JSON.stringify(this.editableParsedResult[entryIndex].eventParams[paramIndex]));
        this.paramBackup = JSON.parse(JSON.stringify(this.currentParam));
        this.showParamEditor = true;
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
        if (this.currentParam.hasOwnProperty(fieldName)) {
          alert(`'${fieldName}' 필드가 이미 존재합니다.`);
          return;
        }
        
        // 새 필드 추가
        this.$set(this.currentParam, fieldName, this.newFieldValue);
        
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
          const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
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
            
            // 업로드 요청
            const uploadPromise = axios.post(`${baseUrl}/api/taggingMaps`, formData);
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
    max-width: 1100px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
  }
  
  .page-title {
    text-align: center;
    margin-bottom: 30px;
    color: #333;
  }
  
  /* 단계 진행바 스타일 */
  .progress-steps {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
    position: relative;
  }
  
  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1;
  }
  
  .step-number {
    width: 40px;
    height: 40px;
    background-color: #ddd;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    margin-bottom: 10px;
  }
  
  .step-connector {
    flex: 1;
    height: 3px;
    background-color: #ddd;
    margin: 0 10px;
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
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 25px;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
  }
  
  .form-control {
    display: block;
    width: 100%;
    padding: 10px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    transition: border-color 0.2s;
  }
  
  .form-control:focus {
    border-color: #007bff;
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
  }
  
  .form-control-sm {
    padding: 6px;
    font-size: 14px;
  }
  
  .log-textarea {
    min-height: 250px;
    font-family: monospace;
    white-space: pre;
    resize: vertical;
  }
  
  .button-group {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }
  
  .btn {
    display: inline-block;
    padding: 10px 20px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    border-radius: 4px;
    transition: all 0.2s;
  }
  
  .btn-sm {
    padding: 5px 10px;
    font-size: 14px;
  }
  
  .btn-primary {
    background-color: #007bff;
    color: white;
  }
  
  .btn-primary:hover {
    background-color: #0069d9;
  }
  
  .btn-primary:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
  
  .btn-secondary {
    background-color: #6c757d;
    color: white;
  }
  
  .btn-secondary:hover {
    background-color: #5a6268;
  }
  
  .btn-success {
    background-color: #28a745;
    color: white;
  }
  
  .btn-success:hover {
    background-color: #218838;
  }
  
  .btn-info {
    background-color: #17a2b8;
    color: white;
  }
  
  .btn-danger {
    background-color: #dc3545;
    color: white;
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
  
  .btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    color: #6c757d;
    font-size: 16px;
    padding: 5px;
  }
  
  .btn-icon:hover {
    color: #000;
  }
  
  .ml-2 {
    margin-left: 10px;
  }
  
  .mt-2 {
    margin-top: 10px;
  }
  
  .mt-3 {
    margin-top: 15px;
  }
  
  .mt-4 {
    margin-top: 20px;
  }
  
  .alert {
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 20px;
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
  
  .img-preview {
    max-width: 100%;
    max-height: 200px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  /* 데이터 편집 UI 스타일 */
  .parsed-data-editor {
    margin-top: 20px;
  }
  
  .data-card {
    margin-bottom: 30px;
    background: #fff;
    border-radius: 8px;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
  }
  
  .card-header h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
  }
  
  .card-actions {
    display: flex;
    gap: 10px;
  }
  
  .form-row {
    display: flex;
    flex-wrap: wrap;
    margin-right: -10px;
    margin-left: -10px;
  }
  
  .form-row > .form-group {
    padding-right: 10px;
    padding-left: 10px;
  }
  
  .col-md-4 {
    flex: 0 0 33.333333%;
    max-width: 33.333333%;
  }
  
  .col-md-5 {
    flex: 0 0 41.666667%;
    max-width: 41.666667%;
  }
  
  .col-md-2 {
    flex: 0 0 16.666667%;
    max-width: 16.666667%;
  }
  
  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 25px;
    margin-bottom: 15px;
  }
  
  .section-title h4 {
    margin: 0;
    font-size: 16px;
    color: #333;
  }
  
  .event-params-table {
    margin-top: 10px;
    overflow-x: auto;
  }
  
  .table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .table th, .table td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid #dee2e6;
  }
  
  .table th {
    background-color: #f8f9fa;
    font-weight: 600;
  }
  
  .btn-group {
    display: flex;
    gap: 5px;
  }
  
  hr {
    margin: 25px 0;
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
    border-radius: 8px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }
  
  .modal-header {
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .modal-header h4 {
    margin: 0;
    font-size: 18px;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6c757d;
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
  
  .field-with-actions {
    display: flex;
    align-items: center;
  }
  
  .field-with-actions .form-control {
    flex: 1;
    margin-right: 10px;
  }
  
  .add-field-form {
    margin-top: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 4px;
  }
  
  /* 업로드 요약 및 결과 스타일 */
  .upload-summary, .upload-result {
    padding: 20px;
    background-color: #f8f9fa;
    border-radius: 8px;
  }
  
  .summary-item {
    margin-bottom: 10px;
  }
  
  .success-icon {
    font-size: 60px;
    color: #28a745;
    text-align: center;
    margin-bottom: 20px;
  }
  
  .upload-result {
    text-align: center;
  }
  
  .upload-result h3 {
    margin-bottom: 20px;
  }
  
  /* 폰트어썸 아이콘 스타일 */
  .fa {
    display: inline-block;
    font: normal normal normal 14px/1 FontAwesome;
    font-size: inherit;
    text-rendering: auto;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  .fa-copy:before {
    content: "\f0c5";
  }
  
  .fa-trash:before {
    content: "\f1f8";
  }
  
  .fa-times:before {
    content: "\f00d";
  }
  
  .fa-check-circle:before {
    content: "\f058";
  }
  </style>