# auto_stastic - 통계 기법 추천 시스템

재활 연구 초보자를 위한 연구 설계 및 통계 방법 추천 시스템
플로우차트 기반 의사결정 트리 + 초등학생도 이해할 수 있는 쉬운 설명 제공

## 배포

- **GitHub Pages**: https://suah7475.github.io/auto_statistical_method/
- 프론트엔드 전용 정적 사이트 (서버 불필요)

## 프로젝트 구조

```
v2.0_auto_statistical_method/
├── index.html              # 메인 UI (질문 흐름 + 결과 + 커스터마이저)
├── css/
│   └── style.css           # 미니멀 스타일시트 (Pretendard 폰트, 흑백 디자인)
├── js/
│   ├── stat-data.js        # 26개 통계 테스트 정의 + 8개 질문 정의
│   ├── stat-recommender.js # 통계 테스트 추천 엔진 (의사결정 트리)
│   ├── r-code-customizer.js # R 코드 커스터마이저 v3.0 + 엑셀 내보내기
│   ├── result-renderer.js  # 결과 렌더링 (쉬운 설명, 비유, 재활 예시)
│   ├── webr-runner.js      # WebR 엔진 초기화, 패키지 설치, R 코드 실행
│   ├── webr-adaptor.js     # RCodeGenerators 출력을 WebR 호환으로 변환
│   ├── pubmed-search.js    # PubMed 논문 검색 + SCI-E 저널 필터링
│   └── app.js              # 앱 메인 로직 (질문 흐름 + 결과 렌더링)
├── docs/
│   ├── user-guide.md       # 사용법 안내서 (마크다운)
│   └── user-guide.html     # 사용법 안내서 (HTML)
├── images/
│   └── 서울재활병원_가로형CI.png
├── .nojekyll               # GitHub Pages Jekyll 비활성화
├── .gitignore              # Git 제외 파일
└── CLAUDE.md               # 프로젝트 문서
```

## 실행 방법

`index.html`을 브라우저에서 직접 열거나 GitHub Pages로 배포.
모든 기능이 프론트엔드 JavaScript로 동작 (서버 불필요).

## 주요 기능

### 1. 플로우차트 기반 통계 방법 추천
- **의사결정 흐름**: DV 유형 → DV 수준 → IV 개수 → IV 유형 → 그룹 수 → 대응 여부 → 정규성 → 공변량
- **26개 통계 테스트 지원**: 모수/비모수 검정, 회귀분석, GLM 포함
- **혼합 분석**: 연속형+범주형 독립변수 동시 처리 (ANCOVA, GLM 등)

#### 추천 엔진 의사결정 트리 (`js/stat-recommender.js`)

**연속형 DV:**

| IV 개수 | IV 유형 | 조건 | 추천 (primary) |
|---------|---------|------|---------------|
| 1개 | 범주형 | 2그룹, 대응, 정규 | paired_t |
| 1개 | 범주형 | 2그룹, 대응, 비정규 | wilcoxon_signed_rank |
| 1개 | 범주형 | 2그룹, 독립, 정규 | independent_t |
| 1개 | 범주형 | 2그룹, 독립, 비정규 | mann_whitney |
| 1개 | 범주형 | 3+그룹, 대응, 정규 | repeated_anova |
| 1개 | 범주형 | 3+그룹, 대응, 비정규 | friedman |
| 1개 | 범주형 | 3+그룹, 독립, 정규 | one_way_anova |
| 1개 | 범주형 | 3+그룹, 독립, 비정규 | kruskal_wallis |
| 1개 | 연속형 | - | simple_regression |
| 2+ | 범주형 | 공변량 있음 | ancova |
| 2+ | 범주형 | 대응(반복) | mixed_anova |
| 2+ | 범주형 | 독립 | two_way_anova |
| 2+ | 연속형 | - | multiple_regression |
| 2+ | 혼합 | 공변량 있음 | glm_covariate |
| 2+ | 혼합 | 공변량 없음 | dummy_regression |

**범주형 DV:**

| IV 유형 | DV 수준 | 추천 (primary) |
|---------|---------|---------------|
| 범주형 (1개) | 이분형 | chi_square |
| 범주형 (1개) | 명목 3+ | chi_square |
| 범주형 (1개) | 순서형 | ordinal_regression |
| 범주형 (1개, 대응) | - | mcnemar |
| 연속형/다중 | 이분형 | logistic_regression |
| 연속형/다중 | 명목 3+ | multinomial_logistic |
| 연속형/다중 | 순서형 | ordinal_regression |

### 2. 초보자 친화적 설명
- **쉬운 설명** (`simple_description`): 초등학생도 이해할 수 있는 쉬운 문장
- **비유** (`analogy`): 일상생활에 비유한 설명
- **재활 예시** (`rehab_example`): 재활 분야의 구체적인 사용 예시
- **접기/펼치기**: 전문적인 설명은 `<details>`로 접기 처리

### 3. R 코드 커스터마이저 v3.0 (고도화)
사용자의 실제 엑셀 데이터에 맞춰 **논문 수준의 R 코드**를 자동 생성.
생성된 코드를 R/RStudio에 붙여넣기하면 바로 통계 분석 실행 가능.

#### 3단계 위저드 흐름
1. **Step 1 - 데이터 파일 정보**: 파일 경로(선택) + 형식(xlsx/csv) + 엑셀 컬럼명 입력
2. **Step 2 - 컬럼 타입 확인**: 자동 감지된 타입(연속형/범주형/순서형) 확인/수정
3. **Step 3 - 변수 매핑**: 테스트별 필요 변수(DV, IV, 그룹, 시점 등)에 내 컬럼 매핑

#### 주요 모듈 (`js/r-code-customizer.js`)
- `TEST_VARIABLE_REQUIREMENTS`: 26개 테스트별 필요 변수 정의 (role, type, required, help)
- `TypeDetector`: 컬럼명 기반 자동 타입 감지 (정규식 패턴 매칭)
- `ColumnParser`: 쉼표/탭/줄바꿈 구분자 파싱
- `RCodeCustomizer`: 3단계 위저드 UI 제어 + 상태 관리 + 헬퍼 함수
  - `_bt(v)`: 백틱 래핑 (한국어 변수명 보호)
  - `_dfVar(v)`: `df$\`v\`` 형태 (데이터프레임 변수 접근)
  - `_formula(dv, ivs)`: 백틱 포함 formula 생성
  - `_formulaInteraction(dv, iv1, iv2)`: 상호작용 formula 생성
  - `_generateExcelExportCode()`: 테스트별 시트 구성으로 엑셀 내보내기 코드 생성
- `RCodeGenerators`: 26개 테스트별 완전한 R 코드 생성 함수

#### 표준 R 코드 구조 (모든 테스트 공통)
1. 패키지 설치 및 로드
2. 데이터 불러오기 (xlsx/csv)
3. 데이터 전처리 (결측치 제거, factor 변환)
4. 기술통계 (그룹별 요약)
5. 가정 검정 + 해석 가이드 (정규성, 등분산, 구형성 등)
6. 본 분석 실행
7. 사후 검정 (해당 시)
8. 효과 크기 + 95% CI
9. 시각화 (ggplot2/ggpubr)
10. 결과 해석 가이드 (한국어)
99. 엑셀 결과 내보내기 (WebR에서는 자동 제외)

#### 사용되는 R 패키지
| 패키지 | 용도 |
|--------|------|
| `rstatix` | tidy 통계 함수 (t_test, anova_test, cor_test 등) |
| `effectsize` | 효과 크기 + 95% CI (cohens_d, eta_squared 등) |
| `ggpubr` | 논문 품질 ggplot2 래퍼 (ggboxplot, ggpaired, ggscatter) |
| `ggplot2` | 범용 시각화 |
| `car` | Levene 검정, Type III ANOVA, VIF, Durbin-Watson |
| `emmeans` | 추정 주변 평균, 쌍별 비교 |
| `afex` | 반복측정/혼합 ANOVA (aov_ez - quoted 파라미터) |
| `performance` | 모형 진단 (check_model) |
| `pROC` | ROC 곡선 + AUC (이분형 로지스틱) |
| `ResourceSelection` | Hosmer-Lemeshow 적합도 검정 |
| `DescTools` | Cramer's V, Odds Ratio + CI |
| `readxl` | Excel 파일 읽기 |
| `writexl` | Excel 파일 쓰기 (엑셀 내보내기) |
| `brant` | 비례 오즈 가정 검정 (순서형 로지스틱) |
| `MASS` | polr (순서형 로지스틱 회귀) |
| `nnet` | multinom (다중범주 로지스틱 회귀) |

### 4. WebR 브라우저 실행 (v2.0 신규)
R 코드를 서버 없이 브라우저에서 직접 실행.

#### 아키텍처
```
RCodeGenerators (원본 R 코드)
  → WebRAdaptor (변환: install 제거, 경로 치환, %>% → |>, 단계 분리)
    → WebRRunner (WebR WASM 엔진으로 실행)
      → 결과 출력 (텍스트 + 그래프)
```

#### WebR Adaptor (`js/webr-adaptor.js`)
- `removeInstallCode()`: install.packages/library 코드 제거
- `replaceFilePath()`: 로컬 경로 → VFS 경로 (`/home/web_user/data.csv`) 치환, `na.strings = c("", "NA")` 추가 (빈 셀 NA 처리)
- `replaceReadExcel()`: read_excel 잔여 코드 제거
- `replaceWithNativePipe()`: `%>%` → `|>` 네이티브 파이프 변환 (R 4.1+)
- `splitIntoSteps()`: 섹션 헤더 기반 단계 분리 (id 매핑 + export 제외)
- `insertNumericConversion()`: 사용자 지정 변수 유형을 steps에 직접 삽입 (`as.numeric`/`as.factor`/`as.ordered`)

#### WebR Runner (`js/webr-runner.js`)
- PostMessage 채널 사용 (COOP/COEP 헤더 불필요, GitHub Pages 호환)
- Core 패키지: ggplot2, dplyr, rstatix, effectsize (init 시 설치)
- Lazy 패키지: 테스트별 필요 시 추가 설치 (ggpubr, car, emmeans, afex 등)
- `captureOutput()`: 블록별 tryCatch 래핑 → 부분 오류도 계속 실행
- `captureGraphics()`: canvas 디바이스로 그래프 캡처

### 5. PubMed 논문 검색 + SCI-E 저널 필터링
- **재활 분야 특화**: PT, OT, ST, 재활심리, 신경재활 영역 한정
- **SCI-E 저널 화이트리스트**: 약 80개 재활·의학 SCI-E급 저널 목록으로 필터링
- **SCI-E 필터 토글**: 체크박스로 SCI-E급만/전체 전환 (기본: SCI-E만)
- **SCI-E 배지**: 검색 결과에 SCI-E 저널 표시 배지
- **클릭 가능한 링크**: 논문 제목 클릭 시 PubMed 페이지로 이동
- **E-utilities API**: 최근 10년 논문 검색, SCI 필터 시 3배 검색 후 필터링

## 디자인

- **미니멀 디자인**: 흰색 배경, 검은색(#111) 텍스트, 그라데이션/그림자 없음
- **Pretendard Variable 폰트**: CDN 로드 (한국어 최적화)
- **단순 테두리**: 1px solid #ddd, border-radius 3-4px
- **이모지 없음**: UI 전체에서 이모지 제거, 텍스트만 사용

## 질문 흐름 (8단계)

| 단계 | ID | 질문 | 조건 |
|------|-----|------|------|
| 1 | `dv_type` | 결과 변수 종류 (숫자/그룹) | 항상 |
| 2 | `dv_level` | 범주형 결과 변수 수준 | dv_type == "categorical" |
| 3 | `iv_count` | 비교할 변수 개수 | 항상 |
| 4 | `iv_types` | 비교 변수 종류 (다중 선택) | 항상 |
| 5 | `group_count` | 그룹 수 (2개/3개 이상) | iv_types에 "categorical" 포함 |
| 6 | `paired` | 대응 여부 (같은 사람 반복 측정?) | iv_types에 "categorical" 포함 |
| 7 | `normality` | 정규분포 여부 | dv_type == "continuous" |
| 8 | `has_covariate` | 공변량(통제 변수) 유무 | iv_count == "two_plus" |

## 지원 통계 테스트 (26종)

### 그룹 비교 (모수)
- 일표본 t-검정, 독립표본 t-검정, 대응표본 t-검정
- 일원/이원/반복측정/혼합 분산분석
- 공분산분석 (ANCOVA)

### 그룹 비교 (비모수)
- Mann-Whitney U, Wilcoxon 부호순위 검정
- Kruskal-Wallis, Friedman 검정

### 범주형 분석
- 카이제곱 검정, Fisher 정확 검정, McNemar 검정

### 상관/회귀 분석
- Pearson/Spearman/점이연 상관분석
- 단순/다중 선형회귀, 더미 회귀분석
- 이분형/다중범주/순서형 로지스틱 회귀

### 일반선형모형 (GLM)
- GLM (공변량 포함), GLM ANOVA

## 개발 가이드

### 통계 테스트 추가
1. `js/stat-data.js`의 `STAT_TESTS`에 테스트 정의 추가
2. `js/stat-recommender.js`에 추천 로직 추가
3. `js/r-code-customizer.js`에 아래 3가지 추가:
   - `TEST_VARIABLE_REQUIREMENTS`에 변수 요구사항 정의
   - `RCodeGenerators`에 코드 생성 함수 추가 (표준 섹션 구조 준수)
4. `js/webr-adaptor.js`의 `PACKAGE_MAP`에 필요 패키지 목록 추가
5. `js/pubmed-search.js`에 검색어 매핑 추가

### R 코드 생성 함수 형식
```javascript
RCodeGenerators.test_id = function(p) {
    // p.filePath: 파일 경로, p.fileFormat: 'xlsx'|'csv'
    // p.vars: { role: columnName }, p.multiIV: [col1, col2, ...]
    // p.extras: { role: value }, p.columnTypes: { col: type }
    // this._bt(v): 백틱 래핑, this._dfVar(v): df$`v`
    // this._formula(dv, ivs): 백틱 포함 formula
    var code = '';
    code += this._generateDataLoadCode(p.filePath, p.fileFormat);
    // ... 섹션별 분석 코드 생성
    return code;
};
```

### 테스트별 변수 역할 (role)
| role | 설명 | 사용 테스트 |
|------|------|------------|
| `dv` | 종속변수 | 대부분의 테스트 |
| `group` | 그룹 변수 | 독립 t, ANOVA, ANCOVA 등 |
| `pre`, `post` | 사전/사후 | 대응 t, Wilcoxon, McNemar |
| `subject` | 대상자 ID | 반복측정, Friedman, 혼합 ANOVA |
| `time` | 시점 변수 | 반복측정, Friedman, 혼합 ANOVA |
| `factor1`, `factor2` | 요인 1/2 | 이원 ANOVA |
| `covariate` | 공변량 | ANCOVA, GLM |
| `var_x`, `var_y` | 변수 X/Y | 상관분석 |
| `var1`, `var2` | 범주형 변수 1/2 | 카이제곱, Fisher |
| `binary_var`, `continuous_var` | 이분형/연속형 | 점이연 상관 |
| `iv` | 독립변수 (단일) | 단순 회귀 |
| `multiIV` | 독립변수 (다중, 체크박스) | 다중회귀, 로지스틱 등 |

## 재활 분야 (therapy_field)

| ID | 분야 |
|----|------|
| `pt` | 물리치료 (Physical Therapy) |
| `ot` | 작업치료 (Occupational Therapy) |
| `st` | 언어치료 (Speech Therapy) |
| `psych` | 재활심리 (Rehabilitation Psychology) |
| `neuro` | 신경재활 (Neurorehabilitation) |
| `all` | 전체 재활 분야 |

## 참고 자료

- [UCLA OARC What Statistics Should I Use?](https://stats.oarc.ucla.edu/other/mult-pkg/whatstat/)
- [PubMed E-utilities API](https://www.ncbi.nlm.nih.gov/books/NBK25501/)
- [R CRAN](https://cran.r-project.org/)
- 통계분석 기법의 선택 플로우차트 (한국어)
