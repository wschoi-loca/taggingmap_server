
// html2canvas-pro 라이브러리 로드
  
(function() {
    var script = document.createElement('script');
    script.src = 'https://unpkg.com/html2canvas-pro@latest/dist/html2canvas-pro.min.js';
    script.onload = function() {
        console.log('html2canvas-pro loaded.');
    };
    document.head.appendChild(script);
})();

// Firebase 클라이언트 SDK 로드
// <script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.6.0/firebase-storage.js"></script>
(function() {
    var script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js';
    script.onload = function() {
        console.log('html2canvas-pro loaded.');
    };
    document.head.appendChild(script);
})();

(function() {
    var script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/9.6.0/firebase-storage.js';
    script.onload = function() {
        console.log('html2canvas-pro loaded.');
    };
    document.head.appendChild(script);
})();

// 현재 날짜와 시간을 "YYYYMMDD_HHmmss" 형식으로 반환하는 함수
function getCurrentTimestamp() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    var hours = String(now.getHours()).padStart(2, '0');
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var seconds = String(now.getSeconds()).padStart(2, '0');
    return year + month + day + '_' + hours + minutes + seconds;
}

// URL을 변환하는 함수
function transformHref(href) {
    return href
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
        .replace(/\//g, '_') + '_';
}

// 캡쳐할 영역의 ID 설정
var captureAreaId = 'body';

// 유틸리티 함수: Blob을 다운로드 링크로 변환하고 클릭
function downloadBlob(blob, filename) {
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 캡쳐 및 다운로드 함수
function captureAndDownload(eventType, timestamp) {
    var captureArea = document.querySelector(captureAreaId);
    if (!captureArea) {
        alert('Capture area not found!');
        return;
    }

    html2canvas(captureArea, {
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        ignoreElements: function(element) { 
            return element.classList && element.classList.contains('gnb-wrapper'); 
        }
    }).then(function(canvas) {
        try {
            canvas.toBlob(function(blob) {
                if (blob) {
                    var transformedHref = transformHref(document.location.href);
                    downloadBlob(blob, timestamp + '_' + eventType + '_' + transformedHref + '.png');
                } else {
                    console.error('Blob 생성 실패');
                }
            }, 'image/png'); // 명시적으로 mime type 지정
        } catch (error) {
            console.error('Error creating Blob:', error);
        }
    }).catch(function(error) {
        console.error('Error capturing screen:', error);
        console.error('html2canvas error details:', error); // 에러 상세 정보 로그 추가
    });
}

// Blob 다운로드 함수
function downloadBlob(blob, filename) {
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 환경에 따른 기본 URL 설정
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://taggingmap-server-bd06b783e6ac.herokuapp.com';

// Firebase 초기화
const firebaseConfig = {
    apiKey: "AIzaSyDJ_ODZY1Iq603TmAguXzQpgq66N_QaLyw",
    authDomain: "loca-ga-taggingmap.firebaseapp.com",
    projectId: "loca-ga-taggingmap",
    storageBucket: "loca-ga-taggingmap.firebasestorage.app",
    messagingSenderId: "434460786285",
    appId: "1:434460786285:web:3f6096b85e32751990c964"
  };
  
  firebase.initializeApp(firebaseConfig);
  
  function uploadDataDirectly(jsonData, imageBlob, eventType, timestamp) {
    // Firebase Storage에 직접 업로드
    const storageRef = firebase.storage().ref();
    const filename = `${timestamp}_${eventType}_${transformHref(document.location.href)}.png`;
    const fileRef = storageRef.child(`uploads/${filename}`);
    
    fileRef.put(imageBlob).then(snapshot => {
      return snapshot.ref.getDownloadURL();
    }).then(imageUrl => {
      // 이미지 URL을 서버에 전송
      const formData = new FormData();
      formData.append('eventParams', JSON.stringify(jsonData));
      formData.append('TIME', new Date().toISOString());
      formData.append('EVENTNAME', eventType);
      formData.append('PAGETITLE', document.title);
      formData.append('URL', document.location.href);
      formData.append('timestamp', new Date().toISOString());
      formData.append('imageUrl', imageUrl); // 이미지 URL만 전송
      
      return fetch('https://taggingmap-server-bd06b783e6ac.herokuapp.com/api/taggingMaps', {
        method: 'POST',
        body: formData
      });
    }).then(response => {
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      return response.text();
    }).then(data => {
      console.log('Upload successful:', data);
    }).catch(error => {
      console.error('Error uploading data:', error);
    });
  }

function highlightGtmElements(eventType) {
    var selector = '[data-gtm-' + eventType + ']:not(.gnb-wrapper *)';

    if (eventType === "visibility") {
        selector += ', [data-gtm-view-item-list]:not(.gnb-wrapper *), [data-gtm-popup-visibility]:not(.gnb-wrapper *)';
    } else if (eventType === "click") {
        selector += ', [data-gtm-select-item]:not(.gnb-wrapper *), [data-gtm-auto-click]:not(.gnb-wrapper *),[data-gtm-popup-click]:not(.gnb-wrapper *), [data-gtm-etc]:not(.gnb-wrapper *)';
    }

    var elements = document.querySelectorAll(selector);
    var highlightElements = [];

    Array.prototype.forEach.call(elements, function(el, index) {
        if (eventType === "visibility") {
            el.style.backgroundColor = 'rgba(191, 255, 0, 0.3)';
        } else if (eventType === "click") {
            el.style.backgroundColor = 'rgba(64, 0, 255, 0.3)';
        }

        var rect = el.getBoundingClientRect();
        var idSpan = document.createElement('span');
        idSpan.textContent = index;
        idSpan.style.position = 'absolute';
        idSpan.style.top = rect.top + window.scrollY + 'px';
        idSpan.style.left = rect.left + window.scrollX + 'px';
        idSpan.style.zIndex = '1001'; // 기존 요소보다 위에 표시되도록 z-index 설정
        idSpan.setAttribute('data-gtm-id', 'highlight-' + index); // 고유 식별자 추가
        if (eventType === "visibility") {
            idSpan.style.backgroundColor = 'green';
        } else if (eventType === "click") {
            idSpan.style.backgroundColor = 'purple';
        }
        idSpan.style.color = 'white';
        idSpan.style.padding = '4px';
        idSpan.style.fontSize = '12px';
        idSpan.style.pointerEvents = 'none'; // 클릭 이벤트가 idSpan에 의해 방해되지 않도록 설정

        document.body.appendChild(idSpan); // document.body에 추가하여 부모 요소의 위치 변경 방지
        highlightElements.push({ el: el, idSpan: idSpan });
    });

    function updateHighlightPositions() {
        highlightElements.forEach(function(item) {
            var rect = item.el.getBoundingClientRect();
            item.idSpan.style.top = rect.top + window.scrollY + 'px';
            item.idSpan.style.left = rect.left + window.scrollX + 'px';
        });
    }

    var observer = new MutationObserver(updateHighlightPositions);

    highlightElements.forEach(function(item) {
        observer.observe(item.el, { attributes: true, childList: true, subtree: true });
    });

    window.addEventListener('scroll', updateHighlightPositions);
    window.addEventListener('resize', updateHighlightPositions);
    window.addEventListener('mousemove', updateHighlightPositions);
    window.addEventListener('touchmove', updateHighlightPositions);

    // 초기 위치 업데이트
    updateHighlightPositions();
}

function highlightGtmElementsOverlay(eventType) {
    var selector = '[data-gtm-' + eventType + ']:not(.gnb-wrapper *)';

    if (eventType === "visibility") {
        selector += ', [data-gtm-view-item-list]:not(.gnb-wrapper *), [data-gtm-popup-visibility]:not(.gnb-wrapper *)';
    } else if (eventType === "click") {
        selector += ', [data-gtm-select-item]:not(.gnb-wrapper *), [data-gtm-popup-click]:not(.gnb-wrapper *), [data-gtm-etc]:not(.gnb-wrapper *)';
    }

    var elements = document.querySelectorAll(selector);

    Array.prototype.forEach.call(elements, function(el, index) {
        var rect = el.getBoundingClientRect();
        var overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '1000'; // 기존 요소보다 위에 표시되도록 z-index 설정

        if (eventType == "visibility") {
            overlay.style.backgroundColor = 'rgba(191, 255, 0, 0.3)';
        } else if (eventType == "click") {
            overlay.style.backgroundColor = 'rgba(64, 0, 255, 0.3)';
        }

        var idSpan = document.createElement('span');
        idSpan.textContent = index;
        idSpan.style.position = 'absolute';
        idSpan.style.top = '0';
        idSpan.style.left = '0';
        idSpan.style.zIndex = '1001'; // 기존 요소보다 위에 표시되도록 z-index 설정
        idSpan.setAttribute('data-gtm-id', 'highlight-' + index); // 고유 식별자 추가
        if (eventType == "visibility") {
            idSpan.style.backgroundColor = 'green';
        } else if (eventType == "click") {
            idSpan.style.backgroundColor = 'purple';
        }
        idSpan.style.color = 'white';
        idSpan.style.padding = '4px';
        idSpan.style.fontSize = '12px';
        idSpan.style.pointerEvents = 'none'; // 클릭 이벤트가 idSpan에 의해 방해되지 않도록 설정

        overlay.appendChild(idSpan);
        document.body.appendChild(overlay);
    });
}

function removeHighlightGtmElements() {
    // Remove background colors from GTM elements
    var elements = document.querySelectorAll('[data-gtm-visibility], [data-gtm-click], [data-gtm-view-item-list], [data-gtm-popup-visibility], [data-gtm-select-item], [data-gtm-popup-click], [data-gtm-auto-click],[data-gtm-etc]');
    Array.prototype.forEach.call(elements, function(el) {
        el.style.backgroundColor = ''; // 원래 배경색으로 되돌리기
    });
    
    // Remove all number indicators added to document.body
    var idSpans = document.querySelectorAll('[data-gtm-id]');
    Array.prototype.forEach.call(idSpans, function(idSpan) {
        if (idSpan.parentNode) {
            idSpan.parentNode.removeChild(idSpan);
        }
    });

    // Remove overlay if it exists
    var overlay = document.getElementById('gtm-overlay');
    if (overlay) {
        document.body.removeChild(overlay);
    }
}


function extractGtmData(eventType, mapping) {
    var results = [];
    var selector = '[data-gtm-' + eventType + ']:not(.gnb-wrapper *)';

    if (eventType === "visibility") {
        selector += ', [data-gtm-view-item-list]:not(.gnb-wrapper *), [data-gtm-popup-visibility]:not(.gnb-wrapper *)';
    } else if (eventType === "click") {
        selector += ', [data-gtm-select-item]:not(.gnb-wrapper *), [data-gtm-popup-click]:not(.gnb-wrapper *), [data-gtm-auto-click]:not(.gnb-wrapper *), [data-gtm-etc]:not(.gnb-wrapper *)';
    }

    var elements = document.querySelectorAll(selector);

    var rdp_event_mapping = {
        ep_category: 'EVENTCATEGORY',
        ep_action: 'EVENTACTION',
        ep_label: 'EVENTLABEL',
        label: 'LABEL_TEXT',
        label1: 'CATEGORY_DEPTH1',
        label2: 'CATEGORY_DEPTH2',
        label3: 'CATEGORY_DEPTH3',
        label4: 'CATEGORY_DEPTH4',
        label5: 'CATEGORY_DEPTH5',
        label6: 'CATEGORY_DEPTH6',
        label7: 'CATEGORY_DEPTH7',
        label8: 'CATEGORY_DEPTH8',
        label9: 'CATEGORY_DEPTH9',
        label10: 'CATEGORY_DEPTH10',
        search_keyword: 'SEAK',
        search_type: 'SRCH_KEYWORD_TYPE',
        search_result: 'SEAK_SUS',
        search_result_click: 'SEAK_TP',
        card_name: 'CARD_NAME',
        card_code: 'CARD_CODE',
        card_new_or_exist: 'PAGE_CARDAPL_CODE',
        card_type: 'PAGE_CARDAPL_KND',
        fin_prod_name: 'PAGE_FN_PD_NM',
        fin_amount: 'PAGE_FN_LOAN_AMT',
        revol_rate: 'PAGE_RVO_EGM_STT_RT',
        revol_term: 'PAGE_RVO_EGM_STT_TE',
        prod_funnel_name: 'PAGE_PD_APL_LVL',
        cts_name: 'CONTENT_NM',
        cts_name1: 'CONTENT_NM1',
        cts_name2: 'CONTENT_NM2',
        cts_name3: 'CONTENT_NM3',
        cts_id: 'PAGE_MKT_CONTS_ID',
        cts_sub_id: 'SUB_CONTENT_ID',
        cts_sub_id1: 'SUB_CONTENT_ID1',
        cts_sub_id2: 'SUB_CONTENT_ID2',
        cts_sub_id3: 'SUB_CONTENT_ID3',
        cts_sub_id4: 'SUB_CONTENT_ID4',
        cts_sub_id5: 'SUB_CONTENT_ID5',
        index: 'HORIZONTAL_INDEX',
        cts_group1: 'CTS_GROUP1',
        cts_group2: 'CTS_GROUP2',
        cts_group3: 'CTS_GROUP3',
        cts_group4: 'CTS_GROUP4',
        cts_group5: 'CTS_GROUP5',
        cts_group6: 'CTS_GROUP6',
        cts_group7: 'CTS_GROUP7',
        cts_group8: 'CTS_GROUP8',
        cts_group9: 'CTS_GROUP9',
        cts_group10: 'CTS_GROUP10',
        cts_group11: 'CTS_GROUP11',
        cts_group12: 'CTS_GROUP12',
        cts_group13: 'CTS_GROUP13',
        auto_tag_yn: 'AUTO_TAG_YN',
        popup_message: 'popup_message',
        popup_class: 'popup_class',
        popup_button: 'popup_button',
        item_id: 'item_id',
        item_name: 'item_name',
        price: 'price',
        coupon_yn: 'coupon_yn',
        discount: 'discount',
        item_brand: 'item_brand',
        item_category: 'item_category',
        item_category: 'item_category2',
        item_category: 'item_category3',
        item_category: 'item_category4',
    };

    var rdp_section_mapping = {
        ep_category: 'EVENTCATEGORY',
        ep_action: 'EVENTACTION',
        ep_label: 'EVENTLABEL',
        label: 'LABEL_TEXT',
        label1: 'CATEGORY_DEPTH1',
        label2: 'CATEGORY_DEPTH2',
        label3: 'CATEGORY_DEPTH3',
        label4: 'CATEGORY_DEPTH4',
        label5: 'CATEGORY_DEPTH5',
        label6: 'CATEGORY_DEPTH6',
        label7: 'CATEGORY_DEPTH7',
        label8: 'CATEGORY_DEPTH8',
        label9: 'CATEGORY_DEPTH9',
        label10: 'CATEGORY_DEPTH10',
        search_keyword: 'SEAK',
        search_type: 'SRCH_KEYWORD_TYPE',
        search_result: 'SEAK_SUS',
        search_result_click: 'SEAK_TP',
        card_name: 'CARD_NAME',
        card_code: 'CARD_CODE',
        card_new_or_exist: 'PAGE_CARDAPL_CODE',
        card_type: 'PAGE_CARDAPL_KND',
        fin_prod_name: 'PAGE_FN_PD_NM',
        fin_amount: 'PAGE_FN_LOAN_AMT',
        revol_rate: 'PAGE_RVO_EGM_STT_RT',
        revol_term: 'PAGE_RVO_EGM_STT_TE',
        prod_funnel_name: 'PAGE_PD_APL_LVL',
        cts_name: 'CONTENT_NM',
        cts_name1: 'CONTENT_NM1',
        cts_name2: 'CONTENT_NM2',
        cts_name3: 'CONTENT_NM3',
        cts_id: 'PAGE_MKT_CONTS_ID',
        cts_sub_id: 'SUB_CONTENT_ID',
        cts_sub_id1: 'SUB_CONTENT_ID1',
        cts_sub_id2: 'SUB_CONTENT_ID2',
        cts_sub_id3: 'SUB_CONTENT_ID3',
        cts_sub_id4: 'SUB_CONTENT_ID4',
        cts_sub_id5: 'SUB_CONTENT_ID5',
        index: 'VERTICAL_INDEX',
        cts_group1: 'CTS_GROUP1',
        cts_group2: 'CTS_GROUP2',
        cts_group3: 'CTS_GROUP3',
        cts_group4: 'CTS_GROUP4',
        cts_group5: 'CTS_GROUP5',
        cts_group6: 'CTS_GROUP6',
        cts_group7: 'CTS_GROUP7',
        cts_group8: 'CTS_GROUP8',
        cts_group9: 'CTS_GROUP9',
        cts_group10: 'CTS_GROUP10',
        cts_group11: 'CTS_GROUP11',
        cts_group12: 'CTS_GROUP12',
        cts_group13: 'CTS_GROUP13',
        auto_tag_yn: 'AUTO_TAG_YN',
        popup_message: 'popup_message',
        popup_class: 'popup_class',
        popup_button: 'popup_button',
        item_id: 'item_id',
        item_name: 'item_name',
        price: 'price',
        coupon_yn: 'coupon_yn',
        discount: 'discount',
        item_brand: 'item_brand',
        item_category: 'item_category',
        item_category: 'item_category2',
        item_category: 'item_category3',
        item_category: 'item_category4',
    };

    var ga_event_mapping = {
        ep_category: '카테고리_ep_category',
        ep_action: '액션_ep_action',
        ep_label: '라벨_ep_label',
        label: 'ep_label_text',
        label1: 'ep_category_depth1',
        label2: 'ep_category_depth2',
        label3: 'ep_category_depth3',
        label4: 'ep_category_depth4',
        label5: 'ep_category_depth5',
        label6: 'ep_category_depth6',
        label7: 'ep_category_depth7',
        label8: 'ep_category_depth8',
        label9: 'ep_category_depth9',
        label10: 'ep_category_depth10',
        search_keyword: '검색_검색어_ep_cd_25_srch_keyword',
        search_result: '검색_검색 결과_ep_cd26_srch_result',
        card_name: '카드명_ep_cd12_card_name',
        card_code: '카드코드_ep_cd64_card_apply_code',
        card_new_or_exist: 'card_new_or_exist',
        card_type: 'card_type',
        fin_prod_name: 'fin_prod_name',
        fin_amount: 'fin_amount',
        revol_rate: 'revol_rate',
        revol_term: 'revol_term',
        prod_funnel_name: 'prod_funnel_name',
        cts_name: '콘텐츠명_ep_cd14_cts_nm',
        cts_name1: 'ep_cts_nm1',
        cts_name2: 'ep_cts_nm2',
        cts_name3: 'ep_cts_nm3',
        cts_id: '콘텐츠ID_ep_cd42_cts_id',
        cts_sub_id: '서브콘텐츠ID_ep_cd79_sub_cts_id',
        cts_sub_id1: 'sub_cts_id1',
        cts_sub_id2: 'sub_cts_id2',
        cts_sub_id3: 'sub_cts_id3',
        cts_sub_id4: 'sub_cts_id4',
        cts_sub_id5: 'sub_cts_id5',
        index: 'ep_horizontal_index',
        cts_group1: 'ep_cd101_cts_group1',
        cts_group2: 'ep_cd102_cts_group2',
        cts_group3: 'ep_cd103_cts_group3',
        cts_group4: 'ep_cd104_cts_group4',
        cts_group5: 'ep_cd105_cts_group5',
        cts_group6: 'ep_cd106_cts_group6',
        cts_group7: 'ep_cd107_cts_group7',
        cts_group8: 'ep_cd108_cts_group8',
        cts_group9: 'ep_cd109_cts_group9',
        cts_group10: 'ep_cd110_cts_group10',
        cts_group11: 'ep_cd111_cts_group11',
        cts_group12: 'ep_cd112_cts_group12',
        cts_group13: 'ep_cd113_cts_group13',
        auto_tag_yn: 'auto_tag_yn',
        popup_message: 'popup_message',
        popup_class: 'popup_class',
        popup_button: 'popup_button',
        item_id: 'item_id',
        item_name: 'item_name',
        price: 'price',
        coupon_yn: 'coupon_yn',
        discount: 'discount',
        item_brand: 'item_brand',
        item_category: 'item_category',
        item_category: 'item_category2',
        item_category: 'item_category3',
        item_category: 'item_category4',
    };

    var ga_section_mapping = {
        ep_category: '카테고리_ep_category',
        ep_action: '액션_ep_action',
        ep_label: '라벨_ep_label',
        label: 'ep_label_text',
        label1: 'ep_category_depth1',
        label2: 'ep_category_depth2',
        label3: 'ep_category_depth3',
        label4: 'ep_category_depth4',
        label5: 'ep_category_depth5',
        label6: 'ep_category_depth6',
        label7: 'ep_category_depth7',
        label8: 'ep_category_depth8',
        label9: 'ep_category_depth9',
        label10: 'ep_category_depth10',
        search_keyword: '검색_검색어_ep_cd_25_srch_keyword',
        search_result: '검색_검색 결과_ep_cd26_srch_result',
        card_name: '카드명_ep_cd12_card_name',
        card_code: '카드코드_ep_cd64_card_apply_code',
        card_new_or_exist: 'card_new_or_exist',
        card_type: 'card_type',
        fin_prod_name: 'fin_prod_name',
        fin_amount: 'fin_amount',
        revol_rate: 'revol_rate',
        revol_term: 'revol_term',
        prod_funnel_name: 'prod_funnel_name',
        cts_name: '콘텐츠명_ep_cd14_cts_nm',
        cts_name1: 'ep_cts_nm1',
        cts_name2: 'ep_cts_nm2',
        cts_name3: 'ep_cts_nm3',
        cts_id: '콘텐츠ID_ep_cd42_cts_id',
        cts_sub_id: '서브콘텐츠ID_ep_cd79_sub_cts_id',
        cts_sub_id1: 'sub_cts_id1',
        cts_sub_id2: 'sub_cts_id2',
        cts_sub_id3: 'sub_cts_id3',
        cts_sub_id4: 'sub_cts_id4',
        cts_sub_id5: 'sub_cts_id5',
        index: 'ep_vertical_index',
        cts_group1: 'ep_cd101_cts_group1',
        cts_group2: 'ep_cd102_cts_group2',
        cts_group3: 'ep_cd103_cts_group3',
        cts_group4: 'ep_cd104_cts_group4',
        cts_group5: 'ep_cd105_cts_group5',
        cts_group6: 'ep_cd106_cts_group6',
        cts_group7: 'ep_cd107_cts_group7',
        cts_group8: 'ep_cd108_cts_group8',
        cts_group9: 'ep_cd109_cts_group9',
        cts_group10: 'ep_cd110_cts_group10',
        cts_group11: 'ep_cd111_cts_group11',
        cts_group12: 'ep_cd112_cts_group12',
        cts_group13: 'ep_cd113_cts_group13',
        auto_tag_yn: 'auto_tag_yn',
        popup_message: 'popup_message',
        popup_class: 'popup_class',
        popup_button: 'popup_button',
        item_id: 'item_id',
        item_name: 'item_name',
        price: 'price',
        coupon_yn: 'coupon_yn',
        discount: 'discount',
        item_brand: 'item_brand',
        item_category: 'item_category',
        item_category: 'item_category2',
        item_category: 'item_category3',
        item_category: 'item_category4',
    };

    var transformedHref = transformHref(document.location.href);

    Array.prototype.forEach.call(elements, function(el, index) {
        var viewEvent = eventType == 'visibility' ? 'view' : eventType;
        var eventName;
        if (el.hasAttribute('data-gtm-popup-click')) {
            eventName = 'popup_click';
        } else if (el.hasAttribute('data-gtm-popup-visibility')) {
            eventName = 'popup_view';
        } else if (el.hasAttribute('data-gtm-auto-click')) {
            eventName = 'cts_click';
        } else if (el.hasAttribute('data-gtm-select-item')) {
            eventName = 'select-item';
        } else if (el.hasAttribute('data-gtm-view-item-list')) {
            eventName = 'view-item-list';
        } else if (el.hasAttribute('data-gtm-etc')) {
            eventName = 'etc';
        } else {
            eventName = 'cts_' + viewEvent;
        }
    
        var location = document.location.href;
        var dataGtmBodyEvent = el.getAttribute('data-gtm-body') || null;
        var dataGtmBodySection = {};
        var sectionElement = el.closest('[data-gtm-section]');
    
        while (sectionElement) {
            var sectionData = sectionElement.getAttribute('data-gtm-body');
            if (sectionData) {
                var parsedSectionData = JSON.parse(sectionData);
                Object.keys(parsedSectionData).forEach(function(key) {
                    if (dataGtmBodySection.hasOwnProperty(key)) {
                        console.warn('키가 겹칩니다 (섹션 데이터):', '요소 번호:', index, '키:', key, '기존 값:', dataGtmBodySection[key], '새 값:', parsedSectionData[key]);
                    }
                });
                dataGtmBodySection = Object.assign({}, parsedSectionData, dataGtmBodySection);
            }
    
            if (sectionElement.hasAttribute('data-gtm-section-find-continue')) {
                sectionElement = sectionElement.parentElement.closest('[data-gtm-section]');
            } else {
                break;
            }
        }
    
        var eventParameter = {};
        var shotKey = transformedHref + (index);
        var pathname = document.location.pathname.substring(1);
        if (pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
        }
        var title = pathname.replace(/\//g, '>');
    
        if (dataGtmBodyEvent) {
            var eventData = JSON.parse(dataGtmBodyEvent);
            for (var source in eventData) {
                var mappedKey = (mapping === 'rdp') ? rdp_event_mapping[source] : ga_event_mapping[source];
                if (mappedKey) {
                    if (eventParameter.hasOwnProperty(mappedKey)) {
                        console.warn('키가 겹칩니다 (이벤트 데이터):', '요소 번호:', index, '키:', mappedKey, '기존 값:', eventParameter[mappedKey], '새 값:', eventData[source]);
                    }
                    eventParameter[mappedKey] = eventData[source];
                }
            }
        }
    
        if (dataGtmBodySection) {
            for (var source in dataGtmBodySection) {
                var mappedKey = (mapping === 'rdp') ? rdp_section_mapping[source] : ga_section_mapping[source];
                if (mappedKey) {
                    if (eventParameter.hasOwnProperty(mappedKey)) {
                        console.warn('키가 겹칩니다 (섹션 데이터 -> 이벤트 데이터):', '요소 번호:', index, '키:', mappedKey, '기존 값:', eventParameter[mappedKey], '새 값:', dataGtmBodySection[source]);
                    }
                    eventParameter[mappedKey] = dataGtmBodySection[source];
                }
            }
        }
    
        if (el.hasAttribute('data-gtm-popup-visibility') || el.hasAttribute('data-gtm-popup-click')) {
            var popupBodyData = el.getAttribute('data-gtm-popup-body');
            var dataGtmBodyEvent = el.getAttribute('data-gtm-popup-body') || null;
            var dataGtmBodySection = {};
            var sectionElement = el.closest('[data-gtm-section]');
        
            while (sectionElement) {
                var sectionData = sectionElement.getAttribute('data-gtm-popup-body');
                if (sectionData) {
                    var parsedSectionData = JSON.parse(sectionData);
                    Object.keys(parsedSectionData).forEach(function(key) {
                        if (dataGtmBodySection.hasOwnProperty(key)) {
                            console.warn('키가 겹칩니다 (섹션 데이터):', '요소 번호:', index, '키:', key, '기존 값:', dataGtmBodySection[key], '새 값:', parsedSectionData[key]);
                        }
                    });
                    dataGtmBodySection = Object.assign({}, parsedSectionData, dataGtmBodySection);
                }
        
                if (sectionElement.hasAttribute('data-gtm-section-find-continue')) {
                    sectionElement = sectionElement.parentElement.closest('[data-gtm-section]');
                } else {
                    break;
                }
            }
            if (dataGtmBodySection) {
                for (var source in dataGtmBodySection) {
                    var mappedKey = (mapping === 'rdp') ? rdp_section_mapping[source] : ga_section_mapping[source];
                    if (mappedKey) {
                        if (eventParameter.hasOwnProperty(mappedKey)) {
                            console.warn('키가 겹칩니다 (섹션 데이터 -> 이벤트 데이터):', '요소 번호:', index, '키:', mappedKey, '기존 값:', eventParameter[mappedKey], '새 값:', dataGtmBodySection[source]);
                        }
                        eventParameter[mappedKey] = dataGtmBodySection[source];
                    }
                }
            }
        
            if (popupBodyData) {
                var eventData = JSON.parse(popupBodyData);
                for (var source in eventData) {
                    var mappedKey = (mapping === 'rdp') ? rdp_event_mapping[source] : ga_event_mapping[source];
                    if (mappedKey) {
                        if (eventParameter.hasOwnProperty(mappedKey)) {
                            console.warn('키가 겹칩니다 (이벤트 데이터):', '요소 번호:', index, '키:', mappedKey, '기존 값:', eventParameter[mappedKey], '새 값:', eventData[source]);
                        }
                        eventParameter[mappedKey] = eventData[source];
                    }
                }
            }
        }

        if (el.hasAttribute('data-gtm-auto-click')) {
            var autoBodyData = el.getAttribute('data-gtm-auto-body');
            var dataGtmBodyEvent = el.getAttribute('data-gtm-auto-body') || null;
            var dataGtmBodySection = {};
            var sectionElement = el.closest('[data-gtm-section]');
        
            while (sectionElement) {
                var sectionData = sectionElement.getAttribute('data-gtm-auto-body');
                if (sectionData) {
                    var parsedSectionData = JSON.parse(sectionData);
                    Object.keys(parsedSectionData).forEach(function(key) {
                        if (dataGtmBodySection.hasOwnProperty(key)) {
                            console.warn('키가 겹칩니다 (섹션 데이터):', '요소 번호:', index, '키:', key, '기존 값:', dataGtmBodySection[key], '새 값:', parsedSectionData[key]);
                        }
                    });
                    dataGtmBodySection = Object.assign({}, parsedSectionData, dataGtmBodySection);
                }
        
                if (sectionElement.hasAttribute('data-gtm-section-find-continue')) {
                    sectionElement = sectionElement.parentElement.closest('[data-gtm-section]');
                } else {
                    break;
                }
            }
            if (dataGtmBodySection) {
                for (var source in dataGtmBodySection) {
                    var mappedKey = (mapping === 'rdp') ? rdp_section_mapping[source] : ga_section_mapping[source];
                    if (mappedKey) {
                        if (eventParameter.hasOwnProperty(mappedKey)) {
                            console.warn('키가 겹칩니다 (섹션 데이터 -> 이벤트 데이터):', '요소 번호:', index, '키:', mappedKey, '기존 값:', eventParameter[mappedKey], '새 값:', dataGtmBodySection[source]);
                        }
                        eventParameter[mappedKey] = dataGtmBodySection[source];
                    }
                }
            }
        
            if (autoBodyData) {
                var eventData = JSON.parse(autoBodyData);
                for (var source in eventData) {
                    var mappedKey = (mapping === 'rdp') ? rdp_event_mapping[source] : ga_event_mapping[source];
                    if (mappedKey) {
                        if (eventParameter.hasOwnProperty(mappedKey)) {
                            console.warn('키가 겹칩니다 (이벤트 데이터):', '요소 번호:', index, '키:', mappedKey, '기존 값:', eventParameter[mappedKey], '새 값:', eventData[source]);
                        }
                        eventParameter[mappedKey] = eventData[source];
                    }
                }
            }
        }
        
        if (el.hasAttribute('data-gtm-view-item-list') || el.hasAttribute('data-gtm-select-item')) {     
            var ecommerceData = el.getAttribute('data-gtm-ecommerce');
            if (ecommerceData) {
                var parsedEcommerceData = JSON.parse(ecommerceData);
                var items = parsedEcommerceData.ecommerce.items;
                items.forEach(function(item, itemIndex) {
                    Object.keys(item).forEach(function(key) {
                        eventParameter['item_' + itemIndex + '_' + key] = item[key];
                    });
                });
            }
        }
    
        if (el.hasAttribute('data-gtm-etc')) {
            var etcBodyData = el.getAttribute('data-gtm-body');
            var etcEcommerceData = el.closest('[data-gtm-ecommerce]');
            if (etcBodyData) {
                var eventData = JSON.parse(etcBodyData);
                for (var source in eventData) {
                    var mappedKey = (mapping === 'rdp') ? rdp_event_mapping[source] : ga_event_mapping[source];
                    if (mappedKey) {
                        if (eventParameter.hasOwnProperty(mappedKey)) {
                            console.warn('키가 겹칩니다 (이벤트 데이터):', '요소 번호:', index, '키:', mappedKey, '기존 값:', eventParameter[mappedKey], '새 값:', eventData[source]);
                        }
                        eventParameter[mappedKey] = eventData[source];
                    }
                }
            }
            if (etcEcommerceData) {
                var parsedEtcEcommerceData = JSON.parse(etcEcommerceData.getAttribute('data-gtm-ecommerce'));
                var items = parsedEtcEcommerceData.ecommerce.items;
                items.forEach(function(item, itemIndex) {
                    Object.keys(item).forEach(function(key) {
                        eventParameter['item_' + itemIndex + '_' + key] = item[key];
                    });
                });
            }
        }
    
        var result = {
            SHOT_NUMBER: index,
            EVENTNAME: eventName,
            PAGEPATH: location,
            PAGETITLE: title,
            TIME: getCurrentTimestamp(),
            //SHOT_KEY: shotKey
        };
        
        Object.assign(result, eventParameter);
        
        results.push(result);
    });
    console.table(results);

    var jsonBlob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    var jsonUrl = URL.createObjectURL(jsonBlob);
    var jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = getCurrentTimestamp() + '_' + eventType + '_' + transformedHref + '.json';
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);
    console.log("JSON 파일이 다운로드되었습니다.");
}

function 태깅맵_RDP노출() {
    var timestamp = getCurrentTimestamp();
    highlightGtmElements("visibility");
    extractGtmData("visibility", 'rdp');
    captureAndDownload('visibility', timestamp); // 캡쳐함수호출
}

function 태깅맵_GA노출() {
    var timestamp = getCurrentTimestamp();
    highlightGtmElements("visibility");
    extractGtmData("visibility", 'ga');
    captureAndDownload('visibility', timestamp); // 캡쳐함수호출
}

function 태깅맵_RDP클릭() {
    var timestamp = getCurrentTimestamp();
    highlightGtmElements("click");
    extractGtmData("click", 'rdp');
    captureAndDownload('click', timestamp); // 캡쳐함수호출
}

function 태깅맵_GA클릭() {
    var timestamp = getCurrentTimestamp();
    highlightGtmElements("click");
    extractGtmData("click", 'ga');
    captureAndDownload('click', timestamp); // 캡쳐함수호출
}


function 태깅맵_DB노출() {
    var timestamp = getCurrentTimestamp();
    highlightGtmElements("visibility");
    extractGtmData("visibility", 'rdp');
    captureAndDownload('visibility', timestamp); // 캡쳐함수호출

    // Assuming jsonData and imageBlob are available from the previous functions
    var jsonData = extractGtmData("visibility", 'rdp');
    html2canvas(document.querySelector(captureAreaId)).then(function(canvas) {
        canvas.toBlob(function(blob) {
            uploadData(jsonData, blob, 'visibility', timestamp);
        });
    });
}

function 태깅맵_DB클릭() {
    var timestamp = getCurrentTimestamp();
    highlightGtmElements("click");
    extractGtmData("click", 'rdp');
    captureAndDownload('click', timestamp); // 캡쳐함수호출

    // Assuming jsonData and imageBlob are available from the previous functions
    var jsonData = extractGtmData("click", 'rdp');
    html2canvas(document.querySelector(captureAreaId)).then(function(canvas) {
        canvas.toBlob(function(blob) {
            uploadData(jsonData, blob, 'click', timestamp);
        });
    });
}

function 태깅맵_지우기() {
    removeHighlightGtmElements();
}

function 태깅맵_RDP노출_오버레이() {
    var timestamp = getCurrentTimestamp();
    highlightGtmElementsOverlay("visibility");
    extractGtmData("visibility", 'rdp');
    captureAndDownload('visibility', timestamp); // 캡쳐함수호출
}

function 태깅맵_GA노출_오버레이() {
    var timestamp = getCurrentTimestamp();
    highlightGtmElementsOverlay("visibility");
    extractGtmData("visibility", 'ga');
    captureAndDownload('visibility', timestamp); // 캡쳐함수호출
}

function 태깅맵_RDP클릭_오버레이() {
    var timestamp = getCurrentTimestamp();
    highlightGtmElementsOverlay("click");
    extractGtmData("click", 'rdp');
    captureAndDownload('click', timestamp); // 캡쳐함수호출
}

function 태깅맵_GA클릭_오버레이() {
    var timestamp = getCurrentTimestamp();
    highlightGtmElementsOverlay("click");
    extractGtmData("click", 'ga');
    captureAndDownload('click', timestamp); // 캡쳐함수호출
}
