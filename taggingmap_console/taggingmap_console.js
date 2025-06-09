// Function to check if a script is loaded
function isScriptLoaded(src) {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src === src) {
            return true;
        }
    }
    return false;
}

// Async function to load a script
async function loadScript(src) {
    if (isScriptLoaded(src)) {
        console.log('Script already loaded:', src);
        return;
    }
    
    return new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = src;
        script.onload = function() {
            console.log('Script loaded:', src);
            resolve();
        };
        script.onerror = function() {
            reject(new Error('Failed to load script: ' + src));
        };
        document.head.appendChild(script);
    });
}

// Async function to ensure required libraries are loaded
async function ensureLibrariesLoaded() {
    try {
        await Promise.all([
            loadScript('https://unpkg.com/html2canvas-pro@latest/dist/html2canvas-pro.min.js'),
            loadScript('https://widget.cloudinary.com/v2.0/global/all.js')
        ]);
        console.log('All required libraries loaded.');
    } catch (error) {
        console.error('Error loading libraries:', error);
        throw error;
    }
}

// Function to generate common GTM selector based on event type
function getGtmSelector(eventType) {
    var baseSelector = '[data-gtm-' + eventType + ']:not(.gnb-wrapper *):not(.loginTime *)';
    
    if (eventType === "visibility") {
        return baseSelector + ', [data-gtm-view-item-list]:not(.gnb-wrapper *):not(.loginTime *), [data-gtm-popup-visibility]:not(.gnb-wrapper *):not(.loginTime *)';
    } else if (eventType === "click") {
        return baseSelector + ', [data-gtm-select-item]:not(.gnb-wrapper *):not(.loginTime *), [data-gtm-auto-click]:not(.gnb-wrapper *):not(.loginTime *),[data-gtm-popup-click]:not(.gnb-wrapper *):not(.loginTime *), [data-gtm-etc]:not(.gnb-wrapper *):not(.loginTime *)';
    }
    
    return baseSelector;
}

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

// Cloudinary 설정
const CLOUDINARY_CLOUD_NAME = 'dfksr3bzo';
const CLOUDINARY_API_KEY = '213991357667172';
const CLOUDINARY_UPLOAD_PRESET = 'ml_default'; // 필요시 Cloudinary 대시보드에서 unsigned 프리셋 생성

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

// 환경에 따른 기본 URL 설정
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://taggingmap-server-bd06b783e6ac.herokuapp.com';

// Cloudinary를 통해 이미지 업로드하는 함수
function uploadDataDirectly(jsonData, imageBlob, eventType, timestamp) {
    console.log('Starting direct server upload...');
    
    // 서버에 바로 업로드 (가장 안정적인 방법)
    uploadDataDirectToServer(jsonData, imageBlob, eventType, timestamp);
    // FormData 생성
    const formData = new FormData();
    
    // 이미지 파일 추가
    const filename = `${timestamp}_${eventType}_${transformHref(document.location.href)}.png`;
    const file = new File([imageBlob], filename, { type: 'image/png' });
    
    // Cloudinary API 업로드 설정
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('timestamp', Math.round(new Date().getTime() / 1000));
    formData.append('folder', 'taggingmap');
    
    // Cloudinary로 직접 업로드
    fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Cloudinary upload failed: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Cloudinary upload successful:', data);

        var pathname = document.location.pathname.substring(1);
        if (pathname.endsWith('/')) {
            pathname = pathname.slice(0, -1);
        }
        var title = pathname.replace(/\//g, '>');
        // 이미지 URL과 JSON 데이터를 서버에 전송
        const serverFormData = new FormData();
        serverFormData.append('eventParams', eventParams);
        serverFormData.append('TIME', new Date().toISOString());
        serverFormData.append('EVENTTYPE', eventType);
        serverFormData.append('PAGETITLE', title);
        serverFormData.append('URL', document.location.href);
        serverFormData.append('timestamp', new Date().toISOString());
        serverFormData.append('imageUrl', data.secure_url); // Cloudinary 이미지 URL
        
        return fetch(`${API_BASE_URL}/api/taggingMaps`, {
            method: 'POST',
            body: serverFormData
        });
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
        return response.text();
    })
    .then(data => {
        console.log('Server upload successful:', data);
    })
    .catch(error => {
        console.error('Error uploading to Cloudinary:', error);
    });
}

// 서버에 직접 업로드하는 함수
function uploadDataDirectToServer(jsonData, imageBlob, eventType, timestamp) {
    const formData = new FormData();
    
    // URL에서 페이지 타이틀 추출
    let pathname = document.location.pathname.substring(1);
    if (pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
    }
    let title = pathname.replace(/\//g, '>') || document.title;
    
    // 서버 요청 데이터 설정
    formData.append('eventParams', JSON.stringify(jsonData));
    formData.append('TIME', new Date().toISOString());
    formData.append('EVENTTYPE', eventType);
    formData.append('PAGETITLE', title);
    formData.append('URL', document.location.href);
    formData.append('timestamp', new Date().toISOString());
    
    // 이미지 파일 직접 추가
    const filename = `${timestamp}_${eventType}_${transformHref(document.location.href)}.png`;
    formData.append('image', new File([imageBlob], filename, { type: 'image/png' }));

    // 서버에 업로드
    fetch(`${API_BASE_URL}/api/taggingMaps`, {
        method: 'POST',
        body: formData,
    })
    .then(function(response) {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Server error: ${text}`);
            });
        }
        return response.text();
    })
    .then(function(data) {
        console.log('Server upload successful:', data);
    })
    .catch(function(error) {
        console.error('Server upload failed:', error);
    });
}

function highlightGtmElements(eventType) {
    var selector = getGtmSelector(eventType);
    var elements = document.querySelectorAll(selector);
    
    // 최상위 z-index 찾기
    var highestZIndex = getHighestZIndex();
    var superHighZIndex = Math.max(highestZIndex + 1000, 10000);

    Array.prototype.forEach.call(elements, function(el, index) {
        // 요소 하이라이트
        if (eventType === "visibility") {
            el.style.backgroundColor = 'rgba(191, 255, 0, 0.3)';
        } else if (eventType === "click") {
            el.style.backgroundColor = 'rgba(64, 0, 255, 0.3)';
        }

        // 번호를 표시할 요소 생성
        var idSpan = document.createElement('span');
        idSpan.textContent = index;
        idSpan.style.position = 'absolute'; // fixed 대신 absolute 사용
        idSpan.style.top = '0';
        idSpan.style.left = '0';
        idSpan.style.zIndex = superHighZIndex;
        idSpan.setAttribute('data-gtm-id', 'highlight-' + index);
        
        if (eventType === "visibility") {
            idSpan.style.backgroundColor = 'green';
        } else if (eventType === "click") {
            idSpan.style.backgroundColor = 'purple';
        }
        
        idSpan.style.color = 'white';
        idSpan.style.padding = '4px';
        idSpan.style.fontSize = '12px';
        idSpan.style.pointerEvents = 'none';
        
        // 요소의 position 확인 및 설정
        var elPosition = window.getComputedStyle(el).position;
        if (elPosition === 'static') {
            el.style.position = 'relative'; // 요소가 static이면 relative로 변경
        }
        
        // 번호를 요소에 직접 추가
        el.appendChild(idSpan);
    });

    function getHighestZIndex() {
        var elements = document.getElementsByTagName('*');
        var highest = 0;
        
        for (var i = 0; i < elements.length; i++) {
            var zIndex = parseInt(window.getComputedStyle(elements[i]).zIndex);
            if (zIndex > highest && !isNaN(zIndex)) {
                highest = zIndex;
            }
        }
        
        return highest;
    }
}

function highlightGtmElementsOverlay(eventType) {
    var selector = getGtmSelector(eventType);
    var elements = document.querySelectorAll(selector);

    Array.prototype.forEach.call(elements, function(el, index) {
        var rect = el.getBoundingClientRect();
        var overlay = document.createElement('div');
        overlay.setAttribute('data-gtm-overlay', 'true'); // 오버레이 요소 식별자 추가
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
        
        // 위치 스타일 초기화 (position: relative로 변경되었을 경우)
        if (el.hasAttribute('data-original-position')) {
            el.style.position = el.getAttribute('data-original-position');
            el.removeAttribute('data-original-position');
        } else if (el.style.position === 'relative') {
            // 원래 위치를 저장하지 않았다면 그냥 초기화
            el.style.position = '';
        }
        
        // 요소 내부에 추가된 번호 span도 확인하여 제거
        var innerSpans = el.querySelectorAll('[data-gtm-id]');
        Array.prototype.forEach.call(innerSpans, function(span) {
            span.parentNode.removeChild(span);
        });
    });
    
    // 기존 방식: document.body에 추가된 번호 제거
    var idSpans = document.querySelectorAll('[data-gtm-id]');
    Array.prototype.forEach.call(idSpans, function(idSpan) {
        if (idSpan.parentNode) {
            idSpan.parentNode.removeChild(idSpan);
        }
    });

    // Remove overlay elements
    var overlays = document.querySelectorAll('[data-gtm-overlay]');
    Array.prototype.forEach.call(overlays, function(overlay) {
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    });

    // Remove overlay if it exists (기존 코드 유지)
    var overlay = document.getElementById('gtm-overlay');
    if (overlay) {
        document.body.removeChild(overlay);
    }
    
    // 이벤트 리스너 제거 (혹시 남아있을 경우)
    window.removeEventListener('scroll', window.updateHighlightPositions);
    window.removeEventListener('resize', window.updateHighlightPositions);
    window.removeEventListener('mousemove', window.updateHighlightPositions);
    window.removeEventListener('touchmove', window.updateHighlightPositions);
}
function extractGtmData(eventType, mapping) {
    var results = [];

    var selector = getGtmSelector(eventType);
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
        
        if (viewEvent == 'view') {
            // When viewEvent is 'view', only check for these two attributes
            if (el.hasAttribute('data-gtm-popup-visibility')) {
                eventName = 'popup_view';
            } else {
                // First check if there's a closest section with is_popup="1"
                var sectionElement = el.closest('[data-gtm-section]');
                var isPopup = false;
                
                if (sectionElement && sectionElement.hasAttribute('data-gtm-body')) {
                    try {
                        var sectionData = JSON.parse(sectionElement.getAttribute('data-gtm-body'));
                        if (sectionData.is_popup === "1") {
                            isPopup = true;
                        }
                    } catch (e) {
                        console.error('Error parsing data-gtm-body on section:', e);
                    }
                }
                
                // Then check the element itself if no popup found in section
                if (!isPopup && el.hasAttribute('data-gtm-body')) {
                    try {
                        var elData = JSON.parse(el.getAttribute('data-gtm-body'));
                        if (elData.is_popup === "1") {
                            isPopup = true;
                        }
                    } catch (e) {
                        console.error('Error parsing data-gtm-body on element:', e);
                    }
                }
                
                if (isPopup) {
                    eventName = 'popup_view';
                } else if (el.hasAttribute('data-gtm-view-item-list')) {
                    eventName = 'view-item-list';
                } else {
                    eventName = 'cts_view';
                }
            }
        } else {
            // For all other event types, use the original logic with the same section-first approach
            if (el.hasAttribute('data-gtm-popup-click')) {
                eventName = 'popup_click';
            } else {
                // First check if there's a closest section with is_popup="1"
                var sectionElement = el.closest('[data-gtm-section]');
                var isPopup = false;
                
                if (sectionElement && sectionElement.hasAttribute('data-gtm-body')) {
                    try {
                        var sectionData = JSON.parse(sectionElement.getAttribute('data-gtm-body'));
                        if (sectionData.is_popup === "1") {
                            isPopup = true;
                        }
                    } catch (e) {
                        console.error('Error parsing data-gtm-body on section:', e);
                    }
                }
                
                // Then check the element itself if no popup found in section
                if (!isPopup && el.hasAttribute('data-gtm-body')) {
                    try {
                        var elData = JSON.parse(el.getAttribute('data-gtm-body'));
                        if (elData.is_popup === "1") {
                            isPopup = true;
                        }
                    } catch (e) {
                        console.error('Error parsing data-gtm-body on element:', e);
                    }
                }
                
                if (isPopup) {
                    eventName = 'popup_click';
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
            }
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
    
    // 추가: 결과를 반환하여 다른 함수에서 사용할 수 있게 함
    return results;
}

function 태깅맵_RDP노출() {
    태깅맵_지우기();
    ensureLibrariesLoaded().then(function() {
        var timestamp = getCurrentTimestamp();
        highlightGtmElements("visibility");
        var jsonData = extractGtmData("visibility", 'rdp');
        
        html2canvas(document.querySelector(captureAreaId), {
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            ignoreElements: function(element) { 
                return element.classList && element.classList.contains('gnb-wrapper'); 
            }
        }).then(function(canvas) {
            canvas.toBlob(function(blob) {
                downloadBlob(blob, timestamp + '_visibility_' + transformHref(document.location.href) + '.png');
            }, 'image/png');
        });
    }).catch(error => console.error('Error in 태깅맵_RDP노출:', error));
}

function 태깅맵_GA노출() {
    태깅맵_지우기();
    ensureLibrariesLoaded().then(function() {
        var timestamp = getCurrentTimestamp();
        highlightGtmElements("visibility");
        var jsonData = extractGtmData("visibility", 'ga');
        
        html2canvas(document.querySelector(captureAreaId), {
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            ignoreElements: function(element) { 
                return element.classList && element.classList.contains('gnb-wrapper'); 
            }
        }).then(function(canvas) {
            canvas.toBlob(function(blob) {
                downloadBlob(blob, timestamp + '_visibility_' + transformHref(document.location.href) + '.png');
            }, 'image/png');
        });
    }).catch(error => console.error('Error in 태깅맵_GA노출:', error));
}

function 태깅맵_RDP클릭() {
    태깅맵_지우기();
    ensureLibrariesLoaded().then(function() {
        var timestamp = getCurrentTimestamp();
        highlightGtmElements("click");
        var jsonData = extractGtmData("click", 'rdp');
        
        html2canvas(document.querySelector(captureAreaId), {
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            ignoreElements: function(element) { 
                return element.classList && element.classList.contains('gnb-wrapper'); 
            }
        }).then(function(canvas) {
            canvas.toBlob(function(blob) {
                downloadBlob(blob, timestamp + '_click_' + transformHref(document.location.href) + '.png');
            }, 'image/png');
        });
    }).catch(error => console.error('Error in 태깅맵_RDP클릭:', error));
}

function 태깅맵_GA클릭() {
    태깅맵_지우기();
    ensureLibrariesLoaded().then(function() {
        var timestamp = getCurrentTimestamp();
        highlightGtmElements("click");
        var jsonData = extractGtmData("click", 'ga');
        
        html2canvas(document.querySelector(captureAreaId), {
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            ignoreElements: function(element) { 
                return element.classList && element.classList.contains('gnb-wrapper'); 
            }
        }).then(function(canvas) {
            canvas.toBlob(function(blob) {
                downloadBlob(blob, timestamp + '_click_' + transformHref(document.location.href) + '.png');
            }, 'image/png');
        });
    }).catch(error => console.error('Error in 태깅맵_GA클릭:', error));
}

function 태깅맵_DB노출() {
    태깅맵_지우기();
    ensureLibrariesLoaded().then(function() {
        var timestamp = getCurrentTimestamp();
        highlightGtmElements("visibility");
        var jsonData = extractGtmData("visibility", 'rdp');
        
        // eventParams가 비어있는지 확인
        if (jsonData.length === 0) {
            console.warn("추출된 이벤트 파라미터가 없어 DB에 저장하지 않습니다.");
            alert("추출된 태깅 요소가 없어 DB에 저장하지 않습니다.");
            return; // 함수 종료
        }
        
        html2canvas(document.querySelector(captureAreaId), {
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            ignoreElements: function(element) { 
                return element.classList && element.classList.contains('gnb-wrapper'); 
            }
        }).then(function(canvas) {
            canvas.toBlob(function(blob) {
                // 로컬 다운로드 및 서버 업로드
                downloadBlob(blob, timestamp + '_visibility_' + transformHref(document.location.href) + '.png');
                uploadDataDirectToServer(jsonData, blob, 'visibility', timestamp);
            }, 'image/png');
        });
    }).catch(error => console.error('Error in 태깅맵_DB노출:', error));
}

function 태깅맵_DB클릭() {
    태깅맵_지우기();
    ensureLibrariesLoaded().then(function() {
        var timestamp = getCurrentTimestamp();
        highlightGtmElements("click");
        var jsonData = extractGtmData("click", 'rdp');
        
        // eventParams가 비어있는지 확인
        if (jsonData.length === 0) {
            console.warn("추출된 이벤트 파라미터가 없어 DB에 저장하지 않습니다.");
            alert("추출된 태깅 요소가 없어 DB에 저장하지 않습니다.");
            return; // 함수 종료
        }
        
        html2canvas(document.querySelector(captureAreaId), {
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            ignoreElements: function(element) { 
                return element.classList && element.classList.contains('gnb-wrapper'); 
            }
        }).then(function(canvas) {
            canvas.toBlob(function(blob) {
                // 로컬 다운로드 및 서버 업로드
                downloadBlob(blob, timestamp + '_click_' + transformHref(document.location.href) + '.png');
                uploadDataDirectToServer(jsonData, blob, 'click', timestamp);
            }, 'image/png');
        });
    }).catch(error => console.error('Error in 태깅맵_DB클릭:', error));
}

function 태깅맵_지우기() {
    removeHighlightGtmElements();
}

function 태깅맵_RDP노출_오버레이() {
    태깅맵_지우기();
    ensureLibrariesLoaded().then(function() {
        var timestamp = getCurrentTimestamp();
        highlightGtmElementsOverlay("visibility");
        var jsonData = extractGtmData("visibility", 'rdp');
        
        html2canvas(document.querySelector(captureAreaId), {
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            ignoreElements: function(element) { 
                return element.classList && element.classList.contains('gnb-wrapper'); 
            }
        }).then(function(canvas) {
            canvas.toBlob(function(blob) {
                downloadBlob(blob, timestamp + '_visibility_' + transformHref(document.location.href) + '.png');
            }, 'image/png');
        });
    }).catch(error => console.error('Error in 태깅맵_RDP노출_오버레이:', error));
}

function 태깅맵_GA노출_오버레이() {
    태깅맵_지우기();
    ensureLibrariesLoaded().then(function() {
        var timestamp = getCurrentTimestamp();
        highlightGtmElementsOverlay("visibility");
        var jsonData = extractGtmData("visibility", 'ga');
        
        html2canvas(document.querySelector(captureAreaId), {
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            ignoreElements: function(element) { 
                return element.classList && element.classList.contains('gnb-wrapper'); 
            }
        }).then(function(canvas) {
            canvas.toBlob(function(blob) {
                downloadBlob(blob, timestamp + '_visibility_' + transformHref(document.location.href) + '.png');
            }, 'image/png');
        });
    }).catch(error => console.error('Error in 태깅맵_GA노출_오버레이:', error));
}

function 태깅맵_RDP클릭_오버레이() {
    태깅맵_지우기();
    ensureLibrariesLoaded().then(function() {
        var timestamp = getCurrentTimestamp();
        highlightGtmElementsOverlay("click");
        var jsonData = extractGtmData("click", 'rdp');
        
        html2canvas(document.querySelector(captureAreaId), {
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            ignoreElements: function(element) { 
                return element.classList && element.classList.contains('gnb-wrapper'); 
            }
        }).then(function(canvas) {
            canvas.toBlob(function(blob) {
                downloadBlob(blob, timestamp + '_click_' + transformHref(document.location.href) + '.png');
            }, 'image/png');
        });
    }).catch(error => console.error('Error in 태깅맵_RDP클릭_오버레이:', error));
}

function 태깅맵_GA클릭_오버레이() {
    태깅맵_지우기();
    ensureLibrariesLoaded().then(function() {
        var timestamp = getCurrentTimestamp();
        highlightGtmElementsOverlay("click");
        var jsonData = extractGtmData("click", 'ga');
        
        html2canvas(document.querySelector(captureAreaId), {
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            ignoreElements: function(element) { 
                return element.classList && element.classList.contains('gnb-wrapper'); 
            }
        }).then(function(canvas) {
            canvas.toBlob(function(blob) {
                downloadBlob(blob, timestamp + '_click_' + transformHref(document.location.href) + '.png');
            }, 'image/png');
        });
    }).catch(error => console.error('Error in 태깅맵_GA클릭_오버레이:', error));
}

function 태깅맵_DB노출_오버레이() {
    태깅맵_지우기();
    ensureLibrariesLoaded().then(function() {
        var timestamp = getCurrentTimestamp();
        highlightGtmElementsOverlay("visibility");
        var jsonData = extractGtmData("visibility", 'rdp');
        
        // eventParams가 비어있는지 확인
        if (jsonData.length === 0) {
            console.warn("추출된 이벤트 파라미터가 없어 DB에 저장하지 않습니다.");
            alert("추출된 태깅 요소가 없어 DB에 저장하지 않습니다.");
            return; // 함수 종료
        }
        
        html2canvas(document.querySelector(captureAreaId), {
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            ignoreElements: function(element) { 
                return element.classList && element.classList.contains('gnb-wrapper'); 
            }
        }).then(function(canvas) {
            canvas.toBlob(function(blob) {
                // 로컬 다운로드 및 서버 업로드
                downloadBlob(blob, timestamp + '_visibility_' + transformHref(document.location.href) + '.png');
                uploadDataDirectToServer(jsonData, blob, 'visibility', timestamp);
            }, 'image/png');
        });
    }).catch(error => console.error('Error in 태깅맵_DB노출_오버레이:', error));
}

function 태깅맵_DB클릭_오버레이() {
    태깅맵_지우기();
    ensureLibrariesLoaded().then(function() {
        var timestamp = getCurrentTimestamp();
        highlightGtmElementsOverlay("click");
        var jsonData = extractGtmData("click", 'rdp');
        
        // eventParams가 비어있는지 확인
        if (jsonData.length === 0) {
            console.warn("추출된 이벤트 파라미터가 없어 DB에 저장하지 않습니다.");
            alert("추출된 태깅 요소가 없어 DB에 저장하지 않습니다.");
            return; // 함수 종료
        }
        
        html2canvas(document.querySelector(captureAreaId), {
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            ignoreElements: function(element) { 
                return element.classList && element.classList.contains('gnb-wrapper'); 
            }
        }).then(function(canvas) {
            canvas.toBlob(function(blob) {
                // 로컬 다운로드 및 서버 업로드
                downloadBlob(blob, timestamp + '_click_' + transformHref(document.location.href) + '.png');
                uploadDataDirectToServer(jsonData, blob, 'click', timestamp);
            }, 'image/png');
        });
    }).catch(error => console.error('Error in 태깅맵_DB클릭_오버레이:', error));
}