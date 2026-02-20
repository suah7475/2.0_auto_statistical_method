// 통계 테스트 추천 엔진 (플로우차트 기반 의사결정 트리)
window.AutoStat = window.AutoStat || {};

window.AutoStat.StatRecommender = {

    recommend: function(userInput) {
        var dv_type = userInput.dv_type || "continuous";
        var dv_level = userInput.dv_level || "binary";
        var iv_count = Number(userInput.iv_count) || 1;
        var iv_types = userInput.iv_types || ["categorical"];
        var group_count = Number(userInput.group_count) || 2;
        var paired = userInput.paired === true;
        var normality = userInput.normality !== undefined ? userInput.normality === true : true;
        var has_covariate = userInput.has_covariate === true;

        // IV 유형 분석
        var has_continuous_iv = iv_types.indexOf("continuous") !== -1;
        var has_categorical_iv = iv_types.indexOf("categorical") !== -1;
        var is_mixed_iv = has_continuous_iv && has_categorical_iv;

        // 추천 로직 실행
        var recommendations;
        if (dv_type === "continuous") {
            recommendations = this._recommendContinuousDv(
                iv_count, iv_types, has_continuous_iv, has_categorical_iv,
                is_mixed_iv, group_count, paired, normality, has_covariate
            );
        } else {
            recommendations = this._recommendCategoricalDv(
                dv_level, iv_count, iv_types, has_continuous_iv, has_categorical_iv,
                is_mixed_iv, group_count, paired
            );
        }

        var tests = window.AutoStat.STAT_TESTS;
        var primary, alternatives;

        if (recommendations && recommendations.length > 0) {
            primary = tests[recommendations[0]] || null;
            alternatives = [];
            for (var i = 1; i < Math.min(recommendations.length, 4); i++) {
                var tid = recommendations[i];
                if (tests[tid]) {
                    var alt = {};
                    for (var key in tests[tid]) {
                        alt[key] = tests[tid][key];
                    }
                    alt.reason = this._getReason(tid);
                    alternatives.push(alt);
                }
            }
        } else {
            primary = tests["chi_square"];
            alternatives = [];
        }

        var decision_path = this._buildDecisionPath(
            dv_type, dv_level, iv_count, iv_types,
            group_count, paired, normality, has_covariate
        );

        return {
            success: true,
            recommendation: {
                primary: primary,
                alternatives: alternatives,
                decision_path: decision_path,
                is_mixed: is_mixed_iv
            }
        };
    },

    // ==================== 연속형 DV 추천 ====================
    _recommendContinuousDv: function(iv_count, iv_types, has_continuous_iv,
                                      has_categorical_iv, is_mixed_iv, group_count,
                                      paired, normality, has_covariate) {

        // === 단일 IV ===
        if (iv_count === 1) {
            if (has_categorical_iv && !has_continuous_iv) {
                // 범주형 IV → 그룹 비교
                if (group_count === 2) {
                    if (paired) {
                        return normality
                            ? ["paired_t", "wilcoxon_signed_rank"]
                            : ["wilcoxon_signed_rank", "paired_t"];
                    } else {
                        return normality
                            ? ["independent_t", "mann_whitney", "point_biserial"]
                            : ["mann_whitney", "independent_t"];
                    }
                } else {
                    // 3개 이상 그룹
                    if (paired) {
                        return normality
                            ? ["repeated_anova", "friedman"]
                            : ["friedman", "repeated_anova"];
                    } else {
                        return normality
                            ? ["one_way_anova", "kruskal_wallis"]
                            : ["kruskal_wallis", "one_way_anova"];
                    }
                }
            } else if (has_continuous_iv && !has_categorical_iv) {
                // 연속형 IV → 상관/회귀
                return ["simple_regression", "pearson_correlation", "spearman_correlation"];
            }
        }

        // === 다중 IV (2개 이상) ===
        if (has_categorical_iv && !has_continuous_iv) {
            // 모두 범주형 IV
            if (has_covariate) {
                return ["ancova", "glm_covariate", "multiple_regression"];
            }
            if (paired) {
                // 피험자 내 요인 포함 → 혼합 ANOVA
                return ["mixed_anova", "repeated_anova", "two_way_anova"];
            }
            // 독립 그룹 → ANOVA (GLM)
            return ["two_way_anova", "glm_anova", "one_way_anova"];

        } else if (has_continuous_iv && !has_categorical_iv) {
            // 모두 연속형 IV → 다중회귀
            return ["multiple_regression", "glm_anova"];

        } else if (is_mixed_iv) {
            // 혼합 IV (범주 + 연속)
            if (has_covariate) {
                return ["glm_covariate", "ancova", "multiple_regression"];
            }
            return ["dummy_regression", "multiple_regression", "glm_covariate"];
        }

        return ["multiple_regression"];
    },

    // ==================== 범주형 DV 추천 ====================
    _recommendCategoricalDv: function(dv_level, iv_count, iv_types,
                                       has_continuous_iv, has_categorical_iv,
                                       is_mixed_iv, group_count, paired) {

        // === 단일 범주형 IV → 교차분석 계열 ===
        if (iv_count === 1 && has_categorical_iv && !has_continuous_iv) {
            if (dv_level === "ordinal") {
                return ["ordinal_regression", "chi_square", "kruskal_wallis"];
            }
            if (paired) {
                return ["mcnemar", "chi_square"];
            }
            if (dv_level === "binary") {
                return ["chi_square", "fisher_exact", "logistic_regression"];
            }
            // nominal (3가지 이상, 순서 없음)
            return ["chi_square", "fisher_exact", "multinomial_logistic"];
        }

        // === 단일 연속형 IV → 로지스틱 회귀 ===
        if (iv_count === 1 && has_continuous_iv && !has_categorical_iv) {
            if (dv_level === "binary") {
                return ["logistic_regression"];
            } else if (dv_level === "nominal") {
                return ["multinomial_logistic", "logistic_regression"];
            } else {
                return ["ordinal_regression", "logistic_regression"];
            }
        }

        // === 다중 IV 또는 혼합 IV → 회귀 모형 ===
        if (dv_level === "binary") {
            return ["logistic_regression", "multinomial_logistic"];
        } else if (dv_level === "nominal") {
            return ["multinomial_logistic", "logistic_regression"];
        } else {
            return ["ordinal_regression", "multinomial_logistic", "logistic_regression"];
        }
    },

    // ==================== 대안 이유 ====================
    _getReason: function(testId) {
        var reasons = {
            "mann_whitney": "데이터가 정규분포가 아닐 때 사용해요",
            "wilcoxon_signed_rank": "데이터가 정규분포가 아닐 때 사용해요",
            "kruskal_wallis": "데이터가 정규분포가 아닐 때 사용해요",
            "friedman": "데이터가 정규분포가 아닐 때 사용해요",
            "spearman_correlation": "정규분포가 아니거나 순위 데이터일 때",
            "fisher_exact": "사람 수가 적을 때 (칸에 5명 미만)",
            "ancova": "다른 요인(나이 등)의 영향을 빼고 싶을 때",
            "glm_covariate": "다른 요인의 영향을 통제하고 싶을 때",
            "multiple_regression": "여러 변수로 예측하고 싶을 때",
            "logistic_regression": "'예/아니오' 결과를 예측할 때",
            "multinomial_logistic": "3가지 이상 결과를 예측할 때",
            "ordinal_regression": "순서 있는 등급을 예측할 때",
            "two_way_anova": "두 그룹 변수의 상호작용을 볼 때",
            "mixed_anova": "그룹 비교 + 시간 변화를 동시에 볼 때",
            "repeated_anova": "같은 사람을 여러 시점에서 비교할 때",
            "point_biserial": "그룹(2개)과 숫자 관계를 볼 때",
            "chi_square": "두 그룹 변수의 관련성을 볼 때",
            "paired_t": "정규분포일 때 더 정확해요",
            "independent_t": "정규분포일 때 더 정확해요",
            "one_way_anova": "정규분포일 때 더 정확해요 (단일 요인)",
            "dummy_regression": "그룹을 숫자로 바꿔서 회귀분석",
            "glm_anova": "여러 숫자 변수의 영향을 볼 때",
            "pearson_correlation": "두 변수의 선형 관계를 볼 때",
            "simple_regression": "하나의 변수로 예측할 때"
        };
        return reasons[testId] || "대안적 분석 방법";
    },

    // ==================== 의사결정 경로 ====================
    _buildDecisionPath: function(dv_type, dv_level, iv_count, iv_types,
                                  group_count, paired, normality, has_covariate) {
        var path = [];

        // 1. DV 유형
        if (dv_type === "continuous") {
            path.push("결과 변수가 숫자예요 (점수, 시간, 거리 등)");
        } else {
            var levelDesc = {
                "binary": "예/아니오 (성공/실패)",
                "nominal": "3가지 이상 종류 (A/B/C)",
                "ordinal": "순서 있는 등급 (경증/중등증/중증)"
            };
            path.push("결과 변수가 그룹이에요: " + (levelDesc[dv_level] || dv_level));
        }

        // 2. IV 개수
        if (iv_count === 1) {
            path.push("비교할 변수가 1개예요");
        } else {
            path.push("비교할 변수가 2개 이상이에요");
        }

        // 3. IV 유형
        if (iv_types.indexOf("categorical") !== -1 && iv_types.indexOf("continuous") !== -1) {
            path.push("그룹 변수 + 숫자 변수가 섞여있어요");
        } else if (iv_types.indexOf("categorical") !== -1) {
            path.push("그룹으로 나눠서 비교해요 (실험군/대조군 등)");
        } else if (iv_types.indexOf("continuous") !== -1) {
            path.push("숫자로 예측해요 (나이, 치료 횟수 등)");
        }

        // 4. 그룹 관련 (범주형 IV가 있을 때)
        if (iv_types.indexOf("categorical") !== -1) {
            if (group_count === 2) {
                path.push("2개 그룹 비교");
            } else {
                path.push("3개 이상 그룹 비교");
            }

            if (paired) {
                path.push("같은 사람을 여러 번 측정했어요 (전-후 비교)");
            } else {
                path.push("서로 다른 사람들이에요 (실험군 vs 대조군)");
            }
        }

        // 5. 정규성 (연속형 DV + 범주형 IV)
        if (dv_type === "continuous" && iv_types.indexOf("categorical") !== -1) {
            if (normality) {
                path.push("데이터가 정규분포예요 → 모수 검정 사용");
            } else {
                path.push("데이터가 정규분포가 아니에요 → 비모수 검정 추천");
            }
        }

        // 6. 공변량
        if (has_covariate && iv_count >= 2) {
            path.push("다른 요인(나이 등)의 영향을 빼고 분석해요");
        }

        return path;
    },

    getAllTests: function() {
        return Object.values(window.AutoStat.STAT_TESTS);
    },

    getTestById: function(testId) {
        return window.AutoStat.STAT_TESTS[testId] || null;
    }
};
