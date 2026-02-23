/**
 * Result Renderer v1.0
 * R 실행 결과를 HTML로 렌더링
 */

window.AutoStat = window.AutoStat || {};

window.AutoStat.ResultRenderer = {

    STEP_LABELS: {
        load: '데이터 로딩',
        preprocess: '데이터 전처리',
        desc: '기술통계',
        assume: '가정 검정',
        main: '본분석 결과',
        posthoc: '사후검정',
        effect: '효과크기',
        plot: '시각화',
        interpret: '해석 가이드'
    },

    STEP_ORDER: ['load', 'preprocess', 'desc', 'assume', 'main', 'posthoc', 'effect', 'plot', 'interpret'],

    // ────────────── 전체 렌더링 ──────────────

    render: function(container, results, plotImages) {
        if (!container) return;
        container.innerHTML = '';

        // null/빈 결과 처리
        if (!results || typeof results !== 'object' || Object.keys(results).length === 0) {
            container.appendChild(this.renderError('분석 결과가 없습니다. 다시 시도해주세요.'));
            return;
        }

        var self = this;
        var orderedSteps = this._orderSteps(results);

        orderedSteps.forEach(function(stepId) {
            var result = results[stepId];
            if (!result) return;

            // 시각화는 별도 처리
            if (stepId === 'plot') {
                self._renderPlotStep(container, result, plotImages);
                return;
            }

            var stepEl = self._createStepElement(stepId, result);
            container.appendChild(stepEl);
        });
        // 액션 버튼은 app.js의 _createResultActionButtons에서 생성
    },

    // ────────────── 단계별 요소 생성 ──────────────

    _createStepElement: function(stepId, result) {
        var div = document.createElement('div');
        div.className = 'result-step';
        div.setAttribute('data-step', stepId);

        var label = result.label || this.STEP_LABELS[stepId] || stepId;
        var hasError = result.error && result.error.length > 0;
        var statusClass = hasError ? 'step-error' : 'step-done';
        var statusText = hasError ? '오류' : '완료';

        // 헤더
        var header = document.createElement('div');
        header.className = 'step-header';
        header.innerHTML =
            '<span class="step-status ' + statusClass + '">' + statusText + '</span>' +
            '<h4>' + this._escapeHtml(label) + '</h4>' +
            '<span class="step-toggle">+</span>';

        // 콘텐츠
        var content = document.createElement('div');
        content.className = 'step-content';

        if (hasError) {
            content.appendChild(this.renderError(result.error));
        }

        if (result.output) {
            var outputEl = this._renderOutput(stepId, result.output);
            content.appendChild(outputEl);
        }

        if (result.warnings) {
            var warnEl = document.createElement('div');
            warnEl.className = 'step-warnings';
            warnEl.innerHTML = '<small>Warning: ' + this._escapeHtml(result.warnings) + '</small>';
            content.appendChild(warnEl);
        }

        // 기본적으로 main, desc는 펼침
        var isExpanded = (stepId === 'main' || stepId === 'desc' || stepId === 'effect');
        if (!isExpanded) {
            content.style.display = 'none';
        } else {
            header.querySelector('.step-toggle').textContent = '-';
        }

        // 토글 이벤트
        header.addEventListener('click', function() {
            var isVisible = content.style.display !== 'none';
            content.style.display = isVisible ? 'none' : 'block';
            header.querySelector('.step-toggle').textContent = isVisible ? '+' : '-';
        });

        div.appendChild(header);
        div.appendChild(content);
        return div;
    },

    // ────────────── 출력 렌더링 ──────────────

    _renderOutput: function(stepId, outputText) {
        var container = document.createElement('div');

        // 테이블 형태 감지 시도
        if (this._looksLikeTable(outputText)) {
            var table = this._tryParseTable(outputText);
            if (table) {
                container.appendChild(table);
                return container;
            }
        }

        // p-value 강조
        var formatted = this._highlightStatValues(outputText);

        var pre = document.createElement('div');
        pre.className = 'console-output';
        pre.innerHTML = '<pre>' + formatted + '</pre>';
        container.appendChild(pre);

        return container;
    },

    // ────────────── 시각화 렌더링 ──────────────

    _renderPlotStep: function(container, result, plotImages) {
        var div = document.createElement('div');
        div.className = 'result-step';
        div.setAttribute('data-step', 'plot');

        var header = document.createElement('div');
        header.className = 'step-header';
        header.innerHTML =
            '<span class="step-status step-done">완료</span>' +
            '<h4>시각화</h4>' +
            '<span class="step-toggle">-</span>';

        var content = document.createElement('div');
        content.className = 'step-content';

        if (plotImages && plotImages.length > 0) {
            for (var i = 0; i < plotImages.length; i++) {
                var img = document.createElement('img');
                img.src = plotImages[i].src || plotImages[i];
                img.className = 'webr-plot-image';
                img.alt = '분석 결과 그래프';
                content.appendChild(img);
            }
        } else if (result && result.output) {
            var pre = document.createElement('div');
            pre.className = 'console-output';
            pre.innerHTML = '<pre>' + this._escapeHtml(result.output) + '</pre>';
            content.appendChild(pre);
        } else {
            var msg = document.createElement('p');
            msg.className = 'plot-fallback-msg';
            msg.textContent = '시각화는 R 코드 다운로드 후 로컬에서 확인하세요.';
            content.appendChild(msg);
        }

        header.addEventListener('click', function() {
            var isVisible = content.style.display !== 'none';
            content.style.display = isVisible ? 'none' : 'block';
            header.querySelector('.step-toggle').textContent = isVisible ? '+' : '-';
        });

        div.appendChild(header);
        div.appendChild(content);
        container.appendChild(div);
    },

    // ────────────── 에러 표시 ──────────────

    renderError: function(errorMessage) {
        var div = document.createElement('div');
        div.className = 'result-error';
        div.innerHTML =
            '<strong>실행 오류</strong>' +
            '<p>' + this._escapeHtml(errorMessage) + '</p>';
        return div;
    },

    // ────────────── 액션 버튼 ──────────────

    _createActionButtons: function() {
        var div = document.createElement('div');
        div.className = 'result-actions';
        div.innerHTML =
            '<button class="btn btn-primary" id="btn-download-excel-result">Excel 다운로드</button>' +
            '<button class="btn btn-secondary" id="btn-view-rcode-result">R 코드 보기</button>' +
            '<button class="btn btn-outline" id="btn-rerun-analysis">다시 분석</button>';
        return div;
    },

    // ────────────── Excel 다운로드 ──────────────

    createExcelDownload: function(results, testName) {
        if (typeof XLSX === 'undefined') {
            alert('Excel 라이브러리가 로드되지 않았습니다.');
            return;
        }

        var wb = XLSX.utils.book_new();
        var safeName = (testName || '통계분석').replace(/[\\/:*?"<>|]/g, '_');

        // 분석 정보 시트
        var infoData = [
            ['분석 방법', testName || '통계 분석'],
            ['분석 일시', new Date().toLocaleString('ko-KR')],
            ['도구', 'auto_statistical_method v2.0 (WebR)'],
            [''],
            ['각 시트에 단계별 분석 결과가 저장되어 있습니다.']
        ];
        var infoSheet = XLSX.utils.aoa_to_sheet(infoData);
        // 컬럼 너비
        infoSheet['!cols'] = [{ wch: 15 }, { wch: 50 }];
        XLSX.utils.book_append_sheet(wb, infoSheet, '분석정보');

        // 각 단계별 시트
        var self = this;
        var sheetCount = 0;
        this.STEP_ORDER.forEach(function(stepId) {
            if (!results[stepId]) return;
            if (stepId === 'plot') return;

            var stepResult = results[stepId];
            var label = stepResult.label || self.STEP_LABELS[stepId] || stepId;
            // 시트명: 숫자 + 이름 (31자 제한, 특수문자 제거)
            sheetCount++;
            var sheetName = (sheetCount + '. ' + label)
                .replace(/[\\/:*?"<>|]/g, '')
                .substring(0, 31);

            var sheetData = [];
            sheetData.push(['[' + label + ']']);
            sheetData.push(['']);

            if (stepResult.output) {
                var outputLines = stepResult.output.split('\n');
                outputLines.forEach(function(line) { sheetData.push([line]); });
            }

            if (stepResult.error) {
                sheetData.push(['']);
                sheetData.push(['[오류] ' + stepResult.error]);
            }

            if (stepResult.warnings) {
                sheetData.push(['']);
                sheetData.push(['[경고] ' + stepResult.warnings]);
            }

            var sheet = XLSX.utils.aoa_to_sheet(sheetData);
            sheet['!cols'] = [{ wch: 80 }];
            XLSX.utils.book_append_sheet(wb, sheet, sheetName);
        });

        // 정의되지 않은 step도 추가
        for (var key in results) {
            if (this.STEP_ORDER.indexOf(key) === -1 && key !== 'plot') {
                var r = results[key];
                if (r && r.output) {
                    sheetCount++;
                    var extraName = (sheetCount + '. ' + (r.label || key))
                        .replace(/[\\/:*?"<>|]/g, '')
                        .substring(0, 31);
                    var extraData = [[r.label || key], ['']];
                    r.output.split('\n').forEach(function(l) { extraData.push([l]); });
                    var extraSheet = XLSX.utils.aoa_to_sheet(extraData);
                    extraSheet['!cols'] = [{ wch: 80 }];
                    XLSX.utils.book_append_sheet(wb, extraSheet, extraName);
                }
            }
        }

        // 다운로드
        var dateStr = new Date().toISOString().split('T')[0];
        var fileName = safeName + '_결과_' + dateStr + '.xlsx';
        XLSX.writeFile(wb, fileName);
    },

    // ────────────── 유틸리티 ──────────────

    _orderSteps: function(results) {
        var ordered = [];
        var self = this;

        // 정의된 순서대로 (접미사 변형 포함: assume, assume_2, assume_3...)
        this.STEP_ORDER.forEach(function(id) {
            if (results[id]) ordered.push(id);
            // 접미사 변형 검색 (id_2, id_3, ...)
            for (var n = 2; n <= 5; n++) {
                var variant = id + '_' + n;
                if (results[variant]) ordered.push(variant);
            }
        });

        // 정의되지 않은 step도 추가 (step_N 등)
        for (var key in results) {
            if (ordered.indexOf(key) === -1) {
                ordered.push(key);
            }
        }

        return ordered;
    },

    _looksLikeTable: function(text) {
        var lines = text.trim().split('\n');
        if (lines.length < 2) return false;
        // 탭으로 구분된 행이 2개 이상인 경우에만 테이블로 처리
        // (공백 정렬 출력을 테이블로 변환하면 열 정렬이 깨지므로 탭만 감지)
        var tabCount = 0;
        for (var i = 0; i < Math.min(lines.length, 5); i++) {
            if (/\t/.test(lines[i])) tabCount++;
        }
        return tabCount >= 2;
    },

    _tryParseTable: function(text) {
        var lines = text.trim().split('\n').filter(function(l) { return l.trim(); });
        if (lines.length < 2) return null;

        try {
            var table = document.createElement('table');
            table.className = 'result-table';

            for (var i = 0; i < lines.length; i++) {
                var cells = lines[i].trim().split(/\t/);
                var row = document.createElement('tr');

                for (var j = 0; j < cells.length; j++) {
                    var cell = document.createElement(i === 0 ? 'th' : 'td');
                    cell.textContent = cells[j].trim();
                    row.appendChild(cell);
                }

                table.appendChild(row);
            }

            return table;
        } catch (e) {
            return null;
        }
    },

    _highlightStatValues: function(text) {
        var escaped = this._escapeHtml(text);

        // p-value 강조 (p < 0.05 이면 볼드)
        escaped = escaped.replace(
            /(p[\s\-]*(?:value)?[\s]*[=<>]\s*)([\d.e\-]+)/gi,
            function(match, prefix, value) {
                var pVal = parseFloat(value);
                var cls = (pVal < 0.05) ? 'p-value significant' : 'p-value';
                return '<span class="' + cls + '">' + prefix + value + '</span>';
            }
        );

        // 통계량 강조
        escaped = escaped.replace(
            /((?:t|F|chi-sq|W|U|Z|H)\s*[\(=][\d.,\s]+[\)]*\s*=?\s*[\d.e\-]+)/gi,
            '<span class="stat-value">$1</span>'
        );

        return escaped;
    },

    _escapeHtml: function(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
};
