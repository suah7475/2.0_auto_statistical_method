/**
 * 업로드 데이터와 변수 매핑을 R 실행 전에 검사한다.
 * 브라우저와 간단한 Node 테스트에서 함께 사용할 수 있도록 DOM에 의존하지 않는다.
 */
window.AutoStat = window.AutoStat || {};

window.AutoStat.DataValidator = {
    MISSING_VALUES: ['', 'na', 'n/a', 'null', 'undefined', '.'],

    isMissing: function(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'number') return Number.isNaN(value);
        return this.MISSING_VALUES.indexOf(String(value).trim().toLowerCase()) !== -1;
    },

    toNumber: function(value) {
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        if (this.isMissing(value)) return null;
        var normalized = String(value).trim().replace(/,/g, '');
        if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return null;
        var number = Number(normalized);
        return Number.isFinite(number) ? number : null;
    },

    validateHeaders: function(headers) {
        var errors = [];
        var warnings = [];
        var seen = Object.create(null);

        if (!Array.isArray(headers) || headers.length === 0) {
            return { valid: false, errors: ['첫 행에서 열 이름을 찾지 못했습니다.'], warnings: [] };
        }

        headers.forEach(function(header, index) {
            var name = String(header === undefined || header === null ? '' : header).trim();
            var position = index + 1;

            if (!name) {
                errors.push(position + '번째 열의 이름이 비어 있습니다. 첫 행에 열 이름을 입력해주세요.');
                return;
            }
            if (name.length > 80) {
                errors.push('열 이름 "' + name.slice(0, 24) + '..."이 너무 깁니다. 80자 이하로 줄여주세요.');
            }
            if (/[\u0000-\u001f\u007f`"'\\]/.test(name)) {
                errors.push('열 이름 "' + name + '"에 따옴표, 역슬래시 또는 줄바꿈이 있습니다. 해당 문자를 제거해주세요.');
            }

            var key = name.toLocaleLowerCase('ko-KR');
            if (seen[key]) {
                errors.push('열 이름 "' + name + '"이 중복되었습니다. 각 열 이름은 서로 달라야 합니다.');
            }
            seen[key] = true;
        });

        if (headers.length > 60) {
            warnings.push('열이 ' + headers.length + '개입니다. 분석에 필요한 열만 남기면 선택이 쉬워집니다.');
        }

        return { valid: errors.length === 0, errors: errors, warnings: warnings };
    },

    inferType: function(header, values) {
        var headerType = window.AutoStat.TypeDetector ?
            window.AutoStat.TypeDetector.detect(String(header || '')) : 'continuous';
        var nonMissing = (values || []).filter(function(value) {
            return !window.AutoStat.DataValidator.isMissing(value);
        });

        if (nonMissing.length === 0) return headerType;

        var unique = this.uniqueValues(nonMissing);
        var numericCount = nonMissing.filter(function(value) {
            return window.AutoStat.DataValidator.toNumber(value) !== null;
        }).length;
        var numericRatio = numericCount / nonMissing.length;

        if (headerType === 'ordinal') return 'ordinal';
        if (headerType === 'categorical') return 'categorical';
        if (numericRatio >= 0.95) {
            return unique.length <= 2 ? 'categorical' : 'continuous';
        }
        return 'categorical';
    },

    detectTypes: function(headers, rows) {
        var result = {};
        var self = this;
        headers.forEach(function(header, index) {
            var values = rows.map(function(row) { return row[index]; });
            result[header] = self.inferType(header, values);
        });
        return result;
    },

    uniqueValues: function(values) {
        var seen = Object.create(null);
        var result = [];
        (values || []).forEach(function(value) {
            if (window.AutoStat.DataValidator.isMissing(value)) return;
            var stringValue = String(value).trim();
            var key = stringValue;
            if (!seen[key]) {
                seen[key] = true;
                result.push(stringValue);
            }
        });
        return result;
    },

    getColumnValues: function(headers, rows, columnName) {
        var index = headers.indexOf(columnName);
        if (index === -1) return [];
        return rows.map(function(row) { return row[index]; });
    },

    getUniqueColumnValues: function(headers, rows, columnName) {
        return this.uniqueValues(this.getColumnValues(headers, rows, columnName));
    },

    parseOrder: function(value) {
        if (!value) return [];
        return String(value).split(/\s*(?:\||>)\s*/).map(function(item) {
            return item.trim();
        }).filter(Boolean);
    },

    validateMapping: function(config) {
        config = config || {};
        var testId = config.testId;
        var requirements = config.requirements || {};
        var headers = config.headers || [];
        var rows = config.rows || [];
        var vars = config.vars || {};
        var multiIV = config.multiIV || [];
        var columnTypes = config.columnTypes || {};
        var extras = config.extras || {};
        var errors = [];
        var warnings = [];
        var self = this;

        var headerReport = this.validateHeaders(headers);
        errors = errors.concat(headerReport.errors);
        warnings = warnings.concat(headerReport.warnings);

        (requirements.variables || []).forEach(function(variable) {
            if (variable.required && !vars[variable.role]) {
                errors.push(variable.label + '을(를) 선택해주세요.');
            }
        });

        var minimumPredictors = ['multiple_regression', 'dummy_regression', 'glm_anova'].indexOf(testId) !== -1 ? 2 : 1;
        if (requirements.multiIV && multiIV.length < minimumPredictors) {
            errors.push('독립변수를 ' + minimumPredictors + '개 이상 선택해주세요.');
        }

        var selected = [];
        Object.keys(vars).forEach(function(role) {
            if (vars[role]) selected.push({ role: role, column: vars[role] });
        });
        multiIV.forEach(function(column) {
            selected.push({ role: 'multiIV', column: column });
        });

        var selectedColumns = Object.create(null);
        selected.forEach(function(item) {
            if (headers.indexOf(item.column) === -1) {
                errors.push('선택한 열 "' + item.column + '"을 데이터에서 찾을 수 없습니다.');
                return;
            }
            if (selectedColumns[item.column]) {
                errors.push('"' + item.column + '" 열이 두 역할에 중복 선택되었습니다. 서로 다른 열을 선택해주세요.');
            }
            selectedColumns[item.column] = true;
        });

        var requirementsByRole = {};
        (requirements.variables || []).concat(requirements.optionalVariables || []).forEach(function(variable) {
            requirementsByRole[variable.role] = variable;
        });

        selected.forEach(function(item) {
            var type = columnTypes[item.column];
            var expected = requirementsByRole[item.role] && requirementsByRole[item.role].type;
            var values = self.getColumnValues(headers, rows, item.column);
            var presentValues = values.filter(function(value) { return !self.isMissing(value); });
            var unique = self.uniqueValues(presentValues);

            if (presentValues.length === 0) {
                errors.push('"' + item.column + '" 열에 분석할 값이 없습니다.');
                return;
            }
            if (unique.length < 2 && item.role !== 'subject') {
                errors.push('"' + item.column + '" 열의 값이 모두 같습니다. 서로 다른 값이 필요합니다.');
            }

            if (expected === 'continuous' && type !== 'continuous') {
                errors.push('"' + item.column + '"은(는) 숫자 변수로 설정해야 합니다.');
            }
            if (expected === 'categorical' && type === 'continuous') {
                errors.push('"' + item.column + '"은(는) 그룹 변수로 설정해야 합니다.');
            }
            if (expected === 'ordinal' && type !== 'ordinal') {
                errors.push('"' + item.column + '"은(는) 순서형 변수로 설정해야 합니다.');
            }

            if (type === 'continuous') {
                var invalidNumeric = presentValues.filter(function(value) {
                    return self.toNumber(value) === null;
                });
                if (invalidNumeric.length > 0) {
                    errors.push('"' + item.column + '" 열에 숫자가 아닌 값이 ' + invalidNumeric.length + '개 있습니다.');
                }
            }
        });

        this._validateLevels(testId, headers, rows, vars, multiIV, columnTypes, errors, warnings);
        this._validateExtras(requirements, headers, rows, vars, extras, errors);
        this._validateRepeatedMeasures(testId, headers, rows, vars, errors);

        var usedColumns = Object.keys(selectedColumns);
        var completeRows = rows.filter(function(row) {
            return usedColumns.every(function(column) {
                var index = headers.indexOf(column);
                return index !== -1 && !self.isMissing(row[index]);
            });
        }).length;

        if (usedColumns.length > 0 && completeRows < 3) {
            errors.push('선택한 열에 결측치가 없는 행이 ' + completeRows + '개뿐입니다. 최소 3개 행이 필요합니다.');
        }
        if (rows.length > 0 && completeRows > 0 && completeRows < rows.length) {
            warnings.push('결측치가 있는 ' + (rows.length - completeRows) + '개 행은 분석에서 제외됩니다.');
        }

        var predictorCount = multiIV.length || Math.max(0, usedColumns.length - 1);
        if (/(?:regression|logistic)|glm_/.test(testId || '') && completeRows > 0) {
            if (completeRows <= predictorCount + 2) {
                errors.push('분석 가능한 행 수가 예측변수 수에 비해 너무 적습니다. 행을 더 확보하거나 변수를 줄여주세요.');
            } else if (completeRows < (predictorCount + 1) * 10) {
                warnings.push('표본 수가 적어 회귀 결과가 불안정할 수 있습니다. 연구자 또는 통계 전문가와 표본 수를 확인하세요.');
            }
        } else if (completeRows > 0 && completeRows < 10) {
            warnings.push('분석 가능한 행이 10개 미만입니다. 결과를 해석할 때 표본 수를 함께 확인하세요.');
        }

        return {
            valid: errors.length === 0,
            errors: this._uniqueMessages(errors),
            warnings: this._uniqueMessages(warnings),
            completeRows: completeRows,
            totalRows: rows.length
        };
    },

    _validateLevels: function(testId, headers, rows, vars, multiIV, columnTypes, errors, warnings) {
        var self = this;
        function count(column) {
            return self.getUniqueColumnValues(headers, rows, column).length;
        }
        function exactly(role, expected, label) {
            if (!vars[role]) return;
            var actual = count(vars[role]);
            if (actual !== expected) errors.push(label + '은(는) ' + expected + '개 범주여야 하지만 현재 ' + actual + '개입니다.');
        }
        function atLeast(role, expected, label) {
            if (!vars[role]) return;
            var actual = count(vars[role]);
            if (actual < expected) errors.push(label + '은(는) ' + expected + '개 이상의 범주가 필요합니다.');
        }

        if (['independent_t', 'mann_whitney'].indexOf(testId) !== -1) exactly('group', 2, '그룹 변수');
        if (['one_way_anova', 'kruskal_wallis'].indexOf(testId) !== -1) atLeast('group', 3, '그룹 변수');
        if (testId === 'two_way_anova') {
            atLeast('factor1', 2, '요인 1');
            atLeast('factor2', 2, '요인 2');
        }
        if (['repeated_anova', 'mixed_anova'].indexOf(testId) !== -1) atLeast('time', 2, '시점 변수');
        if (testId === 'friedman') atLeast('time', 3, '시점 변수');
        if (['mixed_anova', 'ancova', 'glm_covariate'].indexOf(testId) !== -1) atLeast('group', 2, '그룹 변수');
        if (['chi_square', 'fisher_exact'].indexOf(testId) !== -1) {
            atLeast('var1', 2, '변수 1');
            atLeast('var2', 2, '변수 2');
        }
        if (testId === 'mcnemar') {
            exactly('pre', 2, '사전 상태');
            exactly('post', 2, '사후 상태');
        }
        if (testId === 'point_biserial') exactly('binary_var', 2, '이분형 변수');
        if (testId === 'logistic_regression') exactly('dv', 2, '결과 변수');
        if (testId === 'multinomial_logistic') atLeast('dv', 3, '결과 변수');
        if (testId === 'ordinal_regression') atLeast('dv', 3, '결과 변수');

        if (testId === 'dummy_regression') {
            var categoricalCount = multiIV.filter(function(column) {
                return columnTypes[column] === 'categorical' || columnTypes[column] === 'ordinal';
            }).length;
            if (categoricalCount === 0) {
                errors.push('더미변수 회귀에는 그룹 변수를 하나 이상 선택해야 합니다.');
            }
        }

        if (testId === 'chi_square' && vars.var1 && vars.var2) {
            var cells = count(vars.var1) * count(vars.var2);
            if (cells > 25) warnings.push('교차표 범주 조합이 ' + cells + '개입니다. 범주를 임상적으로 의미 있게 합칠 수 있는지 확인하세요.');
        }
    },

    _validateExtras: function(requirements, headers, rows, vars, extras, errors) {
        var self = this;
        (requirements.extras || []).forEach(function(extra) {
            var value = extras[extra.role];
            if (extra.required && !String(value || '').trim()) {
                errors.push(extra.label + '을(를) 선택해주세요.');
                return;
            }
            if (extra.inputType === 'data-select' && value) {
                var sourceColumn = vars[extra.sourceRole];
                var available = self.getUniqueColumnValues(headers, rows, sourceColumn);
                if (available.indexOf(String(value)) === -1) {
                    errors.push(extra.label + ' 값이 실제 데이터에 없습니다.');
                }
            }
            if (extra.role === 'cutoff') {
                var cutoff = Number(value);
                if (!Number.isFinite(cutoff) || cutoff <= 0 || cutoff >= 1) {
                    errors.push('분류 기준값은 0보다 크고 1보다 작아야 합니다.');
                }
            }
            if (extra.inputType === 'data-order' && value) {
                var source = vars[extra.sourceRole];
                var actual = self.getUniqueColumnValues(headers, rows, source).sort();
                var ordered = self.parseOrder(value);
                var orderedUnique = self.uniqueValues(ordered);
                if (ordered.length !== orderedUnique.length || ordered.length !== actual.length ||
                    ordered.slice().sort().join('\u0001') !== actual.join('\u0001')) {
                    errors.push(extra.label + '에는 결과 변수의 모든 범주를 한 번씩 넣어주세요.');
                }
            }
        });
    },

    _validateRepeatedMeasures: function(testId, headers, rows, vars, errors) {
        if (['repeated_anova', 'friedman', 'mixed_anova'].indexOf(testId) === -1) return;
        if (!vars.subject || !vars.time || !vars.dv) return;

        var subjectIndex = headers.indexOf(vars.subject);
        var timeIndex = headers.indexOf(vars.time);
        var dvIndex = headers.indexOf(vars.dv);
        var groupIndex = vars.group ? headers.indexOf(vars.group) : -1;
        var timeLevels = this.getUniqueColumnValues(headers, rows, vars.time);
        var subjects = Object.create(null);
        var duplicates = 0;
        var self = this;

        rows.forEach(function(row) {
            if (self.isMissing(row[subjectIndex]) || self.isMissing(row[timeIndex]) || self.isMissing(row[dvIndex])) return;
            var subject = String(row[subjectIndex]);
            var time = String(row[timeIndex]);
            if (!subjects[subject]) {
                subjects[subject] = {
                    times: Object.create(null),
                    groups: Object.create(null)
                };
            }
            if (subjects[subject].times[time]) duplicates++;
            subjects[subject].times[time] = true;
            if (groupIndex !== -1 && !self.isMissing(row[groupIndex])) {
                subjects[subject].groups[String(row[groupIndex])] = true;
            }
        });

        if (duplicates > 0) {
            errors.push('같은 대상자와 같은 시점이 중복된 행이 ' + duplicates + '개 있습니다. 한 시점당 한 행만 남겨주세요.');
        }

        var incomplete = 0;
        var changingGroup = 0;
        Object.keys(subjects).forEach(function(subject) {
            if (Object.keys(subjects[subject].times).length !== timeLevels.length) incomplete++;
            if (Object.keys(subjects[subject].groups).length > 1) changingGroup++;
        });
        if (incomplete > 0) {
            errors.push('모든 시점의 값이 없는 대상자가 ' + incomplete + '명입니다. 반복측정 자료를 확인해주세요.');
        }
        if (changingGroup > 0) {
            errors.push('분석 중 그룹이 바뀐 대상자가 ' + changingGroup + '명입니다. 대상자별 그룹을 하나로 맞춰주세요.');
        }
    },

    _uniqueMessages: function(messages) {
        return messages.filter(function(message, index) {
            return messages.indexOf(message) === index;
        });
    }
};
