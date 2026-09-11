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
    uploadedRows: [],
    uploadedCSV: '',
    uploadedRowCount: 0,
    fileReadId: 0,
    webrColumnTypes: {},
    webrVariableMapping: {},
    webrMultiIVSelections: [],
    webrExtraValues: {},
    webrCancelled: false,  // WebR 분석 진행 중 취소 플래그
    webrRunId: 0,
    lastWebRProgress: 0,
    paperSearchId: 0,

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
        this._showModeSelection(false);
        this._setupEventListeners();
    },

    // ==================== 이벤트 리스너 ====================

    _setupEventListeners: function() {
        var self = this;

        // 초기 모드 선택 카드
        this._bindActivate(document.getElementById('entry-flow'), function() {
            self._startFlowMode();
        });

        this._bindActivate(document.getElementById('entry-browse'), function() {
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
            self._showModeSelection();
        });

        document.getElementById('btn-restart-bottom').addEventListener('click', function() {
            self._showModeSelection();
        });

        document.getElementById('btn-search-papers').addEventListener('click', function() {
            self._searchPapers();
        });

        // [NEW] 모드 선택 카드
        this._bindActivate(document.getElementById('mode-webr'), function() {
            self._selectMode('webr');
        });

        this._bindActivate(document.getElementById('mode-code'), function() {
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
                self._cancelActiveWebRRun();
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
                return q.condition(self.answers);
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
        var progress = ((this.currentStep + 1) / this.visibleQuestions.length) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';
        document.getElementById('progress-bar').setAttribute('aria-valuenow', String(Math.round(progress)));
        document.getElementById('progress-text').textContent =
            '단계 ' + (this.currentStep + 1) + ' / ' + this.visibleQuestions.length;

        // 질문 렌더링
        var html = '';
        html += '<div class="question-help">' + this._escapeHtml(this._stripEmoji(q.help)) + '</div>';
        html += '<h2 class="question-title" tabindex="-1">' + this._escapeHtml(q.question) + '</h2>';

        var allowMulti = q.multiSelect && !(q.id === 'iv_types' && Number(this.answers.iv_count) === 1);
        if (allowMulti) {
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

            html += '<button type="button" class="option-card' + (isSelected ? ' selected' : '') + '" ' +
                     'aria-pressed="' + (isSelected ? 'true' : 'false') + '" ' +
                     'data-question="' + q.id + '" ' +
                     'data-value="' + this._encodeValue(opt.value) + '" ' +
                     'data-answer-array="' + (q.id === 'iv_types' ? 'true' : 'false') + '" ' +
                     'data-multi="' + (allowMulti ? 'true' : 'false') + '">';
            html += '<span class="option-label">' + this._escapeHtml(this._stripEmoji(opt.label)) + '</span>';
            html += '<span class="option-desc">' + this._escapeHtml(opt.description) + '</span>';
            html += '</button>';
        }
        html += '</div>';

        if (allowMulti) {
            var hasSelection = Array.isArray(currentAnswer) && currentAnswer.length > 0;
            html += '<button class="btn btn-primary btn-confirm" id="btn-confirm-multi"' + (hasSelection ? '' : ' disabled') + '>선택 완료</button>';
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
                    self._handleAnswer(qId, this.getAttribute('data-answer-array') === 'true' ? [val] : val);
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
        var title = container.querySelector('.question-title');
        if (title) title.focus({ preventScroll: true });
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
            cardElem.setAttribute('aria-pressed', 'false');
        } else {
            this.answers[questionId].push(value);
            cardElem.classList.add('selected');
            cardElem.setAttribute('aria-pressed', 'true');
        }
        var confirmBtn = document.getElementById('btn-confirm-multi');
        if (confirmBtn) confirmBtn.disabled = this.answers[questionId].length === 0;
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
            this._renderQuestion();
        }
    },

    _restart: function() {
        this.webrCancelled = true;
        if (window.AutoStat.WebRRunner && window.AutoStat.WebRRunner.cancel) {
            window.AutoStat.WebRRunner.cancel();
        }
        this.currentStep = 0;
        this.answers = {};
        this.currentRecommendation = null;
        this.webrMode = false;
        this.uploadedFile = null;
        this.uploadedHeaders = [];
        this.uploadedRows = [];
        this.uploadedCSV = '';
        this.uploadedRowCount = 0;
        this.fileReadId++;
        this.webrColumnTypes = {};
        this.webrVariableMapping = {};
        this.webrMultiIVSelections = [];
        this.webrExtraValues = {};
        this.visibleQuestions = this._computeVisibleQuestions();
        this.webrRunId++;
        this.lastWebRProgress = 0;

        // WebR 관련 UI 초기화
        this._hideAllWebrSections();
        var fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
        document.getElementById('file-dropzone').style.display = 'block';
        document.getElementById('file-preview').style.display = 'none';
        this._hideValidationSummary();
        this._clearPaperResults();
        document.querySelectorAll('.mode-card').forEach(function(card) {
            card.classList.remove('selected');
            card.setAttribute('aria-pressed', 'false');
        });
    },

    // ==================== 진입 모드 선택 ====================

    _showModeSelection: function(shouldFocus) {
        this._restart();
        document.getElementById('entry-mode-section').style.display = 'block';
        document.getElementById('browse-section').style.display = 'none';
        document.getElementById('question-section').style.display = 'none';
        document.getElementById('result-section').style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (shouldFocus !== false) this._focusHeading('#entry-title');
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
                html += '<button type="button" class="browse-test-card" data-testid="' + testId + '">';
                html += '<div class="browse-test-name">' + test.name + '</div>';
                html += '<div class="browse-test-name-en">' + test.name_en + '</div>';
                html += '<div class="browse-test-desc">' + test.simple_description + '</div>';
                html += '</button>';
            });

            html += '</div></div>';
        });

        container.innerHTML = html;

        // 클릭 이벤트
        container.querySelectorAll('.browse-test-card').forEach(function(card) {
            self._bindActivate(card, function() {
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
        this._clearPaperResults();

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
        this._focusHeading('#result-title');
    },

    // ==================== 결과 표시 (기존 유지) ====================

    _showResults: function() {
        document.getElementById('question-section').style.display = 'none';
        document.getElementById('result-section').style.display = 'block';

        document.getElementById('progress-fill').style.width = '100%';

        var result = window.AutoStat.StatRecommender.recommend(this.answers);
        if (!result.success || !result.recommendation || !result.recommendation.primary) {
            this._showToast(result.message || '추천 결과를 만들 수 없습니다. 선택 내용을 다시 확인해주세요.', 'error');
            this.currentStep = Math.max(0, this.visibleQuestions.length - 1);
            this._renderQuestion();
            return;
        }
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
        document.getElementById('decision-path-container').open = false;
        this._renderDecisionPath(result.recommendation.decision_path);
        this._renderAlternatives(result.recommendation.alternatives);
        this._clearPaperResults();

        // [NEW] 모드 선택 표시, 기존 커스터마이저 숨김
        document.getElementById('analysis-mode-section').style.display = 'block';
        document.getElementById('r-code-customizer').style.display = 'none';
        this._hideAllWebrSections();

        // PubMed 분야 드롭다운
        this._populateTherapyFields();

        window.scrollTo({ top: 0, behavior: 'smooth' });
        this._focusHeading('#result-title');
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
            var card = document.createElement('button');
            card.type = 'button';
            card.className = 'alt-card';
            card.innerHTML =
                '<span class="alt-name">' + self._escapeHtml(alt.name) + '</span>' +
                '<span class="alt-reason">' + self._escapeHtml(self._stripEmoji(alt.reason || '')) + '</span>' +
                '<span class="alt-desc">' + self._escapeHtml(alt.simple_description) + '</span>';

            self._bindActivate(card, function() {
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
        this._clearPaperResults();

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
        this._focusHeading('#result-title');
    },

    // ==================== [NEW] 모드 선택 ====================

    _selectMode: function(mode) {
        // 카드 선택 표시
        document.querySelectorAll('.mode-card').forEach(function(c) {
            c.classList.remove('selected');
            c.setAttribute('aria-pressed', 'false');
        });

        if (mode === 'webr') {
            this.webrMode = true;
            document.getElementById('mode-webr').classList.add('selected');
            document.getElementById('mode-webr').setAttribute('aria-pressed', 'true');
            document.getElementById('r-code-customizer').style.display = 'none';
            document.getElementById('file-upload-section').style.display = 'block';
        } else {
            this.webrMode = false;
            document.getElementById('mode-code').classList.add('selected');
            document.getElementById('mode-code').setAttribute('aria-pressed', 'true');
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

    _decodeCsvBuffer: function(buffer) {
        if (typeof TextDecoder === 'undefined') {
            throw new Error('이 브라우저는 CSV 문자 인코딩 처리를 지원하지 않습니다. Excel(.xlsx) 파일을 사용해주세요.');
        }

        var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        var text;
        try {
            text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        } catch (utf8Error) {
            try {
                text = new TextDecoder('euc-kr', { fatal: true }).decode(bytes);
            } catch (eucKrError) {
                throw new Error('CSV 문자 인코딩을 확인할 수 없습니다. UTF-8 또는 EUC-KR로 저장해주세요.');
            }
        }
        return text.replace(/^\uFEFF/, '');
    },

    _handleFileUpload: function(file) {
        var self = this;
        var readId = ++this.fileReadId;

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

        if (typeof XLSX === 'undefined') {
            this._showToast('파일 읽기 도구를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.', 'error');
            return;
        }

        this.uploadedFile = null;
        this.uploadedHeaders = [];
        this.uploadedRows = [];
        this.uploadedCSV = '';
        this.uploadedRowCount = 0;
        this._hideValidationSummary();

        var reader = new FileReader();
        reader.onload = function(e) {
            if (readId !== self.fileReadId) return;
            try {
                var workbook;
                if (ext === 'csv') {
                    var csvText = self._decodeCsvBuffer(e.target.result);
                    workbook = XLSX.read(csvText, { type: 'string', cellDates: false });
                } else {
                    var data = new Uint8Array(e.target.result);
                    workbook = XLSX.read(data, { type: 'array', cellDates: false });
                }
                var firstSheet = workbook.Sheets[workbook.SheetNames[0]];

                // JSON 배열로 변환
                var jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true, defval: '' });
                if (jsonData.length < 2) {
                    self._showToast('데이터가 비어있거나 헤더만 있습니다.', 'error');
                    return;
                }

                var headers = jsonData[0].map(function(h) { return String(h).trim(); });
                var rows = jsonData.slice(1).filter(function(row) {
                    return row.some(function(value) {
                        return !window.AutoStat.DataValidator.isMissing(value);
                    });
                });
                var headerReport = window.AutoStat.DataValidator.validateHeaders(headers);
                if (!headerReport.valid) {
                    self._showToast(headerReport.errors[0], 'error');
                    return;
                }
                if (rows.length === 0) {
                    self._showToast('열 이름 아래에 분석할 데이터가 없습니다.', 'error');
                    return;
                }

                // 검증한 헤더와 빈 행을 정리한 데이터만 WebR에 전달
                var cleanSheet = XLSX.utils.aoa_to_sheet([headers].concat(rows));
                var csvString = XLSX.utils.sheet_to_csv(cleanSheet);

                self.uploadedFile = file;
                self.uploadedHeaders = headers;
                self.uploadedRows = rows;
                self.uploadedCSV = csvString;
                self.uploadedRowCount = rows.length;

                // 미리보기 표시
                self._showDataPreview(headers, rows.slice(0, 5), file.name);

                // 열 이름과 실제 값을 함께 사용해 유형 감지
                self.webrColumnTypes = window.AutoStat.DataValidator.detectTypes(headers, rows);

                // 변수 매핑 UI 표시
                self._showWebrVariableMapping();

            } catch (err) {
                self._showToast('파일을 읽을 수 없습니다: ' + err.message, 'error');
            }
        };
        reader.onerror = function() {
            if (readId !== self.fileReadId) return;
            self._showToast('파일을 읽지 못했습니다. 파일을 다시 선택해주세요.', 'error');
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
        table.replaceChildren();
        var thead = document.createElement('thead');
        var headerRow = document.createElement('tr');
        headers.forEach(function(header) {
            var th = document.createElement('th');
            th.scope = 'col';
            th.textContent = header;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        sampleRows.forEach(function(row) {
            var tr = document.createElement('tr');
            for (var i = 0; i < headers.length; i++) {
                var td = document.createElement('td');
                td.textContent = row[i] !== undefined ? String(row[i]) : '';
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        if (this.uploadedRowCount > 5) {
            var moreRow = document.createElement('tr');
            var moreCell = document.createElement('td');
            moreCell.colSpan = headers.length;
            moreCell.className = 'preview-more';
            moreCell.textContent = '그 외 ' + (this.uploadedRowCount - 5) + '개 행';
            moreRow.appendChild(moreCell);
            tbody.appendChild(moreRow);
        }
        table.appendChild(tbody);

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
        mappingDiv.replaceChildren();
        var headers = this.uploadedHeaders;
        var colTypes = this.webrColumnTypes || {};
        var self = this;
        var controlIndex = 0;

        function appendTextElement(tag, className, text, parent) {
            var element = document.createElement(tag);
            if (className) element.className = className;
            element.textContent = text;
            parent.appendChild(element);
            return element;
        }

        appendTextElement('h4', '', '분석에 사용할 열 연결', mappingDiv);
        appendTextElement('p', 'help-text', '각 역할에 맞는 열을 고르고 자동 감지된 유형을 확인하세요.', mappingDiv);
        if (requirements.note) appendTextElement('div', 'mapping-note', requirements.note, mappingDiv);

        function buildTypeSelect(attribute, value, detectedType, label) {
            var select = document.createElement('select');
            select.className = 'type-select';
            select.setAttribute(attribute, value);
            select.setAttribute('aria-label', label + ' 데이터 유형');
            [
                ['', '유형 선택'],
                ['continuous', '숫자'],
                ['categorical', '그룹'],
                ['ordinal', '순서형']
            ].forEach(function(optionData) {
                var option = document.createElement('option');
                option.value = optionData[0];
                option.textContent = optionData[1];
                option.selected = detectedType === optionData[0];
                select.appendChild(option);
            });
            return select;
        }

        function appendColumnOptions(select, preferredType, optional) {
            var emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = optional ? '선택하지 않음' : '열을 선택하세요';
            select.appendChild(emptyOption);

            headers.slice().sort(function(a, b) {
                var aMatch = colTypes[a] === preferredType ? 0 : 1;
                var bMatch = colTypes[b] === preferredType ? 0 : 1;
                return aMatch - bMatch;
            }).forEach(function(header) {
                var option = document.createElement('option');
                var typeLabel = colTypes[header] === 'continuous' ? '숫자' :
                    (colTypes[header] === 'ordinal' ? '순서형' : '그룹');
                option.value = header;
                option.textContent = header + ' (' + typeLabel + ')';
                select.appendChild(option);
            });
        }

        function appendVariableControl(variable, optional) {
            controlIndex++;
            var group = document.createElement('div');
            group.className = optional ? 'mapping-group mapping-optional' : 'mapping-group';
            var selectId = 'webr-map-' + controlIndex;
            var label = appendTextElement('label', 'mapping-label', variable.label + (variable.required ? ' *' : ''), group);
            label.htmlFor = selectId;
            if (variable.help) appendTextElement('span', 'mapping-help', variable.help, group);

            var row = document.createElement('div');
            row.className = 'mapping-row';
            var select = document.createElement('select');
            select.id = selectId;
            select.className = 'mapping-select';
            select.setAttribute('data-role', variable.role);
            appendColumnOptions(select, variable.type, optional);
            row.appendChild(select);
            row.appendChild(buildTypeSelect('data-type-role', variable.role, '', variable.label));
            group.appendChild(row);
            mappingDiv.appendChild(group);
        }

        (requirements.variables || []).forEach(function(variable) {
            appendVariableControl(variable, false);
        });
        if (requirements.optionalVariables && requirements.optionalVariables.length > 0) {
            appendTextElement('div', 'mapping-optional-header', '선택 사항', mappingDiv);
            requirements.optionalVariables.forEach(function(variable) {
                appendVariableControl(variable, true);
            });
        }

        if (requirements.multiIV) {
            var fieldset = document.createElement('fieldset');
            fieldset.className = 'mapping-group';
            var legend = document.createElement('legend');
            legend.className = 'mapping-label';
            legend.textContent = requirements.multiIVLabel || '독립변수';
            fieldset.appendChild(legend);
            if (requirements.multiIVHelp) appendTextElement('span', 'mapping-help', requirements.multiIVHelp, fieldset);

            var checkboxes = document.createElement('div');
            checkboxes.className = 'mapping-checkboxes';
            checkboxes.id = 'webr-multi-iv';
            headers.forEach(function(header, index) {
                var item = document.createElement('div');
                item.className = 'checkbox-item';
                var checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = header;
                checkbox.id = 'webr-iv-' + index;
                var checkboxLabel = document.createElement('label');
                checkboxLabel.htmlFor = checkbox.id;
                checkboxLabel.textContent = header;
                item.appendChild(checkbox);
                item.appendChild(checkboxLabel);
                item.appendChild(buildTypeSelect('data-type-iv', header, colTypes[header] || '', header));
                checkboxes.appendChild(item);
            });
            fieldset.appendChild(checkboxes);
            mappingDiv.appendChild(fieldset);
        }

        if (requirements.extras && requirements.extras.length > 0) {
            appendTextElement('div', 'mapping-optional-header', '분석에 필요한 설정', mappingDiv);
            requirements.extras.forEach(function(extra) {
                controlIndex++;
                var group = document.createElement('div');
                group.className = 'mapping-group';
                var inputId = 'webr-extra-' + controlIndex;
                var label = appendTextElement('label', 'mapping-label', extra.label + (extra.required ? ' *' : ''), group);
                label.htmlFor = inputId;
                if (extra.help) appendTextElement('span', 'mapping-help', extra.help, group);

                var input;
                if (extra.inputType === 'select' || extra.inputType === 'data-select') {
                    input = document.createElement('select');
                    input.className = 'mapping-select';
                    if (extra.inputType === 'data-select') {
                        input.disabled = true;
                        input.setAttribute('data-source-role', extra.sourceRole);
                        var pending = document.createElement('option');
                        pending.value = '';
                        pending.textContent = '먼저 결과 열을 선택하세요';
                        input.appendChild(pending);
                    } else {
                        (extra.options || []).forEach(function(value) {
                            var option = document.createElement('option');
                            option.value = value;
                            option.textContent = value;
                            option.selected = value === extra.defaultValue;
                            input.appendChild(option);
                        });
                    }
                } else {
                    input = document.createElement('input');
                    input.className = 'mapping-input';
                    input.type = extra.inputType === 'number' ? 'number' : 'text';
                    input.value = extra.defaultValue === undefined ? '' : extra.defaultValue;
                    if (extra.min !== undefined) input.min = extra.min;
                    if (extra.max !== undefined) input.max = extra.max;
                    if (extra.step !== undefined) input.step = extra.step;
                    if (extra.inputType === 'data-order') {
                        input.disabled = true;
                        input.placeholder = '낮은 단계 | 중간 단계 | 높은 단계';
                        input.setAttribute('data-source-role', extra.sourceRole);
                    }
                }
                input.id = inputId;
                input.setAttribute('data-extra', extra.role);
                input.setAttribute('data-extra-type', extra.inputType || 'text');
                group.appendChild(input);
                mappingDiv.appendChild(group);
            });
        }

        mappingDiv.style.display = 'block';
        document.getElementById('file-action-buttons').style.display = 'flex';
        this._hideValidationSummary();

        mappingDiv.querySelectorAll('.mapping-select[data-role]').forEach(function(varSelect) {
            varSelect.addEventListener('change', function() {
                var role = varSelect.getAttribute('data-role');
                var typeSelect = mappingDiv.querySelector('.type-select[data-type-role="' + role + '"]');
                if (typeSelect) typeSelect.value = self.webrColumnTypes[varSelect.value] || '';
                self._refreshDataDependentExtras();
                self._hideValidationSummary();
            });
        });
        mappingDiv.querySelectorAll('input, select').forEach(function(control) {
            control.addEventListener('change', function() { self._hideValidationSummary(); });
        });
        this._refreshDataDependentExtras();
    },

    _refreshDataDependentExtras: function() {
        var mappingDiv = document.getElementById('webr-variable-mapping');
        var self = this;
        mappingDiv.querySelectorAll('[data-extra-type="data-select"], [data-extra-type="data-order"]').forEach(function(control) {
            var sourceRole = control.getAttribute('data-source-role');
            var sourceSelect = mappingDiv.querySelector('.mapping-select[data-role="' + sourceRole + '"]');
            var column = sourceSelect ? sourceSelect.value : '';
            var values = column ? window.AutoStat.DataValidator.getUniqueColumnValues(
                self.uploadedHeaders, self.uploadedRows, column
            ) : [];

            if (control.getAttribute('data-extra-type') === 'data-select') {
                var previous = control.value;
                control.replaceChildren();
                var placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = column ? '범주를 선택하세요' : '먼저 결과 열을 선택하세요';
                control.appendChild(placeholder);
                values.forEach(function(value) {
                    var option = document.createElement('option');
                    option.value = value;
                    option.textContent = value;
                    control.appendChild(option);
                });
                control.disabled = !column;
                if (values.indexOf(previous) !== -1) control.value = previous;
            } else {
                control.disabled = !column;
                control.value = values.join(' | ');
            }
        });
    },

    _collectWebrConfig: function() {
        var root = document.getElementById('webr-variable-mapping');
        var vars = {};
        var multiIV = [];
        var extras = {};
        var columnTypes = Object.assign({}, this.webrColumnTypes);

        root.querySelectorAll('.mapping-select[data-role]').forEach(function(select) {
            if (select.value) vars[select.getAttribute('data-role')] = select.value;
        });
        root.querySelectorAll('#webr-multi-iv input[type="checkbox"]:checked').forEach(function(checkbox) {
            multiIV.push(checkbox.value);
        });
        root.querySelectorAll('[data-extra]').forEach(function(control) {
            extras[control.getAttribute('data-extra')] = control.value;
        });
        root.querySelectorAll('.type-select[data-type-role]').forEach(function(select) {
            var role = select.getAttribute('data-type-role');
            var variableSelect = root.querySelector('.mapping-select[data-role="' + role + '"]');
            if (variableSelect && variableSelect.value && select.value) {
                columnTypes[variableSelect.value] = select.value;
            }
        });
        root.querySelectorAll('#webr-multi-iv .type-select[data-type-iv]').forEach(function(select) {
            if (select.value) columnTypes[select.getAttribute('data-type-iv')] = select.value;
        });

        return { vars: vars, multiIV: multiIV, extras: extras, columnTypes: columnTypes };
    },

    _validateWebrConfig: function(config) {
        var primary = this.currentRecommendation && this.currentRecommendation.primary;
        var requirements = primary && window.AutoStat.TEST_VARIABLE_REQUIREMENTS[primary.id];
        return window.AutoStat.DataValidator.validateMapping({
            testId: primary ? primary.id : '',
            requirements: requirements || {},
            headers: this.uploadedHeaders,
            rows: this.uploadedRows,
            vars: config.vars,
            multiIV: config.multiIV,
            extras: config.extras,
            columnTypes: config.columnTypes
        });
    },

    _renderValidationSummary: function(report) {
        var container = document.getElementById('webr-validation-summary');
        container.replaceChildren();
        container.className = 'validation-summary ' + (report.valid ? 'validation-ready' : 'validation-error');

        var title = document.createElement('strong');
        title.textContent = report.valid ?
            '분석 준비 완료: ' + report.completeRows + '개 행 사용' :
            '분석 전에 ' + report.errors.length + '가지를 확인해주세요.';
        container.appendChild(title);

        if (report.errors.length > 0) {
            var errorList = document.createElement('ul');
            report.errors.forEach(function(message) {
                var item = document.createElement('li');
                item.textContent = message;
                errorList.appendChild(item);
            });
            container.appendChild(errorList);
        }
        if (report.warnings.length > 0) {
            var warningTitle = document.createElement('p');
            warningTitle.className = 'validation-warning-title';
            warningTitle.textContent = '함께 확인할 내용';
            container.appendChild(warningTitle);
            var warningList = document.createElement('ul');
            report.warnings.forEach(function(message) {
                var item = document.createElement('li');
                item.textContent = message;
                warningList.appendChild(item);
            });
            container.appendChild(warningList);
        }
        container.style.display = 'block';
    },

    _hideValidationSummary: function() {
        var container = document.getElementById('webr-validation-summary');
        if (container) container.style.display = 'none';
    },

    _isActiveWebRRun: function(runId) {
        return !this.webrCancelled && this.webrRunId === runId;
    },

    // ==================== [NEW] WebR 분석 실행 ====================

    _runWebRAnalysis: async function() {
        var self = this;
        var primary = this.currentRecommendation && this.currentRecommendation.primary;
        if (!primary) return;

        var config = this._collectWebrConfig();
        var validation = this._validateWebrConfig(config);
        this._renderValidationSummary(validation);
        if (!validation.valid) {
            this._showToast(validation.errors[0], 'error');
            document.getElementById('webr-validation-summary').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        var vars = config.vars;
        var multiIVList = config.multiIV;
        var extras = config.extras;
        var columnTypes = config.columnTypes;

        // UI: 로딩 표시
        this.webrCancelled = false;
        var runId = ++this.webrRunId;
        this.lastWebRProgress = 0;
        document.getElementById('file-upload-section').style.display = 'none';
        document.getElementById('analysis-mode-section').style.display = 'none';
        document.getElementById('webr-loading-section').style.display = 'block';
        // 진행률 초기화
        this._updateWebRProgress(0, '초기화 중...');

        var Runner = window.AutoStat.WebRRunner;
        var Adaptor = window.AutoStat.WebRAdaptor;
        if (Runner.resetCancellation) Runner.resetCancellation();

        // 진행률 콜백
        Runner.onProgress = function(stage, pct, msg) {
            if (self._isActiveWebRRun(runId)) self._updateWebRProgress(pct, msg);
        };

        var lastRunnerError = '';
        Runner.onError = function(msg) {
            lastRunnerError = msg;
            if (self._isActiveWebRRun(runId)) self._showToast(msg, 'error');
        };

        // 결과 저장용 변수 (에러 시에도 부분 결과 표시)
        var rawCode = '';
        var results = null;
        var plotImages = null;
        var errorMessages = [];

        try {
            // 1. WebR 초기화
            var initOk = await Runner.init();
            if (!this._isActiveWebRRun(runId)) return;
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
            var packagesOk = await Runner.ensurePackages(requiredPkgs);
            if (!this._isActiveWebRRun(runId)) return;
            if (!packagesOk) {
                this._showResultViewerWithError(
                    '분석 도구를 준비하지 못했습니다.',
                    '필요한 R 패키지를 내려받지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도해주세요.',
                    primary.name
                );
                return;
            }

            // 3. 데이터 파일을 VFS에 쓰기
            this._updateWebRProgress(50, '데이터 업로드 중...');
            var writeOk = await Runner.writeFileToVFS('data.csv', this.uploadedCSV);
            if (!this._isActiveWebRRun(runId)) return;
            if (!writeOk) {
                this._showResultViewerWithError(
                    '데이터를 분석 환경에 전달하지 못했습니다.',
                    '이전 데이터로 분석하지 않도록 실행을 중단했습니다. 파일을 다시 선택해주세요.',
                    primary.name
                );
                return;
            }

            // 4. R 코드 생성 (파라미터 이름 정확히 맞춤)
            this._updateWebRProgress(55, 'R 코드 준비 중...');
            var params = {
                filePath: Adaptor.VFS_DATA_PATH,
                fileFormat: 'csv',
                vars: vars,
                extras: extras,
                multiIV: multiIVList,
                columnTypes: columnTypes
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
            if (!this._isActiveWebRRun(runId)) return;

            // 7. 시각화 실행 (별도)
            if (separated.plotStep) {
                this._updateWebRProgress(90, '시각화 생성 중...');
                try {
                    plotImages = await Runner.captureGraphics(separated.plotStep.code);
                    if (!this._isActiveWebRRun(runId)) return;
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

        // 취소된 경우 결과 뷰어를 띄우지 않음 (코드 모드 화면 유지)
        if (!this._isActiveWebRRun(runId)) return;

        // === 결과 뷰어 항상 표시 (부분 결과라도 보여줌) ===
        this._updateWebRProgress(100, '분석 완료');
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
        this._focusHeading('#webr-result-section h3');
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
        this._focusHeading('#webr-result-section h3');
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
            self.uploadedRows = [];
            self.uploadedCSV = '';
            self.uploadedRowCount = 0;
            self.fileReadId++;
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
            self._hideValidationSummary();
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
        var normalized = Math.max(0, Math.min(100, Number(percent) || 0));
        this.lastWebRProgress = Math.max(this.lastWebRProgress || 0, normalized);
        if (fill) fill.style.width = this.lastWebRProgress + '%';
        var progressBar = document.querySelector('.webr-progress-bar');
        if (progressBar) progressBar.setAttribute('aria-valuenow', String(Math.round(this.lastWebRProgress)));
        if (text) text.textContent = message;
    },

    _cancelActiveWebRRun: function() {
        this.webrCancelled = true;
        this.webrRunId++;
        var runner = window.AutoStat.WebRRunner;
        if (runner && runner.cancel) runner.cancel();
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
        this._cancelActiveWebRRun();
        document.getElementById('file-upload-section').style.display = 'none';
        document.getElementById('analysis-mode-section').style.display = 'block';
        document.querySelectorAll('.mode-card').forEach(function(c) {
            c.classList.remove('selected');
            c.setAttribute('aria-pressed', 'false');
        });

        // 파일 업로드 완전 초기화
        document.getElementById('file-dropzone').style.display = 'block';
        document.getElementById('file-preview').style.display = 'none';
        var fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
        this.uploadedFile = null;
        this.uploadedHeaders = [];
        this.uploadedRows = [];
        this.uploadedCSV = '';
        this.uploadedRowCount = 0;
        this.fileReadId++;
        this.webrColumnTypes = {};
        this.webrVariableMapping = {};
        this.webrMultiIVSelections = [];
        this.webrExtraValues = {};
        this._hideValidationSummary();
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
        var searchId = ++this.paperSearchId;
        var field = document.getElementById('therapy-field-select').value;
        var sciFilter = document.getElementById('sci-filter-checkbox').checked;

        document.getElementById('papers-loading').style.display = 'block';
        document.getElementById('papers-list').innerHTML = '';

        try {
            var result = await window.AutoStat.PubMedSearcher.search(testId, field, 10, sciFilter);
            if (searchId !== this.paperSearchId || !this.currentRecommendation || this.currentRecommendation.primary.id !== testId) return;
            if (!result.success) {
                result.message = 'PubMed 검색에 연결하지 못했습니다. 잠시 후 다시 시도하거나 아래 링크를 이용해주세요.';
            }
            this._renderPapers(result);
        } catch (e) {
            if (searchId !== this.paperSearchId) return;
            var fallback = window.AutoStat.PubMedSearcher.getFallback(testId, field);
            this._renderPapers(fallback);
        } finally {
            if (searchId === this.paperSearchId) document.getElementById('papers-loading').style.display = 'none';
        }
    },

    _clearPaperResults: function() {
        this.paperSearchId++;
        var loading = document.getElementById('papers-loading');
        var list = document.getElementById('papers-list');
        if (loading) loading.style.display = 'none';
        if (list) list.replaceChildren();
    },

    _renderPapers: function(result) {
        var self = this;
        var container = document.getElementById('papers-list');
        container.innerHTML = '';

        if (result.sci_filtered) {
            var filterNote = document.createElement('div');
            filterNote.className = 'sci-filter-note';
            filterNote.textContent = '주요 재활·의학 저널 목록을 적용했습니다.';
            container.appendChild(filterNote);
        }

        if (!result.papers || result.papers.length === 0) {
            var msg = result.message || '검색 결과가 없습니다.';
            var empty = document.createElement('div');
            empty.className = 'no-papers';
            var message = document.createElement('p');
            message.textContent = msg;
            empty.appendChild(message);
            if (result.sci_filtered) {
                var hint = document.createElement('p');
                hint.textContent = '저널 필터를 해제하면 더 많은 결과를 볼 수 있습니다.';
                empty.appendChild(hint);
            }
            if (result.search_url) {
                var linkWrap = document.createElement('p');
                var link = document.createElement('a');
                link.href = result.search_url;
                link.target = '_blank';
                link.rel = 'noopener';
                link.textContent = 'PubMed에서 직접 검색';
                linkWrap.appendChild(link);
                empty.appendChild(linkWrap);
            }
            container.appendChild(empty);
            return;
        }

        result.papers.forEach(function(paper) {
            var card = document.createElement('article');
            card.className = 'paper-card';
            var title = document.createElement('h4');
            title.className = 'paper-title';
            var titleLink = document.createElement('a');
            titleLink.href = paper.pubmed_url;
            titleLink.target = '_blank';
            titleLink.rel = 'noopener';
            titleLink.textContent = paper.title;
            title.appendChild(titleLink);
            card.appendChild(title);

            var meta = document.createElement('div');
            meta.className = 'paper-meta';
            if (paper.is_sci || window.AutoStat.PubMedSearcher.isSciJournal(paper.journal)) {
                var badge = document.createElement('span');
                badge.className = 'sci-badge';
                badge.textContent = '주요 저널';
                meta.appendChild(badge);
                meta.appendChild(document.createTextNode(' '));
            }
            meta.appendChild(document.createTextNode(
                (paper.authors_display || '저자 정보 없음') + ' | ' +
                (paper.journal || '저널 정보 없음') + (paper.year ? ' (' + paper.year + ')' : '')
            ));
            card.appendChild(meta);

            if (paper.abstract) {
                var details = document.createElement('details');
                details.className = 'paper-abstract';
                var summary = document.createElement('summary');
                summary.textContent = '초록 보기';
                var abstract = document.createElement('p');
                abstract.textContent = paper.abstract;
                details.appendChild(summary);
                details.appendChild(abstract);
                card.appendChild(details);
            }

            container.appendChild(card);
        });
    },

    // ==================== 유틸리티 (기존 유지) ====================

    // HTML 특수문자 이스케이프 (innerHTML 삽입 전 XSS/렌더링 깨짐 방지)
    _escapeHtml: function(text) {
        if (text === undefined || text === null) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // 클릭 가능한 요소에 키보드 접근성(Enter/Space) + ARIA role 부여
    _bindActivate: function(elem, handler) {
        if (!elem) return;
        if (elem.tagName === 'BUTTON' || elem.tagName === 'A') {
            elem.addEventListener('click', handler);
            return;
        }
        if (!elem.hasAttribute('role')) elem.setAttribute('role', 'button');
        if (!elem.hasAttribute('tabindex')) elem.setAttribute('tabindex', '0');
        elem.addEventListener('click', handler);
        elem.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                handler.call(this, e);
            }
        });
    },

    _showToast: function(message, type) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'toast toast-' + (type || 'info');
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, type === 'error' ? 5000 : 3500);
    },

    _focusHeading: function(selector) {
        var heading = document.querySelector(selector);
        if (!heading) return;
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        window.setTimeout(function() { heading.focus({ preventScroll: true }); }, 0);
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
