/**
 * R 코드 커스터마이저 v2.0
 * 사용자의 엑셀 데이터에 맞게 R 코드를 자동 생성
 * 프론트엔드 전용 (Flask API 불필요)
 */

window.AutoStat = window.AutoStat || {};

// ============================================
// 26개 통계 테스트별 필요 변수 요구사항
// ============================================
window.AutoStat.TEST_VARIABLE_REQUIREMENTS = {
    "one_sample_t": {
        label: "일표본 t-검정",
        variables: [
            { role: "dv", label: "측정 변수 (숫자)", type: "continuous", required: true, help: "예: 악력, 점수, 혈압" }
        ],
        extras: [
            { role: "mu", label: "비교 기준값", inputType: "number", defaultValue: 0, help: "비교할 기준 평균값 (예: 정상 기준 25)" },
            { role: "conf_level", label: "신뢰수준", inputType: "select", options: ["0.90","0.95","0.99"], defaultValue: "0.95", help: "신뢰구간 수준 (보통 0.95)" }
        ]
    },
    "independent_t": {
        label: "독립표본 t-검정",
        variables: [
            { role: "dv", label: "종속변수 (측정값)", type: "continuous", required: true, help: "예: VAS 점수, ROM, 악력" },
            { role: "group", label: "그룹 변수", type: "categorical", required: true, help: "예: 실험군/대조군, 치료A/치료B" }
        ],
        extras: [
            { role: "conf_level", label: "신뢰수준", inputType: "select", options: ["0.90","0.95","0.99"], defaultValue: "0.95", help: "신뢰구간 수준" }
        ]
    },
    "paired_t": {
        label: "대응표본 t-검정",
        variables: [
            { role: "pre", label: "사전 측정값", type: "continuous", required: true, help: "예: 치료 전 점수" },
            { role: "post", label: "사후 측정값", type: "continuous", required: true, help: "예: 치료 후 점수" }
        ],
        optionalVariables: [
            { role: "subject", label: "대상자 ID (선택)", type: "categorical", help: "대상자 식별 변수 (있으면 입력)" }
        ],
        extras: [
            { role: "conf_level", label: "신뢰수준", inputType: "select", options: ["0.90","0.95","0.99"], defaultValue: "0.95", help: "신뢰구간 수준" }
        ]
    },
    "mann_whitney": {
        label: "Mann-Whitney U 검정",
        variables: [
            { role: "dv", label: "종속변수 (측정값)", type: "continuous", required: true, help: "예: 통증 점수, 기능 점수" },
            { role: "group", label: "그룹 변수", type: "categorical", required: true, help: "예: 실험군/대조군" }
        ],
        extras: [
            { role: "conf_level", label: "신뢰수준", inputType: "select", options: ["0.90","0.95","0.99"], defaultValue: "0.95", help: "신뢰구간 수준" }
        ]
    },
    "wilcoxon_signed_rank": {
        label: "Wilcoxon 부호순위 검정",
        variables: [
            { role: "pre", label: "사전 측정값", type: "continuous", required: true, help: "예: 치료 전 점수" },
            { role: "post", label: "사후 측정값", type: "continuous", required: true, help: "예: 치료 후 점수" }
        ],
        extras: [
            { role: "conf_level", label: "신뢰수준", inputType: "select", options: ["0.90","0.95","0.99"], defaultValue: "0.95", help: "신뢰구간 수준" }
        ]
    },
    "one_way_anova": {
        label: "일원 분산분석",
        variables: [
            { role: "dv", label: "종속변수 (측정값)", type: "continuous", required: true, help: "예: 회복 점수" },
            { role: "group", label: "그룹 변수 (3개 이상)", type: "categorical", required: true, help: "예: 치료A/치료B/치료C" }
        ],
        optionalVariables: [
            { role: "covariate", label: "공변량 (선택)", type: "continuous", help: "통제할 변수가 있으면 선택 (ANCOVA로 전환)" }
        ],
        extras: [
            { role: "posthoc_method", label: "사후검정 방법", inputType: "select", options: ["tukey","bonferroni","holm"], defaultValue: "tukey", help: "Tukey(추천), Bonferroni(보수적), Holm(검정력 높음)" }
        ]
    },
    "kruskal_wallis": {
        label: "Kruskal-Wallis 검정",
        variables: [
            { role: "dv", label: "종속변수 (측정값)", type: "continuous", required: true, help: "예: 통증 등급" },
            { role: "group", label: "그룹 변수 (3개 이상)", type: "categorical", required: true, help: "예: 치료A/치료B/치료C" }
        ],
        extras: [
            { role: "posthoc_method", label: "사후검정 방법", inputType: "select", options: ["bonferroni","holm","BH"], defaultValue: "bonferroni", help: "Bonferroni(보수적), Holm(검정력 높음), BH(FDR 보정)" }
        ]
    },
    "two_way_anova": {
        label: "이원 분산분석",
        variables: [
            { role: "dv", label: "종속변수 (측정값)", type: "continuous", required: true, help: "예: 회복 점수" },
            { role: "factor1", label: "요인 1 (그룹)", type: "categorical", required: true, help: "예: 치료 유형" },
            { role: "factor2", label: "요인 2 (그룹)", type: "categorical", required: true, help: "예: 성별" }
        ],
        optionalVariables: [
            { role: "covariate", label: "공변량 (선택)", type: "continuous", help: "통제할 변수가 있으면 선택" }
        ]
    },
    "repeated_anova": {
        label: "반복측정 분산분석",
        variables: [
            { role: "subject", label: "대상자 ID", type: "categorical", required: true, help: "예: 환자번호, ID" },
            { role: "time", label: "시점 변수", type: "categorical", required: true, help: "예: 전/중/후, Time1/Time2/Time3" },
            { role: "dv", label: "종속변수 (측정값)", type: "continuous", required: true, help: "예: 기능 점수" }
        ],
        optionalVariables: [
            { role: "group", label: "집단 변수 (선택)", type: "categorical", help: "있으면 혼합 ANOVA로 전환 (예: 실험군/대조군)" }
        ],
        note: "데이터가 long format이어야 합니다 (한 행에 한 시점의 측정값)"
    },
    "friedman": {
        label: "Friedman 검정",
        variables: [
            { role: "subject", label: "대상자 ID", type: "categorical", required: true, help: "예: 환자번호" },
            { role: "time", label: "시점 변수", type: "categorical", required: true, help: "예: 시점1/시점2/시점3" },
            { role: "dv", label: "종속변수 (측정값)", type: "continuous", required: true, help: "예: 통증 점수" }
        ],
        note: "데이터가 long format이어야 합니다"
    },
    "mixed_anova": {
        label: "혼합 분산분석",
        variables: [
            { role: "subject", label: "대상자 ID", type: "categorical", required: true, help: "예: 환자번호" },
            { role: "group", label: "집단 변수 (between)", type: "categorical", required: true, help: "예: 실험군/대조군" },
            { role: "time", label: "시점 변수 (within)", type: "categorical", required: true, help: "예: 전/중/후" },
            { role: "dv", label: "종속변수 (측정값)", type: "continuous", required: true, help: "예: 기능 점수" }
        ],
        optionalVariables: [
            { role: "covariate", label: "공변량 (선택)", type: "continuous", help: "통제할 변수가 있으면 선택 (예: 나이)" }
        ],
        note: "데이터가 long format이어야 합니다"
    },
    "ancova": {
        label: "공분산분석 (ANCOVA)",
        variables: [
            { role: "dv", label: "종속변수 (사후 측정값)", type: "continuous", required: true, help: "예: 치료 후 점수" },
            { role: "group", label: "그룹 변수", type: "categorical", required: true, help: "예: 실험군/대조군" },
            { role: "covariate", label: "공변량 (통제 변수)", type: "continuous", required: true, help: "예: 사전 점수, 나이" }
        ],
        optionalVariables: [
            { role: "covariate2", label: "추가 공변량 1 (선택)", type: "continuous", help: "추가로 통제할 변수" },
            { role: "covariate3", label: "추가 공변량 2 (선택)", type: "continuous", help: "추가로 통제할 변수" }
        ]
    },
    "chi_square": {
        label: "카이제곱 검정",
        variables: [
            { role: "var1", label: "변수 1 (범주형)", type: "categorical", required: true, help: "예: 치료 유형" },
            { role: "var2", label: "변수 2 (범주형)", type: "categorical", required: true, help: "예: 결과 (성공/실패)" }
        ]
    },
    "fisher_exact": {
        label: "Fisher 정확 검정",
        variables: [
            { role: "var1", label: "변수 1 (범주형)", type: "categorical", required: true, help: "예: 그룹 (실험/대조)" },
            { role: "var2", label: "변수 2 (범주형)", type: "categorical", required: true, help: "예: 결과 (성공/실패)" }
        ]
    },
    "mcnemar": {
        label: "McNemar 검정",
        variables: [
            { role: "pre", label: "사전 상태 (이분형)", type: "categorical", required: true, help: "예: 치료 전 (정상/비정상)" },
            { role: "post", label: "사후 상태 (이분형)", type: "categorical", required: true, help: "예: 치료 후 (정상/비정상)" }
        ]
    },
    "pearson_correlation": {
        label: "Pearson 상관분석",
        variables: [
            { role: "var_x", label: "변수 X (숫자)", type: "continuous", required: true, help: "예: 나이, 치료 횟수" },
            { role: "var_y", label: "변수 Y (숫자)", type: "continuous", required: true, help: "예: 회복 점수" }
        ],
        optionalVariables: [
            { role: "var_z", label: "추가 변수 Z (선택)", type: "continuous", help: "추가 상관 변수가 있으면 선택" }
        ],
        extras: [
            { role: "conf_level", label: "신뢰수준", inputType: "select", options: ["0.90","0.95","0.99"], defaultValue: "0.95", help: "신뢰구간 수준" }
        ]
    },
    "spearman_correlation": {
        label: "Spearman 상관분석",
        variables: [
            { role: "var_x", label: "변수 X", type: "continuous", required: true, help: "예: 통증 등급" },
            { role: "var_y", label: "변수 Y", type: "continuous", required: true, help: "예: 기능 점수" }
        ],
        optionalVariables: [
            { role: "var_z", label: "추가 변수 Z (선택)", type: "continuous", help: "추가 상관 변수가 있으면 선택" }
        ],
        extras: [
            { role: "conf_level", label: "신뢰수준", inputType: "select", options: ["0.90","0.95","0.99"], defaultValue: "0.95", help: "신뢰구간 수준" }
        ]
    },
    "point_biserial": {
        label: "점이연 상관분석",
        variables: [
            { role: "binary_var", label: "이분형 변수 (0/1)", type: "categorical", required: true, help: "예: 성별(남=0/여=1), 수술여부" },
            { role: "continuous_var", label: "연속형 변수 (숫자)", type: "continuous", required: true, help: "예: 점수, 시간" }
        ]
    },
    "simple_regression": {
        label: "단순 선형회귀",
        variables: [
            { role: "dv", label: "종속변수 (예측할 값)", type: "continuous", required: true, help: "예: 회복 점수" },
            { role: "iv", label: "독립변수 (예측에 사용)", type: "continuous", required: true, help: "예: 치료 기간" }
        ],
        extras: [
            { role: "conf_level", label: "신뢰수준", inputType: "select", options: ["0.90","0.95","0.99"], defaultValue: "0.95", help: "신뢰구간 및 예측구간 수준" }
        ]
    },
    "multiple_regression": {
        label: "다중 선형회귀",
        variables: [
            { role: "dv", label: "종속변수 (예측할 값)", type: "continuous", required: true, help: "예: 회복 점수" }
        ],
        multiIV: true,
        multiIVLabel: "독립변수 (여러 개 선택 가능)",
        multiIVHelp: "예: 나이, 치료횟수, 성별 등",
        extras: [
            { role: "conf_level", label: "신뢰수준", inputType: "select", options: ["0.90","0.95","0.99"], defaultValue: "0.95", help: "신뢰구간 수준" }
        ]
    },
    "dummy_regression": {
        label: "더미변수 회귀분석",
        variables: [
            { role: "dv", label: "종속변수 (예측할 값)", type: "continuous", required: true, help: "예: 회복 점수" }
        ],
        multiIV: true,
        multiIVLabel: "독립변수 (범주형 포함, 여러 개 선택)",
        multiIVHelp: "예: 치료유형(A/B/C), 성별",
        extras: [
            { role: "ref_group", label: "기준 그룹 (선택)", inputType: "text", defaultValue: "", help: "범주형 변수의 기준 그룹명 (예: 대조군)" }
        ]
    },
    "logistic_regression": {
        label: "이분형 로지스틱 회귀",
        variables: [
            { role: "dv", label: "종속변수 (이분형: 성공/실패)", type: "categorical", required: true, help: "예: 성공(1)/실패(0)" }
        ],
        multiIV: true,
        multiIVLabel: "독립변수 (여러 개 선택 가능)",
        multiIVHelp: "예: 나이, 중증도, 치료유형",
        extras: [
            { role: "cutoff", label: "분류 기준값 (Cutoff)", inputType: "number", defaultValue: 0.5, help: "예측 확률의 분류 기준 (기본 0.5)" }
        ]
    },
    "multinomial_logistic": {
        label: "다중범주 로지스틱 회귀",
        variables: [
            { role: "dv", label: "종속변수 (3범주 이상)", type: "categorical", required: true, help: "예: 호전/유지/악화" }
        ],
        multiIV: true,
        multiIVLabel: "독립변수 (여러 개 선택 가능)",
        multiIVHelp: "예: 나이, 중증도",
        extras: [
            { role: "ref_category", label: "기준 범주 (선택)", inputType: "text", defaultValue: "", help: "기준이 될 종속변수 범주명 (예: 유지)" }
        ]
    },
    "ordinal_regression": {
        label: "순서형 로지스틱 회귀",
        variables: [
            { role: "dv", label: "종속변수 (순서형)", type: "ordinal", required: true, help: "예: 경증/중등증/중증" }
        ],
        multiIV: true,
        multiIVLabel: "독립변수 (여러 개 선택 가능)",
        multiIVHelp: "예: 나이, 치료 기간"
    },
    "glm_covariate": {
        label: "일반선형모형 (공변량 포함)",
        variables: [
            { role: "dv", label: "종속변수 (측정값)", type: "continuous", required: true, help: "예: 점수" },
            { role: "group", label: "그룹 변수", type: "categorical", required: true, help: "예: 치료A/B/C" },
            { role: "covariate", label: "공변량 (통제 변수)", type: "continuous", required: true, help: "예: 나이" }
        ],
        optionalVariables: [
            { role: "covariate2", label: "추가 공변량 (선택)", type: "continuous", help: "추가로 통제할 변수" }
        ]
    },
    "glm_anova": {
        label: "일반선형모형 (ANOVA)",
        variables: [
            { role: "dv", label: "종속변수 (측정값)", type: "continuous", required: true, help: "예: 회복 점수" }
        ],
        multiIV: true,
        multiIVLabel: "독립변수 (연속형, 여러 개 선택)",
        multiIVHelp: "예: 나이, BMI, 치료시간"
    }
};

// ============================================
// 타입 감지 (클라이언트 사이드)
// ============================================
window.AutoStat.TypeDetector = {
    PATTERNS: {
        continuous: [
            /(나이|age|score|점수|거리|시간|무게|키|height|weight|cm|kg)/i,
            /(혈압|맥박|체온|혈당|bmi|체중|신장)/i,
            /(count|수|값|value|numeric|수치|평균|mean)/i,
            /(분|초|ms|minute|second|hour|일|day)/i,
            /(m|mm|cm|inch|미터|센티|rom|가동범위|range)/i,
            /(vas|nrs|fim|berg|barthel|mmse|mbi|gds)/i,
            /(pre|post|baseline|사전|사후|전|후)/i
        ],
        categorical: [
            /(성별|gender|male|female|남|여|남성|여성|sex)/i,
            /(그룹|group|treatment|치료|약|운동|약물|intervention)/i,
            /(yes|no|예|아니오|성공|실패|합격|불합격|true|false)/i,
            /(type|유형|종류|방식|category|범주)/i,
            /(실험|대조|control|experimental|placebo)/i,
            /(진단|diagnosis|질환|disease)/i
        ],
        ordinal: [
            /(등급|grade|level|단계|심각도|severity|degree)/i,
            /(경증|중등증|중증|심함|mild|moderate|severe)/i,
            /(1차|2차|3차|차수|순서|rank|stage)/i,
            /(rating|likert|리커트|만족도|satisfaction)/i
        ]
    },

    detect: function(columnName) {
        var col = columnName.toLowerCase();
        for (var i = 0; i < this.PATTERNS.ordinal.length; i++) {
            if (this.PATTERNS.ordinal[i].test(col)) return "ordinal";
        }
        for (var i = 0; i < this.PATTERNS.categorical.length; i++) {
            if (this.PATTERNS.categorical[i].test(col)) return "categorical";
        }
        for (var i = 0; i < this.PATTERNS.continuous.length; i++) {
            if (this.PATTERNS.continuous[i].test(col)) return "continuous";
        }
        return "continuous"; // 기본값
    },

    detectMultiple: function(columns) {
        var result = {};
        for (var i = 0; i < columns.length; i++) {
            result[columns[i]] = this.detect(columns[i]);
        }
        return result;
    }
};

// ============================================
// 컬럼 파서
// ============================================
window.AutoStat.ColumnParser = {
    parse: function(inputText) {
        if (!inputText || !inputText.trim()) return [];
        inputText = inputText.trim();

        var cols;
        if (inputText.indexOf('\t') !== -1) {
            cols = inputText.split('\t');
        } else if (inputText.indexOf(',') !== -1) {
            cols = inputText.split(',');
        } else {
            cols = inputText.split('\n');
        }

        cols = cols.map(function(c) { return c.trim(); }).filter(function(c) { return c.length > 0; });

        // 숫자로만 된 행 필터링
        if (cols.length > 0 && /^[0-9\s,.\-]+$/.test(cols[0])) {
            cols = cols.slice(1);
        }

        // 중복 제거
        var seen = {};
        return cols.filter(function(c) {
            var lower = c.toLowerCase();
            if (seen[lower]) return false;
            seen[lower] = true;
            return true;
        });
    }
};

// ============================================
// R 코드 커스터마이저 메인 모듈
// ============================================
window.AutoStat.RCodeCustomizer = {
    // 상태
    testId: null,
    filePath: '',
    fileFormat: 'xlsx',
    columns: [],
    columnTypes: {},
    variableMapping: {},
    multiIVSelections: [],
    extraValues: {},
    customizedCode: null,

    // ==================== 초기화 ====================
    _initialized: false,
    init: function() {
        if (!this._initialized) {
            this._setupEventListeners();
            this._initialized = true;
        }
    },

    _setupEventListeners: function() {
        var self = this;

        var detectBtn = document.getElementById('btn-detect-columns');
        if (detectBtn) {
            detectBtn.addEventListener('click', function() { self._step1DetectColumns(); });
        }

        var resetBtn = document.getElementById('btn-reset-customizer');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() { self._reset(); });
        }

        var confirmBtn = document.getElementById('btn-confirm-types');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() { self._step2ConfirmTypes(); });
        }

        var generateBtn = document.getElementById('btn-generate-code');
        if (generateBtn) {
            generateBtn.addEventListener('click', function() { self._step3GenerateCode(); });
        }

        var copyBtn = document.getElementById('btn-copy-code-custom');
        if (copyBtn) {
            copyBtn.addEventListener('click', function() { self._copyCode(); });
        }

        var downloadBtn = document.getElementById('btn-download-code');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', function() { self._downloadCode(); });
        }
    },

    // ==================== 외부 호출 ====================
    initForTest: function(testId) {
        this.testId = testId;
        this._updateTestLabel();
        this.init();
        this._showStep(1);
    },

    _updateTestLabel: function() {
        var req = window.AutoStat.TEST_VARIABLE_REQUIREMENTS[this.testId];
        var el = document.getElementById('customizer-test-name');
        if (el && req) {
            el.textContent = req.label;
        }
    },

    // ==================== Step 1: 컬럼 감지 ====================
    _step1DetectColumns: function() {
        var columnInput = document.getElementById('column-input');
        var filePathInput = document.getElementById('file-path-input');
        var fileFormatSelect = document.getElementById('file-format-select');

        if (!columnInput) return;

        var input = columnInput.value.trim();
        if (!input) {
            this._showToast('컬럼 텍스트를 입력해주세요.', 'error');
            return;
        }

        // 파일 경로
        this.filePath = filePathInput ? filePathInput.value.trim() : '';
        this.fileFormat = fileFormatSelect ? fileFormatSelect.value : 'xlsx';

        // 파싱
        this.columns = window.AutoStat.ColumnParser.parse(input);
        if (this.columns.length === 0) {
            this._showToast('유효한 컬럼을 찾을 수 없습니다.', 'error');
            return;
        }

        // 타입 감지
        this.columnTypes = window.AutoStat.TypeDetector.detectMultiple(this.columns);

        // UI 렌더링
        this._renderColumnTypes();
        this._showStep(2);
        this._showToast(this.columns.length + '개 컬럼이 감지되었습니다.', 'success');
    },

    _renderColumnTypes: function() {
        var containerEl = document.getElementById('column-types');
        if (!containerEl) return;

        var self = this;
        var html = '';

        this.columns.forEach(function(col) {
            var detectedType = self.columnTypes[col] || 'continuous';
            html += '<div class="column-type-item">' +
                '<div class="column-name">' + col + '</div>' +
                '<select class="type-select" data-column="' + col + '">' +
                    '<option value="continuous"' + (detectedType === 'continuous' ? ' selected' : '') + '>연속형 (숫자)</option>' +
                    '<option value="categorical"' + (detectedType === 'categorical' ? ' selected' : '') + '>범주형 (그룹)</option>' +
                    '<option value="ordinal"' + (detectedType === 'ordinal' ? ' selected' : '') + '>순서형 (등급)</option>' +
                '</select>' +
            '</div>';
        });

        containerEl.innerHTML = html;
    },

    // ==================== Step 2: 타입 확인 → 변수 매핑 ====================
    _step2ConfirmTypes: function() {
        var self = this;

        // 사용자 선택 타입 읽기
        var typeSelects = document.querySelectorAll('.type-select');
        typeSelects.forEach(function(select) {
            var col = select.getAttribute('data-column');
            self.columnTypes[col] = select.value;
        });

        // 변수 매핑 UI 렌더링
        this._renderVariableMapping();
        this._showStep(3);
    },

    _renderVariableMapping: function() {
        var container = document.getElementById('variable-mapping');
        if (!container) return;

        var req = window.AutoStat.TEST_VARIABLE_REQUIREMENTS[this.testId];
        if (!req) {
            container.innerHTML = '<p class="mapping-error">이 테스트의 변수 요구사항이 정의되지 않았습니다.</p>';
            return;
        }

        var self = this;
        var html = '';

        // 테스트별 안내 메시지
        if (req.note) {
            html += '<div class="mapping-note">' + req.note + '</div>';
        }

        // 필수 변수 매핑
        req.variables.forEach(function(v) {
            html += self._buildVariableSelect(v.role, v.label, v.type, v.help);
        });

        // 선택적 변수 매핑
        if (req.optionalVariables) {
            html += '<div class="mapping-optional-header">추가 변수 (선택사항)</div>';
            req.optionalVariables.forEach(function(v) {
                html += self._buildVariableSelect(v.role, v.label, v.type, v.help, true);
            });
        }

        // 다중 IV 선택 (회귀분석 등)
        if (req.multiIV) {
            html += self._buildMultiIVCheckboxes(req.multiIVLabel, req.multiIVHelp);
        }

        // 추가 입력 (기준값 등)
        if (req.extras) {
            html += '<div class="mapping-optional-header">분석 옵션</div>';
            req.extras.forEach(function(ex) {
                html += self._buildExtraInput(ex);
            });
        }

        container.innerHTML = html;
    },

    _buildVariableSelect: function(role, label, preferredType, helpText, isOptional) {
        var self = this;
        var cssClass = isOptional ? 'mapping-group mapping-optional' : 'mapping-group';
        var html = '<div class="' + cssClass + '">';
        html += '<label class="mapping-label">' + label + '</label>';
        if (helpText) {
            html += '<span class="mapping-help">' + helpText + '</span>';
        }
        html += '<select class="mapping-select" data-role="' + role + '"' + (isOptional ? ' data-optional="true"' : '') + '>';
        html += '<option value="">' + (isOptional ? '-- 사용 안 함 --' : '-- 선택하세요 --') + '</option>';

        this.columns.forEach(function(col) {
            var type = self.columnTypes[col];
            var typeLabel = type === 'continuous' ? '숫자' : (type === 'categorical' ? '그룹' : '등급');
            var recommended = (type === preferredType) ? ' *' : '';
            html += '<option value="' + col + '">' + col + ' (' + typeLabel + ')' + recommended + '</option>';
        });

        html += '</select>';
        html += '</div>';
        return html;
    },

    _buildMultiIVCheckboxes: function(label, helpText) {
        var self = this;
        var html = '<div class="mapping-group">';
        html += '<label class="mapping-label">' + label + '</label>';
        if (helpText) {
            html += '<span class="mapping-help">' + helpText + '</span>';
        }
        html += '<div class="mapping-checkboxes">';

        this.columns.forEach(function(col, idx) {
            var type = self.columnTypes[col];
            var typeLabel = type === 'continuous' ? '숫자' : (type === 'categorical' ? '그룹' : '등급');
            html += '<div class="checkbox-item">';
            html += '<input type="checkbox" id="multi-iv-' + idx + '" value="' + col + '" class="multi-iv-checkbox">';
            html += '<label for="multi-iv-' + idx + '">' + col + ' (' + typeLabel + ')</label>';
            html += '</div>';
        });

        html += '</div></div>';
        return html;
    },

    _buildExtraInput: function(extra) {
        var html = '<div class="mapping-group">';
        html += '<label class="mapping-label">' + extra.label + '</label>';
        if (extra.help) {
            html += '<span class="mapping-help">' + extra.help + '</span>';
        }
        if (extra.inputType === 'select' && extra.options) {
            html += '<select class="mapping-input mapping-select" data-extra="' + extra.role + '">';
            extra.options.forEach(function(opt) {
                var selected = (opt === extra.defaultValue) ? ' selected' : '';
                html += '<option value="' + opt + '"' + selected + '>' + opt + '</option>';
            });
            html += '</select>';
        } else {
            html += '<input type="' + (extra.inputType || 'text') + '" class="mapping-input" data-extra="' + extra.role + '" value="' + (extra.defaultValue || '') + '">';
        }
        html += '</div>';
        return html;
    },

    // ==================== Step 3: 코드 생성 ====================
    _step3GenerateCode: function() {
        // 매핑 수집
        var self = this;
        this.variableMapping = {};

        var selects = document.querySelectorAll('.mapping-select');
        selects.forEach(function(sel) {
            var role = sel.getAttribute('data-role');
            if (sel.value) {
                self.variableMapping[role] = sel.value;
            }
        });

        // 다중 IV
        this.multiIVSelections = [];
        var checkboxes = document.querySelectorAll('.multi-iv-checkbox:checked');
        checkboxes.forEach(function(cb) {
            self.multiIVSelections.push(cb.value);
        });

        // 추가값
        this.extraValues = {};
        var extraInputs = document.querySelectorAll('.mapping-input');
        extraInputs.forEach(function(inp) {
            var key = inp.getAttribute('data-extra');
            if (key) {
                self.extraValues[key] = inp.value;
            }
        });

        // 필수 변수 검증
        var req = window.AutoStat.TEST_VARIABLE_REQUIREMENTS[this.testId];
        if (req) {
            for (var i = 0; i < req.variables.length; i++) {
                var v = req.variables[i];
                if (v.required && !this.variableMapping[v.role]) {
                    this._showToast('"' + v.label + '"을(를) 선택해주세요.', 'error');
                    return;
                }
            }
            if (req.multiIV && this.multiIVSelections.length === 0) {
                this._showToast('독립변수를 최소 1개 선택해주세요.', 'error');
                return;
            }
        }

        // R 코드 생성
        this.customizedCode = this._generateCustomCode();

        if (this.customizedCode) {
            this._displayCode(this.customizedCode);
            this._showStep('result');
            this._showToast('R 코드가 생성되었습니다!', 'success');
        }
    },

    // ==================== R 코드 생성 엔진 ====================
    _generateCustomCode: function() {
        var gen = window.AutoStat.RCodeGenerators[this.testId];
        if (!gen) {
            return this._generateGenericCode();
        }

        var code = gen.call(this, {
            filePath: this.filePath,
            fileFormat: this.fileFormat,
            vars: this.variableMapping,
            multiIV: this.multiIVSelections,
            extras: this.extraValues,
            columnTypes: this.columnTypes
        });

        // 엑셀 결과 내보내기 코드 추가
        code += this._generateExcelExportCode();
        return code;
    },

    _generateExcelExportCode: function() {
        var code = '\n\n';
        code += '# ──── 99. 엑셀 결과 내보내기 ────\n';
        code += 'if (!require(writexl)) install.packages("writexl")\n';
        code += 'library(writexl)\n\n';
        code += 'result_sheets <- list()\n\n';

        // htest 객체 → data.frame 변환 헬퍼
        code += '# htest 결과 변환 헬퍼\n';
        code += 'htest_to_df <- function(x) {\n';
        code += '  df <- data.frame(검정방법 = x$method, 통계량 = round(unname(x$statistic), 4), p값 = round(x$p.value, 4))\n';
        code += '  if (!is.null(x$parameter)) df$자유도 <- round(unname(x$parameter), 2)\n';
        code += '  if (!is.null(x$conf.int)) { df$CI_하한 <- round(x$conf.int[1], 4); df$CI_상한 <- round(x$conf.int[2], 4) }\n';
        code += '  if (!is.null(x$estimate)) for (i in seq_along(x$estimate)) df[[names(x$estimate)[i]]] <- round(unname(x$estimate[i]), 4)\n';
        code += '  df\n';
        code += '}\n\n';

        var testId = this.testId;
        var req = window.AutoStat.TEST_VARIABLE_REQUIREMENTS[testId];
        var label = req ? req.label : testId;
        var vars = this.variableMapping || {};
        var fp = this.filePath ? this.filePath.replace(/\\/g, '/').replace(/^["']+|["']+$/g, '') : '';
        var fileName = fp ? fp.split('/').pop() : '(직접입력)';

        // 변수 정보 문자열
        var varParts = [];
        if (vars.dv) varParts.push('DV: ' + vars.dv);
        if (vars.group) varParts.push('Group: ' + vars.group);
        if (vars.iv) varParts.push('IV: ' + vars.iv);
        if (vars.time) varParts.push('Time: ' + vars.time);
        if (vars.subj) varParts.push('ID: ' + vars.subj);
        if (vars.cov) varParts.push('Cov: ' + vars.cov);
        if (vars.var_x) varParts.push('X: ' + vars.var_x);
        if (vars.var_y) varParts.push('Y: ' + vars.var_y);
        if (vars.pre) varParts.push('Pre: ' + vars.pre);
        if (vars.post) varParts.push('Post: ' + vars.post);
        if (vars.row_var) varParts.push('Row: ' + vars.row_var);
        if (vars.col_var) varParts.push('Col: ' + vars.col_var);
        var varStr = (varParts.join(', ') || '-').replace(/"/g, "'");

        // ──── 분석정보 시트 (공통) ────
        code += '# ──── 분석정보 ────\n';
        code += 'result_sheets[["분석정보"]] <- data.frame(\n';
        code += '  항목 = c("분석방법", "데이터파일", "분석일시", "변수"),\n';
        code += '  내용 = c("' + label + '", "' + fileName.replace(/"/g, "'") + '", as.character(Sys.time()), "' + varStr + '")\n';
        code += ')\n\n';

        // ════════════════════════════════════════
        // Category A: t-검정 / 비모수 동등검정
        // ════════════════════════════════════════
        if (['one_sample_t', 'independent_t', 'paired_t', 'mann_whitney', 'wilcoxon_signed_rank'].indexOf(testId) !== -1) {

            // 기술통계
            code += '# ──── 기술통계 ────\n';
            if (testId === 'one_sample_t') {
                var dvCol = vars.dv ? 'dfAnalysis$`' + vars.dv + '`' : 'dfAnalysis[,1]';
                code += 'if (exists("dfAnalysis")) {\n';
                code += '  desc_df <- data.frame(N = nrow(dfAnalysis), 평균 = round(mean(' + dvCol + '), 4),\n';
                code += '    표준편차 = round(sd(' + dvCol + '), 4), 중앙값 = round(median(' + dvCol + '), 4),\n';
                code += '    최솟값 = round(min(' + dvCol + '), 4), 최댓값 = round(max(' + dvCol + '), 4))\n';
                code += '  result_sheets[["기술통계"]] <- desc_df\n';
                code += '}\n\n';
            } else {
                code += 'if (exists("desc")) {\n';
                code += '  result_sheets[["기술통계"]] <- tryCatch(as.data.frame(desc), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n\n';
            }

            // 정규성 검정
            code += '# ──── 정규성 검정 ────\n';
            if (testId === 'one_sample_t') {
                code += 'if (exists("shapiro_result")) {\n';
                code += '  result_sheets[["정규성검정"]] <- tryCatch(htest_to_df(shapiro_result), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n\n';
            } else if (testId === 'paired_t') {
                code += 'if (exists("shapiro_diff")) {\n';
                code += '  result_sheets[["정규성검정"]] <- tryCatch(htest_to_df(shapiro_diff), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n\n';
            } else if (testId === 'independent_t') {
                code += 'if (exists("norm_test")) {\n';
                code += '  result_sheets[["정규성검정"]] <- tryCatch(as.data.frame(norm_test), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n\n';
                // 등분산 검정
                code += '# ──── 등분산 검정 ────\n';
                code += 'if (exists("lev_test")) {\n';
                code += '  result_sheets[["등분산검정"]] <- tryCatch(as.data.frame(lev_test), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n\n';
            }

            // 검정 결과
            code += '# ──── 검정 결과 ────\n';
            if (testId === 'independent_t') {
                code += 'test_rows <- list()\n';
                code += 'if (exists("t_equal")) test_rows[["등분산"]] <- tryCatch(htest_to_df(t_equal), error = function(e) data.frame(오류 = e$message))\n';
                code += 'if (exists("t_welch")) test_rows[["이분산"]] <- tryCatch(htest_to_df(t_welch), error = function(e) data.frame(오류 = e$message))\n';
                code += 'if (length(test_rows) > 0) result_sheets[["검정결과"]] <- do.call(rbind, test_rows)\n\n';
            } else if (testId === 'one_sample_t' || testId === 'paired_t') {
                code += 'if (exists("t_result")) {\n';
                code += '  result_sheets[["검정결과"]] <- tryCatch(htest_to_df(t_result), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n\n';
            } else if (testId === 'mann_whitney' || testId === 'wilcoxon_signed_rank') {
                code += 'if (exists("wilcox_result")) {\n';
                code += '  result_sheets[["검정결과"]] <- tryCatch(htest_to_df(wilcox_result), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n\n';
            }

            // 효과 크기
            code += '# ──── 효과 크기 ────\n';
            code += 'if (exists("d_result")) result_sheets[["효과크기"]] <- tryCatch(as.data.frame(d_result), error = function(e) data.frame(오류 = e$message))\n';
            code += 'if (exists("eff")) result_sheets[["효과크기"]] <- tryCatch(as.data.frame(eff), error = function(e) data.frame(오류 = e$message))\n';
            if (testId === 'wilcoxon_signed_rank') {
                code += 'if (exists("r_effect")) {\n';
                code += '  result_sheets[["효과크기"]] <- data.frame(효과크기_r = round(r_effect, 4),\n';
                code += '    해석 = ifelse(abs(r_effect) < 0.3, "작은 효과", ifelse(abs(r_effect) < 0.5, "중간 효과", "큰 효과")))\n';
                code += '}\n';
            }
            code += '\n';

        // ════════════════════════════════════════
        // Category B: ANOVA 계열
        // ════════════════════════════════════════
        } else if (['one_way_anova', 'two_way_anova', 'repeated_anova', 'mixed_anova', 'kruskal_wallis', 'friedman', 'ancova'].indexOf(testId) !== -1) {

            // 기술통계
            code += '# ──── 기술통계 ────\n';
            code += 'if (exists("desc")) {\n';
            code += '  result_sheets[["기술통계"]] <- tryCatch(as.data.frame(desc), error = function(e) data.frame(오류 = e$message))\n';
            code += '}\n\n';

            // 가정 검정
            code += '# ──── 가정 검정 ────\n';
            if (testId === 'one_way_anova') {
                code += 'if (exists("norm_test")) {\n';
                code += '  result_sheets[["정규성검정"]] <- tryCatch(as.data.frame(norm_test), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n';
            }
            if (testId === 'ancova') {
                code += 'if (exists("homo_model")) {\n';
                code += '  result_sheets[["가정검정_기울기동질성"]] <- tryCatch(\n';
                code += '    as.data.frame(Anova(homo_model, type = "III")),\n';
                code += '    error = function(e) data.frame(메시지 = "회귀 기울기 동질성 검정 완료"))\n';
                code += '}\n';
            }
            if (['repeated_anova', 'mixed_anova'].indexOf(testId) !== -1) {
                code += 'if (exists("aov_result")) {\n';
                code += '  mauchly_df <- tryCatch(as.data.frame(summary(aov_result)$sphericity.tests), error = function(e) NULL)\n';
                code += '  if (!is.null(mauchly_df)) result_sheets[["구형성검정_Mauchly"]] <- mauchly_df\n';
                code += '  pgg <- tryCatch(as.data.frame(summary(aov_result)$pval.adjustments), error = function(e) NULL)\n';
                code += '  if (!is.null(pgg)) result_sheets[["구형성보정_GG_HF"]] <- pgg\n';
                code += '}\n';
            }
            if (testId === 'two_way_anova') {
                code += 'if (exists("interaction_model")) {\n';
                code += '  result_sheets[["가정검정_상호작용"]] <- tryCatch(\n';
                code += '    as.data.frame(Anova(interaction_model, type = "III")),\n';
                code += '    error = function(e) data.frame(메시지 = "상호작용 검정 완료"))\n';
                code += '}\n';
            }
            code += '\n';

            // 분석 결과
            code += '# ──── 분석 결과 ────\n';
            if (['repeated_anova', 'mixed_anova'].indexOf(testId) !== -1) {
                code += 'if (exists("aov_result")) {\n';
                code += '  result_sheets[["분석결과"]] <- tryCatch(nice(aov_result), error = function(e) {\n';
                code += '    tryCatch(as.data.frame(aov_result$anova_table), error = function(e2) data.frame(오류 = e2$message))\n';
                code += '  })\n';
                code += '}\n';
            } else if (testId === 'one_way_anova') {
                code += 'if (exists("anova_model")) {\n';
                code += '  result_sheets[["분석결과"]] <- tryCatch(\n';
                code += '    as.data.frame(Anova(anova_model, type = "III")),\n';
                code += '    error = function(e) tryCatch(as.data.frame(summary(anova_model)[[1]]), error = function(e2) data.frame(오류 = e2$message)))\n';
                code += '}\n';
            } else if (testId === 'ancova') {
                code += 'if (exists("ancova_model")) {\n';
                code += '  result_sheets[["분석결과"]] <- tryCatch(\n';
                code += '    as.data.frame(Anova(ancova_model, type = "III")),\n';
                code += '    error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n';
            } else if (testId === 'kruskal_wallis') {
                code += 'if (exists("kw")) {\n';
                code += '  result_sheets[["분석결과"]] <- tryCatch(as.data.frame(kw), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n';
            } else if (testId === 'friedman') {
                code += 'if (exists("fried")) {\n';
                code += '  result_sheets[["분석결과"]] <- tryCatch(as.data.frame(fried), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n';
            } else if (testId === 'two_way_anova') {
                code += 'if (exists("model")) {\n';
                code += '  result_sheets[["분석결과"]] <- tryCatch(\n';
                code += '    as.data.frame(Anova(model, type = "III")),\n';
                code += '    error = function(e) tryCatch(as.data.frame(summary(model)[[1]]), error = function(e2) data.frame(오류 = e2$message)))\n';
                code += '}\n';
            }
            code += '\n';

            // 사후 검정
            code += '# ──── 사후 검정 ────\n';
            code += 'if (exists("tukey")) result_sheets[["사후검정"]] <- tryCatch(as.data.frame(tukey), error = function(e) data.frame(오류 = e$message))\n';
            code += 'if (exists("dunn")) result_sheets[["사후검정"]] <- tryCatch(as.data.frame(dunn), error = function(e) data.frame(오류 = e$message))\n';
            code += 'if (exists("pwc")) result_sheets[["사후검정"]] <- tryCatch(as.data.frame(pwc), error = function(e) data.frame(오류 = e$message))\n';
            code += 'if (exists("emm")) {\n';
            code += '  result_sheets[["추정주변평균"]] <- tryCatch(as.data.frame(emm), error = function(e) data.frame(오류 = e$message))\n';
            code += '  emm_pairs <- tryCatch(as.data.frame(pairs(emm)), error = function(e) NULL)\n';
            code += '  if (!is.null(emm_pairs)) result_sheets[["사후검정_대비"]] <- emm_pairs\n';
            code += '}\n';
            code += 'if (exists("pairs_result")) result_sheets[["사후검정_대비"]] <- tryCatch(as.data.frame(pairs_result), error = function(e) data.frame(오류 = e$message))\n\n';

            // 효과 크기
            code += '# ──── 효과 크기 ────\n';
            code += 'if (exists("eta")) result_sheets[["효과크기"]] <- tryCatch(as.data.frame(eta), error = function(e) data.frame(오류 = e$message))\n';
            code += 'if (exists("eff")) result_sheets[["효과크기"]] <- tryCatch(as.data.frame(eff), error = function(e) data.frame(오류 = e$message))\n\n';

        // ════════════════════════════════════════
        // Category C: 범주형 검정
        // ════════════════════════════════════════
        } else if (['chi_square', 'fisher_exact', 'mcnemar'].indexOf(testId) !== -1) {

            // 교차표
            code += '# ──── 교차표 ────\n';
            code += 'if (exists("observed")) {\n';
            code += '  result_sheets[["교차표_관측빈도"]] <- tryCatch(as.data.frame.matrix(observed), error = function(e) data.frame(오류 = e$message))\n';
            code += '}\n';
            if (testId !== 'mcnemar') {
                code += 'if (exists("expected")) {\n';
                code += '  result_sheets[["교차표_기대빈도"]] <- tryCatch(as.data.frame.matrix(round(expected, 2)), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n';
            }
            code += '\n';

            // 검정 결과
            code += '# ──── 검정 결과 ────\n';
            if (testId === 'chi_square') {
                code += 'if (exists("chisq_result")) {\n';
                code += '  result_sheets[["검정결과"]] <- tryCatch(htest_to_df(chisq_result), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n';
            } else if (testId === 'fisher_exact') {
                code += 'if (exists("fisher_result")) {\n';
                code += '  result_sheets[["검정결과"]] <- tryCatch(htest_to_df(fisher_result), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n';
            } else if (testId === 'mcnemar') {
                code += 'if (exists("mcnemar_result")) {\n';
                code += '  mc_df <- tryCatch(htest_to_df(mcnemar_result), error = function(e) data.frame(오류 = e$message))\n';
                code += '  if (exists("exact_p")) mc_df$정확검정_p값 <- round(exact_p, 4)\n';
                code += '  result_sheets[["검정결과"]] <- mc_df\n';
                code += '}\n';
            }
            code += '\n';

            // 효과 크기
            code += '# ──── 효과 크기 ────\n';
            code += 'if (exists("cv")) result_sheets[["효과크기_CramersV"]] <- tryCatch(as.data.frame(cv), error = function(e) data.frame(오류 = e$message))\n';
            if (testId === 'chi_square') {
                code += 'if (exists("or")) result_sheets[["오즈비"]] <- tryCatch(data.frame(OR = round(or, 4)), error = function(e) data.frame(오류 = e$message))\n';
            }
            if (testId === 'mcnemar') {
                code += 'if (exists("or_disc")) result_sheets[["오즈비_불일치"]] <- data.frame(OR = round(or_disc, 4))\n';
                code += 'if (exists("cohens_g")) result_sheets[["효과크기_CohenG"]] <- data.frame(Cohens_g = round(cohens_g, 4))\n';
            }
            code += '\n';

        // ════════════════════════════════════════
        // Category D: 상관분석
        // ════════════════════════════════════════
        } else if (['pearson_correlation', 'spearman_correlation', 'point_biserial'].indexOf(testId) !== -1) {

            // 기술통계
            code += '# ──── 기술통계 ────\n';
            code += 'if (exists("desc")) result_sheets[["기술통계"]] <- tryCatch(as.data.frame(desc), error = function(e) data.frame(오류 = e$message))\n\n';

            // 정규성 검정
            if (testId === 'pearson_correlation') {
                code += '# ──── 정규성 검정 ────\n';
                code += 'norm_rows <- list()\n';
                code += 'if (exists("sw_x")) norm_rows[["X"]] <- tryCatch(htest_to_df(sw_x), error = function(e) data.frame(오류 = e$message))\n';
                code += 'if (exists("sw_y")) norm_rows[["Y"]] <- tryCatch(htest_to_df(sw_y), error = function(e) data.frame(오류 = e$message))\n';
                code += 'if (length(norm_rows) > 0) result_sheets[["정규성검정"]] <- do.call(rbind, norm_rows)\n\n';
            } else if (testId === 'point_biserial') {
                code += '# ──── 정규성 검정 ────\n';
                code += 'if (exists("norm_test")) result_sheets[["정규성검정"]] <- tryCatch(as.data.frame(norm_test), error = function(e) data.frame(오류 = e$message))\n\n';
            }

            // 상관분석 결과
            code += '# ──── 상관분석 결과 ────\n';
            code += 'if (exists("tidy_cor")) {\n';
            code += '  result_sheets[["상관분석결과"]] <- tryCatch(as.data.frame(tidy_cor), error = function(e) data.frame(오류 = e$message))\n';
            code += '} else if (exists("cor_result")) {\n';
            code += '  result_sheets[["상관분석결과"]] <- tryCatch(htest_to_df(cor_result), error = function(e) data.frame(오류 = e$message))\n';
            code += '}\n\n';

            // 상관행렬
            code += '# ──── 상관 행렬 ────\n';
            code += 'if (exists("cor_matrix")) result_sheets[["상관행렬"]] <- tryCatch(as.data.frame(cor_matrix), error = function(e) data.frame(오류 = e$message))\n';
            code += 'if (exists("all_cors")) result_sheets[["모든_상관분석"]] <- tryCatch(as.data.frame(all_cors), error = function(e) data.frame(오류 = e$message))\n\n';

            // 효과 크기
            code += '# ──── 효과 크기 ────\n';
            if (testId === 'pearson_correlation') {
                code += 'if (exists("r") && exists("r2")) {\n';
                code += '  result_sheets[["효과크기"]] <- data.frame(r = round(r, 4), R2 = round(r2, 4),\n';
                code += '    해석 = ifelse(abs(r) < 0.3, "작은 상관", ifelse(abs(r) < 0.5, "중간 상관", "큰 상관")))\n';
                code += '}\n';
            } else if (testId === 'spearman_correlation') {
                code += 'if (exists("rho")) {\n';
                code += '  result_sheets[["효과크기"]] <- data.frame(rho = round(rho, 4),\n';
                code += '    해석 = ifelse(abs(rho) < 0.3, "작은 상관", ifelse(abs(rho) < 0.5, "중간 상관", "큰 상관")))\n';
                code += '}\n';
            } else if (testId === 'point_biserial') {
                code += 'if (exists("d_result")) result_sheets[["효과크기"]] <- tryCatch(as.data.frame(d_result), error = function(e) data.frame(오류 = e$message))\n';
            }
            code += '\n';

        // ════════════════════════════════════════
        // Category E: 선형 회귀분석
        // ════════════════════════════════════════
        } else if (['simple_regression', 'multiple_regression', 'dummy_regression'].indexOf(testId) !== -1) {

            // 모형 적합도
            code += '# ──── 모형 적합도 ────\n';
            code += 'if (exists("model")) {\n';
            code += '  s <- summary(model)\n';
            code += '  result_sheets[["모형적합도"]] <- tryCatch(data.frame(\n';
            code += '    R2 = round(s$r.squared, 4), Adj_R2 = round(s$adj.r.squared, 4),\n';
            code += '    F통계량 = round(s$fstatistic[1], 4), F_df1 = s$fstatistic[2], F_df2 = s$fstatistic[3],\n';
            code += '    p값 = round(pf(s$fstatistic[1], s$fstatistic[2], s$fstatistic[3], lower.tail = FALSE), 4)\n';
            code += '  ), error = function(e) data.frame(오류 = e$message))\n';
            code += '}\n\n';

            // 회귀계수
            code += '# ──── 회귀계수 ────\n';
            code += 'if (exists("model")) {\n';
            code += '  coef_df <- tryCatch({\n';
            code += '    cf <- as.data.frame(summary(model)$coefficients)\n';
            code += '    cf$변수 <- rownames(cf)\n';
            code += '    cf <- cf[, c(ncol(cf), 1:(ncol(cf)-1))]\n';
            code += '    cf\n';
            code += '  }, error = function(e) data.frame(오류 = e$message))\n';
            code += '  result_sheets[["회귀계수"]] <- coef_df\n';
            code += '}\n\n';

            // 표준화 계수
            code += '# ──── 표준화 계수 ────\n';
            code += 'if (exists("std_coef")) result_sheets[["표준화계수"]] <- tryCatch(as.data.frame(std_coef), error = function(e) data.frame(오류 = e$message))\n\n';

            // VIF (multiple only)
            if (testId === 'multiple_regression') {
                code += '# ──── 다중공선성 (VIF) ────\n';
                code += 'if (exists("vif_result")) {\n';
                code += '  result_sheets[["다중공선성_VIF"]] <- tryCatch({\n';
                code += '    if (is.vector(vif_result)) data.frame(변수 = names(vif_result), VIF = round(vif_result, 4))\n';
                code += '    else as.data.frame(vif_result)\n';
                code += '  }, error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n\n';
            }

            // 잔차 진단
            code += '# ──── 잔차 진단 ────\n';
            code += 'resid_rows <- list()\n';
            code += 'if (exists("sw")) resid_rows[["정규성"]] <- tryCatch(data.frame(검정 = "Shapiro-Wilk", 통계량 = round(sw$statistic, 4), p값 = round(sw$p.value, 4)), error = function(e) data.frame(오류 = e$message))\n';
            code += 'if (exists("dw")) resid_rows[["독립성"]] <- tryCatch(data.frame(검정 = "Durbin-Watson", 통계량 = round(dw$dw, 4), p값 = round(dw$p, 4)), error = function(e) data.frame(오류 = e$message))\n';
            code += 'if (length(resid_rows) > 0) result_sheets[["잔차진단"]] <- do.call(rbind, resid_rows)\n\n';

            // dummy_regression: ANOVA + emmeans
            if (testId === 'dummy_regression') {
                code += '# ──── ANOVA 표 (Type III) ────\n';
                code += 'if (exists("anova_result")) result_sheets[["ANOVA표"]] <- tryCatch(as.data.frame(anova_result), error = function(e) data.frame(오류 = e$message))\n\n';
                code += '# ──── 효과 크기 ────\n';
                code += 'if (exists("eta")) result_sheets[["효과크기"]] <- tryCatch(as.data.frame(eta), error = function(e) data.frame(오류 = e$message))\n\n';
                code += '# ──── 추정 주변 평균 ────\n';
                code += 'for (v in ls(pattern = "^emm_")) {\n';
                code += '  emm_obj <- get(v)\n';
                code += '  result_sheets[[paste0("추정평균_", gsub("emm_", "", v))]] <- tryCatch(as.data.frame(emm_obj), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n\n';
            }

        // ════════════════════════════════════════
        // Category F: 로지스틱 회귀
        // ════════════════════════════════════════
        } else if (['logistic_regression', 'multinomial_logistic', 'ordinal_regression'].indexOf(testId) !== -1) {

            // 모형 계수
            code += '# ──── 모형 계수 ────\n';
            code += 'if (exists("model")) {\n';
            code += '  coef_df <- tryCatch({\n';
            code += '    cf <- as.data.frame(summary(model)$coefficients)\n';
            code += '    cf$변수 <- rownames(cf)\n';
            code += '    cf <- cf[, c(ncol(cf), 1:(ncol(cf)-1))]\n';
            code += '    cf\n';
            code += '  }, error = function(e) data.frame(오류 = e$message))\n';
            code += '  result_sheets[["모형계수"]] <- coef_df\n';
            code += '}\n\n';

            // OR + CI
            code += '# ──── OR 및 신뢰구간 ────\n';
            code += 'if (exists("or_table")) result_sheets[["OR_신뢰구간"]] <- tryCatch(as.data.frame(or_table), error = function(e) data.frame(오류 = e$message))\n';
            if (testId === 'multinomial_logistic') {
                code += 'if (!exists("or_table") && exists("or_vals") && exists("ci")) {\n';
                code += '  result_sheets[["OR_신뢰구간"]] <- tryCatch(\n';
                code += '    data.frame(OR = round(or_vals, 4), CI_lower = round(ci[,1], 4), CI_upper = round(ci[,2], 4)),\n';
                code += '    error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n';
            }
            code += '\n';

            // 모형 적합도 (logistic)
            if (testId === 'logistic_regression') {
                code += '# ──── 모형 적합도 ────\n';
                code += 'fit_items <- c()\n';
                code += 'fit_vals <- c()\n';
                code += 'if (exists("cox_snell")) { fit_items <- c(fit_items, "Cox_Snell_R2"); fit_vals <- c(fit_vals, round(cox_snell, 4)) }\n';
                code += 'if (exists("nagelkerke")) { fit_items <- c(fit_items, "Nagelkerke_R2"); fit_vals <- c(fit_vals, round(nagelkerke, 4)) }\n';
                code += 'if (exists("roc_result")) { fit_items <- c(fit_items, "AUC"); fit_vals <- c(fit_vals, round(auc(roc_result), 4)) }\n';
                code += 'if (length(fit_items) > 0) result_sheets[["모형적합도"]] <- data.frame(지표 = fit_items, 값 = fit_vals)\n\n';
                code += 'if (exists("hl_test")) {\n';
                code += '  result_sheets[["Hosmer_Lemeshow"]] <- tryCatch(data.frame(\n';
                code += '    카이제곱 = round(hl_test$statistic, 4), 자유도 = hl_test$parameter, p값 = round(hl_test$p.value, 4)\n';
                code += '  ), error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n\n';
            }

            // 우도비 검정 (multinomial)
            if (testId === 'multinomial_logistic') {
                code += '# ──── 우도비 검정 ────\n';
                code += 'if (exists("lr_test")) result_sheets[["우도비검정"]] <- tryCatch(as.data.frame(lr_test), error = function(e) data.frame(오류 = e$message))\n\n';
            }

            // 분류 결과
            code += '# ──── 분류 결과 ────\n';
            code += 'if (exists("confusion")) {\n';
            code += '  result_sheets[["분류결과_혼동행렬"]] <- tryCatch(\n';
            code += '    as.data.frame.matrix(confusion),\n';
            code += '    error = function(e) tryCatch(as.data.frame(confusion), error = function(e2) data.frame(오류 = e2$message)))\n';
            code += '}\n';
            if (testId === 'logistic_regression') {
                code += 'if (exists("acc") && exists("sensitivity") && exists("specificity")) {\n';
                code += '  result_sheets[["분류성능"]] <- data.frame(정확도 = round(acc, 4), 민감도 = round(sensitivity, 4), 특이도 = round(specificity, 4))\n';
                code += '}\n';
            }
            code += '\n';

            // 가정 검정 (ordinal)
            if (testId === 'ordinal_regression') {
                code += '# ──── 비례 오즈 가정 (Brant) ────\n';
                code += 'if (exists("brant_result")) result_sheets[["Brant검정"]] <- tryCatch(as.data.frame(brant_result), error = function(e) data.frame(메시지 = "Brant 검정 수행 완료"))\n\n';
            }

            // ctable (ordinal)
            if (testId === 'ordinal_regression') {
                code += 'if (exists("ctable")) {\n';
                code += '  ct_df <- tryCatch(as.data.frame(ctable), error = function(e) data.frame(오류 = e$message))\n';
                code += '  ct_df$변수 <- rownames(ct_df)\n';
                code += '  result_sheets[["모형계수_상세"]] <- ct_df\n';
                code += '}\n\n';
            }

        // ════════════════════════════════════════
        // Category G: GLM
        // ════════════════════════════════════════
        } else if (['glm_covariate', 'glm_anova'].indexOf(testId) !== -1) {

            // 기술통계
            code += '# ──── 기술통계 ────\n';
            code += 'if (exists("desc")) result_sheets[["기술통계"]] <- tryCatch(as.data.frame(desc), error = function(e) data.frame(오류 = e$message))\n';
            code += 'if (exists("cor_matrix")) result_sheets[["상관행렬"]] <- tryCatch(as.data.frame(cor_matrix), error = function(e) data.frame(오류 = e$message))\n\n';

            // ANOVA 결과
            code += '# ──── ANOVA 결과 (Type III) ────\n';
            code += 'if (exists("anova_result")) result_sheets[["ANOVA결과"]] <- tryCatch(as.data.frame(anova_result), error = function(e) data.frame(오류 = e$message))\n\n';

            // 회귀계수
            code += '# ──── 회귀계수 ────\n';
            code += 'if (exists("model")) {\n';
            code += '  coef_df <- tryCatch({\n';
            code += '    cf <- as.data.frame(summary(model)$coefficients)\n';
            code += '    cf$변수 <- rownames(cf)\n';
            code += '    cf <- cf[, c(ncol(cf), 1:(ncol(cf)-1))]\n';
            code += '    cf\n';
            code += '  }, error = function(e) data.frame(오류 = e$message))\n';
            code += '  result_sheets[["회귀계수"]] <- coef_df\n';
            code += '}\n\n';

            if (testId === 'glm_anova') {
                // 표준화 계수
                code += '# ──── 표준화 계수 ────\n';
                code += 'if (exists("std_coef")) result_sheets[["표준화계수"]] <- tryCatch(as.data.frame(std_coef), error = function(e) data.frame(오류 = e$message))\n\n';

                // VIF
                code += '# ──── 다중공선성 (VIF) ────\n';
                code += 'if (exists("vif_result")) {\n';
                code += '  result_sheets[["다중공선성_VIF"]] <- tryCatch({\n';
                code += '    if (is.vector(vif_result)) data.frame(변수 = names(vif_result), VIF = round(vif_result, 4))\n';
                code += '    else as.data.frame(vif_result)\n';
                code += '  }, error = function(e) data.frame(오류 = e$message))\n';
                code += '}\n\n';
            }

            if (testId === 'glm_covariate') {
                // 가정 검정
                code += '# ──── 가정 검정 (기울기 동질성) ────\n';
                code += 'if (exists("interaction_model")) {\n';
                code += '  result_sheets[["가정검정_기울기동질성"]] <- tryCatch(\n';
                code += '    as.data.frame(Anova(interaction_model, type = "III")),\n';
                code += '    error = function(e) data.frame(메시지 = "기울기 동질성 검정 완료"))\n';
                code += '}\n\n';

                // 사후 검정
                code += '# ──── 사후 검정 ────\n';
                code += 'if (exists("emm")) result_sheets[["추정주변평균"]] <- tryCatch(as.data.frame(emm), error = function(e) data.frame(오류 = e$message))\n';
                code += 'if (exists("pairs_result")) result_sheets[["사후검정_대비"]] <- tryCatch(as.data.frame(pairs_result), error = function(e) data.frame(오류 = e$message))\n\n';
            }

            // 효과 크기
            code += '# ──── 효과 크기 ────\n';
            code += 'if (exists("eta")) result_sheets[["효과크기"]] <- tryCatch(as.data.frame(eta), error = function(e) data.frame(오류 = e$message))\n\n';

            // 잔차 진단
            code += '# ──── 잔차 진단 ────\n';
            code += 'if (exists("sw")) result_sheets[["잔차진단"]] <- tryCatch(\n';
            code += '  data.frame(검정 = "Shapiro-Wilk", 통계량 = round(sw$statistic, 4), p값 = round(sw$p.value, 4)),\n';
            code += '  error = function(e) data.frame(오류 = e$message))\n\n';
        }

        // ════════════════════════════════════════
        // 공통: 엑셀 파일 저장
        // ════════════════════════════════════════
        var timestamp = 'format(Sys.time(), "%Y%m%d_%H%M")';
        code += '\n# ──── 엑셀 파일 저장 ────\n';
        if (fp) {
            code += 'output_dir <- dirname("' + fp + '")\n';
        } else {
            code += 'output_dir <- getwd()\n';
        }
        code += 'output_file <- file.path(output_dir, paste0("분석결과_' + label + '_", ' + timestamp + ', ".xlsx"))\n';
        code += 'write_xlsx(result_sheets, output_file)\n';
        code += 'cat("\\n========================================\\n")\n';
        code += 'cat("★ 결과가 엑셀 파일로 저장되었습니다!\\n")\n';
        code += 'cat("  파일명:", basename(output_file), "\\n")\n';
        code += 'cat("  저장 위치:", normalizePath(output_dir), "\\n")\n';
        code += 'cat("  시트 목록:", paste(names(result_sheets), collapse = ", "), "\\n")\n';
        code += 'cat("========================================\\n")\n';

        return code;
    },

    // ==================== R 코드 헬퍼 함수 ====================
    // 백틱 래핑 (한국어/공백 포함 변수명 보호)
    _bt: function(v) { return '`' + v + '`'; },
    // df$변수 (백틱 포함)
    _dfVar: function(v) { return 'df$`' + v + '`'; },
    // formula 생성: `dv` ~ `iv1` + `iv2`
    _formula: function(dv, ivs) {
        var bt = function(v) { return '`' + v + '`'; };
        if (typeof ivs === 'string') return bt(dv) + ' ~ ' + bt(ivs);
        return bt(dv) + ' ~ ' + ivs.map(bt).join(' + ');
    },
    // 인터랙션 formula: `dv` ~ `iv1` * `iv2`
    _formulaInteraction: function(dv, iv1, iv2) {
        var bt = function(v) { return '`' + v + '`'; };
        return bt(dv) + ' ~ ' + bt(iv1) + ' * ' + bt(iv2);
    },

    _generateDataLoadCode: function(filePath, fileFormat) {
        var code = '';
        var fp = filePath ? filePath.replace(/\\/g, '/').replace(/^["']+|["']+$/g, '') : '';

        if (fileFormat === 'xlsx') {
            code += '# 패키지 설치 (최초 1회)\n';
            code += 'if (!require(readxl)) install.packages("readxl")\n';
            code += 'library(readxl)\n\n';
            if (fp) {
                code += '# 데이터 불러오기\n';
                code += 'df <- read_excel("' + fp + '")\n';
            } else {
                code += '# 데이터 불러오기 (파일 경로를 입력하세요)\n';
                code += 'df <- read_excel("여기에_파일경로.xlsx")\n';
            }
        } else {
            if (fp) {
                code += '# 데이터 불러오기\n';
                code += 'df <- read.csv("' + fp + '", header = TRUE, fileEncoding = "UTF-8")\n';
            } else {
                code += '# 데이터 불러오기 (파일 경로를 입력하세요)\n';
                code += 'df <- read.csv("여기에_파일경로.csv", header = TRUE, fileEncoding = "UTF-8")\n';
            }
        }

        code += '\n# 데이터 확인\n';
        code += 'head(df)\n';
        code += 'str(df)\n';
        return code;
    },

    _generateGenericCode: function() {
        var code = '# ============================================\n';
        code += '# 커스터마이즈된 R 코드\n';
        code += '# ============================================\n\n';
        code += this._generateDataLoadCode(this.filePath, this.fileFormat);
        code += '\n# 변수 매핑 정보:\n';
        for (var role in this.variableMapping) {
            code += '# ' + role + ': ' + this.variableMapping[role] + '\n';
        }
        if (this.multiIVSelections.length > 0) {
            code += '# 독립변수: ' + this.multiIVSelections.join(', ') + '\n';
        }
        return code;
    },

    // ==================== UI 헬퍼 ====================
    _displayCode: function(code) {
        var codeDiv = document.getElementById('customized-code');
        if (!codeDiv) return;

        var escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        codeDiv.innerHTML = '<pre><code>' + escaped + '</code></pre>';
    },

    _showStep: function(stepNum) {
        var steps = document.querySelectorAll('#r-code-customizer .step');
        steps.forEach(function(step) { step.style.display = 'none'; });

        var resultDiv = document.querySelector('#r-code-customizer .customizer-result');
        if (resultDiv) resultDiv.style.display = 'none';

        if (stepNum === 'result') {
            if (resultDiv) resultDiv.style.display = 'block';
        } else {
            var stepDiv = document.querySelector('#r-code-customizer .step-' + stepNum);
            if (stepDiv) stepDiv.style.display = 'block';
        }
    },

    _showToast: function(message, type) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'toast toast-' + (type || 'info');
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 3000);
    },

    _copyCode: function() {
        var self = this;
        if (!this.customizedCode) {
            this._showToast('복사할 코드가 없습니다.', 'error');
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(this.customizedCode).then(function() {
                self._showToast('클립보드에 복사되었습니다!', 'success');
            }).catch(function() {
                self._fallbackCopy();
            });
        } else {
            this._fallbackCopy();
        }
    },

    _fallbackCopy: function() {
        var textArea = document.createElement('textarea');
        textArea.value = this.customizedCode;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            this._showToast('클립보드에 복사되었습니다!', 'success');
        } catch (e) {
            this._showToast('복사에 실패했습니다.', 'error');
        }
        document.body.removeChild(textArea);
    },

    _downloadCode: function() {
        if (!this.customizedCode) {
            this._showToast('다운로드할 코드가 없습니다.', 'error');
            return;
        }

        var testName = this.testId || 'r-code';
        var timestamp = new Date().toISOString().split('T')[0];
        var filename = testName + '_custom_' + timestamp + '.R';

        var bom = '\uFEFF';
        var blob = new Blob([bom + this.customizedCode], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);

        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this._showToast(filename + '로 다운로드되었습니다!', 'success');
    },

    _reset: function() {
        this.columns = [];
        this.columnTypes = {};
        this.variableMapping = {};
        this.multiIVSelections = [];
        this.extraValues = {};
        this.customizedCode = null;

        var textarea = document.getElementById('column-input');
        if (textarea) { textarea.value = ''; textarea.focus(); }

        var fileInput = document.getElementById('file-path-input');
        if (fileInput) fileInput.value = '';

        this._showStep(1);
        this._showToast('초기화되었습니다.', 'success');
    }
};

// ============================================
// 26개 테스트별 R 코드 생성 함수 (v3.0 - 고도화)
// rstatix, effectsize, ggplot2, ggpubr, afex 패키지 활용
// 효과크기 + 95% CI, ggplot2 시각화, 한국어 해석 가이드 포함
// ============================================
window.AutoStat.RCodeGenerators = {

    // ========== 일표본 t-검정 ==========
    one_sample_t: function(p) {
        var dv = p.vars.dv;
        var mu = p.extras.mu || 0;
        var D = this._dfVar(dv);
        var code = '';
        code += '# ================================================\n';
        code += '# 일표본 t-검정 (One-sample t-test)\n';
        code += '# 측정 변수: ' + dv + ' | 비교 기준값: ' + mu + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'pkg <- c("rstatix", "effectsize", "ggpubr")\n';
        code += 'for(p in pkg) if(!require(p, character.only=TRUE)) install.packages(p)\n';
        code += 'library(rstatix); library(effectsize); library(ggpubr)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 결측치 확인 ────\n';
        code += 'cat("결측치 수:", sum(is.na(' + D + ')), "\\n")\n';
        code += 'dfAnalysis <- df[!is.na(' + D + '), ]\n';
        code += 'cat("분석 대상:", nrow(dfAnalysis), "명\\n")\n';
        code += '\n# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n═══════ 기술통계 ═══════\\n")\n';
        code += 'cat("표본 크기:", length(dfAnalysis$' + this._bt(dv) + '), "\\n")\n';
        code += 'cat("평균:", round(mean(dfAnalysis$' + this._bt(dv) + '), 3), "\\n")\n';
        code += 'cat("표준편차:", round(sd(dfAnalysis$' + this._bt(dv) + '), 3), "\\n")\n';
        code += 'cat("중앙값:", round(median(dfAnalysis$' + this._bt(dv) + '), 3), "\\n")\n';
        code += 'cat("비교 기준값(mu):", ' + mu + ', "\\n")\n';
        code += '\n# ──── 5. 가정 검정: 정규성 ────\n';
        code += 'cat("\\n═══════ 정규성 검정 (Shapiro-Wilk) ═══════\\n")\n';
        code += 'shapiro_result <- shapiro.test(dfAnalysis$' + this._bt(dv) + ')\n';
        code += 'print(shapiro_result)\n';
        code += 'cat("\\n★ 해석: p >=0.05이면 정규분포를 따른다고 볼 수 있습니다\\n")\n';
        code += 'cat("  → p =", round(shapiro_result$p.value, 4))\n';
        code += 'if(shapiro_result$p.value >= 0.05) cat(" (정규성 만족)\\n") else cat(" (정규성 불만족 → Wilcoxon 검정 고려)\\n")\n';
        code += '\n# ──── 6. 일표본 t-검정 ────\n';
        code += 'cat("\\n═══════ 일표본 t-검정 결과 ═══════\\n")\n';
        code += 't_result <- t.test(dfAnalysis$' + this._bt(dv) + ', mu = ' + mu + ')\n';
        code += 'print(t_result)\n';
        code += '\n# ──── 7. 효과 크기 + 95% CI ────\n';
        code += 'cat("\\n═══════ 효과 크기 (Cohen\'s d) ═══════\\n")\n';
        code += 'd_result <- cohens_d(dfAnalysis$' + this._bt(dv) + ', mu = ' + mu + ')\n';
        code += 'print(d_result)\n';
        code += 'cat("\\n★ Cohen\'s d 해석 기준:\\n")\n';
        code += 'cat("  |d| < 0.2: 작은 효과  |  0.2~0.8: 중간 효과  |  > 0.8: 큰 효과\\n")\n';
        code += '\n# ──── 8. 시각화 ────\n';
        code += 'gghistogram(dfAnalysis, x = "' + dv + '", add = "mean",\n';
        code += '  fill = "#00AFBB", title = "' + dv + ' 분포",\n';
        code += '  xlab = "' + dv + '", ylab = "빈도") +\n';
        code += '  geom_vline(xintercept = ' + mu + ', linetype = "dashed", color = "red", linewidth = 1)\n';
        code += '\n# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n\\n★★★ 결과 해석 가이드 ★★★\\n")\n';
        code += 'cat("1. p-value < 0.05이면 → 표본 평균이 기준값(' + mu + ')과 통계적으로 유의하게 다릅니다\\n")\n';
        code += 'cat("2. p-value >= 0.05이면 → 표본 평균이 기준값과 유의하게 다르지 않습니다\\n")\n';
        code += 'cat("3. Cohen\'s d가 클수록 실질적인 차이가 크다는 뜻입니다\\n")\n';
        return code;
    },

    // ========== 독립표본 t-검정 ==========
    independent_t: function(p) {
        var dv = p.vars.dv;
        var grp = p.vars.group;
        var D = this._dfVar(dv);
        var G = this._dfVar(grp);
        var f = this._formula(dv, grp);
        var code = '';
        code += '# ================================================\n';
        code += '# 독립표본 t-검정 (Independent samples t-test)\n';
        code += '# 종속변수: ' + dv + ' | 그룹변수: ' + grp + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'pkg <- c("rstatix", "effectsize", "ggpubr", "car")\n';
        code += 'for(p in pkg) if(!require(p, character.only=TRUE)) install.packages(p)\n';
        code += 'library(rstatix); library(effectsize); library(ggpubr); library(car)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += 'df <- df[complete.cases(df[, c("' + dv + '", "' + grp + '")]), ]\n';
        code += G + ' <- factor(' + G + ')\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n';
        code += 'cat("그룹 수준:", levels(' + G + '), "\\n")\n';
        code += 'cat("그룹별 N:", table(' + G + '), "\\n")\n';
        code += '\n# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n═══════ 기술통계 ═══════\\n")\n';
        code += 'cat("그룹별 N:\\n")\n';
        code += 'print(table(' + G + '))\n';
        code += 'cat("\\n그룹별 평균(SD):\\n")\n';
        code += 'print(tapply(' + D + ', ' + G + ', function(x) paste0(round(mean(x),2), " (", round(sd(x),2), ")")))\n';
        code += '\n# rstatix 정리 출력\n';
        code += 'desc <- df %>% group_by(' + this._bt(grp) + ') %>%\n';
        code += '  get_summary_stats(' + this._bt(dv) + ', type = "mean_sd")\n';
        code += 'print(desc)\n';
        code += '\n# ──── 5. 가정 검정 ────\n';
        code += 'cat("\\n═══════ 등분산성 검정 (Levene) ═══════\\n")\n';
        code += 'lev_test <- leveneTest(' + f + ', data = df)\n';
        code += 'print(lev_test)\n';
        code += 'cat("★ p >= 0.05이면 등분산 가정 만족 → Student t / p < 0.05이면 → Welch t\\n")\n';
        code += '\ncat("\\n═══════ 정규성 검정 (그룹별 Shapiro-Wilk) ═══════\\n")\n';
        code += 'norm_test <- df %>% group_by(' + this._bt(grp) + ') %>% shapiro_test(' + this._bt(dv) + ')\n';
        code += 'print(norm_test)\n';
        code += 'cat("★ p >= 0.05이면 정규성 만족\\n")\n';
        code += '\n# ──── 6. t-검정 실행 ────\n';
        code += 'cat("\\n═══════ Student t-검정 (등분산 가정) ═══════\\n")\n';
        code += 't_equal <- t.test(' + f + ', data = df, var.equal = TRUE)\n';
        code += 'print(t_equal)\n';
        code += '\ncat("\\n═══════ Welch t-검정 (등분산 가정 불필요) ═══════\\n")\n';
        code += 't_welch <- t.test(' + f + ', data = df, var.equal = FALSE)\n';
        code += 'print(t_welch)\n';
        code += '\n# rstatix 깔끔한 출력\n';
        code += 'cat("\\n═══════ rstatix 요약표 ═══════\\n")\n';
        code += 'print(df %>% t_test(' + f + '))\n';
        code += '\n# 엑셀 저장용 결과 통합\n';
        code += 't_result <- t_welch\n';
        code += '\n# ──── 7. 효과 크기 + 95% CI ────\n';
        code += 'cat("\\n═══════ 효과 크기 (Cohen\'s d + 95%% CI) ═══════\\n")\n';
        code += 'd_result <- cohens_d(' + f + ', data = df)\n';
        code += 'print(d_result)\n';
        code += 'cat("\\n★ Cohen\'s d: |d|<0.2 작음 / 0.2~0.8 중간 / >0.8 큼\\n")\n';
        code += '\n# ──── 8. 시각화 (ggplot2) ────\n';
        code += 'ggboxplot(df, x = "' + grp + '", y = "' + dv + '",\n';
        code += '  color = "' + grp + '", add = "jitter",\n';
        code += '  title = "그룹별 ' + dv + ' 비교") +\n';
        code += '  stat_compare_means(method = "t.test")\n';
        code += '\n# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n\\n★★★ 결과 해석 가이드 ★★★\\n")\n';
        code += 'cat("1. Levene 검정 p >= 0.05 → Student t / p < 0.05 → Welch t 결과를 봅니다\\n")\n';
        code += 'cat("2. t-검정 p < 0.05이면 → 두 그룹의 평균 차이가 통계적으로 유의합니다\\n")\n';
        code += 'cat("3. Cohen\'s d로 효과 크기를 확인하세요 (논문에 반드시 보고)\\n")\n';
        return code;
    },

    // ========== 대응표본 t-검정 ==========
    paired_t: function(p) {
        var pre = p.vars.pre;
        var post = p.vars.post;
        var PRE = this._dfVar(pre);
        var POST = this._dfVar(post);
        var code = '';
        code += '# ================================================\n';
        code += '# 대응표본 t-검정 (Paired samples t-test)\n';
        code += '# 사전: ' + pre + ' | 사후: ' + post + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'pkg <- c("rstatix", "effectsize", "ggpubr")\n';
        code += 'for(p in pkg) if(!require(p, character.only=TRUE)) install.packages(p)\n';
        code += 'library(rstatix); library(effectsize); library(ggpubr)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += 'df <- df[complete.cases(df[, c("' + pre + '", "' + post + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n';
        code += 'df$diff_score <- ' + POST + ' - ' + PRE + '\n';
        code += '\n# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n═══════ 기술통계 ═══════\\n")\n';
        code += 'cat("사전(' + pre + ') - 평균:", round(mean(' + PRE + ', na.rm=T), 3), ", SD:", round(sd(' + PRE + ', na.rm=T), 3), "\\n")\n';
        code += 'cat("사후(' + post + ') - 평균:", round(mean(' + POST + ', na.rm=T), 3), ", SD:", round(sd(' + POST + ', na.rm=T), 3), "\\n")\n';
        code += 'cat("차이 점수 - 평균:", round(mean(df$diff_score, na.rm=T), 3), ", SD:", round(sd(df$diff_score, na.rm=T), 3), "\\n")\n';
        code += '\n# ──── 5. 가정 검정: 차이 점수 정규성 ────\n';
        code += 'cat("\\n═══════ 차이 점수 정규성 검정 ═══════\\n")\n';
        code += 'shapiro_diff <- shapiro.test(df$diff_score)\n';
        code += 'print(shapiro_diff)\n';
        code += 'cat("★ p >= 0.05 → 정규성 만족 (대응 t-검정 사용 가능)\\n")\n';
        code += 'cat("  p < 0.05 → 정규성 불만족 (Wilcoxon 부호순위 검정 고려)\\n")\n';
        code += '\n# ──── 6. 대응표본 t-검정 ────\n';
        code += 'cat("\\n═══════ 대응표본 t-검정 결과 ═══════\\n")\n';
        code += 't_result <- t.test(' + PRE + ', ' + POST + ', paired = TRUE)\n';
        code += 'print(t_result)\n';
        code += '\n# ──── 7. 효과 크기 + 95% CI ────\n';
        code += 'cat("\\n═══════ 효과 크기 (Cohen\'s d + 95%% CI) ═══════\\n")\n';
        code += 'd_result <- cohens_d(df$diff_score, mu = 0)\n';
        code += 'print(d_result)\n';
        code += '\n# ──── 8. 시각화 ────\n';
        code += '# QQ plot (차이 점수 정규성 시각적 확인)\n';
        code += 'ggqqplot(df$diff_score, title = "차이 점수 Q-Q Plot")\n\n';
        code += 'ggpaired(df, cond1 = "' + pre + '", cond2 = "' + post + '",\n';
        code += '  color = "#00AFBB", line.color = "gray70",\n';
        code += '  title = "사전-사후 변화", ylab = "측정값")\n';
        code += '\n# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n\\n★★★ 결과 해석 가이드 ★★★\\n")\n';
        code += 'cat("1. p < 0.05이면 → 사전-사후 차이가 통계적으로 유의합니다\\n")\n';
        code += 'cat("2. 평균 차이의 방향(증가/감소)을 확인하세요\\n")\n';
        code += 'cat("3. Cohen\'s d와 95%% CI를 논문에 보고하세요\\n")\n';
        return code;
    },

    // ========== Mann-Whitney U 검정 ==========
    mann_whitney: function(p) {
        var dv = p.vars.dv;
        var grp = p.vars.group;
        var D = this._dfVar(dv);
        var G = this._dfVar(grp);
        var f = this._formula(dv, grp);
        var code = '';
        code += '# ================================================\n';
        code += '# Mann-Whitney U 검정 (Wilcoxon rank-sum test)\n';
        code += '# 종속변수: ' + dv + ' | 그룹변수: ' + grp + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'pkg <- c("rstatix", "ggpubr")\n';
        code += 'for(p in pkg) if(!require(p, character.only=TRUE)) install.packages(p)\n';
        code += 'library(rstatix); library(ggpubr)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += 'df <- df[complete.cases(df[, c("' + dv + '", "' + grp + '")]), ]\n';
        code += G + ' <- factor(' + G + ')\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n';
        code += '\n# ──── 4. 기술통계 (비모수: 중앙값, IQR) ────\n';
        code += 'cat("\\n═══════ 기술통계 ═══════\\n")\n';
        code += 'cat("그룹별 N:\\n")\n';
        code += 'print(table(' + G + '))\n';
        code += 'cat("\\n그룹별 중앙값(IQR):\\n")\n';
        code += 'print(tapply(' + D + ', ' + G + ', function(x) paste0(round(median(x),2), " (", round(IQR(x),2), ")")))\n';
        code += '\n# rstatix 정리 출력\n';
        code += 'desc <- df %>% group_by(' + this._bt(grp) + ') %>%\n';
        code += '  get_summary_stats(' + this._bt(dv) + ', type = "median_iqr")\n';
        code += 'print(desc)\n';
        code += '\n# ──── 5. Mann-Whitney U 검정 ────\n';
        code += 'cat("\\n═══════ Mann-Whitney U 검정 결과 ═══════\\n")\n';
        code += 'wilcox_result <- wilcox.test(' + f + ', data = df, exact = FALSE)\n';
        code += 'print(wilcox_result)\n';
        code += '\n# rstatix 깔끔한 출력\n';
        code += 'cat("\\n═══════ rstatix 요약 ═══════\\n")\n';
        code += 'print(df %>% wilcox_test(' + f + '))\n';
        code += '\n# ──── 6. 효과 크기 (r) + 95% CI ────\n';
        code += 'cat("\\n═══════ 효과 크기 ═══════\\n")\n';
        code += 'eff <- df %>% wilcox_effsize(' + f + ')\n';
        code += 'print(eff)\n';
        code += 'cat("\\n★ r 해석: |r|<0.1 매우 작음 / 0.1~0.3 작음 / 0.3~0.5 중간 / >0.5 큼\\n")\n';
        code += '\n# ──── 7. 시각화 ────\n';
        code += 'ggboxplot(df, x = "' + grp + '", y = "' + dv + '",\n';
        code += '  color = "' + grp + '", add = "jitter",\n';
        code += '  title = "그룹별 ' + dv + ' 비교 (비모수)") +\n';
        code += '  stat_compare_means(method = "wilcox.test")\n';
        code += '\n# ──── 8. 결과 해석 가이드 ────\n';
        code += 'cat("\\n\\n★★★ 결과 해석 가이드 ★★★\\n")\n';
        code += 'cat("1. p < 0.05이면 → 두 그룹의 분포가 통계적으로 유의하게 다릅니다\\n")\n';
        code += 'cat("2. 비모수 검정이므로 중앙값(Median)과 IQR을 보고합니다\\n")\n';
        code += 'cat("3. 효과 크기 r을 논문에 함께 보고하세요\\n")\n';
        return code;
    },

    // ========== Wilcoxon 부호순위 검정 ==========
    wilcoxon_signed_rank: function(p) {
        var pre = p.vars.pre;
        var post = p.vars.post;
        var PRE = this._dfVar(pre);
        var POST = this._dfVar(post);
        var code = '';
        code += '# ================================================\n';
        code += '# Wilcoxon 부호순위 검정 (Wilcoxon signed-rank test)\n';
        code += '# 사전: ' + pre + ' | 사후: ' + post + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'pkg <- c("rstatix", "ggpubr")\n';
        code += 'for(p in pkg) if(!require(p, character.only=TRUE)) install.packages(p)\n';
        code += 'library(rstatix); library(ggpubr)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += 'df <- df[complete.cases(df[, c("' + pre + '", "' + post + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n\n';
        code += '# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n═══════ 기술통계 (비모수: 중앙값) ═══════\\n")\n';
        code += 'cat("사전 - 중앙값:", median(' + PRE + ', na.rm=T), ", IQR:", IQR(' + PRE + ', na.rm=T), "\\n")\n';
        code += 'cat("사후 - 중앙값:", median(' + POST + ', na.rm=T), ", IQR:", IQR(' + POST + ', na.rm=T), "\\n")\n';
        code += '\n# ──── 5. Wilcoxon 부호순위 검정 ────\n';
        code += 'cat("\\n═══════ Wilcoxon 부호순위 검정 결과 ═══════\\n")\n';
        code += 'wilcox_result <- wilcox.test(' + PRE + ', ' + POST + ', paired = TRUE, exact = FALSE)\n';
        code += 'print(wilcox_result)\n';
        code += '\n# ──── 6. 효과 크기 (r) ────\n';
        code += 'cat("\\n═══════ 효과 크기 ═══════\\n")\n';
        code += 'n <- nrow(df)\n';
        code += 'z <- qnorm(max(wilcox_result$p.value, .Machine$double.xmin) / 2)\n';
        code += 'r_effect <- abs(z) / sqrt(n)\n';
        code += 'cat("r =", round(r_effect, 3), "\\n")\n';
        code += 'cat("★ r 해석: |r|<0.1 매우 작음 / 0.1~0.3 작음 / 0.3~0.5 중간 / >0.5 큼\\n")\n';
        code += '\n# ──── 7. 시각화 ────\n';
        code += 'ggpaired(df, cond1 = "' + pre + '", cond2 = "' + post + '",\n';
        code += '  color = "#E7B800", line.color = "gray70",\n';
        code += '  title = "사전-사후 변화 (비모수)", ylab = "측정값")\n';
        code += '\n# ──── 8. 결과 해석 가이드 ────\n';
        code += 'cat("\\n\\n★★★ 결과 해석 가이드 ★★★\\n")\n';
        code += 'cat("1. p < 0.05이면 → 사전-사후 차이가 통계적으로 유의합니다\\n")\n';
        code += 'cat("2. 비모수 검정이므로 중앙값과 IQR을 보고합니다\\n")\n';
        code += 'cat("3. 정규성 가정을 만족하지 못할 때 대응표본 t-검정 대신 사용합니다\\n")\n';
        return code;
    },

    // ========== 일원 분산분석 ==========
    one_way_anova: function(p) {
        var dv = p.vars.dv;
        var grp = p.vars.group;
        var G = this._dfVar(grp);
        var f = this._formula(dv, grp);
        var bt = this._bt.bind(this);
        var covVar = p.vars.covariate;
        var code = '';
        code += '# ================================================\n';
        code += '# 일원 분산분석 (One-way ANOVA)';
        if (covVar) code += ' + 공변량 통제';
        code += '\n# 종속변수: ' + dv + ' | 그룹변수: ' + grp;
        if (covVar) code += ' | 공변량: ' + covVar;
        code += '\n# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'pkg <- c("rstatix", "effectsize", "ggpubr", "car", "emmeans")\n';
        code += 'for(p in pkg) if(!require(p, character.only=TRUE)) install.packages(p)\n';
        code += 'library(rstatix); library(effectsize); library(ggpubr); library(car); library(emmeans)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += 'df <- df[complete.cases(df[, c("' + dv + '", "' + grp + '"' + (covVar ? ', "' + covVar + '"' : '') + ')]), ]\n';
        code += G + ' <- factor(' + G + ')\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n';
        code += 'cat("그룹:", levels(' + G + '), "\\n")\n';
        code += '\n# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n═══════ 기술통계 ═══════\\n")\n';
        code += 'desc <- df %>% group_by(' + bt(grp) + ') %>%\n';
        code += '  get_summary_stats(' + bt(dv) + ', type = "mean_sd")\n';
        code += 'print(desc)\n';
        code += '\n# ──── 5. 가정 검정 ────\n';
        code += 'cat("\\n═══════ 정규성 검정 (그룹별) ═══════\\n")\n';
        code += 'norm_test <- df %>% group_by(' + bt(grp) + ') %>% shapiro_test(' + bt(dv) + ')\n';
        code += 'print(norm_test)\n';
        code += '\ncat("\\n═══════ 등분산성 검정 (Levene) ═══════\\n")\n';
        code += 'print(leveneTest(' + f + ', data = df))\n';
        if (covVar) {
            // 공변량이 있는 경우 ANCOVA-like 분석 추가
            code += '\n# ──── 6. ANOVA + 공변량 통제 (ANCOVA) ────\n';
            code += 'cat("\\n═══════ ANOVA (공변량 통제) 결과 ═══════\\n")\n';
            code += 'anova_model <- aov(' + bt(dv) + ' ~ ' + bt(covVar) + ' + ' + bt(grp) + ', data = df)\n';
            code += 'print(summary(anova_model))\n';
            code += '\n# Type III ANOVA\n';
            code += 'print(Anova(anova_model, type = "III"))\n';
            code += '\n# ──── 7. 사후검정 (emmeans) ────\n';
            code += 'cat("\\n═══════ 조정된 평균 + 사후검정 ═══════\\n")\n';
            code += 'emm <- emmeans(anova_model, ~ ' + bt(grp) + ')\n';
            code += 'print(emm)\n';
            code += 'print(pairs(emm, adjust = "tukey"))\n';
        } else {
            code += '\n# ──── 6. 일원 분산분석 ────\n';
            code += 'cat("\\n═══════ ANOVA 결과 ═══════\\n")\n';
            code += 'anova_model <- aov(' + f + ', data = df)\n';
            code += 'print(summary(anova_model))\n';
            code += '\n# rstatix (깔끔한 출력)\n';
            code += 'print(df %>% anova_test(' + f + '))\n';
            code += '\n# ──── 7. 사후검정 (Tukey HSD) ────\n';
            code += 'cat("\\n═══════ 사후검정 (Tukey HSD) ═══════\\n")\n';
            code += 'tukey <- df %>% tukey_hsd(' + f + ')\n';
            code += 'print(tukey)\n';
        }
        code += '\n# ──── 8. 효과 크기 + 95% CI ────\n';
        code += 'cat("\\n═══════ 효과 크기 ═══════\\n")\n';
        code += 'eta <- eta_squared(anova_model, ci = 0.95)\n';
        code += 'print(eta)\n';
        code += 'cat("★ Eta-squared: <0.01 매우 작음 / 0.01~0.06 작음 / 0.06~0.14 중간 / >0.14 큼\\n")\n';
        code += '\n# ──── 9. 시각화 ────\n';
        code += 'ggboxplot(df, x = "' + grp + '", y = "' + dv + '",\n';
        code += '  color = "' + grp + '", add = "jitter",\n';
        code += '  title = "그룹별 ' + dv + ' 비교") +\n';
        code += '  stat_compare_means(method = "anova")\n';
        code += '\n# ──── 10. 결과 해석 가이드 ────\n';
        code += 'cat("\\n\\n★★★ 결과 해석 가이드 ★★★\\n")\n';
        code += 'cat("1. ANOVA p < 0.05이면 → 적어도 하나의 그룹이 다릅니다\\n")\n';
        code += 'cat("2. 사후검정으로 어떤 그룹 간 차이가 있는지 확인하세요\\n")\n';
        code += 'cat("3. Eta-squared와 95%% CI를 논문에 보고하세요\\n")\n';
        if (covVar) {
            code += 'cat("4. 공변량(' + covVar + ')을 통제한 결과입니다 (ANCOVA)\\n")\n';
        }
        return code;
    },

    // ========== Kruskal-Wallis 검정 ==========
    kruskal_wallis: function(p) {
        var dv = p.vars.dv;
        var grp = p.vars.group;
        var G = this._dfVar(grp);
        var f = this._formula(dv, grp);
        var code = '';
        code += '# ================================================\n';
        code += '# Kruskal-Wallis 검정\n';
        code += '# 종속변수: ' + dv + ' | 그룹변수: ' + grp + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'pkg <- c("rstatix", "ggpubr")\n';
        code += 'for(p in pkg) if(!require(p, character.only=TRUE)) install.packages(p)\n';
        code += 'library(rstatix); library(ggpubr)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += 'df <- df[complete.cases(df[, c("' + dv + '", "' + grp + '")]), ]\n';
        code += G + ' <- factor(' + G + ')\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n';
        code += '\n# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n═══════ 기술통계 (중앙값, IQR) ═══════\\n")\n';
        code += 'desc <- df %>% group_by(' + this._bt(grp) + ') %>%\n';
        code += '  get_summary_stats(' + this._bt(dv) + ', type = "median_iqr")\n';
        code += 'print(desc)\n';
        code += '\n# ──── 5. Kruskal-Wallis 검정 ────\n';
        code += 'cat("\\n═══════ Kruskal-Wallis 검정 결과 ═══════\\n")\n';
        code += 'kw <- df %>% kruskal_test(' + f + ')\n';
        code += 'print(kw)\n';
        code += '\n# ──── 6. 사후검정 (Dunn with Bonferroni) ────\n';
        code += 'cat("\\n═══════ 사후검정 (Dunn) ═══════\\n")\n';
        code += 'dunn <- df %>% dunn_test(' + f + ', p.adjust.method = "bonferroni")\n';
        code += 'print(dunn)\n';
        code += '\n# ──── 7. 효과 크기 ────\n';
        code += 'cat("\\n═══════ 효과 크기 ═══════\\n")\n';
        code += 'eff <- df %>% kruskal_effsize(' + f + ')\n';
        code += 'print(eff)\n';
        code += 'cat("★ eta2[H]: <0.01 매우 작음 / 0.01~0.06 작음 / 0.06~0.14 중간 / >0.14 큼\\n")\n';
        code += '\n# ──── 8. 시각화 ────\n';
        code += 'ggboxplot(df, x = "' + grp + '", y = "' + dv + '",\n';
        code += '  color = "' + grp + '", add = "jitter",\n';
        code += '  title = "그룹별 ' + dv + ' 비교 (비모수)") +\n';
        code += '  stat_compare_means(method = "kruskal.test")\n';
        code += '\n# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n\\n★★★ 결과 해석 가이드 ★★★\\n")\n';
        code += 'cat("1. p < 0.05이면 → 적어도 하나의 그룹 분포가 다릅니다\\n")\n';
        code += 'cat("2. Dunn 사후검정으로 구체적 그룹 간 차이를 확인하세요\\n")\n';
        code += 'cat("3. 비모수이므로 중앙값과 IQR을 보고합니다\\n")\n';
        return code;
    },

    // ========== 이원 분산분석 ==========
    two_way_anova: function(p) {
        var dv = p.vars.dv;
        var f1 = p.vars.factor1;
        var f2 = p.vars.factor2;
        var F1 = this._dfVar(f1);
        var F2 = this._dfVar(f2);
        var bt = this._bt.bind(this);
        var covVar = p.vars.covariate;
        var fi = this._formulaInteraction(dv, f1, f2);
        var code = '';
        code += '# ================================================\n';
        code += '# 이원 분산분석 (Two-way ANOVA)';
        if (covVar) code += ' + 공변량 통제';
        code += '\n# DV: ' + dv + ' | 요인1: ' + f1 + ' | 요인2: ' + f2;
        if (covVar) code += ' | 공변량: ' + covVar;
        code += '\n# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'pkg <- c("rstatix", "effectsize", "ggpubr", "car", "emmeans")\n';
        code += 'for(p in pkg) if(!require(p, character.only=TRUE)) install.packages(p)\n';
        code += 'library(rstatix); library(effectsize); library(ggpubr); library(car); library(emmeans)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += F1 + ' <- factor(' + F1 + ')\n';
        code += F2 + ' <- factor(' + F2 + ')\n';
        code += '\n# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n═══════ 기술통계 ═══════\\n")\n';
        code += 'desc <- df %>% group_by(' + bt(f1) + ', ' + bt(f2) + ') %>%\n';
        code += '  get_summary_stats(' + bt(dv) + ', type = "mean_sd")\n';
        code += 'print(desc)\n';
        code += '\n# ──── 5. 이원 분산분석 ────\n';
        code += 'cat("\\n═══════ 이원 분산분석 결과 ═══════\\n")\n';
        if (covVar) {
            code += 'model <- aov(' + bt(dv) + ' ~ ' + bt(covVar) + ' + ' + bt(f1) + ' * ' + bt(f2) + ', data = df)\n';
        } else {
            code += 'model <- aov(' + fi + ', data = df)\n';
        }
        code += 'print(summary(model))\n';
        code += '\n# ──── 6. 효과 크기 ────\n';
        code += 'cat("\\n═══════ 효과 크기 (Eta-squared + 95%% CI) ═══════\\n")\n';
        code += 'print(eta_squared(model, ci = 0.95))\n';
        code += '\n# ──── 7. 사후검정 ────\n';
        code += 'cat("\\n═══════ 사후검정 ═══════\\n")\n';
        code += 'emm <- emmeans(model, ~ ' + bt(f1) + ' * ' + bt(f2) + ')\n';
        code += 'print(pairs(emm, adjust = "tukey"))\n';
        code += '\n# ──── 8. 상호작용 시각화 ────\n';
        code += 'ggline(df, x = "' + f1 + '", y = "' + dv + '", color = "' + f2 + '",\n';
        code += '  add = c("mean_se"), title = "상호작용 그래프",\n';
        code += '  ylab = "' + dv + '", xlab = "' + f1 + '")\n';
        code += '\n# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n\\n★★★ 결과 해석 가이드 ★★★\\n")\n';
        code += 'cat("1. 상호작용 효과(A:B) p < 0.05이면 → 요인 간 상호작용 존재\\n")\n';
        code += 'cat("2. 상호작용이 유의하면 → 단순 주효과 분석 필요\\n")\n';
        code += 'cat("3. 상호작용이 비유의하면 → 각 주효과를 해석합니다\\n")\n';
        if (covVar) {
            code += 'cat("4. 공변량(' + covVar + ')을 통제한 결과입니다\\n")\n';
        }
        return code;
    },

    // ========== 반복측정 분산분석 (afex 사용) ==========
    repeated_anova: function(p) {
        var dv = p.vars.dv;
        var subj = p.vars.subject;
        var time = p.vars.time;
        var code = '';
        code += '# ================================================\n';
        code += '# 반복측정 분산분석 (Repeated Measures ANOVA)\n';
        code += '# DV: ' + dv + ' | 대상자: ' + subj + ' | 시점: ' + time + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'pkg <- c("afex", "emmeans", "effectsize", "rstatix", "ggpubr")\n';
        code += 'for(p in pkg) if(!require(p, character.only=TRUE)) install.packages(p)\n';
        code += 'library(afex); library(emmeans); library(effectsize); library(rstatix); library(ggpubr)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += this._dfVar(subj) + ' <- factor(' + this._dfVar(subj) + ')\n';
        code += this._dfVar(time) + ' <- factor(' + this._dfVar(time) + ')\n';
        code += 'cat("시점:", levels(' + this._dfVar(time) + '), "\\n")\n';
        code += '\n# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n═══════ 기술통계 ═══════\\n")\n';
        code += 'desc <- df %>% group_by(' + this._bt(time) + ') %>%\n';
        code += '  get_summary_stats(' + this._bt(dv) + ', type = "mean_sd")\n';
        code += 'print(desc)\n';
        code += '\n# ──── 5. 반복측정 ANOVA (afex) ────\n';
        code += 'cat("\\n═══════ 반복측정 ANOVA 결과 ═══════\\n")\n';
        code += '# afex::aov_ez는 변수명을 문자열로 받으므로 한국어 변수명에도 안전합니다\n';
        // 선택적 그룹 변수가 있으면 혼합 ANOVA로 전환
        var grpVar = p.vars.group;
        if (grpVar) {
            code += this._dfVar(grpVar) + ' <- factor(' + this._dfVar(grpVar) + ')\n';
            code += 'cat("★ 집단 변수(' + grpVar + ')가 추가되어 혼합 ANOVA로 분석합니다\\n")\n';
            code += 'aov_result <- aov_ez(id = "' + subj + '", dv = "' + dv + '",\n';
            code += '  data = df, within = "' + time + '", between = "' + grpVar + '", na.rm = TRUE)\n';
        } else {
            code += 'aov_result <- aov_ez(id = "' + subj + '", dv = "' + dv + '",\n';
            code += '  data = df, within = "' + time + '", na.rm = TRUE)\n';
        }
        code += 'print(summary(aov_result))\n';
        code += '\n# 구형성 검정 (Mauchly)\n';
        code += 'cat("\\n★ 구형성 검정이 p < 0.05이면 → GG 또는 HF 보정값을 사용하세요\\n")\n';
        code += 'cat("  (afex는 자동으로 GG 보정을 적용합니다)\\n")\n';
        code += '\n# ──── 6. 사후검정 ────\n';
        code += 'cat("\\n═══════ 사후검정 (Bonferroni) ═══════\\n")\n';
        if (grpVar) {
            code += 'emm <- emmeans(aov_result, ~ ' + this._bt(grpVar) + ' * ' + this._bt(time) + ')\n';
        } else {
            code += 'emm <- emmeans(aov_result, ~ ' + this._bt(time) + ')\n';
        }
        code += 'print(pairs(emm, adjust = "bonferroni"))\n';
        code += '\n# ──── 7. 효과 크기 ────\n';
        code += 'cat("\\n═══════ 효과 크기 ═══════\\n")\n';
        code += 'print(eta_squared(aov_result, ci = 0.95))\n';
        code += '\n# ──── 8. 시각화 ────\n';
        code += 'ggline(df, x = "' + time + '", y = "' + dv + '",\n';
        code += '  add = c("mean_se"), title = "시점별 변화",\n';
        code += '  ylab = "' + dv + '", xlab = "' + time + '")\n';
        code += '\n# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n\\n★★★ 결과 해석 가이드 ★★★\\n")\n';
        code += 'cat("1. p < 0.05이면 → 시점 간 유의한 차이가 있습니다\\n")\n';
        code += 'cat("2. 사후검정으로 어떤 시점 간 차이인지 확인하세요\\n")\n';
        code += 'cat("3. GG(Greenhouse-Geisser) 보정값이 자동 적용됩니다\\n")\n';
        return code;
    },

    // ========== Friedman 검정 ==========
    friedman: function(p) {
        var dv = p.vars.dv;
        var subj = p.vars.subject;
        var time = p.vars.time;
        var code = '';
        code += '# ================================================\n';
        code += '# Friedman 검정\n';
        code += '# DV: ' + dv + ' | 대상자: ' + subj + ' | 시점: ' + time + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'pkg <- c("rstatix", "tidyr", "ggpubr")\n';
        code += 'for(p in pkg) if(!require(p, character.only=TRUE)) install.packages(p)\n';
        code += 'library(rstatix); library(tidyr); library(ggpubr)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += this._dfVar(subj) + ' <- factor(' + this._dfVar(subj) + ')\n';
        code += this._dfVar(time) + ' <- factor(' + this._dfVar(time) + ')\n';
        code += 'df <- df[complete.cases(df[, c("' + dv + '", "' + subj + '", "' + time + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명 x", nlevels(' + this._dfVar(time) + '), "시점\\n")\n';
        code += '\n# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n═══════ 시점별 기술통계 ═══════\\n")\n';
        code += 'desc <- df %>% group_by(' + this._bt(time) + ') %>%\n';
        code += '  get_summary_stats(' + this._bt(dv) + ', type = "median_iqr")\n';
        code += 'print(desc)\n';
        code += '\n# ──── 5. Friedman 검정 ────\n';
        code += 'cat("\\n═══════ Friedman 검정 결과 ═══════\\n")\n';
        code += 'fried <- df %>% friedman_test(' + this._formula(dv, time) + ' | ' + this._bt(subj) + ')\n';
        code += 'print(fried)\n';
        code += '\n# ──── 6. 효과 크기 (Kendall\'s W) ────\n';
        code += 'cat("\\n═══════ 효과 크기 ═══════\\n")\n';
        code += 'eff <- df %>% friedman_effsize(' + this._formula(dv, time) + ' | ' + this._bt(subj) + ')\n';
        code += 'print(eff)\n';
        code += 'cat("★ Kendall W: <0.1 매우 작음 / 0.1~0.3 작음 / 0.3~0.5 중간 / >0.5 큼\\n")\n';
        code += '\n# ──── 7. 사후검정 (Wilcoxon pairwise) ────\n';
        code += 'cat("\\n═══════ 사후검정 ═══════\\n")\n';
        code += 'pwc <- df %>% wilcox_test(' + this._formula(dv, time) + ', paired = TRUE, p.adjust.method = "bonferroni")\n';
        code += 'print(pwc)\n';
        code += '\n# ──── 8. 시각화 ────\n';
        code += 'ggboxplot(df, x = "' + time + '", y = "' + dv + '",\n';
        code += '  add = "jitter", title = "시점별 ' + dv + ' 변화 (비모수)")\n';
        code += '\n# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n\\n★★★ 결과 해석 가이드 ★★★\\n")\n';
        code += 'cat("1. p < 0.05이면 → 시점 간 유의한 차이가 있습니다\\n")\n';
        code += 'cat("2. 사후검정으로 구체적 시점 간 차이를 확인하세요\\n")\n';
        code += 'cat("3. 반복측정 ANOVA의 비모수 버전입니다\\n")\n';
        return code;
    },

    // ========== 혼합 분산분석 (afex 사용) ==========
    mixed_anova: function(p) {
        var dv = p.vars.dv;
        var grp = p.vars.group;
        var subj = p.vars.subject;
        var time = p.vars.time;
        var code = '';
        code += '# ================================================\n';
        code += '# 혼합 분산분석 (Mixed ANOVA)\n';
        code += '# DV: ' + dv + ' | 집단(between): ' + grp + ' | 시점(within): ' + time + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'pkg <- c("afex", "emmeans", "effectsize", "rstatix", "ggpubr")\n';
        code += 'for(p in pkg) if(!require(p, character.only=TRUE)) install.packages(p)\n';
        code += 'library(afex); library(emmeans); library(effectsize); library(rstatix); library(ggpubr)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += this._dfVar(subj) + ' <- factor(' + this._dfVar(subj) + ')\n';
        code += this._dfVar(grp) + ' <- factor(' + this._dfVar(grp) + ')\n';
        code += this._dfVar(time) + ' <- factor(' + this._dfVar(time) + ')\n';
        code += '\n# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n═══════ 기술통계 ═══════\\n")\n';
        code += 'desc <- df %>% group_by(' + this._bt(grp) + ', ' + this._bt(time) + ') %>%\n';
        code += '  get_summary_stats(' + this._bt(dv) + ', type = "mean_sd")\n';
        code += 'print(desc)\n';
        code += '\n# ──── 5. 혼합 ANOVA (afex) ────\n';
        code += 'cat("\\n═══════ 혼합 ANOVA 결과 ═══════\\n")\n';
        // 선택적 공변량
        var covVar = p.vars.covariate;
        if (covVar) {
            code += '# 공변량(' + covVar + ')을 포함한 혼합 ANOVA\n';
            code += 'aov_result <- aov_ez(id = "' + subj + '", dv = "' + dv + '",\n';
            code += '  data = df, between = "' + grp + '", within = "' + time + '",\n';
            code += '  covariate = "' + covVar + '", factorize = FALSE, na.rm = TRUE)\n';
        } else {
            code += 'aov_result <- aov_ez(id = "' + subj + '", dv = "' + dv + '",\n';
            code += '  data = df, between = "' + grp + '", within = "' + time + '", na.rm = TRUE)\n';
        }
        code += 'print(summary(aov_result))\n';
        code += '\n# ──── 6. 효과 크기 ────\n';
        code += 'cat("\\n═══════ 효과 크기 (Eta-squared + 95%% CI) ═══════\\n")\n';
        code += 'print(eta_squared(aov_result, ci = 0.95))\n';
        code += '\n# ──── 7. 사후검정 ────\n';
        code += 'cat("\\n═══════ 사후검정 ═══════\\n")\n';
        code += '# 상호작용 효과 분석\n';
        code += 'emm <- emmeans(aov_result, ~ ' + this._bt(grp) + ' * ' + this._bt(time) + ')\n';
        code += 'print(pairs(emm, adjust = "bonferroni"))\n';
        code += '\n# ──── 8. 시각화 ────\n';
        code += 'ggline(df, x = "' + time + '", y = "' + dv + '", color = "' + grp + '",\n';
        code += '  add = c("mean_se"), title = "집단 x 시점 상호작용",\n';
        code += '  ylab = "' + dv + '", xlab = "' + time + '")\n';
        code += '\n# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n\\n★★★ 결과 해석 가이드 ★★★\\n")\n';
        code += 'cat("1. 상호작용(' + grp + ':' + time + ') p < 0.05 → 집단에 따라 시점별 변화 패턴이 다릅니다\\n")\n';
        code += 'cat("2. 주효과(' + grp + ') → 집단 간 전체적인 차이\\n")\n';
        code += 'cat("3. 주효과(' + time + ') → 시점에 따른 전체적인 변화\\n")\n';
        code += 'cat("4. 상호작용이 유의하면 단순 주효과 분석을 추가로 수행하세요\\n")\n';
        return code;
    },

    // ========== ANCOVA ==========
    ancova: function(p) {
        var dv = p.vars.dv;
        var grp = p.vars.group;
        var cov = p.vars.covariate;
        var G = this._dfVar(grp);
        // 추가 공변량 수집
        var covariates = [cov];
        if (p.vars.covariate2) covariates.push(p.vars.covariate2);
        if (p.vars.covariate3) covariates.push(p.vars.covariate3);
        var bt = this._bt.bind(this);
        var covFormulaStr = covariates.map(bt).join(' + ');
        var allCovStr = covariates.join(', ');
        var code = '';
        code += '# ================================================\n';
        code += '# 공분산분석 (ANCOVA)\n';
        code += '# DV: ' + dv + ' | 그룹: ' + grp + ' | 공변량: ' + allCovStr + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'pkg <- c("car", "emmeans", "effectsize", "rstatix", "ggpubr")\n';
        code += 'for(p in pkg) if(!require(p, character.only=TRUE)) install.packages(p)\n';
        code += 'library(car); library(emmeans); library(effectsize); library(rstatix); library(ggpubr)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += G + ' <- factor(' + G + ')\n';
        code += '\n# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n═══════ 기술통계 ═══════\\n")\n';
        code += 'desc <- df %>% group_by(' + bt(grp) + ') %>%\n';
        code += '  get_summary_stats(' + covariates.concat([dv]).map(bt).join(', ') + ', type = "mean_sd")\n';
        code += 'print(desc)\n';
        code += '\n# ──── 5. 가정 검정 ────\n';
        code += 'cat("\\n═══════ 회귀 기울기 동질성 검정 ═══════\\n")\n';
        code += 'homo_model <- lm(' + bt(dv) + ' ~ (' + covFormulaStr + ') * ' + bt(grp) + ', data = df)\n';
        code += 'print(Anova(homo_model, type = "III"))\n';
        code += 'cat("★ 상호작용항이 p >= 0.05이면 → 기울기 동질성 만족\\n")\n';
        code += '\n# ──── 6. ANCOVA (Type III) ────\n';
        code += 'cat("\\n═══════ ANCOVA 결과 ═══════\\n")\n';
        code += 'ancova_model <- lm(' + bt(dv) + ' ~ ' + covFormulaStr + ' + ' + bt(grp) + ', data = df)\n';
        code += 'print(Anova(ancova_model, type = "III"))\n';
        code += '\n# ──── 7. 효과 크기 ────\n';
        code += 'cat("\\n═══════ 효과 크기 ═══════\\n")\n';
        code += 'print(eta_squared(ancova_model, ci = 0.95))\n';
        code += '\n# ──── 8. 조정된 평균 + 사후검정 ────\n';
        code += 'cat("\\n═══════ 조정된 평균 (Adjusted Means) ═══════\\n")\n';
        code += 'emm <- emmeans(ancova_model, ~ ' + bt(grp) + ')\n';
        code += 'print(emm)\n';
        code += 'cat("\\n═══════ 쌍별 비교 ═══════\\n")\n';
        code += 'print(pairs(emm, adjust = "bonferroni"))\n';
        code += '\n# ──── 9. 시각화 ────\n';
        code += 'ggscatter(df, x = "' + cov + '", y = "' + dv + '", color = "' + grp + '",\n';
        code += '  add = "reg.line", conf.int = TRUE,\n';
        code += '  title = "ANCOVA: ' + dv + ' by ' + grp + ' (공변량: ' + allCovStr + ')")\n';
        code += '\n# ──── 10. 결과 해석 가이드 ────\n';
        code += 'cat("\\n\\n★★★ 결과 해석 가이드 ★★★\\n")\n';
        code += 'cat("1. 기울기 동질성이 만족되어야 ANCOVA 결과가 유효합니다\\n")\n';
        code += 'cat("2. 그룹 효과 p < 0.05이면 → 공변량 통제 후에도 그룹 차이 존재\\n")\n';
        code += 'cat("3. 조정된 평균(Adjusted Means)을 보고하세요 (원래 평균이 아님!)\\n")\n';
        if (covariates.length > 1) {
            code += 'cat("4. 공변량 ' + covariates.length + '개(' + allCovStr + ')를 동시에 통제했습니다\\n")\n';
        }
        return code;
    },

    // ========== 범주형 분석 ==========

    // ---------- 카이제곱 검정 ----------
    chi_square: function(p) {
        var v1 = p.vars.var1;
        var v2 = p.vars.var2;
        var V1 = this._dfVar(v1);
        var V2 = this._dfVar(v2);
        var code = '';
        code += '# ================================================\n';
        code += '# 카이제곱 검정 (Chi-square Test of Independence)\n';
        code += '# 변수1: ' + v1 + ' | 변수2: ' + v2 + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(rstatix))   install.packages("rstatix")\n';
        code += 'if (!require(ggplot2))   install.packages("ggplot2")\n';
        code += 'if (!require(DescTools)) install.packages("DescTools")\n';
        code += 'library(rstatix); library(ggplot2); library(DescTools)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += V1 + ' <- factor(' + V1 + ')\n';
        code += V2 + ' <- factor(' + V2 + ')\n';
        code += 'df <- df[complete.cases(df[, c("' + v1 + '", "' + v2 + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n\n';
        code += '# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n=== 관측 빈도표 ===\\n")\n';
        code += 'observed <- table(' + V1 + ', ' + V2 + ')\n';
        code += 'print(observed)\n';
        code += 'cat("\\n=== 행 비율(%) ===\\n")\n';
        code += 'print(round(prop.table(observed, margin = 1) * 100, 1))\n';
        code += 'cat("\\n=== 열 비율(%) ===\\n")\n';
        code += 'print(round(prop.table(observed, margin = 2) * 100, 1))\n\n';
        code += '# ──── 5. 가정 검정: 기대빈도 확인 ────\n';
        code += 'cat("\\n=== 기대빈도 ===\\n")\n';
        code += 'expected <- chisq.test(observed)$expected\n';
        code += 'print(round(expected, 2))\n';
        code += 'low_expected <- sum(expected < 5)\n';
        code += 'cat("\\n기대빈도 5 미만 셀:", low_expected, "/", length(expected), "\\n")\n';
        code += 'if (low_expected > 0) {\n';
        code += '  cat("\\n★ 주의: 기대빈도 5 미만 셀이 있습니다!\\n")\n';
        code += '  cat("  → 20% 이상이면 Fisher 정확 검정을 사용하세요\\n")\n';
        code += '  cat("  → 현재 비율:", round(low_expected / length(expected) * 100, 1), "%\\n")\n';
        code += '}\n\n';
        code += '# ──── 6. 본 분석: 카이제곱 검정 ────\n';
        code += 'cat("\\n=== 카이제곱 검정 결과 ===\\n")\n';
        code += 'chisq_result <- chisq.test(observed)\n';
        code += 'print(chisq_result)\n\n';
        code += '# Yates 보정 (2x2 표인 경우)\n';
        code += 'if (all(dim(observed) == c(2, 2))) {\n';
        code += '  cat("\\n=== Yates 연속성 보정 ===\\n")\n';
        code += '  print(chisq.test(observed, correct = TRUE))\n';
        code += '}\n\n';
        code += '# ──── 7. 효과 크기: Cramer\'s V + 95% CI ────\n';
        code += 'cat("\\n=== 효과 크기 ===\\n")\n';
        code += 'cv <- CramerV(observed, conf.level = 0.95)\n';
        code += 'cat("Cramer\'s V:", round(cv[1], 3), "\\n")\n';
        code += 'cat("95% CI: [", round(cv[2], 3), ",", round(cv[3], 3), "]\\n")\n';
        code += '# 해석: 0.1 = 작음, 0.3 = 중간, 0.5 = 큼\n\n';
        code += '# 2x2 표이면 Odds Ratio도 계산\n';
        code += 'if (all(dim(observed) == c(2, 2))) {\n';
        code += '  or <- OddsRatio(observed, conf.level = 0.95)\n';
        code += '  cat("\\nOdds Ratio:", round(or[1], 3), "\\n")\n';
        code += '  cat("95% CI: [", round(or[2], 3), ",", round(or[3], 3), "]\\n")\n';
        code += '}\n\n';
        code += '# ──── 8. 시각화 (ggplot2) ────\n';
        code += 'df_plot <- as.data.frame(observed)\n';
        code += 'colnames(df_plot) <- c("Var1", "Var2", "Freq")\n';
        code += 'ggplot(df_plot, aes(x = Var1, y = Freq, fill = Var2)) +\n';
        code += '  geom_bar(stat = "identity", position = "dodge") +\n';
        code += '  labs(title = "' + v1 + ' vs ' + v2 + '",\n';
        code += '       x = "' + v1 + '", y = "빈도", fill = "' + v2 + '") +\n';
        code += '  theme_minimal(base_family = "sans") +\n';
        code += '  theme(text = element_text(size = 12))\n\n';
        code += '# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. p < 0.05이면 → 두 범주형 변수가 서로 관련이 있습니다 (독립이 아님)\\n")\n';
        code += 'cat("2. p >= 0.05이면 → 두 변수 사이에 유의한 관련성이 없습니다\\n")\n';
        code += 'cat("3. Cramer\'s V: 0.1(작은 효과), 0.3(중간 효과), 0.5(큰 효과)\\n")\n';
        code += 'cat("4. 기대빈도 5 미만 셀이 20% 이상이면 Fisher 정확 검정 사용!\\n")\n';
        return code;
    },

    // ---------- Fisher 정확 검정 ----------
    fisher_exact: function(p) {
        var v1 = p.vars.var1;
        var v2 = p.vars.var2;
        var V1 = this._dfVar(v1);
        var V2 = this._dfVar(v2);
        var code = '';
        code += '# ================================================\n';
        code += '# Fisher 정확 검정 (Fisher\'s Exact Test)\n';
        code += '# 변수1: ' + v1 + ' | 변수2: ' + v2 + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(rstatix))   install.packages("rstatix")\n';
        code += 'if (!require(ggplot2))   install.packages("ggplot2")\n';
        code += 'if (!require(DescTools)) install.packages("DescTools")\n';
        code += 'library(rstatix); library(ggplot2); library(DescTools)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += V1 + ' <- factor(' + V1 + ')\n';
        code += V2 + ' <- factor(' + V2 + ')\n';
        code += 'df <- df[complete.cases(df[, c("' + v1 + '", "' + v2 + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n\n';
        code += '# ──── 4. 기술통계: 분할표 ────\n';
        code += 'cat("\\n=== 관측 빈도표 ===\\n")\n';
        code += 'observed <- table(' + V1 + ', ' + V2 + ')\n';
        code += 'print(observed)\n';
        code += 'cat("\\n=== 행 비율(%) ===\\n")\n';
        code += 'print(round(prop.table(observed, margin = 1) * 100, 1))\n\n';
        code += '# ──── 5. 기대빈도 확인 (Fisher 사용 근거) ────\n';
        code += 'cat("\\n=== 기대빈도 확인 ===\\n")\n';
        code += 'expected <- chisq.test(observed)$expected\n';
        code += 'print(round(expected, 2))\n';
        code += 'cat("기대빈도 5 미만 셀:", sum(expected < 5), "개\\n")\n';
        code += 'cat("→ Fisher 정확 검정이 적절합니다\\n")\n\n';
        code += '# ──── 6. 본 분석: Fisher 정확 검정 ────\n';
        code += 'cat("\\n=== Fisher 정확 검정 결과 ===\\n")\n';
        code += 'fisher_result <- fisher.test(observed)\n';
        code += 'print(fisher_result)\n\n';
        code += '# ──── 7. 효과 크기 ────\n';
        code += 'cat("\\n=== 효과 크기 ===\\n")\n';
        code += '# 2x2 표: Odds Ratio + 95% CI\n';
        code += 'if (all(dim(observed) == c(2, 2))) {\n';
        code += '  cat("Odds Ratio:", round(fisher_result$estimate, 3), "\\n")\n';
        code += '  cat("95% CI: [", round(fisher_result$conf.int[1], 3), ",",\n';
        code += '      round(fisher_result$conf.int[2], 3), "]\\n")\n';
        code += '  # Cramer\'s V도 참고용\n';
        code += '  cv <- CramerV(observed, conf.level = 0.95)\n';
        code += '  cat("Cramer\'s V:", round(cv[1], 3),\n';
        code += '      "[", round(cv[2], 3), ",", round(cv[3], 3), "]\\n")\n';
        code += '} else {\n';
        code += '  # rxc 표: Cramer\'s V\n';
        code += '  cv <- CramerV(observed, conf.level = 0.95)\n';
        code += '  cat("Cramer\'s V:", round(cv[1], 3),\n';
        code += '      "[", round(cv[2], 3), ",", round(cv[3], 3), "]\\n")\n';
        code += '}\n\n';
        code += '# ──── 8. 시각화 (ggplot2) ────\n';
        code += 'df_plot <- as.data.frame(observed)\n';
        code += 'colnames(df_plot) <- c("Var1", "Var2", "Freq")\n';
        code += 'ggplot(df_plot, aes(x = Var1, y = Freq, fill = Var2)) +\n';
        code += '  geom_bar(stat = "identity", position = "fill") +\n';
        code += '  scale_y_continuous(labels = function(x) paste0(x * 100, "%")) +\n';
        code += '  labs(title = "' + v1 + ' vs ' + v2 + ' (비율)",\n';
        code += '       x = "' + v1 + '", y = "비율", fill = "' + v2 + '") +\n';
        code += '  theme_minimal(base_family = "sans")\n\n';
        code += '# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. p < 0.05이면 → 두 변수 간 유의한 관련성 있음\\n")\n';
        code += 'cat("2. Odds Ratio > 1 → 첫 번째 범주에서 사건 발생 확률이 더 높음\\n")\n';
        code += 'cat("3. Odds Ratio < 1 → 두 번째 범주에서 사건 발생 확률이 더 높음\\n")\n';
        code += 'cat("4. OR의 95% CI가 1을 포함하면 → 유의하지 않음\\n")\n';
        code += 'cat("5. Fisher 검정은 소표본(기대빈도 < 5)에서 카이제곱보다 정확합니다\\n")\n';
        return code;
    },

    // ---------- McNemar 검정 ----------
    mcnemar: function(p) {
        var pre = p.vars.pre;
        var post = p.vars.post;
        var PRE = this._dfVar(pre);
        var POST = this._dfVar(post);
        var code = '';
        code += '# ================================================\n';
        code += '# McNemar 검정 (McNemar\'s Test)\n';
        code += '# 사전: ' + pre + ' | 사후: ' + post + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(rstatix))   install.packages("rstatix")\n';
        code += 'if (!require(ggplot2))   install.packages("ggplot2")\n';
        code += 'if (!require(DescTools)) install.packages("DescTools")\n';
        code += 'library(rstatix); library(ggplot2); library(DescTools)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += PRE + ' <- factor(' + PRE + ')\n';
        code += POST + ' <- factor(' + POST + ')\n';
        code += 'df <- df[complete.cases(df[, c("' + pre + '", "' + post + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n\n';
        code += '# ──── 4. 기술통계: 전후 변화표 ────\n';
        code += 'cat("\\n=== 전후 변화표 (분할표) ===\\n")\n';
        code += 'observed <- table(' + PRE + ', ' + POST + ')\n';
        code += 'print(observed)\n';
        code += 'cat("\\n행 = 사전(' + pre + '), 열 = 사후(' + post + ')\\n")\n';
        code += 'cat("\\n=== 변화 비율(%) ===\\n")\n';
        code += 'print(round(prop.table(observed) * 100, 1))\n\n';
        code += '# ──── 5. 본 분석: McNemar 검정 ────\n';
        code += 'cat("\\n=== McNemar 검정 결과 ===\\n")\n';
        code += 'mcnemar_result <- mcnemar.test(observed)\n';
        code += 'print(mcnemar_result)\n\n';
        code += '# exact McNemar (소표본 시 더 정확)\n';
        code += 'if (all(dim(observed) == c(2, 2))) {\n';
        code += '  b <- observed[1, 2]  # 사전Yes-사후No\n';
        code += '  c_val <- observed[2, 1]  # 사전No-사후Yes\n';
        code += '  cat("\\n=== Exact McNemar (이항검정) ===\\n")\n';
        code += '  exact_p <- binom.test(b, b + c_val, p = 0.5)$p.value\n';
        code += '  cat("exact p-value:", round(exact_p, 4), "\\n")\n';
        code += '}\n\n';
        code += '# ──── 6. 효과 크기 ────\n';
        code += 'cat("\\n=== 효과 크기 ===\\n")\n';
        code += 'if (all(dim(observed) == c(2, 2))) {\n';
        code += '  b <- observed[1, 2]\n';
        code += '  c_val <- observed[2, 1]\n';
        code += '  # Odds Ratio of discordant pairs\n';
        code += '  or_disc <- b / c_val\n';
        code += '  cat("불일치 쌍의 OR:", round(or_disc, 3), "\\n")\n';
        code += '  # Cohen\'s g\n';
        code += '  cohens_g <- abs(b / (b + c_val) - 0.5)\n';
        code += '  cat("Cohen\'s g:", round(cohens_g, 3), "\\n")\n';
        code += '  cat("  (0.05=작음, 0.15=중간, 0.25=큼)\\n")\n';
        code += '}\n\n';
        code += '# ──── 7. 시각화 ────\n';
        code += 'df_change <- data.frame(\n';
        code += '  시점 = factor(rep(c("사전", "사후"), each = nrow(df)),\n';
        code += '               levels = c("사전", "사후")),\n';
        code += '  범주 = c(as.character(' + PRE + '), as.character(' + POST + '))\n';
        code += ')\n';
        code += 'ggplot(df_change, aes(x = 시점, fill = 범주)) +\n';
        code += '  geom_bar(position = "fill") +\n';
        code += '  scale_y_continuous(labels = function(x) paste0(x * 100, "%")) +\n';
        code += '  labs(title = "사전-사후 범주 변화",\n';
        code += '       y = "비율", fill = "범주") +\n';
        code += '  theme_minimal(base_family = "sans")\n\n';
        code += '# ──── 8. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. McNemar 검정은 같은 사람의 전후 범주 변화를 비교합니다\\n")\n';
        code += 'cat("2. p < 0.05이면 → 사전-사후 범주 분포가 유의하게 변했음\\n")\n';
        code += 'cat("3. 불일치 쌍(b, c)만 검정에 사용됩니다\\n")\n';
        code += 'cat("4. b와 c가 모두 작으면(< 25) exact McNemar 결과를 보세요\\n")\n';
        return code;
    },

    // ========== 상관 분석 ==========

    // ---------- Pearson 상관분석 ----------
    pearson_correlation: function(p) {
        var x = p.vars.var_x;
        var y = p.vars.var_y;
        var X = this._dfVar(x);
        var Y = this._dfVar(y);
        var code = '';
        code += '# ================================================\n';
        code += '# Pearson 상관분석 (Pearson Correlation)\n';
        code += '# X: ' + x + ' | Y: ' + y + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(rstatix))  install.packages("rstatix")\n';
        code += 'if (!require(ggpubr))   install.packages("ggpubr")\n';
        code += 'if (!require(ggplot2))  install.packages("ggplot2")\n';
        code += 'library(rstatix); library(ggpubr); library(ggplot2)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += 'df <- df[complete.cases(df[, c("' + x + '", "' + y + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n\n';
        code += '# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n=== 기술통계 ===\\n")\n';
        code += 'cat("' + x + ':\\n")\n';
        code += 'cat("  평균:", round(mean(' + X + ', na.rm = TRUE), 3),\n';
        code += '    ", SD:", round(sd(' + X + ', na.rm = TRUE), 3),\n';
        code += '    ", 범위:", round(min(' + X + ', na.rm = TRUE), 2), "~",\n';
        code += '    round(max(' + X + ', na.rm = TRUE), 2), "\\n")\n';
        code += 'cat("' + y + ':\\n")\n';
        code += 'cat("  평균:", round(mean(' + Y + ', na.rm = TRUE), 3),\n';
        code += '    ", SD:", round(sd(' + Y + ', na.rm = TRUE), 3),\n';
        code += '    ", 범위:", round(min(' + Y + ', na.rm = TRUE), 2), "~",\n';
        code += '    round(max(' + Y + ', na.rm = TRUE), 2), "\\n")\n\n';
        code += '# ──── 5. 가정 검정: 정규성 ────\n';
        code += 'cat("\\n=== 정규성 검정 (Shapiro-Wilk) ===\\n")\n';
        code += 'sw_x <- shapiro.test(' + X + ')\n';
        code += 'sw_y <- shapiro.test(' + Y + ')\n';
        code += 'cat("' + x + ': W =", round(sw_x$statistic, 4), ", p =", round(sw_x$p.value, 4), "\\n")\n';
        code += 'cat("' + y + ': W =", round(sw_y$statistic, 4), ", p =", round(sw_y$p.value, 4), "\\n")\n';
        code += 'if (sw_x$p.value < 0.05 | sw_y$p.value < 0.05) {\n';
        code += '  cat("\\n★ 정규성 위반! Spearman 상관분석을 고려하세요\\n")\n';
        code += '}\n\n';
        code += '# ──── 6. 본 분석: Pearson 상관 ────\n';
        code += 'cat("\\n=== Pearson 상관분석 결과 ===\\n")\n';
        code += 'cor_result <- cor.test(' + X + ', ' + Y + ', method = "pearson")\n';
        code += 'print(cor_result)\n\n';
        code += '# rstatix 깔끔한 출력\n';
        code += 'cat("\\n=== rstatix 결과 ===\\n")\n';
        code += 'tidy_cor <- df %>% cor_test(' + this._bt(x) + ', ' + this._bt(y) + ', method = "pearson")\n';       
        code += 'print(tidy_cor)\n\n';
        // 추가 변수 Z가 있으면 상관행렬 분석
        var varZ = p.vars.var_z;
        if (varZ) {
            code += '# ──── 추가: 다변수 상관행렬 (변수 Z 포함) ────\n';
            code += 'cat("\\n=== 다변수 상관행렬 (' + x + ', ' + y + ', ' + varZ + ') ===\\n")\n';
            code += 'cor_vars <- c("' + x + '", "' + y + '", "' + varZ + '")\n';
            code += 'cor_matrix <- cor(df[, cor_vars], use = "complete.obs", method = "pearson")\n';
            code += 'print(round(cor_matrix, 3))\n\n';
            code += '# 모든 쌍별 상관 검정\n';
            code += 'cat("\\n=== 모든 쌍별 상관 검정 ===\\n")\n';
            code += 'all_cors <- df %>% cor_test(vars = cor_vars, method = "pearson")\n';
            code += 'print(all_cors)\n\n';
        }
        code += '# ──── 7. 결정계수 (R²) ────\n';
        code += 'cat("\\n=== 설명력 ===\\n")\n';
        code += 'r <- cor_result$estimate\n';
        code += 'r2 <- r^2\n';
        code += 'cat("r =", round(r, 3), "\\n")\n';
        code += 'cat("R² =", round(r2, 3), "→", round(r2 * 100, 1), "% 설명력\\n")\n';
        code += 'cat("95% CI: [", round(cor_result$conf.int[1], 3), ",",\n';
        code += '    round(cor_result$conf.int[2], 3), "]\\n")\n\n';
        code += '# ──── 8. 시각화 (ggpubr) ────\n';
        code += 'ggscatter(df, x = "' + x + '", y = "' + y + '",\n';
        code += '          add = "reg.line", conf.int = TRUE,\n';
        code += '          cor.coef = TRUE, cor.method = "pearson",\n';
        code += '          xlab = "' + x + '", ylab = "' + y + '",\n';
        code += '          title = "Pearson 상관분석: ' + x + ' vs ' + y + '")\n\n';
        code += '# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. r = ±0.1~0.3: 약한 상관\\n")\n';
        code += 'cat("2. r = ±0.3~0.5: 중간 상관\\n")\n';
        code += 'cat("3. r = ±0.5~0.7: 강한 상관\\n")\n';
        code += 'cat("4. r = ±0.7 이상: 매우 강한 상관\\n")\n';
        code += 'cat("5. R²는 한 변수가 다른 변수를 얼마나 설명하는지 (%)\\n")\n';
        code += 'cat("6. 상관 ≠ 인과관계! 관련성만 의미합니다\\n")\n';
        return code;
    },

    // ---------- Spearman 상관분석 ----------
    spearman_correlation: function(p) {
        var x = p.vars.var_x;
        var y = p.vars.var_y;
        var X = this._dfVar(x);
        var Y = this._dfVar(y);
        var code = '';
        code += '# ================================================\n';
        code += '# Spearman 상관분석 (Spearman Rank Correlation)\n';
        code += '# X: ' + x + ' | Y: ' + y + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(rstatix))  install.packages("rstatix")\n';
        code += 'if (!require(ggpubr))   install.packages("ggpubr")\n';
        code += 'if (!require(ggplot2))  install.packages("ggplot2")\n';
        code += 'library(rstatix); library(ggpubr); library(ggplot2)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += 'df <- df[complete.cases(df[, c("' + x + '", "' + y + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n\n';
        code += '# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n=== 기술통계 ===\\n")\n';
        code += 'cat("' + x + ': 중앙값 =", median(' + X + ', na.rm = TRUE),\n';
        code += '    ", IQR =", IQR(' + X + ', na.rm = TRUE), "\\n")\n';
        code += 'cat("' + y + ': 중앙값 =", median(' + Y + ', na.rm = TRUE),\n';
        code += '    ", IQR =", IQR(' + Y + ', na.rm = TRUE), "\\n")\n\n';
        code += '# ──── 5. 본 분석: Spearman 상관 ────\n';
        code += 'cat("\\n=== Spearman 상관분석 결과 ===\\n")\n';
        code += 'cor_result <- cor.test(' + X + ', ' + Y + ', method = "spearman")\n';
        code += 'print(cor_result)\n\n';
        code += '# rstatix 깔끔한 출력\n';
        code += 'cat("\\n=== rstatix 결과 ===\\n")\n';
        code += 'tidy_cor <- df %>% cor_test(' + this._bt(x) + ', ' + this._bt(y) + ', method = "spearman")\n';
        code += 'print(tidy_cor)\n\n';
        // 추가 변수 Z가 있으면 상관행렬 분석
        var varZ = p.vars.var_z;
        if (varZ) {
            code += '# ──── 추가: 다변수 상관행렬 (변수 Z 포함) ────\n';
            code += 'cat("\\n=== 다변수 상관행렬 (' + x + ', ' + y + ', ' + varZ + ') ===\\n")\n';
            code += 'cor_vars <- c("' + x + '", "' + y + '", "' + varZ + '")\n';
            code += 'cor_matrix <- cor(df[, cor_vars], use = "complete.obs", method = "spearman")\n';
            code += 'print(round(cor_matrix, 3))\n\n';
            code += '# 모든 쌍별 상관 검정\n';
            code += 'cat("\\n=== 모든 쌍별 상관 검정 ===\\n")\n';
            code += 'all_cors <- df %>% cor_test(vars = cor_vars, method = "spearman")\n';
            code += 'print(all_cors)\n\n';
        }
        code += '# ──── 6. 결정계수 ────\n';
        code += 'rho <- cor_result$estimate\n';
        code += 'cat("\\nSpearman rho:", round(rho, 3), "\\n")\n';
        code += 'cat("rho²:", round(rho^2, 3), "→", round(rho^2 * 100, 1), "% 설명력\\n")\n\n';
        code += '# ──── 7. 시각화 (ggpubr) ────\n';
        code += 'ggscatter(df, x = "' + x + '", y = "' + y + '",\n';
        code += '          add = "reg.line", conf.int = TRUE,\n';
        code += '          cor.coef = TRUE, cor.method = "spearman",\n';
        code += '          xlab = "' + x + '", ylab = "' + y + '",\n';
        code += '          title = "Spearman 상관분석: ' + x + ' vs ' + y + '")\n\n';
        code += '# ──── 8. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. Spearman은 순위 기반 상관 → 정규성 가정 불필요\\n")\n';
        code += 'cat("2. 순서형 변수(Likert 척도)에도 사용 가능\\n")\n';
        code += 'cat("3. 이상치에 Pearson보다 강건(robust)합니다\\n")\n';
        code += 'cat("4. rho 해석: ±0.1~0.3 약함, ±0.3~0.5 중간, ±0.5+ 강함\\n")\n';
        return code;
    },

    // ---------- 점이연 상관분석 ----------
    point_biserial: function(p) {
        var bin = p.vars.binary_var;
        var cont = p.vars.continuous_var;
        var BIN = this._dfVar(bin);
        var CONT = this._dfVar(cont);
        var code = '';
        code += '# ================================================\n';
        code += '# 점이연 상관분석 (Point-Biserial Correlation)\n';
        code += '# 이분형: ' + bin + ' | 연속형: ' + cont + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(rstatix))  install.packages("rstatix")\n';
        code += 'if (!require(ggpubr))   install.packages("ggpubr")\n';
        code += 'if (!require(ggplot2))  install.packages("ggplot2")\n';
        code += 'if (!require(effectsize)) install.packages("effectsize")\n';
        code += 'library(rstatix); library(ggpubr); library(ggplot2); library(effectsize)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += 'df <- df[complete.cases(df[, c("' + bin + '", "' + cont + '")]), ]\n';
        code += '# 이분형 변수를 0/1 숫자로 변환\n';
        code += BIN + ' <- factor(' + BIN + ')\n';
        code += 'df$`' + bin + '_num` <- as.numeric(' + BIN + ') - 1\n';
        code += 'cat("이분형 변수 수준:", levels(' + BIN + '), "→ 0/1 코딩\\n")\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n\n';
        code += '# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n=== 그룹별 기술통계 ===\\n")\n';
        code += 'desc <- df %>%\n';
        code += '  group_by(' + this._bt(bin) + ') %>%\n';
        code += '  get_summary_stats(' + this._bt(cont) + ', type = "common")\n';
        code += 'print(desc)\n\n';
        code += '# ──── 5. 가정 검정 ────\n';
        code += 'cat("\\n=== 정규성 검정 (그룹별) ===\\n")\n';
        code += 'norm_test <- df %>%\n';
        code += '  group_by(' + this._bt(bin) + ') %>%\n';
        code += '  shapiro_test(' + this._bt(cont) + ')\n';
        code += 'print(norm_test)\n\n';
        code += '# ──── 6. 본 분석: 점이연 상관 ────\n';
        code += 'cat("\\n=== 점이연 상관분석 결과 ===\\n")\n';
        code += 'cor_result <- cor.test(df$`' + bin + '_num`, ' + CONT + ')\n';
        code += 'print(cor_result)\n\n';
        code += 'r <- cor_result$estimate\n';
        code += 'cat("\\nPoint-biserial r:", round(r, 3), "\\n")\n';
        code += 'cat("95% CI: [", round(cor_result$conf.int[1], 3), ",",\n';
        code += '    round(cor_result$conf.int[2], 3), "]\\n")\n';
        code += 'cat("R²:", round(r^2, 3), "→", round(r^2 * 100, 1), "% 설명력\\n")\n\n';
        code += '# ──── 7. 효과 크기: Cohen\'s d (보충) ────\n';
        code += 'cat("\\n=== Cohen\'s d (참고) ===\\n")\n';
        code += 'd_result <- cohens_d(' + this._formula(cont, bin) + ', data = df)\n';
        code += 'print(d_result)\n\n';
        code += '# ──── 8. 시각화 ────\n';
        code += 'ggboxplot(df, x = "' + bin + '", y = "' + cont + '",\n';
        code += '          add = "jitter", color = "' + bin + '",\n';
        code += '          xlab = "' + bin + '", ylab = "' + cont + '",\n';
        code += '          title = "점이연 상관: ' + bin + ' vs ' + cont + '")\n\n';
        code += '# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. 점이연 상관 = 이분형(0/1) 변수와 연속형 변수의 Pearson r\\n")\n';
        code += 'cat("2. r > 0: 1 그룹이 연속 변수 값이 더 높음\\n")\n';
        code += 'cat("3. r < 0: 0 그룹이 연속 변수 값이 더 높음\\n")\n';
        code += 'cat("4. R²: 이분 변수가 연속 변수 분산의 몇 %를 설명하는지\\n")\n';
        code += 'cat("5. 독립표본 t-검정과 수학적으로 동일한 결과입니다\\n")\n';
        return code;
    },

    // ========== 회귀 분석 ==========

    // ---------- 단순 회귀분석 ----------
    simple_regression: function(p) {
        var dv = p.vars.dv;
        var iv = p.vars.iv;
        var DV = this._dfVar(dv);
        var IV = this._dfVar(iv);
        var f = this._formula(dv, iv);
        var code = '';
        code += '# ================================================\n';
        code += '# 단순 선형회귀 (Simple Linear Regression)\n';
        code += '# DV: ' + dv + ' | IV: ' + iv + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(ggplot2))    install.packages("ggplot2")\n';
        code += 'if (!require(performance)) install.packages("performance")\n';
        code += 'if (!require(effectsize)) install.packages("effectsize")\n';
        code += 'library(ggplot2); library(performance); library(effectsize)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += 'df <- df[complete.cases(df[, c("' + dv + '", "' + iv + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n\n';
        code += '# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n=== 기술통계 ===\\n")\n';
        code += 'cat("' + dv + ': M =", round(mean(' + DV + '), 3), ", SD =", round(sd(' + DV + '), 3), "\\n")\n';
        code += 'cat("' + iv + ': M =", round(mean(' + IV + '), 3), ", SD =", round(sd(' + IV + '), 3), "\\n")\n';
        code += 'cat("상관계수 (r):", round(cor(' + IV + ', ' + DV + '), 3), "\\n")\n\n';
        code += '# ──── 5. 회귀 모형 ────\n';
        code += 'cat("\\n=== 단순 선형회귀 결과 ===\\n")\n';
        code += 'model <- lm(' + f + ', data = df)\n';
        code += 'model_summary <- summary(model)\n';
        code += 'print(model_summary)\n\n';
        code += '# 회귀 방정식\n';
        code += 'b <- coefficients(model)\n';
        code += 'cat("\\n회귀 방정식: ' + dv + ' =", round(b[1], 3), "+", round(b[2], 3), "* ' + iv + '\\n")\n';
        code += 'cat("R² =", round(model_summary$r.squared, 3),\n';
        code += '    "→", round(model_summary$r.squared * 100, 1), "% 설명력\\n")\n';
        code += 'cat("Adjusted R² =", round(model_summary$adj.r.squared, 3), "\\n")\n\n';
        code += '# ──── 6. 표준화 계수 ────\n';
        code += 'cat("\\n=== 표준화 계수 (Beta) ===\\n")\n';
        code += 'std_coef <- standardize_parameters(model)\n';
        code += 'print(std_coef)\n\n';
        code += '# ──── 7. 가정 검정: 잔차 진단 ────\n';
        code += 'cat("\\n=== 잔차 진단 ===\\n")\n';
        code += '# 잔차 정규성\n';
        code += 'sw <- shapiro.test(residuals(model))\n';
        code += 'cat("잔차 정규성 (Shapiro-Wilk): W =", round(sw$statistic, 4),\n';
        code += '    ", p =", round(sw$p.value, 4), "\\n")\n';
        code += 'if (sw$p.value < 0.05) cat("  → 정규성 위반! 비모수 회귀 또는 변환을 고려하세요\\n")\n\n';
        code += '# Durbin-Watson (잔차 독립성)\n';
        code += 'if (require(car)) {\n';
        code += '  dw <- durbinWatsonTest(model)\n';
        code += '  cat("Durbin-Watson:", round(dw$dw, 3), ", p =", round(dw$p, 4), "\\n")\n';
        code += '  cat("  (2에 가까울수록 좋음. p < 0.05이면 자기상관 문제)\\n")\n';
        code += '}\n\n';
        code += '# ──── 8. 시각화 (ggplot2) ────\n';
        code += '# 회귀 산점도\n';
        code += 'ggplot(df, aes(x = ' + this._bt(iv) + ', y = ' + this._bt(dv) + ')) +\n';
        code += '  geom_point(alpha = 0.6) +\n';
        code += '  geom_smooth(method = "lm", se = TRUE, color = "blue") +\n';
        code += '  labs(title = "단순 선형회귀: ' + dv + ' ~ ' + iv + '",\n';
        code += '       x = "' + iv + '", y = "' + dv + '",\n';
        code += '       caption = paste0("R² = ", round(model_summary$r.squared, 3))) +\n';
        code += '  theme_minimal(base_family = "sans")\n\n';
        code += '# 잔차 진단 플롯\n';
        code += 'par(mfrow = c(2, 2))\n';
        code += 'plot(model)\n';
        code += 'par(mfrow = c(1, 1))\n\n';
        code += '# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. p < 0.05이면 → 독립변수가 종속변수를 유의하게 예측함\\n")\n';
        code += 'cat("2. R² = 독립변수가 종속변수를 얼마나 설명하는지 (%)\\n")\n';
        code += 'cat("3. 계수(b) = IV가 1 증가하면 DV가 b만큼 변화\\n")\n';
        code += 'cat("4. 표준화 계수(Beta) = 변수 간 상대적 영향력 비교용\\n")\n';
        code += 'cat("5. 잔차 진단 플롯에서 패턴이 없어야 좋은 모형입니다\\n")\n';
        return code;
    },

    // ---------- 다중 회귀분석 ----------
    multiple_regression: function(p) {
        var self = this;
        var dv = p.vars.dv;
        var ivs = p.multiIV;
        var f = this._formula(dv, ivs);
        var code = '';
        code += '# ================================================\n';
        code += '# 다중 선형회귀 (Multiple Linear Regression)\n';
        code += '# DV: ' + dv + ' | IVs: ' + ivs.join(', ') + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(car))        install.packages("car")\n';
        code += 'if (!require(effectsize)) install.packages("effectsize")\n';
        code += 'if (!require(performance)) install.packages("performance")\n';
        code += 'if (!require(ggplot2))    install.packages("ggplot2")\n';
        code += 'library(car); library(effectsize); library(performance); library(ggplot2)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        // 범주형 변수 factor 변환
        ivs.forEach(function(iv) {
            if (p.columnTypes && (p.columnTypes[iv] === 'categorical' || p.columnTypes[iv] === 'ordinal')) {
                code += self._dfVar(iv) + ' <- factor(' + self._dfVar(iv) + ')\n';
            }
        });
        code += 'df <- df[complete.cases(df[, c("' + [dv].concat(ivs).join('", "') + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n\n';
        code += '# ──── 4. 기술통계 + 상관행렬 ────\n';
        code += 'cat("\\n=== 기술통계 ===\\n")\n';
        code += 'print(summary(df[, c("' + [dv].concat(ivs).join('", "') + '")]))\n\n';
        code += '# 연속형 변수만 상관행렬\n';
        code += 'num_vars <- c("' + [dv].concat(ivs).join('", "') + '")\n';
        code += 'num_cols <- sapply(df[, num_vars], is.numeric)\n';
        code += 'if (sum(num_cols) > 1) {\n';
        code += '  cat("\\n=== 상관행렬 ===\\n")\n';
        code += '  print(round(cor(df[, num_vars[num_cols]], use = "complete.obs"), 3))\n';
        code += '}\n\n';
        code += '# ──── 5. 다중회귀 모형 ────\n';
        code += 'cat("\\n=== 다중 선형회귀 결과 ===\\n")\n';
        code += 'model <- lm(' + f + ', data = df)\n';
        code += 'model_summary <- summary(model)\n';
        code += 'print(model_summary)\n\n';
        code += 'cat("\\nR² =", round(model_summary$r.squared, 3),\n';
        code += '    "→", round(model_summary$r.squared * 100, 1), "% 설명력\\n")\n';
        code += 'cat("Adjusted R² =", round(model_summary$adj.r.squared, 3), "\\n")\n\n';
        code += '# ──── 6. 표준화 계수 (Beta) ────\n';
        code += 'cat("\\n=== 표준화 계수 ===\\n")\n';
        code += 'std_coef <- standardize_parameters(model)\n';
        code += 'print(std_coef)\n\n';
        code += '# ──── 7. 다중공선성 진단 (VIF) ────\n';
        code += 'cat("\\n=== 다중공선성 (VIF) ===\\n")\n';
        code += 'vif_result <- vif(model)\n';
        code += 'print(round(vif_result, 3))\n';
        code += 'cat("\\n★ VIF 해석:\\n")\n';
        code += 'cat("  VIF < 5: 양호\\n")\n';
        code += 'cat("  VIF 5~10: 주의 (다중공선성 의심)\\n")\n';
        code += 'cat("  VIF > 10: 심각 (해당 변수 제거 고려)\\n")\n\n';
        code += '# ──── 8. 잔차 진단 ────\n';
        code += 'cat("\\n=== 잔차 진단 ===\\n")\n';
        code += 'sw <- shapiro.test(residuals(model))\n';
        code += 'cat("잔차 정규성: W =", round(sw$statistic, 4), ", p =", round(sw$p.value, 4), "\\n")\n';
        code += 'dw <- durbinWatsonTest(model)\n';
        code += 'cat("Durbin-Watson:", round(dw$dw, 3), ", p =", round(dw$p, 4), "\\n")\n\n';
        code += '# 잔차 진단 플롯\n';
        code += 'par(mfrow = c(2, 2))\n';
        code += 'plot(model)\n';
        code += 'par(mfrow = c(1, 1))\n\n';
        code += '# ──── 9. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. 각 IV의 p < 0.05이면 → 해당 변수가 DV를 유의하게 예측\\n")\n';
        code += 'cat("2. R²: 모든 IV가 함께 DV를 설명하는 비율 (%)\\n")\n';
        code += 'cat("3. Beta(표준화 계수): 어떤 변수가 가장 영향력이 큰지 비교\\n")\n';
        code += 'cat("4. VIF > 10이면 다중공선성 문제 → 해당 변수 제거 고려\\n")\n';
        code += 'cat("5. Adjusted R²는 변수 수에 대한 페널티 적용 (보정된 설명력)\\n")\n';
        return code;
    },

    // ---------- 더미변수 회귀분석 ----------
    dummy_regression: function(p) {
        var self = this;
        var dv = p.vars.dv;
        var ivs = p.multiIV;
        var f = this._formula(dv, ivs);
        var code = '';
        code += '# ================================================\n';
        code += '# 더미변수 회귀분석 (Dummy Variable Regression)\n';
        code += '# DV: ' + dv + ' | IVs: ' + ivs.join(', ') + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(car))        install.packages("car")\n';
        code += 'if (!require(effectsize)) install.packages("effectsize")\n';
        code += 'if (!require(emmeans))    install.packages("emmeans")\n';
        code += 'if (!require(ggplot2))    install.packages("ggplot2")\n';
        code += 'library(car); library(effectsize); library(emmeans); library(ggplot2)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리: 범주형 → factor 변환 ────\n';
        ivs.forEach(function(iv) {
            code += self._dfVar(iv) + ' <- factor(' + self._dfVar(iv) + ')\n';
            code += 'cat("' + iv + ' 수준:", levels(' + self._dfVar(iv) + '), "\\n")\n';
        });
        code += 'df <- df[complete.cases(df[, c("' + [dv].concat(ivs).join('", "') + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n\n';
        code += '# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n=== 그룹별 기술통계 ===\\n")\n';
        ivs.forEach(function(iv) {
            code += 'cat("\\n--- ' + iv + '별 ---\\n")\n';
            code += 'print(aggregate(' + self._bt(dv) + ' ~ ' + self._bt(iv) + ', data = df,\n';
            code += '  FUN = function(x) c(M = round(mean(x), 3), SD = round(sd(x), 3), N = length(x))))\n';
        });
        code += '\n# ──── 5. 더미변수 회귀분석 ────\n';
        code += 'cat("\\n=== 더미변수 회귀분석 결과 ===\\n")\n';
        code += '# R이 factor를 자동으로 더미코딩합니다 (첫 번째 수준이 기준)\n';
        code += 'model <- lm(' + f + ', data = df)\n';
        code += 'print(summary(model))\n\n';
        code += '# ──── 6. Type III ANOVA ────\n';
        code += 'cat("\\n=== Type III ANOVA ===\\n")\n';
        code += 'anova_result <- Anova(model, type = "III")\n';
        code += 'print(anova_result)\n\n';
        code += '# ──── 7. 효과 크기 ────\n';
        code += 'cat("\\n=== 효과 크기 (Eta² / Omega²) ===\\n")\n';
        code += 'eta <- eta_squared(anova_result, ci = 0.95)\n';
        code += 'print(eta)\n\n';
        code += '# ──── 8. 추정 주변 평균 + 쌍별 비교 ────\n';
        ivs.forEach(function(iv) {
            code += 'cat("\\n=== ' + iv + ' 추정 주변 평균 ===\\n")\n';
            code += 'emm_' + iv.replace(/[^a-zA-Z0-9]/g, '_') + ' <- emmeans(model, ~ ' + self._bt(iv) + ')\n';
            code += 'print(emm_' + iv.replace(/[^a-zA-Z0-9]/g, '_') + ')\n';
            code += 'cat("\\n=== ' + iv + ' 쌍별 비교 ===\\n")\n';
            code += 'print(pairs(emm_' + iv.replace(/[^a-zA-Z0-9]/g, '_') + ', adjust = "tukey"))\n';
        });
        code += '\n# ──── 9. 시각화 ────\n';
        code += 'par(mfrow = c(2, 2))\n';
        code += 'plot(model)\n';
        code += 'par(mfrow = c(1, 1))\n\n';
        code += '# ──── 10. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. 더미 계수: 기준 그룹 대비 각 그룹의 평균 차이\\n")\n';
        code += 'cat("2. 기준 그룹 = factor의 첫 번째 수준 (절편 = 기준 그룹 평균)\\n")\n';
        code += 'cat("3. 각 계수의 p < 0.05 → 기준 그룹과 유의한 차이\\n")\n';
        code += 'cat("4. Type III ANOVA → 각 변수의 전체적 효과 검정\\n")\n';
        code += 'cat("5. emmeans 쌍별 비교 → 모든 그룹 간 차이 확인\\n")\n';
        return code;
    },

    // ========== 로지스틱 회귀 ==========

    // ---------- 이분형 로지스틱 회귀 ----------
    logistic_regression: function(p) {
        var self = this;
        var dv = p.vars.dv;
        var ivs = p.multiIV;
        var DV = this._dfVar(dv);
        var f = this._formula(dv, ivs);
        var code = '';
        code += '# ================================================\n';
        code += '# 이분형 로지스틱 회귀 (Binary Logistic Regression)\n';
        code += '# DV: ' + dv + ' | IVs: ' + ivs.join(', ') + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(car))        install.packages("car")\n';
        code += 'if (!require(pROC))       install.packages("pROC")\n';
        code += 'if (!require(ResourceSelection)) install.packages("ResourceSelection")\n';
        code += 'if (!require(ggplot2))    install.packages("ggplot2")\n';
        code += 'library(car); library(pROC); library(ResourceSelection); library(ggplot2)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        ivs.forEach(function(iv) {
            if (p.columnTypes && p.columnTypes[iv] === 'categorical') {
                code += self._dfVar(iv) + ' <- factor(' + self._dfVar(iv) + ')\n';
            }
        });
        code += '# DV를 0/1 숫자로 확인\n';
        code += DV + ' <- as.numeric(factor(' + DV + ')) - 1\n';
        code += 'cat("DV 수준:", unique(' + DV + '), "\\n")\n';
        code += 'cat("0:", sum(' + DV + ' == 0), "명, 1:", sum(' + DV + ' == 1), "명\\n")\n';
        code += 'df <- df[complete.cases(df[, c("' + [dv].concat(ivs).join('", "') + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n\n';
        code += '# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n=== 기술통계 ===\\n")\n';
        code += 'print(summary(df[, c("' + [dv].concat(ivs).join('", "') + '")]))\n\n';
        code += '# ──── 5. 로지스틱 회귀 모형 ────\n';
        code += 'cat("\\n=== 이분형 로지스틱 회귀 결과 ===\\n")\n';
        code += 'model <- glm(' + f + ', data = df, family = binomial)\n';
        code += 'print(summary(model))\n\n';
        code += '# ──── 6. 오즈비 (Odds Ratio) + 95% CI ────\n';
        code += 'cat("\\n=== 오즈비 (OR) + 95% CI ===\\n")\n';
        code += 'or_table <- data.frame(\n';
        code += '  OR = round(exp(coef(model)), 3),\n';
        code += '  CI_lower = round(exp(confint.default(model))[, 1], 3),\n';
        code += '  CI_upper = round(exp(confint.default(model))[, 2], 3),\n';
        code += '  p_value = round(coef(summary(model))[, 4], 4)\n';
        code += ')\n';
        code += 'print(or_table)\n';
        code += 'cat("\\n★ OR 해석: OR > 1 → 위험/확률 증가, OR < 1 → 감소\\n")\n';
        code += 'cat("  95% CI가 1을 포함하면 유의하지 않음\\n")\n\n';
        code += '# ──── 7. 모형 적합도 검정 ────\n';
        code += 'cat("\\n=== Hosmer-Lemeshow 적합도 검정 ===\\n")\n';
        code += 'hl_test <- hoslem.test(' + DV + ', fitted(model), g = 10)\n';
        code += 'print(hl_test)\n';
        code += 'cat("→ p > 0.05이면 모형이 데이터에 잘 맞음\\n")\n\n';
        code += '# Nagelkerke R² (유사 결정계수)\n';
        code += 'null_model <- glm(' + this._bt(dv) + ' ~ 1, data = df, family = binomial)\n';
        code += 'L_full <- logLik(model)\n';
        code += 'L_null <- logLik(null_model)\n';
        code += 'n <- nrow(df)\n';
        code += 'cox_snell <- 1 - exp((2/n) * (as.numeric(L_null) - as.numeric(L_full)))\n';
        code += 'nagelkerke <- cox_snell / (1 - exp(2/n * as.numeric(L_null)))\n';
        code += 'cat("\\nCox & Snell R²:", round(cox_snell, 3), "\\n")\n';
        code += 'cat("Nagelkerke R²:", round(nagelkerke, 3), "\\n")\n\n';
        code += '# ──── 8. 예측 성능 + ROC 곡선 ────\n';
        code += 'cat("\\n=== 예측 성능 ===\\n")\n';
        code += 'pred_prob <- predict(model, type = "response")\n';
        code += 'pred_class <- ifelse(pred_prob > 0.5, 1, 0)\n';
        code += 'confusion <- table(실제 = ' + DV + ', 예측 = pred_class)\n';
        code += 'print(confusion)\n';
        code += 'acc <- sum(diag(confusion)) / sum(confusion)\n';
        code += 'sensitivity <- confusion[2, 2] / sum(confusion[2, ])\n';
        code += 'specificity <- confusion[1, 1] / sum(confusion[1, ])\n';
        code += 'cat("정확도:", round(acc * 100, 1), "%\\n")\n';
        code += 'cat("민감도:", round(sensitivity * 100, 1), "%\\n")\n';
        code += 'cat("특이도:", round(specificity * 100, 1), "%\\n")\n\n';
        code += '# ROC 곡선 + AUC\n';
        code += 'cat("\\n=== ROC / AUC ===\\n")\n';
        code += 'roc_result <- roc(' + DV + ', pred_prob)\n';
        code += 'cat("AUC:", round(auc(roc_result), 3), "\\n")\n';
        code += 'cat("AUC 95% CI:", round(ci.auc(roc_result)[1], 3), "-",\n';
        code += '    round(ci.auc(roc_result)[3], 3), "\\n")\n\n';
        code += '# ──── 9. 시각화 ────\n';
        code += '# ROC 곡선\n';
        code += 'plot(roc_result, col = "blue", lwd = 2,\n';
        code += '     main = paste0("ROC Curve (AUC = ", round(auc(roc_result), 3), ")"))\n';
        code += 'abline(a = 0, b = 1, lty = 2, col = "gray")\n\n';
        code += '# ──── 10. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. OR(오즈비): 독립변수 1단위 증가 시 사건 발생 확률 변화\\n")\n';
        code += 'cat("2. OR > 1 → 발생 확률 증가, OR < 1 → 감소\\n")\n';
        code += 'cat("3. AUC: 0.5 = 무작위, 0.7+ 양호, 0.8+ 우수, 0.9+ 탁월\\n")\n';
        code += 'cat("4. Hosmer-Lemeshow p > 0.05 → 모형 적합도 양호\\n")\n';
        code += 'cat("5. Nagelkerke R² → 모형의 설명력 (0~1)\\n")\n';
        return code;
    },

    // ---------- 다중범주 로지스틱 회귀 ----------
    multinomial_logistic: function(p) {
        var self = this;
        var dv = p.vars.dv;
        var ivs = p.multiIV;
        var DV = this._dfVar(dv);
        var f = this._formula(dv, ivs);
        var code = '';
        code += '# ================================================\n';
        code += '# 다중범주 로지스틱 회귀 (Multinomial Logistic Regression)\n';
        code += '# DV: ' + dv + ' (' + 3 + '+범주) | IVs: ' + ivs.join(', ') + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(nnet))       install.packages("nnet")\n';
        code += 'if (!require(car))        install.packages("car")\n';
        code += 'if (!require(effects))    install.packages("effects")\n';
        code += 'if (!require(ggplot2))    install.packages("ggplot2")\n';
        code += 'library(nnet); library(car); library(effects); library(ggplot2)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += DV + ' <- factor(' + DV + ')\n';
        code += 'cat("DV 수준:", levels(' + DV + '), "\\n")\n';
        code += 'cat("기준 범주 (reference):", levels(' + DV + ')[1], "\\n")\n';
        ivs.forEach(function(iv) {
            if (p.columnTypes && p.columnTypes[iv] === 'categorical') {
                code += self._dfVar(iv) + ' <- factor(' + self._dfVar(iv) + ')\n';
            }
        });
        code += 'df <- df[complete.cases(df[, c("' + [dv].concat(ivs).join('", "') + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n';
        code += 'cat("\\n범주별 빈도:\\n"); print(table(' + DV + '))\n\n';
        code += '# ──── 4. 다중범주 로지스틱 회귀 ────\n';
        code += 'cat("\\n=== 다중범주 로지스틱 회귀 결과 ===\\n")\n';
        code += 'model <- multinom(' + f + ', data = df, trace = FALSE)\n';
        code += 'print(summary(model))\n\n';
        code += '# Wald 검정 (z-value, p-value)\n';
        code += 'cat("\\n=== Wald 검정 (z-value & p-value) ===\\n")\n';
        code += 'z <- summary(model)$coefficients / summary(model)$standard.errors\n';
        code += 'p_val <- 2 * (1 - pnorm(abs(z)))\n';
        code += 'cat("\\nz-values:\\n"); print(round(z, 3))\n';
        code += 'cat("\\np-values:\\n"); print(round(p_val, 4))\n\n';
        code += '# ──── 5. 오즈비 (Relative Risk Ratio) + 95% CI ────\n';
        code += 'cat("\\n=== 오즈비 (OR) ===\\n")\n';
        code += 'or_vals <- exp(coef(model))\n';
        code += 'print(round(or_vals, 3))\n\n';
        code += '# 95% CI\n';
        code += 'cat("\\n=== OR 95% CI ===\\n")\n';
        code += 'ci <- exp(confint.default(model))\n';
        code += 'print(round(ci, 3))\n\n';
        code += '# ──── 6. 모형 적합도 ────\n';
        code += 'cat("\\n=== 모형 적합도 ===\\n")\n';
        code += 'null_model <- multinom(' + this._bt(dv) + ' ~ 1, data = df, trace = FALSE)\n';
        code += 'lr_test <- anova(null_model, model)\n';
        code += 'print(lr_test)\n';
        code += 'cat("AIC:", AIC(model), "\\n")\n';
        code += 'cat("BIC:", BIC(model), "\\n")\n\n';
        code += '# ──── 7. 예측 성능 ────\n';
        code += 'cat("\\n=== 분류 정확도 ===\\n")\n';
        code += 'pred_class <- predict(model, type = "class")\n';
        code += 'confusion <- table(실제 = ' + DV + ', 예측 = pred_class)\n';
        code += 'print(confusion)\n';
        code += 'cat("전체 정확도:", round(sum(diag(confusion))/sum(confusion)*100, 1), "%\\n")\n\n';
        code += '# ──── 8. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. 다중범주 로지스틱 = 기준 범주 대비 각 범주의 OR 비교\\n")\n';
        code += 'cat("2. 기준 범주:", levels(' + DV + ')[1], "\\n")\n';
        code += 'cat("3. OR > 1 → 해당 범주에 속할 확률 증가\\n")\n';
        code += 'cat("4. OR < 1 → 해당 범주에 속할 확률 감소\\n")\n';
        code += 'cat("5. p < 0.05인 변수만 유의한 예측 변수\\n")\n';
        code += 'cat("6. AIC가 작을수록 더 좋은 모형\\n")\n';
        return code;
    },

    // ---------- 순서형 로지스틱 회귀 ----------
    ordinal_regression: function(p) {
        var self = this;
        var dv = p.vars.dv;
        var ivs = p.multiIV;
        var DV = this._dfVar(dv);
        var f = this._formula(dv, ivs);
        var code = '';
        code += '# ================================================\n';
        code += '# 순서형 로지스틱 회귀 (Ordinal Logistic Regression)\n';
        code += '# DV: ' + dv + ' (순서형) | IVs: ' + ivs.join(', ') + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(MASS))       install.packages("MASS")\n';
        code += 'if (!require(car))        install.packages("car")\n';
        code += 'if (!require(brant))      install.packages("brant")\n';
        code += 'if (!require(ggplot2))    install.packages("ggplot2")\n';
        code += 'library(MASS); library(car); library(brant); library(ggplot2)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += '# DV를 순서형 factor로 변환\n';
        code += DV + ' <- factor(' + DV + ', ordered = TRUE)\n';
        code += 'cat("DV 순서:", levels(' + DV + '), "\\n")\n';
        ivs.forEach(function(iv) {
            if (p.columnTypes && p.columnTypes[iv] === 'categorical') {
                code += self._dfVar(iv) + ' <- factor(' + self._dfVar(iv) + ')\n';
            }
        });
        code += 'df <- df[complete.cases(df[, c("' + [dv].concat(ivs).join('", "') + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n';
        code += 'cat("\\n범주별 빈도:\\n"); print(table(' + DV + '))\n\n';
        code += '# ──── 4. 순서형 로지스틱 회귀 ────\n';
        code += 'cat("\\n=== 순서형 로지스틱 회귀 결과 ===\\n")\n';
        code += 'model <- polr(' + f + ', data = df, Hess = TRUE)\n';
        code += 'print(summary(model))\n\n';
        code += '# p-value 계산 (polr은 기본 제공하지 않음)\n';
        code += 'ctable <- coef(summary(model))\n';
        code += 'p_val <- pnorm(abs(ctable[, "t value"]), lower.tail = FALSE) * 2\n';
        code += 'ctable <- cbind(ctable, "p value" = round(p_val, 4))\n';
        code += 'cat("\\n=== 계수 + p-value ===\\n")\n';
        code += 'print(ctable)\n\n';
        code += '# ──── 5. 오즈비 + 95% CI ────\n';
        code += 'cat("\\n=== 오즈비 (OR) + 95% CI ===\\n")\n';
        code += 'or_vals <- exp(coef(model))\n';
        code += 'ci <- exp(confint.default(model))\n';
        code += 'or_table <- data.frame(\n';
        code += '  OR = round(or_vals, 3),\n';
        code += '  CI_lower = round(ci[, 1], 3),\n';
        code += '  CI_upper = round(ci[, 2], 3)\n';
        code += ')\n';
        code += 'print(or_table)\n\n';
        code += '# ──── 6. 비례 오즈 가정 검정 (Brant test) ────\n';
        code += 'cat("\\n=== 비례 오즈 가정 검정 (Brant test) ===\\n")\n';
        code += 'tryCatch({\n';
        code += '  brant_result <- brant(model)\n';
        code += '  print(brant_result)\n';
        code += '  cat("\\n★ 모든 변수의 p > 0.05이면 → 비례 오즈 가정 충족\\n")\n';
        code += '  cat("  p < 0.05인 변수가 있으면 → 해당 변수에서 가정 위반\\n")\n';
        code += '}, error = function(e) {\n';
        code += '  cat("Brant test를 수행할 수 없습니다:", e$message, "\\n")\n';
        code += '})\n\n';
        code += '# ──── 7. 모형 적합도 ────\n';
        code += 'cat("\\n=== 모형 적합도 ===\\n")\n';
        code += 'cat("AIC:", AIC(model), "\\n")\n';
        code += 'cat("BIC:", BIC(model), "\\n")\n';
        code += '# 예측 정확도\n';
        code += 'pred <- predict(model)\n';
        code += 'cat("분류 정확도:", round(mean(pred == ' + DV + ') * 100, 1), "%\\n")\n\n';
        code += '# ──── 8. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. 순서형 로지스틱 = 순서가 있는 범주(예: 경증-중등증-중증)의 예측\\n")\n';
        code += 'cat("2. OR > 1 → 더 높은 범주로 이동할 확률 증가\\n")\n';
        code += 'cat("3. OR < 1 → 더 낮은 범주로 이동할 확률 증가\\n")\n';
        code += 'cat("4. 비례 오즈 가정(Brant test)이 충족되어야 결과가 타당\\n")\n';
        code += 'cat("5. 가정 위반 시 → 다중범주 로지스틱 회귀(multinomial) 고려\\n")\n';
        return code;
    },

    // ========== 일반선형모형 (GLM) ==========

    // ---------- GLM (공변량 포함) ----------
    glm_covariate: function(p) {
        var dv = p.vars.dv;
        var grp = p.vars.group;
        var cov = p.vars.covariate;
        var GRP = this._dfVar(grp);
        var bt = this._bt.bind(this);
        // 추가 공변량 수집
        var covariates = [cov];
        if (p.vars.covariate2) covariates.push(p.vars.covariate2);
        var covFormulaStr = covariates.map(bt).join(' + ');
        var allCovStr = covariates.join(', ');
        var allVars = [dv, grp].concat(covariates);
        var code = '';
        code += '# ================================================\n';
        code += '# 일반선형모형 (GLM with Covariate)\n';
        code += '# DV: ' + dv + ' | 그룹: ' + grp + ' | 공변량: ' + allCovStr + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(car))        install.packages("car")\n';
        code += 'if (!require(emmeans))    install.packages("emmeans")\n';
        code += 'if (!require(effectsize)) install.packages("effectsize")\n';
        code += 'if (!require(ggplot2))    install.packages("ggplot2")\n';
        code += 'if (!require(ggpubr))     install.packages("ggpubr")\n';
        code += 'library(car); library(emmeans); library(effectsize)\n';
        code += 'library(ggplot2); library(ggpubr)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += GRP + ' <- factor(' + GRP + ')\n';
        code += 'df <- df[complete.cases(df[, c("' + allVars.join('", "') + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n';
        code += 'cat("그룹:", levels(' + GRP + '), "\\n")\n\n';
        code += '# ──── 4. 기술통계 ────\n';
        code += 'cat("\\n=== 그룹별 기술통계 ===\\n")\n';
        code += 'desc <- df %>% group_by(' + bt(grp) + ') %>%\n';
        code += '  get_summary_stats(' + covariates.concat([dv]).map(bt).join(', ') + ', type = "mean_sd")\n';
        code += 'print(desc)\n\n';
        code += '# ──── 5. 가정 검정 ────\n';
        code += '# 기울기 동질성 검정 (공변량 × 그룹 상호작용)\n';
        code += 'cat("\\n=== 기울기 동질성 검정 ===\\n")\n';
        code += 'interaction_model <- lm(' + bt(dv) + ' ~ (' + covFormulaStr + ') * ' + bt(grp) + ', data = df)\n';
        code += 'print(Anova(interaction_model, type = "III"))\n';
        code += 'cat("\\n★ 상호작용 p > 0.05이면 → 기울기 동질성 가정 충족\\n")\n\n';
        code += '# 잔차 정규성\n';
        code += 'main_model <- lm(' + bt(dv) + ' ~ ' + covFormulaStr + ' + ' + bt(grp) + ', data = df)\n';
        code += 'sw <- shapiro.test(residuals(main_model))\n';
        code += 'cat("잔차 정규성 (Shapiro-Wilk): p =", round(sw$p.value, 4), "\\n")\n\n';
        code += '# ──── 6. 본 분석: GLM (Type III ANOVA) ────\n';
        code += 'cat("\\n=== GLM (Type III ANOVA) ===\\n")\n';
        code += 'model <- lm(' + bt(dv) + ' ~ ' + covFormulaStr + ' + ' + bt(grp) + ', data = df)\n';
        code += 'anova_result <- Anova(model, type = "III")\n';
        code += 'print(anova_result)\n\n';
        code += 'cat("\\n=== 모형 요약 ===\\n")\n';
        code += 'print(summary(model))\n\n';
        code += '# ──── 7. 효과 크기 ────\n';
        code += 'cat("\\n=== 효과 크기 (Eta² + 95% CI) ===\\n")\n';
        code += 'eta <- eta_squared(anova_result, ci = 0.95)\n';
        code += 'print(eta)\n\n';
        code += '# ──── 8. 추정 주변 평균 + 쌍별 비교 ────\n';
        code += 'cat("\\n=== 추정 주변 평균 (공변량 통제) ===\\n")\n';
        code += 'emm <- emmeans(model, ~ ' + bt(grp) + ')\n';
        code += 'print(emm)\n\n';
        code += 'cat("\\n=== 쌍별 비교 ===\\n")\n';
        code += 'pairs_result <- pairs(emm, adjust = "bonferroni")\n';
        code += 'print(pairs_result)\n\n';
        code += '# ──── 9. 시각화 ────\n';
        code += 'ggplot(df, aes(x = ' + bt(cov) + ', y = ' + bt(dv) + ',\n';
        code += '               color = ' + bt(grp) + ')) +\n';
        code += '  geom_point(alpha = 0.6) +\n';
        code += '  geom_smooth(method = "lm", se = TRUE) +\n';
        code += '  labs(title = "GLM: ' + dv + ' ~ ' + allCovStr + ' + ' + grp + '",\n';
        code += '       x = "' + cov + ' (공변량)", y = "' + dv + '",\n';
        code += '       color = "' + grp + '") +\n';
        code += '  theme_minimal(base_family = "sans")\n\n';
        code += '# ──── 10. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. GLM = 공변량(연속형 통제변수)을 통제한 후 그룹 비교\\n")\n';
        code += 'cat("2. 기울기 동질성 p > 0.05이어야 결과가 타당합니다\\n")\n';
        code += 'cat("3. 그룹 효과 p < 0.05 → 공변량 통제 후에도 그룹 차이 존재\\n")\n';
        code += 'cat("4. 추정 주변 평균(Adjusted Means)을 보고하세요 (원래 평균 아님!)\\n")\n';
        return code;
    },

    // ---------- GLM ANOVA (다중 연속형 IV) ----------
    glm_anova: function(p) {
        var dv = p.vars.dv;
        var ivs = p.multiIV;
        var f = this._formula(dv, ivs);
        var code = '';
        code += '# ================================================\n';
        code += '# 일반선형모형 (GLM - 다중 연속형 IV)\n';
        code += '# DV: ' + dv + ' | IVs: ' + ivs.join(', ') + '\n';
        code += '# ================================================\n\n';
        code += '# ──── 1. 패키지 설치 및 로드 ────\n';
        code += 'if (!require(car))        install.packages("car")\n';
        code += 'if (!require(effectsize)) install.packages("effectsize")\n';
        code += 'if (!require(performance)) install.packages("performance")\n';
        code += 'if (!require(ggplot2))    install.packages("ggplot2")\n';
        code += 'library(car); library(effectsize); library(performance); library(ggplot2)\n\n';
        code += '# ──── 2. 데이터 불러오기 ────\n';
        code += this._generateDataLoadCode(p.filePath, p.fileFormat);
        code += '\n# ──── 3. 데이터 전처리 ────\n';
        code += 'df <- df[complete.cases(df[, c("' + [dv].concat(ivs).join('", "') + '")]), ]\n';
        code += 'cat("분석 대상:", nrow(df), "명\\n")\n\n';
        code += '# ──── 4. 기술통계 + 상관행렬 ────\n';
        code += 'cat("\\n=== 기술통계 ===\\n")\n';
        code += 'all_vars <- c("' + [dv].concat(ivs).join('", "') + '")\n';
        code += 'desc <- data.frame(\n';
        code += '  변수 = all_vars,\n';
        code += '  평균 = sapply(df[, all_vars], mean, na.rm = TRUE),\n';
        code += '  SD = sapply(df[, all_vars], sd, na.rm = TRUE),\n';
        code += '  최소 = sapply(df[, all_vars], min, na.rm = TRUE),\n';
        code += '  최대 = sapply(df[, all_vars], max, na.rm = TRUE)\n';
        code += ')\n';
        code += 'print(round(desc, 3))\n\n';
        code += 'cat("\\n=== 상관행렬 ===\\n")\n';
        code += 'cor_matrix <- cor(df[, all_vars], use = "complete.obs")\n';
        code += 'print(round(cor_matrix, 3))\n\n';
        code += '# ──── 5. GLM 모형 ────\n';
        code += 'cat("\\n=== GLM 결과 ===\\n")\n';
        code += 'model <- lm(' + f + ', data = df)\n';
        code += 'model_summary <- summary(model)\n';
        code += 'print(model_summary)\n\n';
        code += 'cat("\\nR² =", round(model_summary$r.squared, 3),\n';
        code += '    "→", round(model_summary$r.squared * 100, 1), "% 설명력\\n")\n';
        code += 'cat("Adjusted R² =", round(model_summary$adj.r.squared, 3), "\\n")\n\n';
        code += '# ──── 6. Type III ANOVA ────\n';
        code += 'cat("\\n=== Type III ANOVA ===\\n")\n';
        code += 'anova_result <- Anova(model, type = "III")\n';
        code += 'print(anova_result)\n\n';
        code += '# ──── 7. 효과 크기 ────\n';
        code += 'cat("\\n=== 효과 크기 (Eta² + 95% CI) ===\\n")\n';
        code += 'eta <- eta_squared(anova_result, ci = 0.95)\n';
        code += 'print(eta)\n\n';
        code += '# ──── 8. 표준화 계수 + VIF ────\n';
        code += 'cat("\\n=== 표준화 계수 ===\\n")\n';
        code += 'std_coef <- standardize_parameters(model)\n';
        code += 'print(std_coef)\n\n';
        code += 'cat("\\n=== 다중공선성 (VIF) ===\\n")\n';
        code += 'vif_result <- vif(model)\n';
        code += 'print(round(vif_result, 3))\n';
        code += 'cat("★ VIF < 5: 양호, 5~10: 주의, > 10: 심각\\n")\n\n';
        code += '# ──── 9. 잔차 진단 ────\n';
        code += 'cat("\\n=== 잔차 진단 ===\\n")\n';
        code += 'sw <- shapiro.test(residuals(model))\n';
        code += 'cat("잔차 정규성: W =", round(sw$statistic, 4), ", p =", round(sw$p.value, 4), "\\n")\n\n';
        code += '# 잔차 진단 플롯\n';
        code += 'par(mfrow = c(2, 2))\n';
        code += 'plot(model)\n';
        code += 'par(mfrow = c(1, 1))\n\n';
        code += '# ──── 10. 결과 해석 가이드 ────\n';
        code += 'cat("\\n★ 결과 해석 가이드 ★\\n")\n';
        code += 'cat("1. GLM = 여러 연속형 독립변수로 종속변수를 예측\\n")\n';
        code += 'cat("2. 각 IV의 p < 0.05 → 다른 변수를 통제하고도 유의한 효과\\n")\n';
        code += 'cat("3. R²: 모든 IV가 함께 DV를 설명하는 비율 (%)\\n")\n';
        code += 'cat("4. Beta(표준화 계수)로 변수 간 상대적 영향력 비교\\n")\n';
        code += 'cat("5. VIF > 10이면 다중공선성 → 변수 제거 고려\\n")\n';
        code += 'cat("6. Type III ANOVA → 각 변수의 고유한 기여도 검정\\n")\n';
        return code;
    }
};

// ============================================
// 페이지 로드 시 초기화
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('r-code-customizer')) {
        window.AutoStat.RCodeCustomizer.init();
    }
});
