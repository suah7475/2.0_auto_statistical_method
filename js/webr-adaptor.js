/**
 * WebR Adaptor v1.0
 * 기존 RCodeGenerators 출력을 WebR 호환으로 변환
 * - install.packages() 제거
 * - 파일 경로를 VFS 경로로 치환
 * - 코드를 단계별로 분리
 */

window.AutoStat = window.AutoStat || {};

window.AutoStat.WebRAdaptor = {

    VFS_DATA_PATH: '/home/web_user/data.csv',

    // 테스트별 필요 패키지 맵
    // coin: rstatix 효과크기 함수(cohens_d, rank_biserial 등) 내부 의존성
    PACKAGE_MAP: {
        one_sample_t:         ['rstatix', 'effectsize', 'coin', 'ggpubr'],
        independent_t:        ['rstatix', 'effectsize', 'coin', 'ggpubr', 'car'],
        paired_t:             ['rstatix', 'effectsize', 'coin', 'ggpubr'],
        mann_whitney:          ['rstatix', 'effectsize', 'coin', 'ggpubr'],
        wilcoxon_signed_rank:  ['rstatix', 'effectsize', 'coin', 'ggpubr'],
        kruskal_wallis:        ['rstatix', 'effectsize', 'coin', 'ggpubr'],
        friedman:              ['rstatix', 'coin', 'ggpubr', 'tidyr'],
        one_way_anova:         ['rstatix', 'effectsize', 'coin', 'ggpubr', 'car', 'emmeans'],
        two_way_anova:         ['rstatix', 'effectsize', 'coin', 'ggpubr', 'car', 'emmeans'],
        repeated_anova:        ['rstatix', 'effectsize', 'coin', 'ggpubr', 'afex', 'emmeans'],
        mixed_anova:           ['rstatix', 'effectsize', 'coin', 'ggpubr', 'afex', 'emmeans'],
        ancova:                ['rstatix', 'effectsize', 'coin', 'ggpubr', 'car', 'emmeans'],
        chi_square:            ['rstatix', 'DescTools'],
        fisher_exact:          ['rstatix', 'DescTools'],
        mcnemar:               ['rstatix', 'DescTools'],
        pearson_correlation:   ['rstatix', 'ggpubr'],
        spearman_correlation:  ['rstatix', 'ggpubr'],
        point_biserial:        ['rstatix', 'effectsize', 'coin', 'ggpubr'],
        simple_regression:     ['effectsize', 'ggpubr', 'car', 'performance'],
        multiple_regression:   ['effectsize', 'ggpubr', 'car', 'performance'],
        dummy_regression:      ['effectsize', 'ggpubr', 'car', 'emmeans'],
        logistic_regression:   ['car', 'pROC', 'ResourceSelection'],
        multinomial_logistic:  ['nnet', 'car', 'effects'],
        ordinal_regression:    ['MASS', 'car', 'brant'],
        glm_covariate:         ['rstatix', 'effectsize', 'coin', 'car', 'emmeans', 'ggpubr'],
        glm_anova:             ['effectsize', 'car', 'performance']
    },

    // ────────────── 메인 변환 ──────────────

    adapt: function(testId, params) {
        // 1. 기존 RCodeGenerators에서 R 코드 생성
        var generator = window.AutoStat.RCodeGenerators[testId];
        if (!generator) {
            return { steps: [], packages: [], rawCode: '' };
        }

        // RCodeCustomizer에 _bt, _dfVar, _formula 등 헬퍼가 정의되어 있음
        var context = window.AutoStat.RCodeCustomizer || window.AutoStat.RCodeGenerators;
        var rawCode = generator.call(context, params);

        // 2. install/library 코드 제거
        var code = this.removeInstallCode(rawCode);

        // 3. 파일 경로를 VFS 경로로 치환
        code = this.replaceFilePath(code);

        // 4. read_excel → read.csv 치환
        code = this.replaceReadExcel(code);

        // 4.5. %>% → |> 네이티브 파이프 치환 (R 4.1+ 기본 제공, 패키지 불필요)
        code = this.replaceWithNativePipe(code);

        // 5. 단계별 분리
        var steps = this.splitIntoSteps(code);

        // 5.5. 변수 유형 변환 코드 삽입 (사용자 지정 유형을 steps에 직접 추가)
        steps = this.insertNumericConversion(steps, params);

        // 6. removeInstallCode가 library() 호출을 제거하므로,
        //    패키지 로드 코드를 첫 번째 step 앞에 재삽입.
        //    ※ 실제 설치는 executeSteps(steps, packages)가 JS API로 먼저 처리함
        //    → 여기서는 단순 library() 호출만 (패키지는 이미 JS가 설치 완료)
        var basePkgs = ['dplyr'].concat(this.PACKAGE_MAP[testId] || []);
        var seen = {};
        var libPkgs = basePkgs.filter(function(p) {
            if (seen[p]) return false;
            seen[p] = true;
            return true;
        });

        if (libPkgs.length > 0 && steps.length > 0) {
            var libCode = libPkgs.map(function(pkg) {
                return 'suppressMessages(library(' + pkg + ', warn.conflicts = FALSE))';
            }).join('\n');
            steps[0].code = libCode + '\n\n' + steps[0].code;
        }

        // 7. 필요 패키지 목록
        var packages = this.getRequiredPackages(testId);

        return {
            steps: steps,
            packages: packages,
            rawCode: rawCode
        };
    },

    // ────────────── install/library 코드 제거 ──────────────

    removeInstallCode: function(rCode) {
        var lines = rCode.split('\n');
        var filtered = [];
        var skipSection = false;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            // 패키지 설치 섹션 감지
            if (/# ────.*1\.\s*패키지/.test(line)) {
                skipSection = true;
                continue;
            }

            // 다음 섹션 시작 시 skip 해제
            if (skipSection && /# ────.*\d+\./.test(line) && !/1\./.test(line)) {
                skipSection = false;
            }

            if (skipSection) continue;

            // 개별 install/library 라인 제거
            if (/^\s*install\.packages\(/.test(line)) continue;
            if (/^\s*if\s*\(\s*!require/.test(line)) continue;
            if (/^\s*library\(/.test(line)) continue;
            if (/^\s*pkg\s*<-\s*c\(/.test(line)) continue;
            if (/^\s*for\s*\(\s*p\s+in\s+pkg\s*\)/.test(line)) continue;
            if (/^\s*suppressWarnings\(suppressMessages\(library/.test(line)) continue;

            filtered.push(line);
        }

        return filtered.join('\n');
    },

    // ────────────── 파일 경로 치환 ──────────────

    replaceFilePath: function(rCode) {
        var vfsPath = this.VFS_DATA_PATH;
        // na.strings: 빈 셀("") 및 "NA" 문자열을 R의 NA로 변환 → 숫자 컬럼이 character로 읽히는 문제 방지
        // 원본 코드에는 na.strings가 없으므로 [^)]* 정규식이 안전하게 동작함
        var cleanCall = 'read.csv("' + vfsPath + '", header = TRUE, fileEncoding = "UTF-8", na.strings = c("", "NA"))';

        rCode = rCode.replace(/read\.csv\([^)]*\)/g, cleanCall);
        rCode = rCode.replace(/read_excel\([^)]*\)/g, cleanCall);

        return rCode;
    },

    // ────────────── read_excel 관련 잔여 코드 제거 ──────────────

    replaceReadExcel: function(rCode) {
        // readxl 관련 install/library 코드 제거 (removeInstallCode에서 놓칠 수 있는 것)
        rCode = rCode.replace(/if\s*\(!require\(readxl\)\)\s*install\.packages\("readxl"\)\n?/g, '');
        rCode = rCode.replace(/library\(readxl\)\n?/g, '');

        // replaceFilePath에서 이미 read_excel → read.csv 치환 완료
        // 혹시 남은 read_excel이 있으면 추가 치환
        var vfsPath = this.VFS_DATA_PATH;
        rCode = rCode.replace(
            /read_excel\([^)]*\)/g,
            'read.csv("' + vfsPath + '", header = TRUE, fileEncoding = "UTF-8")'
        );

        return rCode;
    },

    // ────────────── %>% → |> 네이티브 파이프 치환 ──────────────

    replaceWithNativePipe: function(rCode) {
        // magrittr %>% 를 R 4.1+ 네이티브 파이프 |> 로 교체
        // WebR(R 4.2+)에서는 |> 가 기본 제공 → 패키지 의존성 없음
        // 주석이나 문자열 내 %>% 도 교체되지만 기능에 영향 없음
        return rCode.replace(/%>%/g, '|>');
    },

    // ────────────── 변수 유형 변환 코드 삽입 ──────────────
    // steps 배열의 "preprocess" 또는 "load" step 끝에 as.numeric/as.factor 변환 코드를 추가.
    // 원본 R 코드 문자열을 건드리지 않으므로 정규식 충돌 없음.

    insertNumericConversion: function(steps, params) {
        if (!params || !params.columnTypes || !steps || steps.length === 0) return steps;

        // 실제 분석에 사용되는 컬럼만 변환 (사용자가 선택한 변수)
        var usedCols = [];
        if (params.vars) {
            Object.keys(params.vars).forEach(function(role) {
                if (params.vars[role]) usedCols.push(params.vars[role]);
            });
        }
        if (params.multiIV && Array.isArray(params.multiIV)) {
            usedCols = usedCols.concat(params.multiIV);
        }
        // 중복 제거
        usedCols = usedCols.filter(function(c, i, a) { return c && a.indexOf(c) === i; });

        var colTypes = params.columnTypes;
        var lines = [];
        usedCols.forEach(function(col) {
            var type = colTypes[col];
            if (!type) return;
            var bt = '`' + col + '`';
            if (type === 'continuous') {
                lines.push('if (!is.numeric(df$' + bt + ')) df$' + bt + ' <- suppressWarnings(as.numeric(as.character(df$' + bt + ')))');
            } else if (type === 'categorical') {
                lines.push('if (!is.factor(df$' + bt + ')) df$' + bt + ' <- as.factor(df$' + bt + ')');
            } else if (type === 'ordinal') {
                lines.push('if (!is.ordered(df$' + bt + ')) df$' + bt + ' <- as.ordered(as.factor(df$' + bt + '))');
            }
        });

        if (lines.length === 0) return steps;

        var convCode = '# 변수 유형 변환 (사용자 지정)\n' + lines.join('\n');

        // "preprocess" step 우선, 없으면 "load" step에 추가
        var targetIdx = -1;
        for (var i = 0; i < steps.length; i++) {
            if (steps[i].id === 'preprocess') { targetIdx = i; break; }
        }
        if (targetIdx === -1) {
            for (var j = 0; j < steps.length; j++) {
                if (steps[j].id === 'load') { targetIdx = j; break; }
            }
        }
        if (targetIdx === -1 && steps.length > 0) targetIdx = 0;

        if (targetIdx !== -1) {
            steps[targetIdx].code = steps[targetIdx].code + '\n\n' + convCode;
        }

        return steps;
    },

    // ────────────── 코드 단계 분리 ──────────────

    splitIntoSteps: function(rCode) {
        // 섹션 헤더 패턴: # ──── N. 제목 ────
        var sectionPattern = /# ────.*?(\d+)\.\s*(.+?)(?:\s*────.*)?$/;
        var lines = rCode.split('\n');
        var steps = [];
        var currentStep = null;
        var currentLines = [];

        // 섹션 ID 매핑 (순서 보장 배열 — 구체적 키가 먼저)
        var SECTION_RULES = [
            // ── 데이터 ──
            ['데이터 불러오기', 'load'],
            ['데이터 확인', 'load'],
            ['데이터 전처리', 'preprocess'],
            ['결측치', 'preprocess'],

            // ── 기술통계 ──
            ['기술통계', 'desc'],
            ['교차표', 'desc'],
            ['분할표', 'desc'],

            // ── 가정 검정 (구체적 키 — 일반 키보다 먼저) ──
            ['가정 검정', 'assume'],
            ['정규성', 'assume'],
            ['등분산', 'assume'],
            ['기대빈도', 'assume'],
            ['비례 오즈', 'assume'],
            ['다중공선성', 'assume'],
            ['VIF', 'assume'],
            ['잔차 진단', 'assume'],

            // ── 모형 적합도 / 예측 성능 (본분석보다 먼저 매칭) ──
            ['모형 적합도', 'assume'],
            ['예측 성능', 'main'],

            // ── 본분석 (구체적 테스트명) ──
            ['본 분석', 'main'],
            ['본분석', 'main'],
            ['분석 실행', 'main'],
            ['검정 실행', 'main'],
            ['t-검정', 'main'],
            ['분산분석', 'main'],
            ['Mann-Whitney', 'main'],
            ['Wilcoxon', 'main'],
            ['Kruskal', 'main'],
            ['Friedman', 'main'],
            ['ANCOVA', 'main'],
            ['회귀 모형', 'main'],
            ['다중회귀', 'main'],
            ['더미변수', 'main'],
            ['로지스틱', 'main'],
            ['순서형', 'main'],
            ['점이연', 'main'],
            ['Pearson', 'main'],
            ['Spearman', 'main'],
            ['GLM', 'main'],

            // ── ANOVA 관련 (ANCOVA보다 뒤에) ──
            ['ANOVA', 'main'],

            // ── 사후검정 ──
            ['사후검정', 'posthoc'],
            ['사후 검정', 'posthoc'],
            ['쌍별 비교', 'posthoc'],
            ['조정된 평균', 'posthoc'],
            ['추정 주변 평균', 'posthoc'],

            // ── 효과크기 ──
            ['효과크기', 'effect'],
            ['효과 크기', 'effect'],
            ['오즈비', 'effect'],
            ['결정계수', 'effect'],
            ['표준화 계수', 'effect'],

            // ── 시각화 ──
            ['시각화', 'plot'],
            ['그래프', 'plot'],

            // ── 해석 ──
            ['해석', 'interpret'],

            // ── 내보내기 ──
            ['엑셀', 'export'],
            ['Excel', 'export']
        ];

        // 이미 사용된 step ID 추적 (중복 방지)
        var usedIds = {};

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var match = line.match(sectionPattern);

            if (match) {
                // 이전 섹션 저장
                if (currentStep && currentLines.length > 0) {
                    steps.push({
                        id: currentStep.id,
                        label: currentStep.label,
                        code: currentLines.join('\n').trim()
                    });
                }

                // 새 섹션 시작
                var sectionTitle = match[2].trim();
                var sectionId = 'step_' + match[1];

                // 제목에서 ID 매핑 (배열 순서대로 — 구체적 키 우선)
                for (var r = 0; r < SECTION_RULES.length; r++) {
                    if (sectionTitle.indexOf(SECTION_RULES[r][0]) !== -1) {
                        sectionId = SECTION_RULES[r][1];
                        break;
                    }
                }

                // 중복 ID 방지: 이미 사용된 ID면 접미사 추가
                if (usedIds[sectionId]) {
                    usedIds[sectionId]++;
                    sectionId = sectionId + '_' + usedIds[sectionId];
                } else {
                    usedIds[sectionId] = 1;
                }

                currentStep = { id: sectionId, label: sectionTitle };
                currentLines = [];
            } else {
                currentLines.push(line);
            }
        }

        // 마지막 섹션 저장
        if (currentStep && currentLines.length > 0) {
            steps.push({
                id: currentStep.id,
                label: currentStep.label,
                code: currentLines.join('\n').trim()
            });
        }

        // steps가 비어있으면 전체 코드를 하나의 step으로
        if (steps.length === 0 && rCode.trim()) {
            steps.push({
                id: 'main',
                label: '분석 실행',
                code: rCode.trim()
            });
        }

        // export 단계 제거 (WebR에서는 JS로 Excel 생성)
        steps = steps.filter(function(s) { return s.id !== 'export'; });

        return steps;
    },

    // ────────────── 필요 패키지 목록 ──────────────

    getRequiredPackages: function(testId) {
        return this.PACKAGE_MAP[testId] || ['rstatix', 'effectsize'];
    },

    // ────────────── 시각화 코드 분리 ──────────────

    extractPlotCode: function(steps) {
        var plotStep = null;
        var otherSteps = [];

        for (var i = 0; i < steps.length; i++) {
            if (steps[i].id === 'plot') {
                plotStep = steps[i];
            } else {
                otherSteps.push(steps[i]);
            }
        }

        return { plotStep: plotStep, otherSteps: otherSteps };
    }
};
