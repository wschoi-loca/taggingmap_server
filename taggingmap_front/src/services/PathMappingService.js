// src/services/PathMappingService.js
class PathMappingService {
    constructor() {
      this.mappings = {};
      this.loaded = false;
    }
  
    async loadMappings() {
      if (this.loaded) return this.mappings;
  
      try {
        const response = await fetch('/src/assets/path_only_grouped_ga_data.csv');
        const csvText = await response.text();
        
        // CSV 파싱
        const rows = csvText.split('\n');
        rows.forEach((row, index) => {
          // 헤더 행 건너뛰기
          if (index === 0) return;
          
          const columns = row.split(',');
          if (columns.length >= 3) {
            const koreanTitle = columns[1];
            const englishTitle = columns[2];
            
            // 영문 제목을 키로, 한글 제목을 값으로 저장
            if (englishTitle && koreanTitle) {
              this.mappings[englishTitle.trim()] = koreanTitle.trim();
            }
          }
        });
        
        this.loaded = true;
        return this.mappings;
      } catch (error) {
        console.error('Error loading path mappings:', error);
        return {};
      }
    }
  
    getKoreanTitle(englishPath) {
      return this.mappings[englishPath] || '';
    }
  }
  
  export default new PathMappingService();