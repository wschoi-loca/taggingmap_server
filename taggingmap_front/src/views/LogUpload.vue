<!-- src/views/LogUpload.vue -->
<template>
    <div class="log-upload">
      <h1>태깅맵 로그 업로드</h1>
      
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
        <button @click="parseLog" class="btn btn-primary" :disabled="isProcessing">
          {{ isProcessing ? '처리 중...' : '로그 파싱 및 변환' }}
        </button>
        <button @click="clearInput" class="btn btn-secondary ml-2">
          지우기
        </button>
      </div>
      
      <div v-if="parsedResult" class="result-container mt-4">
        <h3>변환 결과:</h3>
        <div class="alert" :class="{'alert-success': !hasError, 'alert-danger': hasError}">
          {{ statusMessage }}
        </div>
        <div v-if="!hasError" class="parsed-data">
          <pre>{{ formattedResult }}</pre>
        </div>
        <div class="mt-3">
          <button 
            v-if="!hasError" 
            @click="uploadData" 
            class="btn btn-success" 
            :disabled="isUploading"
          >
            {{ isUploading ? '업로드 중...' : '태깅맵 업로드' }}
          </button>
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
        platform: 'android',
        logInput: '',
        parsedResult: null,
        statusMessage: '',
        hasError: false,
        isProcessing: false,
        isUploading: false,
        addScreenshot: false,
        selectedFile: null,
        previewUrl: null
      };
    },
    computed: {
      formattedResult() {
        return this.parsedResult ? JSON.stringify(this.parsedResult, null, 2) : '';
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
          
          this.statusMessage = '로그 파싱 완료! 업로드 버튼을 눌러 태깅맵에 저장하세요.';
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
      
      // 태깅맵 업로드 메서드
      async uploadData() {
        if (!this.parsedResult || this.parsedResult.length === 0) {
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
          
          for (const entry of this.parsedResult) {
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
          
          this.statusMessage = `${this.parsedResult.length}개의 태깅맵 항목이 성공적으로 업로드되었습니다!`;
        } catch (error) {
          console.error('태깅맵 업로드 중 오류:', error);
          this.hasError = true;
          this.statusMessage = `업로드 실패: ${error.response?.data || error.message}`;
        } finally {
          this.isUploading = false;
        }
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
      
      // 입력 초기화
      clearInput() {
        this.logInput = '';
        this.parsedResult = null;
        this.statusMessage = '';
        this.hasError = false;
        this.selectedFile = null;
        this.previewUrl = null;
      }
    }
  };
  </script>
  
  <style scoped>
  .log-upload {
    max-width: 1000px;
    margin: 0 auto;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  .form-control {
    display: block;
    width: 100%;
    padding: 0.5rem;
    font-size: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .log-textarea {
    min-height: 250px;
    font-family: monospace;
    white-space: pre;
  }
  
  .btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    border-radius: 4px;
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
  
  .ml-2 {
    margin-left: 0.5rem;
  }
  
  .mt-2 {
    margin-top: 0.5rem;
  }
  
  .mt-3 {
    margin-top: 1rem;
  }
  
  .mt-4 {
    margin-top: 1.5rem;
  }
  
  .result-container {
    border: 1px solid #ddd;
    padding: 1rem;
    border-radius: 4px;
    background-color: #f9f9f9;
  }
  
  .alert {
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
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
  
  .parsed-data {
    background-color: #fff;
    border: 1px solid #ddd;
    padding: 1rem;
    border-radius: 4px;
    max-height: 300px;
    overflow-y: auto;
  }
  
  .parsed-data pre {
    margin: 0;
    white-space: pre-wrap;
    font-family: monospace;
    font-size: 0.875rem;
  }
  
  .img-preview {
    max-width: 100%;
    max-height: 200px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  </style>