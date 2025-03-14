// html2canvas-pro 라이브러리 로드
(function() {
    var script = document.createElement('script');
    script.src = 'https://unpkg.com/html2canvas-pro@latest/dist/html2canvas-pro.min.js';
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
        ignoreElements: (element) => element.classList && element.classList.contains('gnb-wrapper')
    }).then(function(canvas) {
        canvas.toBlob(function(blob) {
            if (blob) {
                var transformedHref = transformHref(document.location.href);
                downloadBlob(blob, timestamp + '_' + eventType + '_' + transformedHref + '.png');
            } else {
                console.error('Blob 생성 실패');
            }
        }, 'image/png'); // 명시적으로 mime type 지정
    }).catch(function(error) {
        console.error('Error capturing screen:', error);
        console.error('html2canvas error details:', error); // 에러 상세 정보 로그 추가
    });
}


function uploadData(jsonData, imageBlob, eventType, timestamp) {
    var transformedHref = transformHref(document.location.href);
    console.log(jsonData)
    var formData = new FormData();
    formData.append('jsonData', JSON.stringify(jsonData)); // Ensure jsonData is stringified
    formData.append('image', new File([imageBlob], getCurrentTimestamp() + '_' + eventType + '_' + transformedHref + '.png', { type: 'image/png' }));
    console.log(formData)

    fetch('http://localhost:5000/api/pages', {
        method: 'POST',
        body: formData,
    })
    .then(function(response) {
        return response.text();
    })
    .then(function(data) {
        console.log('Upload successful:', data);
    })
    .catch(function(error) {
        console.error('Error uploading data:', error);
    });
}

function highlightGtmElements(eventType) {
    var elements = document.querySelectorAll('[data-gtm-' + eventType + ']:not(.gnb-wrapper *)');

    Array.prototype.forEach.call(elements, function(el, index) {
        if (eventType == "visibility") {
            el.style.backgroundColor = 'rgba(191, 255, 0, 0.3)';
        } else if (eventType == "click") {
            el.style.backgroundColor = 'rgba(64, 0, 255, 0.3)';
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

        el.style.position = 'relative'; // 부모 요소가 position: relative 인지 확인
        el.appendChild(idSpan);
    });
}

function highlightGtmElementsOverlay(eventType) {
    var elements = document.querySelectorAll('[data-gtm-' + eventType + ']:not(.gnb-wrapper *)');

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
    var elements = document.querySelectorAll('[data-gtm-visibility], [data-gtm-click]');
    Array.prototype.forEach.call(elements, function(el) {
        el.style.backgroundColor = ''; // 원래 배경색으로 되돌리기
        var idSpans = el.querySelectorAll('[data-gtm-id]');
        Array.prototype.forEach.call(idSpans, function(idSpan) {
            if (idSpan && idSpan.parentNode === el) {
                idSpan.style.zIndex = ''; // z-index 초기화
                el.removeChild(idSpan);
            }
        });
    });

    var overlay = document.getElementById('gtm-overlay');
    if (overlay) {
        document.body.removeChild(overlay);
    }
}

function extractGtmData(eventType, mapping) {
    var results = [];
    var elements = document.querySelectorAll('[data-gtm-' + eventType + ']:not(.gnb-wrapper *)');

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
        cts_id: 'PAGE_MKT_CONTS_ID',
        cts_sub_id: 'SUB_CONTENT_ID',
        index: 'HORIZONTAL_INDEX',
        cts_group1: 'EP_CD101_CTS_GROUP1',
        cts_group2: 'EP_CD102_CTS_GROUP2',
        cts_group3: 'EP_CD103_CTS_GROUP3',
        cts_group4: 'EP_CD104_CTS_GROUP4',
        cts_group5: 'EP_CD105_CTS_GROUP5',
        cts_group6: 'EP_CD106_CTS_GROUP6',
        cts_group7: 'EP_CD107_CTS_GROUP7',
        cts_group8: 'EP_CD108_CTS_GROUP8',
        cts_group9: 'EP_CD109_CTS_GROUP9',
        cts_group10: 'EP_CD110_CTS_GROUP10',
        cts_group11: 'EP_CD111_CTS_GROUP11',
        cts_group12: 'EP_CD112_CTS_GROUP12',
        cts_group13: 'EP_CD113_CTS_GROUP13'
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
        cts_id: 'PAGE_MKT_CONTS_ID',
        cts_sub_id: 'SUB_CONTENT_ID',
        index: 'VERTICAL_INDEX',
        cts_group1: 'EP_CD101_CTS_GROUP1',
        cts_group2: 'EP_CD102_CTS_GROUP2',
        cts_group3: 'EP_CD103_CTS_GROUP3',
        cts_group4: 'EP_CD104_CTS_GROUP4',
        cts_group5: 'EP_CD105_CTS_GROUP5',
        cts_group6: 'EP_CD106_CTS_GROUP6',
        cts_group7: 'EP_CD107_CTS_GROUP7',
        cts_group8: 'EP_CD108_CTS_GROUP8',
        cts_group9: 'EP_CD109_CTS_GROUP9',
        cts_group10: 'EP_CD110_CTS_GROUP10',
        cts_group11: 'EP_CD111_CTS_GROUP11',
        cts_group12: 'EP_CD112_CTS_GROUP12',
        cts_group13: 'EP_CD113_CTS_GROUP13'
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
        cts_id: '콘텐츠ID_ep_cd42_cts_id',
        cts_sub_id: '서브 콘텐츠 ID_ep_cd79_sub_cts_id',
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
        cts_group13: 'ep_cd113_cts_group13'
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
        cts_id: '콘텐츠ID_ep_cd42_cts_id',
        cts_sub_id: '서브콘텐츠ID_ep_cd79_sub_cts_id',
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
        cts_group13: 'ep_cd113_cts_group13'
    };

    var transformedHref = transformHref(document.location.href);

    Array.prototype.forEach.call(elements, function(el, index) {
        var viewEvent = eventType == 'visibility' ? 'view' : eventType;
        var eventName = 'cts_' + viewEvent;
        var location = document.location.href;
        var dataGtmBodyEvent = el.getAttribute('data-gtm-body') || null;
        var dataGtmBodySection = null;
        var sectionElement = el.closest('[data-gtm-section]');
    
        while (sectionElement) {
            var sectionData = sectionElement.getAttribute('data-gtm-body');
            if (sectionData) {
                var parsedSectionData = JSON.parse(sectionData);
                if (dataGtmBodySection) {
                    Object.keys(parsedSectionData).forEach(function(key) {
                        if (dataGtmBodySection.hasOwnProperty(key)) {
                            console.warn('키가 겹칩니다 (섹션 데이터):', '요소 번호:', index, '키:', key, '기존 값:', dataGtmBodySection[key], '새 값:', parsedSectionData[key]);
                        }
                    });
                    dataGtmBodySection = Object.assign({}, parsedSectionData, dataGtmBodySection);
                } else {
                    dataGtmBodySection = parsedSectionData;
                }
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
                if (mapping == 'rdp') {
                    var mappedKey = rdp_event_mapping[source];
                    if (mappedKey) {
                        if (eventParameter.hasOwnProperty(mappedKey)) {
                            console.warn('키가 겹칩니다 (이벤트 데이터):', '요소 번호:', index, '키:', mappedKey, '기존 값:', eventParameter[mappedKey], '새 값:', eventData[source]);
                        }
                        eventParameter[mappedKey] = eventData[source];
                    }
                } else if (mapping == 'ga') {
                    var mappedKey = ga_event_mapping[source];
                    if (mappedKey) {
                        if (eventParameter.hasOwnProperty(mappedKey)) {
                            console.warn('키가 겹칩니다 (이벤트 데이터):', '요소 번호:', index, '키:', mappedKey, '기존 값:', eventParameter[mappedKey], '새 값:', eventData[source]);
                        }
                        eventParameter[mappedKey] = eventData[source];
                    }
                }
            }
        }

        if (dataGtmBodySection) {
            if (dataGtmBodySection.is_popup === "1") {
                eventName = 'popup_' + viewEvent;
            }
    
            for (var source in dataGtmBodySection) {
                var mappedKey;
                if (mapping == 'rdp') {
                    mappedKey = rdp_section_mapping[source];
                } else if (mapping == 'ga') {
                    mappedKey = ga_section_mapping[source];
                }

                if (mappedKey) {
                    if (eventParameter.hasOwnProperty(mappedKey)) {
                        console.warn('키가 겹칩니다 (섹션 데이터 -> 이벤트 데이터):', '요소 번호:', index, '키:', mappedKey, '기존 값:', eventParameter[mappedKey], '새 값:', dataGtmBodySection[source]);
                    }
                    eventParameter[mappedKey] = dataGtmBodySection[source];
                }
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
    return results;

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

    // Assuming jsonData and imageBlob are available from the previous functions
    var jsonData = extractGtmData("visibility", 'rdp');
    html2canvas(document.querySelector(captureAreaId)).then(function(canvas) {
        canvas.toBlob(function(blob) {
            uploadData(jsonData, blob, 'visibility', timestamp);
        });
    });
}

function 태깅맵_GA노출() {
    var timestamp = getCurrentTimestamp();
    highlightGtmElements("visibility");
    extractGtmData("visibility", 'ga');
    captureAndDownload('visibility', timestamp); // 캡쳐함수호출

    // Assuming jsonData and imageBlob are available from the previous functions
    var jsonData = extractGtmData("visibility", 'ga');
    html2canvas(document.querySelector(captureAreaId)).then(function(canvas) {
        canvas.toBlob(function(blob) {
            uploadData(jsonData, blob, 'visibility', timestamp);
        });
    });
}

function 태깅맵_RDP클릭() {
    var timestamp = getCurrentTimestamp();
    highlightGtmElements("click");
    extractGtmData("click", 'rdp');
    captureAndDownload('click', timestamp); // 캡쳐함수호출

    // Assuming jsonData and imageBlob are available from the previous functions
    var jsonData = extractGtmData("click", 'rdp');
    console.log('jsonData')
    console.log(jsonData)
    html2canvas(document.querySelector(captureAreaId)).then(function(canvas) {
        canvas.toBlob(function(blob) {
            uploadData(jsonData, blob, 'click', timestamp);
        });
    });
}

function 태깅맵_GA클릭() {
    var timestamp = getCurrentTimestamp();
    highlightGtmElements("click");
    extractGtmData("click", 'ga');
    captureAndDownload('click', timestamp); // 캡쳐함수호출

    // Assuming jsonData and imageBlob are available from the previous functions
    var jsonData = extractGtmData("click", 'ga');
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