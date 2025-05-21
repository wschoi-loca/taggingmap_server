// src/services/PathMappingService.js
class PathMappingService {
    constructor() {
      // 하드코딩된 매핑 데이터
      this.mappings = {
        "front>satellite>main>card": "카드>메인",
        "app>LPMCDCB_V200.lc": "MY>즉시결제>바로출금",
        "app>LPMCDCB_V100.lc": "MY>즉시결제",
        "app>LPMCDCB_V210.lc": "MY>즉시결제>결제방법선택",
        "app>LPMCDCB_V230.lc": "MY>즉시결제>즉시결제완료",
        "spa>my>usage-history": "MY>이용내역(매출전표)>이용내역(매출전표)",
        "spa>my>usage-limit-main": "MY>이용한도메인>이용한도메인",
        "event>detail": "띵샵>이벤트>상세",
        "native>main>MA_1_1_1": "메인>간편홈",
        "main": "띵샵>메인",
        "금융>일부결제금액이월약정(리볼빙)>일부결제금액이월약정>이용안내":"spa>finance>revolving>revolving-bf-use"
      };
      this.loaded = true;
    }
  
    async loadMappings() {
      // 이미 로드된 매핑 데이터를 그대로 반환
      console.log('Path mappings loaded from hardcoded data:', Object.keys(this.mappings).length);
      return this.mappings;
    }
  
    getKoreanTitle(englishPath) {
      return this.mappings[englishPath] || '';
    }
  }
  
  export default new PathMappingService();