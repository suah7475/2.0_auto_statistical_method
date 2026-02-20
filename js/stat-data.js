// 통계 테스트 정의 (쉬운 설명 + 재활 예시 포함)
window.AutoStat = window.AutoStat || {};

window.AutoStat.STAT_TESTS = {
    // ==================== 연속형 DV - 단일 IV ====================
    "one_sample_t": {
        id: "one_sample_t",
        name: "일표본 t-검정",
        name_en: "One-sample t-test",
        description: "단일 표본의 평균이 특정 기준값과 통계적으로 다른지 검정합니다.",
        simple_description: "우리 반 평균 키가 전국 평균 키와 같은지 다른지 알아보는 방법이에요!",
        analogy: "🎯 비유: 우리 동네 초등학생들의 평균 몸무게가 '전국 평균 30kg'과 같은지 비교해보는 것",
        assumptions: ["정규성 (Shapiro-Wilk 검정)", "연속형 종속변수"],
        when_to_use: "한 그룹의 평균을 이미 알려진 기준값과 비교할 때",
        example: "재활 치료 후 환자 그룹의 평균 점수가 정상 기준점과 다른지 검정",
        rehab_example: "🏥 재활 예시: 뇌졸중 환자 20명의 평균 악력이 정상인 기준(25kg)과 다른지 확인하고 싶어요!",
        dv_types: ["continuous"],
        iv_types: ["none"],
        icon: "📊"
    },
    "paired_t": {
        id: "paired_t",
        name: "대응표본 t-검정",
        name_en: "Paired samples t-test",
        description: "동일 대상의 두 측정값(전-후) 평균 차이를 검정합니다.",
        simple_description: "같은 사람이 '치료 전'과 '치료 후'에 달라졌는지 알아보는 방법이에요!",
        analogy: "🎯 비유: 다이어트 전 몸무게와 다이어트 후 몸무게가 진짜 달라졌는지 확인하는 것",
        assumptions: ["차이 점수의 정규성", "대응된 관측치"],
        when_to_use: "같은 사람을 두 번 측정해서 변화가 있는지 볼 때 (정규분포일 때)",
        example: "치료 전후의 통증 점수 변화 비교",
        rehab_example: "🏥 재활 예시: 물리치료 받기 전 통증 점수 7점 → 치료 후 3점, 정말 효과가 있는 걸까요?",
        dv_types: ["continuous"],
        iv_types: ["categorical"],
        icon: "🔄"
    },
    "wilcoxon_signed_rank": {
        id: "wilcoxon_signed_rank",
        name: "Wilcoxon 부호순위 검정",
        name_en: "Wilcoxon signed-rank test",
        description: "대응된 두 측정값의 차이를 비교하는 비모수 검정입니다.",
        simple_description: "대응표본 t-검정의 '동생'이에요! 데이터가 종 모양(정규분포)이 아닐 때 사용해요.",
        analogy: "🎯 비유: 키 순서대로 줄 세워서 전-후 순위가 바뀌었는지 보는 방법",
        assumptions: ["대응된 관측치", "차이 점수가 대칭 분포"],
        when_to_use: "같은 사람의 전-후 비교인데, 데이터가 정규분포가 아닐 때",
        example: "치료 전후 비교에서 정규성을 만족하지 못하는 경우",
        rehab_example: "🏥 재활 예시: 통증 설문(1~10점)이 정규분포가 아니어서 전-후 비교가 어려울 때 사용해요!",
        dv_types: ["continuous", "ordinal"],
        iv_types: ["categorical"],
        icon: "📉"
    },
    "independent_t": {
        id: "independent_t",
        name: "독립표본 t-검정",
        name_en: "Independent samples t-test (2-Sample T-test)",
        description: "두 독립 그룹 간의 평균 차이가 통계적으로 유의한지 검정합니다.",
        simple_description: "서로 다른 두 그룹을 비교해요! 예: 실험반 vs 대조반의 시험 점수 비교",
        analogy: "🎯 비유: 1반 평균 점수와 2반 평균 점수가 정말 다른지 알아보는 것",
        assumptions: ["정규성", "등분산성 (Levene 검정)", "독립성"],
        when_to_use: "서로 다른 두 그룹의 평균을 비교할 때 (정규분포일 때)",
        example: "실험군과 대조군의 치료 효과 비교",
        rehab_example: "🏥 재활 예시: 로봇 치료를 받은 환자 20명 vs 일반 치료 환자 20명, 누가 더 좋아졌을까요?",
        dv_types: ["continuous"],
        iv_types: ["categorical"],
        icon: "⚖️"
    },
    "mann_whitney": {
        id: "mann_whitney",
        name: "Mann-Whitney U 검정",
        name_en: "Mann-Whitney U test",
        description: "두 독립 그룹의 분포를 비교하는 비모수 검정입니다.",
        simple_description: "독립표본 t-검정의 '동생'이에요! 데이터가 종 모양이 아닐 때 두 그룹을 비교해요.",
        analogy: "🎯 비유: 두 반 학생들을 키 순서대로 섞어 세운 뒤, 어느 반이 앞에 더 많이 서는지 보는 것",
        assumptions: ["독립성", "순서형 또는 연속형 변수"],
        when_to_use: "서로 다른 두 그룹 비교인데, 데이터가 정규분포가 아닐 때",
        example: "표본 크기가 작거나 비정규 분포인 두 그룹의 점수 비교",
        rehab_example: "🏥 재활 예시: 참가자가 각 그룹에 10명밖에 없어서 정규분포를 가정하기 어려울 때!",
        dv_types: ["continuous", "ordinal"],
        iv_types: ["categorical"],
        icon: "📊"
    },
    "one_way_anova": {
        id: "one_way_anova",
        name: "일원 분산분석",
        name_en: "One-way ANOVA",
        description: "세 개 이상의 독립 그룹 간 평균 차이를 검정합니다.",
        simple_description: "세 그룹 이상을 한 번에 비교해요! t-검정의 '업그레이드 버전'이에요.",
        analogy: "🎯 비유: 1반, 2반, 3반의 평균 점수가 서로 다른지 한 번에 알아보는 것",
        assumptions: ["정규성", "등분산성", "독립성"],
        when_to_use: "세 그룹 이상의 평균을 한 번에 비교할 때 (정규분포일 때)",
        example: "세 가지 다른 치료법의 효과 비교",
        rehab_example: "🏥 재활 예시: A치료법, B치료법, C치료법 중 어떤 게 가장 효과적일까요? 세 그룹 동시 비교!",
        dv_types: ["continuous"],
        iv_types: ["categorical"],
        icon: "📈"
    },
    "kruskal_wallis": {
        id: "kruskal_wallis",
        name: "Kruskal-Wallis 검정",
        name_en: "Kruskal-Wallis test",
        description: "세 개 이상 독립 그룹의 분포를 비교하는 비모수 검정입니다.",
        simple_description: "일원분산분석(ANOVA)의 '동생'이에요! 세 그룹 이상 비교인데 정규분포가 아닐 때 사용해요.",
        analogy: "🎯 비유: 세 반 학생들을 모두 섞어서 순위를 매긴 뒤, 어느 반이 높은 순위가 많은지 보는 것",
        assumptions: ["독립성", "순서형 또는 연속형 변수"],
        when_to_use: "세 그룹 이상 비교인데, 데이터가 정규분포가 아닐 때",
        example: "비정규 분포 데이터에서 여러 치료 그룹 비교",
        rehab_example: "🏥 재활 예시: 통증 등급(1~5점)처럼 순서형 데이터로 세 치료법을 비교할 때!",
        dv_types: ["continuous", "ordinal"],
        iv_types: ["categorical"],
        icon: "📊"
    },
    "simple_regression": {
        id: "simple_regression",
        name: "단순 회귀분석",
        name_en: "Simple linear regression",
        description: "하나의 연속형 독립변수로 종속변수를 예측하는 모델입니다.",
        simple_description: "하나의 숫자로 다른 숫자를 예측해요! 키로 몸무게 예측하기 같은 거예요.",
        analogy: "🎯 비유: 공부 시간이 늘면 시험 점수도 올라갈까? 그 관계를 직선으로 그려보는 것",
        assumptions: ["선형성", "정규성", "등분산성", "독립성"],
        when_to_use: "숫자 변수 하나로 다른 숫자 결과를 예측하고 싶을 때",
        example: "치료 기간으로 회복 점수 예측",
        rehab_example: "🏥 재활 예시: 치료 횟수가 많을수록 관절 가동범위가 커질까요? 예측해볼 수 있어요!",
        dv_types: ["continuous"],
        iv_types: ["continuous"],
        icon: "📐"
    },

    // ==================== 연속형 DV - 다중 IV ====================
    "glm_covariate": {
        id: "glm_covariate",
        name: "일반선형모형 (공변량 포함)",
        name_en: "GLM with Covariate (ANCOVA)",
        description: "공변량(연속형)을 통제하면서 그룹(범주형) 효과를 분석합니다.",
        simple_description: "다른 요인의 영향을 빼고 순수한 효과만 보고 싶을 때 사용해요!",
        analogy: "🎯 비유: 나이 차이 때문에 생기는 점수 차이를 빼고, 순수하게 치료 효과만 보는 것",
        assumptions: ["정규성", "등분산성", "회귀 기울기의 동질성"],
        when_to_use: "그룹 비교할 때 나이, 성별 같은 다른 요인의 영향을 빼고 싶을 때",
        example: "나이(공변량)를 통제한 후 치료 그룹 간 효과 비교",
        rehab_example: "🏥 재활 예시: 환자 나이가 다 다른데, 나이 영향을 빼고 순수하게 치료 효과만 보고 싶어요!",
        dv_types: ["continuous"],
        iv_types: ["mixed"],
        icon: "🎛️"
    },
    "ancova": {
        id: "ancova",
        name: "공분산분석",
        name_en: "ANCOVA",
        description: "공변량(연속형)을 통제한 상태에서 그룹(범주형) 간 평균 차이를 검정합니다.",
        simple_description: "나이나 시작 점수 같은 영향을 빼고 그룹 차이를 공정하게 비교해요!",
        analogy: "🎯 비유: 달리기 시합에서 출발선이 다르면 불공평하잖아요? 출발선을 맞춰주는 것!",
        assumptions: ["정규성", "등분산성", "회귀 기울기의 동질성"],
        when_to_use: "그룹 비교 시 시작 조건이 달랐던 것을 보정하고 싶을 때",
        example: "사전 점수를 통제한 후 치료 그룹 간 효과 비교",
        rehab_example: "🏥 재활 예시: 치료 전 기능 점수가 환자마다 달랐어요. 이걸 보정하고 치료 효과를 비교해요!",
        dv_types: ["continuous"],
        iv_types: ["mixed"],
        icon: "⚖️"
    },
    "dummy_regression": {
        id: "dummy_regression",
        name: "더미변수 회귀분석",
        name_en: "Regression with Dummy Variables",
        description: "범주형 독립변수를 더미변수로 변환하여 회귀분석을 수행합니다.",
        simple_description: "그룹(범주)을 0과 1 숫자로 바꿔서 회귀분석에 넣는 방법이에요!",
        analogy: "🎯 비유: 성별을 '남자=0, 여자=1'로 바꿔서 숫자처럼 분석하는 것",
        assumptions: ["선형성", "정규성", "등분산성", "독립성"],
        when_to_use: "여러 그룹 변수를 회귀분석에 함께 넣고 싶을 때",
        example: "치료 유형(A/B/C)이 회복 점수에 미치는 영향을 회귀분석으로 분석",
        rehab_example: "🏥 재활 예시: PT(물리치료), OT(작업치료), ST(언어치료) 종류에 따른 효과를 회귀식으로!",
        dv_types: ["continuous"],
        iv_types: ["categorical"],
        icon: "🔢"
    },
    "glm_anova": {
        id: "glm_anova",
        name: "일반선형모형 (ANOVA)",
        name_en: "GLM (ANOVA)",
        description: "여러 연속형 독립변수들의 효과를 일반선형모형으로 분석합니다.",
        simple_description: "여러 숫자 변수들이 결과에 미치는 영향을 한 번에 분석해요!",
        analogy: "🎯 비유: 키, 몸무게, 나이가 각각 달리기 속도에 얼마나 영향 주는지 한 번에 보는 것",
        assumptions: ["선형성", "정규성", "등분산성"],
        when_to_use: "여러 숫자 변수들의 영향을 동시에 분석할 때",
        example: "여러 생체지표(연속형)가 기능 점수에 미치는 영향",
        rehab_example: "🏥 재활 예시: 나이, BMI, 치료 시간이 회복 점수에 각각 얼마나 영향을 미칠까요?",
        dv_types: ["continuous"],
        iv_types: ["continuous"],
        icon: "📊"
    },
    "multiple_regression": {
        id: "multiple_regression",
        name: "다중 회귀분석",
        name_en: "Multiple linear regression",
        description: "연속형과 범주형 독립변수가 혼합된 경우 종속변수를 예측하는 모델입니다.",
        simple_description: "여러 가지 정보(숫자+그룹)를 모두 써서 결과를 예측해요! 가장 많이 쓰이는 분석 중 하나!",
        analogy: "🎯 비유: 공부 시간 + 성별 + 사교육 여부를 모두 고려해서 시험 점수 예측하기",
        assumptions: ["선형성", "정규성", "등분산성", "독립성", "다중공선성 없음"],
        when_to_use: "숫자 변수와 그룹 변수를 모두 넣어서 결과를 예측하고 싶을 때",
        example: "나이(연속), 성별(범주), 치료기간(연속)으로 회복 점수 예측",
        rehab_example: "🏥 재활 예시: 나이 + 성별 + 손상 정도 + 치료 횟수로 6개월 후 보행 능력을 예측해요!",
        dv_types: ["continuous"],
        iv_types: ["continuous", "categorical", "mixed"],
        icon: "🔮"
    },
    "two_way_anova": {
        id: "two_way_anova",
        name: "이원 분산분석",
        name_en: "Two-way ANOVA",
        description: "두 개의 범주형 독립변수가 종속변수에 미치는 영향과 상호작용을 검정합니다.",
        simple_description: "두 가지 그룹 변수의 효과를 동시에 보고, 둘이 합쳐졌을 때 특별한 효과가 있는지도 봐요!",
        analogy: "🎯 비유: 남자/여자 + 치료A/B 조합에서 '남자+치료A'가 특별히 더 좋은지 알아보는 것",
        assumptions: ["정규성", "등분산성", "독립성"],
        when_to_use: "두 그룹 변수의 개별 효과와 상호작용 효과를 함께 보고 싶을 때",
        example: "치료 유형(A/B)과 성별(남/녀)이 회복 점수에 미치는 영향",
        rehab_example: "🏥 재활 예시: 치료 종류(PT/OT)와 연령대(청년/노인)가 회복에 미치는 영향 + 상호작용!",
        dv_types: ["continuous"],
        iv_types: ["categorical"],
        icon: "🔀"
    },
    "repeated_anova": {
        id: "repeated_anova",
        name: "반복측정 분산분석",
        name_en: "Repeated measures ANOVA",
        description: "동일 대상에서 세 번 이상 측정된 값의 차이를 검정합니다.",
        simple_description: "같은 사람을 여러 번 측정해서 시간에 따른 변화를 봐요! 전-중-후 비교에 딱!",
        analogy: "🎯 비유: 다이어트 시작 → 1달 후 → 2달 후 → 3달 후 몸무게 변화 추적하기",
        assumptions: ["정규성", "구형성 (Mauchly 검정)", "대응된 관측치"],
        when_to_use: "같은 사람을 3번 이상 측정해서 시간에 따른 변화를 볼 때",
        example: "치료 전, 4주 후, 8주 후의 기능 점수 변화 비교",
        rehab_example: "🏥 재활 예시: 치료 전 → 4주 후 → 8주 후 → 12주 후 관절 가동범위 변화를 추적해요!",
        dv_types: ["continuous"],
        iv_types: ["categorical"],
        icon: "📅"
    },
    "friedman": {
        id: "friedman",
        name: "Friedman 검정",
        name_en: "Friedman test",
        description: "반복 측정된 세 개 이상의 관련 표본을 비교하는 비모수 검정입니다.",
        simple_description: "반복측정 분산분석의 '동생'! 데이터가 정규분포가 아닐 때 시간 변화를 봐요.",
        analogy: "🎯 비유: 순위로 바꿔서 '전-중-후' 순위가 달라졌는지 보는 것",
        assumptions: ["대응된 관측치", "순서형 또는 연속형 변수"],
        when_to_use: "같은 사람을 3번 이상 측정했는데, 데이터가 정규분포가 아닐 때",
        example: "동일 환자에서 여러 시점의 비정규 분포 데이터 비교",
        rehab_example: "🏥 재활 예시: 통증 등급(1~5점)을 전-중-후 비교하는데 정규분포가 아닐 때!",
        dv_types: ["continuous", "ordinal"],
        iv_types: ["categorical"],
        icon: "📉"
    },
    "mixed_anova": {
        id: "mixed_anova",
        name: "혼합 분산분석",
        name_en: "Mixed ANOVA",
        description: "집단 간 요인과 집단 내 요인(반복측정)을 동시에 분석합니다.",
        simple_description: "그룹 비교 + 시간 변화를 동시에 봐요! 실험군 vs 대조군의 시간에 따른 변화 비교에 최고!",
        analogy: "🎯 비유: 두 반이 1학기 → 2학기 → 3학기 동안 각각 어떻게 변했는지 비교하기",
        assumptions: ["정규성", "등분산성", "구형성"],
        when_to_use: "여러 그룹의 시간에 따른 변화 패턴이 다른지 보고 싶을 때",
        example: "실험군/대조군의 치료 전/중/후 점수 변화 비교",
        rehab_example: "🏥 재활 예시: 로봇치료군 vs 일반치료군의 0주 → 4주 → 8주 회복 패턴이 다른가요?",
        dv_types: ["continuous"],
        iv_types: ["categorical"],
        icon: "🔄"
    },

    // ==================== 범주형 DV ====================
    "chi_square": {
        id: "chi_square",
        name: "카이제곱 검정",
        name_en: "Chi-square test",
        description: "두 범주형 변수 간의 독립성 또는 적합도를 검정합니다.",
        simple_description: "두 그룹이 서로 관련 있는지 없는지 알아봐요! 예: 성별과 합격 여부가 관련 있나요?",
        analogy: "🎯 비유: 남자/여자가 과일 좋아하는 것(사과/바나나)과 관계가 있나? 표로 정리해서 확인!",
        assumptions: ["기대빈도 5 이상", "독립적 관측치"],
        when_to_use: "두 그룹 변수가 서로 관련 있는지 확인하고 싶을 때",
        example: "치료 유형과 회복 여부(성공/실패) 간의 관계 분석",
        rehab_example: "🏥 재활 예시: 치료 종류(PT/OT)에 따라 퇴원 결과(성공/실패)가 달라질까요?",
        dv_types: ["categorical"],
        iv_types: ["categorical"],
        icon: "📋"
    },
    "fisher_exact": {
        id: "fisher_exact",
        name: "Fisher 정확 검정",
        name_en: "Fisher's exact test",
        description: "소표본에서 2x2 분할표의 독립성을 검정합니다.",
        simple_description: "카이제곱 검정의 '동생'! 사람 수가 적을 때(한 칸에 5명 미만) 사용해요.",
        analogy: "🎯 비유: 표의 칸에 사람이 너무 적으면 카이제곱이 부정확해요. 그럴 때 정확하게 계산!",
        assumptions: ["2x2 분할표", "독립적 관측치"],
        when_to_use: "데이터가 적어서 카이제곱 검정을 못 쓸 때 (기대빈도 5 미만)",
        example: "소규모 연구에서 치료 성공/실패 비율 비교",
        rehab_example: "🏥 재활 예시: 희귀 질환 환자 8명만 있어서 표 칸에 사람이 2~3명뿐일 때!",
        dv_types: ["categorical"],
        iv_types: ["categorical"],
        icon: "🔬"
    },
    "mcnemar": {
        id: "mcnemar",
        name: "McNemar 검정",
        name_en: "McNemar's test",
        description: "대응된 이분형 변수의 변화를 검정합니다.",
        simple_description: "같은 사람의 전-후 '예/아니오' 결과가 달라졌는지 봐요!",
        analogy: "🎯 비유: 치료 전 불합격 → 치료 후 합격으로 바뀐 사람이 얼마나 되는지 보는 것",
        assumptions: ["대응된 이분형 데이터"],
        when_to_use: "같은 사람의 전-후 '예/아니오' 결과를 비교할 때",
        example: "치료 전후 '정상/비정상' 판정 변화 분석",
        rehab_example: "🏥 재활 예시: 치료 전 '보행 불가능' → 치료 후 '보행 가능'으로 바뀐 환자 수!",
        dv_types: ["categorical"],
        iv_types: ["categorical"],
        icon: "🔄"
    },
    "logistic_regression": {
        id: "logistic_regression",
        name: "이분형 로지스틱 회귀",
        name_en: "Binary Logistic regression",
        description: "이분형(2수준) 종속변수의 발생 확률을 예측하는 모델입니다.",
        simple_description: "'성공할까 실패할까?'를 여러 정보로 예측해요! 확률로 결과를 알려줘요.",
        analogy: "🎯 비유: 공부 시간, 출석률, 과제 점수로 '합격/불합격' 확률을 예측하는 것",
        assumptions: ["독립적 관측치", "다중공선성 없음", "큰 표본 크기"],
        when_to_use: "'예/아니오' 결과를 여러 변수로 예측하고 싶을 때",
        example: "나이(연속), 중증도(범주)로 치료 성공/실패 예측",
        rehab_example: "🏥 재활 예시: 나이, 손상 정도, 치료 횟수로 '독립 보행 가능/불가능' 예측하기!",
        dv_types: ["categorical"],
        iv_types: ["continuous", "categorical", "mixed"],
        icon: "🎲"
    },
    "multinomial_logistic": {
        id: "multinomial_logistic",
        name: "다중범주 로지스틱 회귀",
        name_en: "Multinomial Logistic regression",
        description: "3개 이상의 명목형 종속변수를 예측하는 모델입니다.",
        simple_description: "결과가 A, B, C 세 가지 이상일 때 어디에 속할지 예측해요!",
        analogy: "🎯 비유: 학생이 '문과/이과/예체능' 중 어디로 갈지 성적과 적성으로 예측하기",
        assumptions: ["독립적 관측치", "다중공선성 없음", "표본 크기 충분"],
        when_to_use: "결과가 3가지 이상(순서 없음)이고, 여러 변수로 예측하고 싶을 때",
        example: "환자 특성으로 치료 선택(A/B/C) 예측",
        rehab_example: "🏥 재활 예시: 환자 정보로 '완전 회복/부분 회복/미회복' 중 어디에 속할지 예측!",
        dv_types: ["categorical"],
        iv_types: ["continuous", "categorical", "mixed"],
        icon: "🎯"
    },
    "ordinal_regression": {
        id: "ordinal_regression",
        name: "순서형 로지스틱 회귀",
        name_en: "Ordinal Logistic regression",
        description: "순서형(서열) 종속변수를 예측하는 모델입니다.",
        simple_description: "결과에 순서가 있을 때(경증→중등증→중증) 어디에 속할지 예측해요!",
        analogy: "🎯 비유: 성적에 따라 '상/중/하' 등급 중 어디에 들어갈지 예측하는 것",
        assumptions: ["비례 오즈 가정", "독립적 관측치"],
        when_to_use: "결과가 순서가 있는 등급(경증/중등증/중증)이고, 예측하고 싶을 때",
        example: "환자 특성으로 중증도(경증/중등증/중증) 예측",
        rehab_example: "🏥 재활 예시: 손상 정보로 '자립/부분 의존/완전 의존' 수준 예측하기!",
        dv_types: ["ordinal", "categorical"],
        iv_types: ["continuous", "categorical", "mixed"],
        icon: "📊"
    },

    // ==================== 상관분석 ====================
    "pearson_correlation": {
        id: "pearson_correlation",
        name: "Pearson 상관분석",
        name_en: "Pearson correlation",
        description: "두 연속형 변수 간의 선형 관계 강도와 방향을 측정합니다.",
        simple_description: "두 숫자가 같이 움직이는지 봐요! 키가 크면 몸무게도 클까요?",
        analogy: "🎯 비유: 아이스크림 판매량과 기온이 같이 올라가는지 보는 것 (같이 오르면 양의 상관!)",
        assumptions: ["정규성", "선형성", "등분산성"],
        when_to_use: "두 숫자 변수가 함께 변하는지, 얼마나 강하게 관련되는지 알고 싶을 때",
        example: "나이와 회복 점수 간의 관계 분석",
        rehab_example: "🏥 재활 예시: 치료 횟수가 많을수록 기능 점수도 높아지나요? r = 0.8이면 강한 관계!",
        dv_types: ["continuous"],
        iv_types: ["continuous"],
        icon: "📈"
    },
    "spearman_correlation": {
        id: "spearman_correlation",
        name: "Spearman 상관분석",
        name_en: "Spearman correlation",
        description: "두 변수 간의 단조 관계를 측정하는 비모수적 상관분석입니다.",
        simple_description: "Pearson의 '동생'! 순위로 바꿔서 관계를 봐요. 정규분포 아닐 때 사용!",
        analogy: "🎯 비유: 달리기 순위와 줄넘기 순위가 비슷한지 보는 것 (1등이 둘 다 1등인지)",
        assumptions: ["순서형 또는 연속형 변수"],
        when_to_use: "두 변수 관계를 보고 싶은데 정규분포가 아니거나, 순위 데이터일 때",
        example: "통증 등급(1-10)과 일상생활 수행능력 간의 관계",
        rehab_example: "🏥 재활 예시: 통증 등급(1~5)과 만족도 등급(1~5)이 관련 있을까요?",
        dv_types: ["continuous", "ordinal"],
        iv_types: ["continuous", "ordinal"],
        icon: "📊"
    },
    "point_biserial": {
        id: "point_biserial",
        name: "점이연 상관분석",
        name_en: "Point-biserial correlation",
        description: "이분형 변수와 연속형 변수 간의 관계를 측정합니다.",
        simple_description: "그룹(남/녀)과 숫자(점수)가 관련 있는지 봐요! 성별과 키의 관계 같은 것!",
        analogy: "🎯 비유: 남자/여자(0/1)와 달리기 기록(숫자)이 관계가 있는지 보는 것",
        assumptions: ["연속형 변수의 정규성", "이분형 변수"],
        when_to_use: "두 그룹(예/아니오)과 숫자 점수가 관련 있는지 알고 싶을 때",
        example: "성별(남/녀)과 치료 점수 간의 관계",
        rehab_example: "🏥 재활 예시: 수술 여부(함/안함)와 회복 점수가 관련 있을까요?",
        dv_types: ["continuous"],
        iv_types: ["categorical"],
        icon: "🔗"
    }
};

// 질문 정의 (쉬운 설명)
window.AutoStat.QUESTIONS = [
    {
        step: 1,
        id: "dv_type",
        question: "알아보고 싶은 '결과'는 어떤 종류인가요?",
        help: "💡 결과 변수(종속변수)의 종류를 선택하세요!",
        options: [
            {
                value: "continuous",
                label: "📊 숫자 (점수, 시간 등)",
                description: "예: 통증 점수 7점, 보행 속도 1.2m/s, 악력 25kg"
            },
            {
                value: "categorical",
                label: "📋 그룹/종류 (성공/실패 등)",
                description: "예: 치료 성공/실패, 정상/비정상, 경증/중등증/중증"
            }
        ]
    },
    {
        step: 2,
        id: "dv_level",
        question: "결과 그룹은 몇 가지이고, 순서가 있나요?",
        help: "💡 결과가 몇 개로 나뉘는지, 순서(등급)가 있는지 선택하세요!",
        condition: "dv_type === 'categorical'",
        options: [
            {
                value: "binary",
                label: "2가지 (예/아니오)",
                description: "예: 성공/실패, 정상/비정상, 가능/불가능"
            },
            {
                value: "nominal",
                label: "3가지 이상 (순서 없음)",
                description: "예: 치료 A/B/C 선택, 좋아하는 과일(사과/바나나/오렌지)"
            },
            {
                value: "ordinal",
                label: "3가지 이상 (순서 있음)",
                description: "예: 경증→중등증→중증, 상→중→하, 1등급→2등급→3등급"
            }
        ]
    },
    {
        step: 3,
        id: "iv_count",
        question: "결과에 영향을 주는 '원인/조건'이 몇 개인가요?",
        help: "💡 비교하거나 예측에 사용할 변수(독립변수)의 개수예요!",
        options: [
            {
                value: 1,
                label: "1개",
                description: "예: 치료군/대조군만 비교, 나이만으로 예측"
            },
            {
                value: 2,
                label: "2개 이상",
                description: "예: 치료군+성별, 나이+치료횟수+손상정도"
            }
        ]
    },
    {
        step: 4,
        id: "iv_types",
        question: "'원인/조건' 변수는 어떤 종류인가요?",
        help: "💡 여러 종류가 섞여있으면 모두 선택하세요!",
        multiSelect: true,
        options: [
            {
                value: "categorical",
                label: "📋 그룹 (실험군/대조군 등)",
                description: "예: 치료 유형(A/B), 성별(남/녀), 그룹 분류"
            },
            {
                value: "continuous",
                label: "📊 숫자 (나이, 횟수 등)",
                description: "예: 나이 45세, 치료 횟수 12회, BMI 24.5"
            }
        ]
    },
    {
        step: 5,
        id: "group_count",
        question: "비교할 그룹이 몇 개인가요?",
        help: "실험군/대조군 = 2개, 치료A/B/C = 3개",
        condition: "iv_types && iv_types.includes('categorical')",
        options: [
            {
                value: 2,
                label: "2개 그룹",
                description: "예: 실험군 vs 대조군, 남자 vs 여자"
            },
            {
                value: 3,
                label: "3개 이상",
                description: "예: 치료A vs 치료B vs 치료C"
            }
        ]
    },
    {
        step: 6,
        id: "paired",
        question: "같은 사람을 여러 번 측정했나요?",
        help: "같은 환자의 '치료 전-후' 비교인지, 다른 환자들 비교인지 선택하세요",
        condition: "iv_types && iv_types.includes('categorical')",
        options: [
            {
                value: false,
                label: "👥 다른 사람들 비교",
                description: "예: 실험군 20명 vs 대조군 20명 (서로 다른 사람)"
            },
            {
                value: true,
                label: "🔄 같은 사람 전-후 비교",
                description: "예: 환자 20명의 치료 전 점수 vs 치료 후 점수"
            }
        ]
    },
    {
        step: 7,
        id: "normality",
        question: "데이터가 '종 모양(정규분포)'인가요?",
        help: "💡 잘 모르겠으면 '아니오'를 선택해도 괜찮아요! 비모수 검정이 더 안전해요.",
        condition: "iv_types && iv_types.includes('categorical') && dv_type === 'continuous'",
        options: [
            {
                value: true,
                label: "✅ 예 (정규분포)",
                description: "히스토그램이 종 모양, Shapiro-Wilk p > 0.05"
            },
            {
                value: false,
                label: "❌ 아니오 / 잘 모름",
                description: "데이터가 한쪽으로 치우쳤거나, 표본 수가 적을 때"
            }
        ]
    },
    {
        step: 8,
        id: "has_covariate",
        question: "영향을 빼고 싶은 다른 요인이 있나요?",
        help: "💡 나이, 성별, 시작 점수 등 결과에 영향을 주지만 관심 없는 변수가 있나요?",
        condition: "iv_count >= 2 && dv_type === 'continuous'",
        options: [
            {
                value: false,
                label: "없어요",
                description: "따로 통제할 변수가 없어요"
            },
            {
                value: true,
                label: "있어요 (공변량)",
                description: "예: 나이 영향을 빼고 치료 효과만 보고 싶어요"
            }
        ]
    }
];
