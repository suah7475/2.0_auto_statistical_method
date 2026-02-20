// 메인 애플리케이션 오케스트레이션
window.AutoStat = window.AutoStat || {};

window.AutoStat.App = {
    currentStep: 0,
    answers: {},
    visibleQuestions: [],
    currentRecommendation: null,

    // [NEW] WebR 모드 관련
    webrMode: false,
    uploadedFile: null,
    uploadedHeaders: [],
    uploadedCSV: '',
    uploadedRowCount: 0,
    webrColumnTypes: {},
    webrVariableMapping: {},
    webrMultiIVSelections: [],
    webrExtraValues: {},

    // 진입 모드: 'flow' | 'browse'
    entryMode: null,

    // 목록 탐색용 카테고리 정의
    BROWSE_CATEGORIES: [
        { name: '그룹 비교 (모수)', tests: ['one_sample_t', 'independent_t', 'paired_t', 'one_way_anova', 'two_way_anova', 'repeated_anova', 'mixed_anova', 'ancova'] },
        { name: '그룹 비교 (비모수)', tests: ['mann_whitney', 'wilcoxon_signed_rank', 'kruskal_wallis', 'friedman'] },
        { name: '범주형 분석', tests: ['chi_square', 'fisher_exact', 'mcnemar'] },
        { name: '상관 분석', tests: ['pearson_correlation', 'spearman_correlation', 'point_biserial'] },
        { name: '회귀 분석', tests: ['simple_regression', 'multiple_regression', 'dummy_regression', 'logistic_regression', 'multinomial_logistic', 'ordinal_regression'] },
        { name: '일반선형모형 (GLM)', tests: ['glm_covariate', 'glm_anova'] }
    ],

    init: function() {
        this.visibleQuestions = this._computeVisibleQuestions();
        this._showModeSelection();
        this._setupEventListeners();
    },

    // ==================== 이벤트 리스너 ====================

    _setupEventListeners: function() {
        var self = this;

        // 초기 모드 선택 카드
        document.getElementById('entry-flow').addEventListener('click', function() {
            self._startFlowMode();
        });

        document.getElementById('entry-browse').addEventListener('click', function() {
            self._startBrowseMode();
        });

        // 목록 탐색 → 처음으로
        document.getElementById('btn-browse-back').addEventListener('click', function() {
            self._showModeSelection();
        });

        // 단계별 질문 → 처음으로
        document.getElementById('btn-flow-back').addEventListener('click', function() {
            self._showModeSelection();
        });

        document.getElementById('btn-back').addEventListener('click', function() {
            self._goBack();
        });

        document.getElementById('btn-restart').addEventListener('click', function() {
            self._restart();
        });

        document.getElementById('btn-restart-bottom').addEventListener('click', function() {
            self._showModeSelection();
        });

        document.getElementById('btn-search-papers').addEventListener('click', function() {
            self._searchPapers();
        });

        // [NEW] 모드 선택 카드
        document.getElementById('mode-webr').addEventListener('click', function() {
            self._selectMode('webr');
        });

        document.getElementById('mode-code').addEventListener('click', function() {
            self._selectMode('code');
        });

        // [NEW] 파일 업로드
        var fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files[0]) {
                    self._handleFileUpload(e.target.files[0]);
                }
            });
        }

        // [NEW] 드래그앤드롭
        var dropzone = document.getElementById('file-dropzone');
        if (dropzone) {
            dropzone.addEventListener('dragover', function(e) {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
            dropzone.addEventListener('dragleave', function() {
                dropzone.classList.remove('dragover');
            });
            dropzone.addEventListener('drop', function(e) {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    self._handleFileUpload(e.dataTransfer.files[0]);
                }
            });
        }

        // [NEW] WebR 실행 / 취소
        var btnRun = document.getElementById('btn-run-webr');
        if (btnRun) {
            btnRun.addEventListener('click', function() {
                self._runWebRAnalysis();
            });
        }

        var btnCancel = document.getElementById('btn-cancel-webr');
        if (btnCancel) {
            btnCancel.addEventListener('click', function() {
                self._cancelWebR();
            });
        }

        // [NEW] WebR 로딩 중 취소
        var btnCancelLoading = document.getElementById('btn-cancel-loading');
        if (btnCancelLoading) {
            btnCancelLoading.addEventListener('click', function() {
                self._fallbackToCodeMode();
            });
        }
    },

    // ==================== 질문 흐름 (기존 유지) ====================

    _computeVisibleQuestions: function() {
        var self = this;
        return window.AutoStat.QUESTIONS.filter(function(q) {
            if (!q.condition) return true;
            try {
                var fn = new Function(
                    'dv_type', 'dv_level', 'iv_count', 'iv_types',
                    'group_count', 'paired', 'normality', 'has_covariate',
                    'return (' + q.condition + ')'
                );
                return fn(
                    self.answers.dv_type,
                    self.answers.dv_level,
                    self.answers.iv_count,
                    self.answers.iv_types || [],
                    self.answers.group_count,
                    self.answers.paired,
                    self.answers.normality,
                    self.answers.has_covariate
                );
            } catch (e) {
                return false;
            }
        });
    },

    _renderQuestion: function() {
        if (this.currentStep >= this.visibleQuestions.length) {
            this._showResults();
            return;
        }

        var q = this.visibleQuestions[this.currentStep];
        var container = document.getElementById('question-container');

        // 진행률
        var progress = ((this.currentStep) / this.visibleQuestions.length) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';
        document.getElementById('progress-text').textContent =
            '단계 ' + (this.currentStep + 1) + ' / ' + this.visibleQuestions.length;

        // 질문 렌더링
        var html = '';
        html += '<div class="question-help">' + this._stripEmoji(q.help) + '</div>';
        html += '<h2 class="question-title">' + q.question + '</h2>';

        if (q.multiSelect) {
            html += '<div class="multi-select-hint">해당하는 것을 모두 선택하세요</div>';
        }

        html += '<div class="option-cards">';
        var currentAnswer = this.answers[q.id];

        for (var i = 0; i < q.options.length; i++) {
            var opt = q.options[i];
            var isSelected = false;

            if (q.multiSelect && Array.isArray(currentAnswer)) {
                isSelected = currentAnswer.indexOf(opt.value) !== -1;
            } else {
                isSelected = currentAnswer === opt.value;
            }

            html += '<div class="option-card' + (isSelected ? ' selected' : '') + '" ' +
                     'data-question="' + q.id + '" ' +
                     'data-value="' + this._encodeValue(opt.value) + '" ' +
                     'data-multi="' + (q.multiSelect ? 'true' : 'false') + '">';
            html += '<div class="option-label">' + this._stripEmoji(opt.label) + '</div>';
            html += '<div class="option-desc">' + opt.description + '</div>';
            html += '</div>';
        }
        html += '</div>';

        if (q.multiSelect) {
            html += '<button class="btn btn-primary btn-confirm" id="btn-confirm-multi">선택 완료</button>';
        }

        container.innerHTML = html;

        // 옵션 클릭 이벤트
        var self = this;
        var cards = container.querySelectorAll('.option-card');
        cards.forEach(function(card) {
            card.addEventListener('click', function() {
                var qId = this.getAttribute('data-question');
                var val = self._decodeValue(this.getAttribute('data-value'));
                var isMulti = this.getAttribute('data-multi') === 'true';

                if (isMulti) {
                    self._handleMultiSelect(qId, val, this);
                } else {
                    self._handleAnswer(qId, val);
                }
            });
        });

        // 멀티셀렉트 확인 버튼
        var confirmBtn = document.getElementById('btn-confirm-multi');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                var q = self.visibleQuestions[self.currentStep];
                if (self.answers[q.id] && self.answers[q.id].length > 0) {
                    self._advanceToNext();
                }
            });
        }

        // 네비게이션 버튼
        document.getElementById('btn-back').style.display =
            this.currentStep > 0 ? 'inline-block' : 'none';
        document.getElementById('btn-restart').style.display =
            this.currentStep > 0 ? 'inline-block' : 'none';

        // 결과 섹션 숨기기
        document.getElementById('result-section').style.display = 'none';
        document.getElementById('question-section').style.display = 'block';
    },

    _encodeValue: function(val) {
        if (typeof val === 'boolean') return val ? '__true__' : '__false__';
        if (typeof val === 'number') return '__num_' + val + '__';
        return String(val);
    },

    _decodeValue: function(str) {
        if (str === '__true__') return true;
        if (str === '__false__') return false;
        if (str.match(/^__num_(.+)__$/)) return Number(str.replace(/^__num_|__$/g, ''));
        return str;
    },

    _handleMultiSelect: function(questionId, value, cardElem) {
        if (!Array.isArray(this.answers[questionId])) {
            this.answers[questionId] = [];
        }

        var idx = this.answers[questionId].indexOf(value);
        if (idx !== -1) {
            this.answers[questionId].splice(idx, 1);
            cardElem.classList.remove('selected');
        } else {
            this.answers[questionId].push(value);
            cardElem.classList.add('selected');
        }
    },

    _handleAnswer: function(questionId, value) {
        this.answers[questionId] = value;
        this._advanceToNext();
    },

    _advanceToNext: function() {
        this.currentStep++;
        this.visibleQuestions = this._computeVisibleQuestions();

        var visibleIds = this.visibleQuestions.map(function(q) { return q.id; });
        for (var key in this.answers) {
            if (visibleIds.indexOf(key) === -1 && key !== this.visibleQuestions[this.currentStep - 1]?.id) {
                var qIdx = -1;
                for (var i = 0; i < window.AutoStat.QUESTIONS.length; i++) {
                    if (window.AutoStat.QUESTIONS[i].id === key) { qIdx = i; break; }
                }
                var curIdx = -1;
                for (var j = 0; j < window.AutoStat.QUESTIONS.length; j++) {
                    if (window.AutoStat.QUESTIONS[j].id === this.visibleQuestions[this.currentStep - 1]?.id) { curIdx = j; break; }
                }
                if (qIdx > curIdx) {
                    delete this.answers[key];
                }
            }
        }

        if (this.currentStep >= this.visibleQuestions.length) {
            this._showResults();
        } else {
            this._renderQuestion();
        }
    },

    _goBack: function() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.visibleQuestions = this._computeVisibleQuestions();
            var q = this.visibleQuestions[this.currentStep];
            if (q) delete this.answers[q.id];
            this._renderQuestion();
        }
    },

    _restart: function() {
        this.currentStep = 0;
        this.answers = {};
        this.currentRecommendation = null;
        this.webrMode = false;
        this.uploadedFile = null;
        this.uploadedHeaders = [];
        this.uploadedCSV = '';
        this.uploadedRowCount = 0;
        this.webrColumnTypes = {};
        this.webrVariableMapping = {};
        this.webrMultiIVSelections = [];
        this.webrExtraValues = {};
        this.visibleQuestions = this._computeVisibleQuestions();

        // WebR 관련 UI 초기화
        this._hideAllWebrSections();
        var fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
        document.getElementById('file-dropzone').style.display = 'block';
        document.getElementById('file-preview').style.display = 'none';
    },

    // ==================== 진입 모드 선택 ====================

    _showModeSelection: function() {
        this._restart();
        document.getElementById('entry-mode-section').style.display = 'block';
        document.getElementById('browse-section').style.display = 'none';
        document.getElementById('question-section').style.display = 'none';
        document.getElementById('result-section').style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    _startFlowMode: function() {
        this.entryMode = 'flow';
        document.getElementById('entry-mode-section').style.display = 'none';
        document.getElementById('browse-section').style.display = 'none';
        document.getElementById('result-section').style.display = 'none';
        document.getElementById('question-section').style.display = 'block';
        this._renderQuestion();
    },

    _startBrowseMode: function() {
        this.entryMode = 'browse';
        document.getElementById('entry-mode-section').style.display = 'none';
        document.getElementById('question-section').style.display = 'none';
        document.getElementById('result-section').style.display = 'none';
        document.getElementById('browse-section').style.display = 'block';
        this._renderBrowseList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    _renderBrowseList: function() {
        var self = this;
        var container = document.getElementById('browse-list');
        var html = '';

        this.BROWSE_CATEGORIES.forEach(function(cat) {
            html += '<div class="browse-category">';
            html += '<h3 class="browse-category-title">' + cat.name + '</h3>';
            html += '<div class="browse-test-grid">';

            cat.tests.forEach(function(testId) {
                var test = window.AutoStat.STAT_TESTS[testId];
                if (!test) return;
                html += '<div class="browse-test-card" data-testid="' + testId + '">';
                html += '<div class="browse-test-name">' + test.name + '</div>';
                html += '<div class="browse-test-name-en">' + test.name_en + '</div>';
                html += '<div class="browse-test-desc">' + test.simple_description + '</div>';
                html += '</div>';
            });

            html += '</div></div>';
        });

        container.innerHTML = html;

        // 클릭 이벤트
        container.querySelectorAll('.browse-test-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var testId = this.getAttribute('data-testid');
                self._showResultForTest(testId);
            });
        });
    },

    _showResultForTest: function(testId) {
        var test = window.AutoStat.STAT_TESTS[testId];
        if (!test) return;

        this.currentRecommendation = { primary: test, alternatives: [], decision_path: [] };

        document.getElementById('browse-section').style.display = 'none';
        document.getElementById('entry-mode-section').style.display = 'none';
        document.getElementById('question-section').style.display = 'none';
        document.getElementById('result-section').style.display = 'block';

        // 의사결정 경로 숨김 (목록 선택 시 불필요)
        document.getElementById('decision-path-container').style.display = 'none';

        // 결과 렌더링
        document.getElementById('result-title').textContent = test.name;
        document.getElementById('result-name-en').textContent = test.name_en;
        document.getElementById('result-simple-desc').textContent = test.simple_description;

        document.getElementById('result-analogy-title').textContent = '비유';
        document.getElementById('result-analogy').textContent = this._stripPrefix(test.analogy);

        document.getElementById('result-rehab-title').textContent = '재활 예시';
        document.getElementById('result-rehab').textContent = this._stripPrefix(test.rehab_example);

        document.getElementById('result-description').textContent = test.description;

        var assumptionsList = document.getElementById('assumptions-list');
        assumptionsList.innerHTML = '';
        if (test.assumptions) {
            test.assumptions.forEach(function(a) {
                var li = document.createElement('li');
                li.textContent = a;
                assumptionsList.appendChild(li);
            });
        }

        document.getElementById('when-to-use-text').textContent = test.when_to_use;

        // 대안 숨김
        document.getElementById('alternatives-container').style.display = 'none';

        // 분석 모드 선택 표시
        document.getElementById('analysis-mode-section').style.display = 'block';
        document.getElementById('r-code-customizer').style.display = 'none';
        this._hideAllWebrSections();

        // PubMed
        this._populateTherapyFields();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // ==================== 결과 표시 (기존 유지) ====================

    _showResults: function() {
        document.getElementById('question-section').style.display = 'none';
        document.getElementById('result-section').style.display = 'block';

        document.getElementById('progress-fill').style.width = '100%';

        var result = window.AutoStat.StatRecommender.recommend(this.answers);
        this.currentRecommendation = result.recommendation;

        var primary = result.recommendation.primary;
        if (!primary) return;

        document.getElementById('result-title').textContent = primary.name;
        document.getElementById('result-name-en').textContent = primary.name_en;
        document.getElementById('result-simple-desc').textContent = primary.simple_description;

        document.getElementById('result-analogy-title').textContent = '비유';
        document.getElementById('result-analogy').textContent = this._stripPrefix(primary.analogy);

        document.getElementById('result-rehab-title').textContent = '재활 예시';
        document.getElementById('result-rehab').textContent = this._stripPrefix(primary.rehab_example);

        document.getElementById('result-description').textContent = primary.description;

        var assumptionsList = document.getElementById('assumptions-list');
        assumptionsList.innerHTML = '';
        if (primary.assumptions) {
            primary.assumptions.forEach(function(a) {
                var li = document.createElement('li');
                li.textContent = a;
                assumptionsList.appendChild(li);
            });
        }

        document.getElementById('when-to-use-text').textContent = primary.when_to_use;

        // 의사결정 경로 다시 표시 (단계별 흐름에서 왔을 때)
        document.getElementById('decision-path-container').style.display = 'block';
        this._renderDecisionPath(result.recommendation.decision_path);
        this._renderAlternatives(result.recommendation.alternatives);

        // [NEW] 모드 선택 표시, 기존 커스터마이저 숨김
        document.getElementById('analysis-mode-section').style.display = 'block';
        document.getElementById('r-code-customizer').style.display = 'none';
        this._hideAllWebrSections();

        // PubMed 분야 드롭다운
        this._populateTherapyFields();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    _renderDecisionPath: function(path) {
        var container = document.getElementById('decision-path');
        container.innerHTML = '';

        if (!path || path.length === 0) return;

        var self = this;
        path.forEach(function(step) {
            var div = document.createElement('div');
            div.className = 'path-step';
            div.textContent = self._stripEmoji(step);
            container.appendChild(div);
        });
    },

    _renderAlternatives: function(alternatives) {
        var container = document.getElementById('alternatives-container');
        var list = document.getElementById('alternatives-list');
        list.innerHTML = '';

        if (!alternatives || alternatives.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        var self = this;

        alternatives.forEach(function(alt) {
            var card = document.createElement('div');
            card.className = 'alt-card';
            card.innerHTML =
                '<div class="alt-name">' + alt.name + '</div>' +
                '<div class="alt-reason">' + self._stripEmoji(alt.reason || '') + '</div>' +
                '<div class="alt-desc">' + alt.simple_description + '</div>';

            card.addEventListener('click', function() {
                self._switchToTest(alt.id);
            });

            list.appendChild(card);
        });
    },

    _switchToTest: function(testId) {
        var newTest = window.AutoStat.StatRecommender.getTestById(testId);
        if (!newTest) return;

        var oldPrimary = this.currentRecommendation.primary;
        var oldAlts = this.currentRecommendation.alternatives || [];

        var newAlts = [];
        if (oldPrimary && oldPrimary.id !== testId) {
            newAlts.push(oldPrimary);
        }
        oldAlts.forEach(function(alt) {
            if (alt.id !== testId) {
                newAlts.push(alt);
            }
        });

        this.currentRecommendation.primary = newTest;
        this.currentRecommendation.alternatives = newAlts;

        document.getElementById('result-title').textContent = newTest.name;
        document.getElementById('result-name-en').textContent = newTest.name_en;
        document.getElementById('result-simple-desc').textContent = newTest.simple_description;
        document.getElementById('result-analogy-title').textContent = '비유';
        document.getElementById('result-analogy').textContent = this._stripPrefix(newTest.analogy);
        document.getElementById('result-rehab-title').textContent = '재활 예시';
        document.getElementById('result-rehab').textContent = this._stripPrefix(newTest.rehab_example);
        document.getElementById('result-description').textContent = newTest.description;

        var assumptionsList = document.getElementById('assumptions-list');
        assumptionsList.innerHTML = '';
        if (newTest.assumptions) {
            newTest.assumptions.forEach(function(a) {
                var li = document.createElement('li');
                li.textContent = a;
                assumptionsList.appendChild(li);
            });
        }
        document.getElementById('when-to-use-text').textContent = newTest.when_to_use;

        this._renderAlternatives(newAlts);

        // 목록 진입 시 의사결정 경로 숨김 유지
        if (this.entryMode === 'browse') {
            document.getElementById('decision-path-container').style.display = 'none';
        }

        // 모드 선택 다시 표시
        document.getElementById('analysis-mode-section').style.display = 'block';
        document.getElementById('r-code-customizer').style.display = 'none';
        this._hideAllWebrSections();

        window.scrollTo({ top: document.getElementById('primary-result').offsetTop - 20, behavior: 'smooth' });
    },

    // ==================== [NEW] 모드 선택 ====================

    _selectMode: function(mode) {
        // 카드 선택 표시
        document.querySelectorAll('.mode-card').forEach(function(c) { c.classList.remove('selected'); });

        if (mode === 'webr') {
            this.webrMode = true;
            document.getElementById('mode-webr').classList.add('selected');
            document.getElementById('r-code-customizer').style.display = 'none';
            document.getElementById('file-upload-section').style.display = 'block';
        } else {
            this.webrMode = false;
            document.getElementById('mode-code').classList.add('selected');
            document.getElementById('file-upload-section').style.display = 'none';
            document.getElementById('r-code-customizer').style.display = 'block';

            // 기존 커스터마이저 초기화
            var primary = this.currentRecommendation && this.currentRecommendation.primary;
            if (primary && window.AutoStat.RCodeCustomizer) {
                window.AutoStat.RCodeCustomizer.initForTest(primary.id);
            }
        }

        // 스크롤
        var target = mode === 'webr' ? 'file-upload-section' : 'r-code-customizer';
        var el = document.getElementById(target);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    // ==================== [NEW] 파일 업로드 ====================

    _handleFileUpload: function(file) {
        var self = this;

        // 파일 크기 체크 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this._showToast('파일 크기는 10MB 이하만 지원합니다.', 'error');
            return;
        }

        // 파일 확장자 체크
        var ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'xlsx' && ext !== 'csv') {
            this._showToast('Excel (.xlsx) 또는 CSV (.csv) 파일만 지원합니다.', 'error');
            return;
        }

        this.uploadedFile = file;

        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = new Uint8Array(e.target.result);
                var workbook = XLSX.read(data, { type: 'array' });
                var firstSheet = workbook.Sheets[workbook.SheetNames[0]];

                // JSON 배열로 변환
                var jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                if (jsonData.length < 2) {
                    self._showToast('데이터가 비어있거나 헤더만 있습니다.', 'error');
                    return;
                }

                var headers = jsonData[0].map(function(h) { return String(h).trim(); });
                var rows = jsonData.slice(1);

                // CSV 문자열 변환 (WebR VFS용)
                var csvString = XLSX.utils.sheet_to_csv(firstSheet);

                self.uploadedHeaders = headers;
                self.uploadedCSV = csvString;
                self.uploadedRowCount = rows.length;

                // 미리보기 표시
                self._showDataPreview(headers, rows.slice(0, 5), file.name);

                // 컬럼 타입 자동 감지
                self.webrColumnTypes = window.AutoStat.TypeDetector.detectMultiple(headers);

                // 변수 매핑 UI 표시
                self._showWebrVariableMapping();

            } catch (err) {
                self._showToast('파일을 읽을 수 없습니다: ' + err.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    },

    _showDataPreview: function(headers, sampleRows, fileName) {
        // 파일 정보
        document.getElementById('uploaded-file-name').textContent = fileName;
        document.getElementById('uploaded-file-info').textContent =
            this.uploadedRowCount + '행 x ' + headers.length + '열';

        // 미리보기 테이블
        var table = document.getElementById('file-preview-table');
        var html = '<thead><tr>';
        headers.forEach(function(h) {
            html += '<th>' + h + '</th>';
        });
        html += '</tr></thead><tbody>';

        sampleRows.forEach(function(row) {
            html += '<tr>';
            for (var i = 0; i < headers.length; i++) {
                html += '<td>' + (row[i] !== undefined ? row[i] : '') + '</td>';
            }
            html += '</tr>';
        });
        if (this.uploadedRowCount > 5) {
            html += '<tr><td colspan="' + headers.length + '" style="text-align:center;color:#999;">... 외 ' +
                    (this.uploadedRowCount - 5) + '행</td></tr>';
        }
        html += '</tbody>';
        table.innerHTML = html;

        // 드롭존 숨기고 미리보기 표시
        document.getElementById('file-dropzone').style.display = 'none';
        document.getElementById('file-preview').style.display = 'block';
    },

    _showWebrVariableMapping: function() {
        var primary = this.currentRecommendation && this.currentRecommendation.primary;
        if (!primary) return;

        var testId = primary.id;
        var requirements = window.AutoStat.TEST_VARIABLE_REQUIREMENTS[testId];
        if (!requirements) return;

        var mappingDiv = document.getElementById('webr-variable-mapping');
        var html = '<h4>분석 변수 매핑</h4>';
        html += '<p class="help-text">통계 분석에 필요한 변수를 선택하세요</p>';

        var headers = this.uploadedHeaders;

        // 필수 변수
        if (requirements.variables) {
            requirements.variables.forEach(function(v) {
                html += '<div class="mapping-group">';
                html += '<label class="mapping-label">' + v.label + ' *</label>';
                if (v.help) html += '<span class="mapping-help">' + v.help + '</span>';
                html += '<select class="mapping-select" data-role="' + v.role + '">';
                html += '<option value="">-- 선택 --</option>';
                headers.forEach(function(h) {
                    html += '<option value="' + h + '">' + h + '</option>';
                });
                html += '</select></div>';
            });
        }

        // 다중 IV (체크박스)
        if (requirements.multiIV) {
            html += '<div class="mapping-group">';
            html += '<label class="mapping-label">' + (requirements.multiIVLabel || '독립변수') + '</label>';
            if (requirements.multiIVHelp) html += '<span class="mapping-help">' + requirements.multiIVHelp + '</span>';
            html += '<div class="mapping-checkboxes" id="webr-multi-iv">';
            headers.forEach(function(h) {
                html += '<div class="checkbox-item"><input type="checkbox" value="' + h + '" id="webr-iv-' + h + '">';
                html += '<label for="webr-iv-' + h + '">' + h + '</label></div>';
            });
            html += '</div></div>';
        }

        // 선택적 변수
        if (requirements.optionalVariables) {
            html += '<div class="mapping-optional-header">선택 사항</div>';
            requirements.optionalVariables.forEach(function(v) {
                html += '<div class="mapping-group mapping-optional">';
                html += '<label class="mapping-label">' + v.label + '</label>';
                if (v.help) html += '<span class="mapping-help">' + v.help + '</span>';
                html += '<select class="mapping-select" data-role="' + v.role + '">';
                html += '<option value="">-- 선택 안 함 --</option>';
                headers.forEach(function(h) {
                    html += '<option value="' + h + '">' + h + '</option>';
                });
                html += '</select></div>';
            });
        }

        // 추가 옵션 (extras)
        if (requirements.extras) {
            requirements.extras.forEach(function(ext) {
                html += '<div class="mapping-group mapping-optional">';
                html += '<label class="mapping-label">' + ext.label + '</label>';
                if (ext.help) html += '<span class="mapping-help">' + ext.help + '</span>';

                if (ext.inputType === 'select' && ext.options) {
                    html += '<select class="mapping-select" data-extra="' + ext.role + '">';
                    ext.options.forEach(function(opt) {
                        var sel = (opt === ext.defaultValue) ? ' selected' : '';
                        html += '<option value="' + opt + '"' + sel + '>' + opt + '</option>';
                    });
                    html += '</select>';
                } else if (ext.inputType === 'number') {
                    html += '<input type="number" class="mapping-input" data-extra="' + ext.role + '" ' +
                            'value="' + (ext.defaultValue || '') + '">';
                } else {
                    html += '<input type="text" class="mapping-input" data-extra="' + ext.role + '" ' +
                            'value="' + (ext.defaultValue || '') + '" placeholder="' + (ext.help || '') + '">';
                }

                html += '</div>';
            });
        }

        mappingDiv.innerHTML = html;
        mappingDiv.style.display = 'block';
        document.getElementById('file-action-buttons').style.display = 'flex';
    },

    // ==================== [NEW] WebR 분석 실행 ====================

    _runWebRAnalysis: async function() {
        var self = this;
        var primary = this.currentRecommendation && this.currentRecommendation.primary;
        if (!primary) return;

        // 변수 매핑 수집
        var vars = {};
        document.querySelectorAll('#webr-variable-mapping .mapping-select[data-role]').forEach(function(sel) {
            if (sel.value) vars[sel.getAttribute('data-role')] = sel.value;
        });

        // 다중 IV 수집
        var multiIVList = [];
        document.querySelectorAll('#webr-multi-iv input[type="checkbox"]:checked').forEach(function(cb) {
            multiIVList.push(cb.value);
        });

        // extras 수집
        var extras = {};
        document.querySelectorAll('#webr-variable-mapping [data-extra]').forEach(function(el) {
            extras[el.getAttribute('data-extra')] = el.value;
        });

        // 필수 변수 검증
        var requirements = window.AutoStat.TEST_VARIABLE_REQUIREMENTS[primary.id];
        if (requirements && requirements.variables) {
            for (var i = 0; i < requirements.variables.length; i++) {
                var v = requirements.variables[i];
                if (v.required && !vars[v.role]) {
                    this._showToast(v.label + '을(를) 선택해주세요.', 'error');
                    return;
                }
            }
        }

        if (requirements && requirements.multiIV && multiIVList.length === 0) {
            this._showToast('독립변수를 하나 이상 선택해주세요.', 'error');
            return;
        }

        // UI: 로딩 표시
        document.getElementById('file-upload-section').style.display = 'none';
        document.getElementById('analysis-mode-section').style.display = 'none';
        document.getElementById('webr-loading-section').style.display = 'block';
        // 진행률 초기화
        this._updateWebRProgress(0, '초기화 중...');

        var Runner = window.AutoStat.WebRRunner;
        var Adaptor = window.AutoStat.WebRAdaptor;
        var Renderer = window.AutoStat.ResultRenderer;

        // 진행률 콜백
        Runner.onProgress = function(stage, pct, msg) {
            self._updateWebRProgress(pct, msg);
        };

        var lastRunnerError = '';
        Runner.onError = function(msg) {
            lastRunnerError = msg;
            self._showToast(msg, 'error');
        };

        // 결과 저장용 변수 (에러 시에도 부분 결과 표시)
        var rawCode = '';
        var results = null;
        var plotImages = null;
        var errorMessages = [];

        try {
            // 1. WebR 초기화
            var initOk = await Runner.init();
            if (!initOk) {
                // 실제 에러 메시지를 표시
                var detail = lastRunnerError || '알 수 없는 오류';
                this._showResultViewerWithError(
                    'R 엔진 초기화에 실패했습니다.',
                    '오류: ' + detail + '\n\n' +
                    '네트워크 연결을 확인하고 다시 시도해주세요.\n' +
                    '문제가 계속되면 "R 코드 생성" 모드를 사용해주세요.',
                    primary.name
                );
                return;
            }

            // 2. 필요 패키지 설치
            var requiredPkgs = Adaptor.getRequiredPackages(primary.id);
            await Runner.ensurePackages(requiredPkgs);

            // 3. 데이터 파일을 VFS에 쓰기
            this._updateWebRProgress(50, '데이터 업로드 중...');
            await Runner.writeFileToVFS('data.csv', this.uploadedCSV);

            // 4. R 코드 생성 (파라미터 이름 정확히 맞춤)
            this._updateWebRProgress(55, 'R 코드 준비 중...');
            var params = {
                filePath: Adaptor.VFS_DATA_PATH,
                fileFormat: 'csv',
                vars: vars,
                extras: extras,
                multiIV: multiIVList,
                columnTypes: this.webrColumnTypes
            };

            var adapted;
            try {
                adapted = Adaptor.adapt(primary.id, params);
                rawCode = adapted.rawCode || '';
            } catch (adaptErr) {
                errorMessages.push('R 코드 생성 오류: ' + adaptErr.message);
                this._showResultViewerWithError(
                    'R 코드 생성 중 오류가 발생했습니다.',
                    adaptErr.message + '\n\n변수 매핑을 확인하거나, "R 코드 생성" 모드를 사용해주세요.',
                    primary.name
                );
                return;
            }

            if (!adapted || !adapted.steps || adapted.steps.length === 0) {
                this._showResultViewerWithError(
                    '이 분석에 대한 R 코드를 생성할 수 없습니다.',
                    '지원되지 않는 분석 유형이거나, 변수 매핑이 올바르지 않습니다.\n"R 코드 생성" 모드를 사용해주세요.',
                    primary.name
                );
                return;
            }

            // 5. 시각화 분리
            var separated = Adaptor.extractPlotCode(adapted.steps);

            // 6. 단계별 R 코드 실행 (패키지 목록 전달 → executeSteps가 JS API로 설치+로드 보장)
            this._updateWebRProgress(60, '분석 실행 중...');
            results = await Runner.executeSteps(separated.otherSteps, adapted.packages);

            // 7. 시각화 실행 (별도)
            if (separated.plotStep) {
                this._updateWebRProgress(90, '시각화 생성 중...');
                try {
                    plotImages = await Runner.captureGraphics(separated.plotStep.code);
                    if (results) {
                        results.plot = { label: '시각화', output: '', error: null };
                    }
                } catch (plotErr) {
                    errorMessages.push('시각화 생성 실패: ' + plotErr.message);
                    if (results) {
                        results.plot = { label: '시각화', output: '', error: '시각화 생성 실패 - R 코드 다운로드 후 로컬에서 실행하세요.' };
                    }
                }
            }

        } catch (e) {
            console.error('WebR 분석 오류:', e);
            errorMessages.push(e.message);
        }

        // === 결과 뷰어 항상 표시 (부분 결과라도 보여줌) ===
        this._showResultViewer(results, plotImages, rawCode, primary.name, errorMessages);
    },

    // 결과 뷰어 표시 (성공/부분실패 모두)
    _showResultViewer: function(results, plotImages, rawCode, testName, errorMessages) {
        document.getElementById('webr-loading-section').style.display = 'none';
        document.getElementById('webr-result-section').style.display = 'block';

        var container = document.getElementById('webr-results');
        var Renderer = window.AutoStat.ResultRenderer;

        // 에러 메시지가 있으면 상단에 표시
        container.innerHTML = '';
        if (errorMessages && errorMessages.length > 0) {
            var errDiv = document.createElement('div');
            errDiv.className = 'result-error';
            errDiv.innerHTML =
                '<strong>일부 분석에서 오류가 발생했습니다</strong>' +
                '<p>' + errorMessages.map(function(m) {
                    return Renderer._escapeHtml(m);
                }).join('<br>') + '</p>';
            container.appendChild(errDiv);
        }

        // 결과가 있으면 렌더링
        if (results && typeof results === 'object' && Object.keys(results).length > 0) {
            var resultDiv = document.createElement('div');
            Renderer.render(resultDiv, results, plotImages);
            // render가 만든 내용을 container로 이동
            while (resultDiv.firstChild) {
                container.appendChild(resultDiv.firstChild);
            }
        } else if (!errorMessages || errorMessages.length === 0) {
            container.appendChild(Renderer.renderError('분석 결과가 없습니다.'));
        }

        // 액션 버튼 (항상 표시)
        this._createResultActionButtons(container, results, rawCode, testName);

        // 결과 섹션으로 스크롤
        document.getElementById('webr-result-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // 에러 전용 결과 뷰어 표시
    _showResultViewerWithError: function(title, detail, testName) {
        document.getElementById('webr-loading-section').style.display = 'none';
        document.getElementById('webr-result-section').style.display = 'block';

        var container = document.getElementById('webr-results');
        var Renderer = window.AutoStat.ResultRenderer;

        container.innerHTML = '';

        var errDiv = document.createElement('div');
        errDiv.className = 'result-error';
        errDiv.innerHTML =
            '<strong>' + Renderer._escapeHtml(title) + '</strong>' +
            '<p>' + Renderer._escapeHtml(detail).replace(/\n/g, '<br>') + '</p>';
        container.appendChild(errDiv);

        // 액션 버튼
        this._createResultActionButtons(container, null, '', testName);

        document.getElementById('webr-result-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // 결과 뷰어 액션 버튼 생성 + 이벤트 바인딩
    _createResultActionButtons: function(container, results, rawCode, testName) {
        var self = this;

        // 기존 액션 버튼 제거 (중복 방지)
        var existingActions = container.querySelector('.result-actions');
        if (existingActions) existingActions.remove();

        var actions = document.createElement('div');
        actions.className = 'result-actions';

        // Excel 다운로드 (결과가 있을 때만)
        if (results && Object.keys(results).length > 0) {
            var btnExcel = document.createElement('button');
            btnExcel.className = 'btn btn-primary';
            btnExcel.textContent = 'Excel로 결과 저장';
            btnExcel.addEventListener('click', function() {
                window.AutoStat.ResultRenderer.createExcelDownload(results, testName);
            });
            actions.appendChild(btnExcel);
        }

        // R 코드 보기 (코드가 있을 때만)
        if (rawCode) {
            var btnCode = document.createElement('button');
            btnCode.className = 'btn btn-secondary';
            btnCode.textContent = 'R 코드 보기';
            btnCode.addEventListener('click', function() {
                self._showRawCodeModal(rawCode);
            });
            actions.appendChild(btnCode);
        }

        // 코드 생성 모드로 전환
        var btnSwitch = document.createElement('button');
        btnSwitch.className = 'btn btn-secondary';
        btnSwitch.textContent = 'R 코드 생성 모드';
        btnSwitch.addEventListener('click', function() {
            document.getElementById('webr-result-section').style.display = 'none';
            self._fallbackToCodeMode();
        });
        actions.appendChild(btnSwitch);

        // 다시 분석 (파일 업로드부터 — 완전 초기화)
        var btnRerun = document.createElement('button');
        btnRerun.className = 'btn btn-outline';
        btnRerun.textContent = '다시 분석';
        btnRerun.addEventListener('click', function() {
            document.getElementById('webr-result-section').style.display = 'none';
            document.getElementById('analysis-mode-section').style.display = 'block';
            document.getElementById('file-upload-section').style.display = 'block';

            // 파일 업로드 상태 완전 초기화
            self.uploadedFile = null;
            self.uploadedHeaders = [];
            self.uploadedCSV = '';
            self.uploadedRowCount = 0;
            self.webrColumnTypes = {};
            self.webrVariableMapping = {};
            self.webrMultiIVSelections = [];
            self.webrExtraValues = {};

            // file input 값 리셋 (같은 파일 재선택 시 change 이벤트 발생하도록)
            var fileInput = document.getElementById('file-input');
            if (fileInput) fileInput.value = '';

            // 드롭존 표시, 미리보기 숨기기
            document.getElementById('file-dropzone').style.display = 'block';
            document.getElementById('file-preview').style.display = 'none';

            // 동적 생성된 변수 매핑/타입 UI 숨기기
            var colTypes = document.getElementById('webr-column-types');
            if (colTypes) colTypes.style.display = 'none';
            var varMapping = document.getElementById('webr-variable-mapping');
            if (varMapping) varMapping.style.display = 'none';
            var actionBtns = document.getElementById('file-action-buttons');
            if (actionBtns) actionBtns.style.display = 'none';
        });
        actions.appendChild(btnRerun);

        container.appendChild(actions);
    },

    _showRawCodeModal: function(rawCode) {
        // 코드 보기 (결과 섹션 하단에 표시)
        var resultSection = document.getElementById('webr-result-section');
        var existing = document.getElementById('raw-code-view');
        if (existing) existing.remove();

        var div = document.createElement('div');
        div.id = 'raw-code-view';
        div.className = 'customizer-result';
        div.style.marginTop = '1.5rem';
        div.innerHTML =
            '<h4>생성된 R 코드</h4>' +
            '<p class="help-text">이 코드를 R/RStudio에 복사하여 실행할 수도 있습니다</p>' +
            '<div class="code-preview-wrapper"><div class="code-preview"><pre><code>' +
            rawCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
            '</code></pre></div></div>' +
            '<div class="code-actions">' +
            '<button class="btn btn-primary" id="btn-copy-raw-code">코드 복사</button>' +
            '<button class="btn btn-secondary" id="btn-download-r-file">R 파일 다운로드</button>' +
            '</div>';
        resultSection.appendChild(div);

        var self = this;
        document.getElementById('btn-copy-raw-code').addEventListener('click', function() {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(rawCode).then(function() {
                    self._showToast('클립보드에 복사되었습니다!', 'success');
                });
            }
        });

        document.getElementById('btn-download-r-file').addEventListener('click', function() {
            var blob = new Blob([rawCode], { type: 'text/plain' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'analysis_code.R';
            a.click();
            URL.revokeObjectURL(url);
        });

        div.scrollIntoView({ behavior: 'smooth' });
    },

    // ==================== [NEW] UI 헬퍼 ====================

    _updateWebRProgress: function(percent, message) {
        var fill = document.getElementById('webr-progress-fill');
        var text = document.getElementById('webr-progress-text');
        if (fill) fill.style.width = percent + '%';
        if (text) text.textContent = message;
    },

    _fallbackToCodeMode: function() {
        // 모든 WebR 관련 섹션 숨기기
        document.getElementById('webr-loading-section').style.display = 'none';
        document.getElementById('webr-result-section').style.display = 'none';
        document.getElementById('file-upload-section').style.display = 'none';

        // 모드 선택 다시 표시
        document.getElementById('analysis-mode-section').style.display = 'block';
        this._selectMode('code');
        this._showToast('코드 생성 모드로 전환되었습니다.', 'info');
    },

    _cancelWebR: function() {
        document.getElementById('file-upload-section').style.display = 'none';
        document.getElementById('analysis-mode-section').style.display = 'block';
        document.querySelectorAll('.mode-card').forEach(function(c) { c.classList.remove('selected'); });

        // 파일 업로드 완전 초기화
        document.getElementById('file-dropzone').style.display = 'block';
        document.getElementById('file-preview').style.display = 'none';
        var fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
        this.uploadedFile = null;
        this.uploadedHeaders = [];
        this.uploadedCSV = '';
        this.uploadedRowCount = 0;
        this.webrColumnTypes = {};
        this.webrVariableMapping = {};
        this.webrMultiIVSelections = [];
        this.webrExtraValues = {};
    },

    _hideAllWebrSections: function() {
        document.getElementById('file-upload-section').style.display = 'none';
        document.getElementById('webr-loading-section').style.display = 'none';
        document.getElementById('webr-result-section').style.display = 'none';
    },

    // ==================== PubMed (기존 유지) ====================

    _populateTherapyFields: function() {
        var select = document.getElementById('therapy-field-select');
        select.innerHTML = '';

        var fields = window.AutoStat.PubMedSearcher.getTherapyFields();
        fields.forEach(function(f) {
            var option = document.createElement('option');
            option.value = f.id;
            option.textContent = f.name;
            select.appendChild(option);
        });
    },

    _searchPapers: async function() {
        if (!this.currentRecommendation || !this.currentRecommendation.primary) return;

        var testId = this.currentRecommendation.primary.id;
        var field = document.getElementById('therapy-field-select').value;
        var sciFilter = document.getElementById('sci-filter-checkbox').checked;

        document.getElementById('papers-loading').style.display = 'block';
        document.getElementById('papers-list').innerHTML = '';

        try {
            var result = await window.AutoStat.PubMedSearcher.search(testId, field, 10, sciFilter);
            this._renderPapers(result);
        } catch (e) {
            var fallback = window.AutoStat.PubMedSearcher.getFallback(testId, field);
            this._renderPapers(fallback);
        } finally {
            document.getElementById('papers-loading').style.display = 'none';
        }
    },

    _renderPapers: function(result) {
        var container = document.getElementById('papers-list');
        container.innerHTML = '';

        if (result.sci_filtered) {
            var filterNote = document.createElement('div');
            filterNote.className = 'sci-filter-note';
            filterNote.textContent = 'SCI-E급 저널 필터 적용됨';
            container.appendChild(filterNote);
        }

        if (!result.papers || result.papers.length === 0) {
            var msg = result.message || '검색 결과가 없습니다.';
            var html = '<div class="no-papers">';
            html += '<p>' + msg + '</p>';
            if (result.sci_filtered) {
                html += '<p>SCI-E 필터를 해제하면 더 많은 결과를 볼 수 있습니다.</p>';
            }
            if (result.search_url) {
                html += '<p><a href="' + result.search_url + '" target="_blank">PubMed에서 직접 검색하기</a></p>';
            }
            html += '</div>';
            container.innerHTML += html;
            return;
        }

        result.papers.forEach(function(paper) {
            var card = document.createElement('div');
            card.className = 'paper-card';

            var abstractHtml = paper.abstract ?
                '<div class="paper-abstract">' + paper.abstract + '</div>' : '';

            var sciBadge = '';
            if (paper.is_sci || window.AutoStat.PubMedSearcher.isSciJournal(paper.journal)) {
                sciBadge = '<span class="sci-badge">SCI-E</span> ';
            }

            card.innerHTML =
                '<div class="paper-title">' +
                    '<a href="' + paper.pubmed_url + '" target="_blank">' + paper.title + '</a>' +
                '</div>' +
                '<div class="paper-meta">' +
                    paper.authors_display + ' | ' +
                    sciBadge + paper.journal + ' (' + paper.year + ')' +
                '</div>' +
                abstractHtml;

            card.addEventListener('click', function(e) {
                if (e.target.tagName !== 'A') {
                    this.classList.toggle('expanded');
                }
            });

            container.appendChild(card);
        });
    },

    // ==================== 유틸리티 (기존 유지) ====================

    _showToast: function(message, type) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'toast toast-' + (type || 'info');
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 3000);
    },

    _stripEmoji: function(text) {
        if (!text) return '';
        return text.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]+\s*/gu, '');
    },

    _stripPrefix: function(text) {
        if (!text) return '';
        return this._stripEmoji(text)
            .replace(/^비유:\s*/, '')
            .replace(/^재활 예시:\s*/, '');
    }
};

// DOM 준비 후 초기화
document.addEventListener('DOMContentLoaded', function() {
    window.AutoStat.App.init();
});
