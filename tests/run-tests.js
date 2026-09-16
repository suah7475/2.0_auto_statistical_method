const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

global.window = { AutoStat: {} };
global.document = { addEventListener: function() {} };

function load(relativePath) {
    const filename = path.join(root, relativePath);
    vm.runInThisContext(fs.readFileSync(filename, 'utf8'), { filename: filename });
}

[
    'js/stat-data.js',
    'js/stat-recommender.js',
    'js/pubmed-search.js',
    'js/data-validator.js',
    'js/r-code-customizer.js',
    'js/webr-adaptor.js',
    'js/webr-runner.js'
].forEach(load);

const AutoStat = window.AutoStat;
let passed = 0;

function test(name, fn) {
    try {
        fn();
        passed += 1;
        process.stdout.write('PASS ' + name + '\n');
    } catch (error) {
        process.stderr.write('FAIL ' + name + '\n' + error.stack + '\n');
        process.exitCode = 1;
    }
}

function recommendedId(input) {
    const result = AutoStat.StatRecommender.recommend(input);
    assert.strictEqual(result.success, true, result.message);
    assert.ok(result.recommendation.primary, 'A primary recommendation is required.');
    return result.recommendation.primary.id;
}

function isQuestionVisible(questionId, answers) {
    const question = AutoStat.QUESTIONS.find(function(item) { return item.id === questionId; });
    if (!question.condition) return true;
    return question.condition(answers);
}

function generatorParams(testId) {
    const requirements = AutoStat.TEST_VARIABLE_REQUIREMENTS[testId];
    const vars = {};
    const columnTypes = {};

    (requirements.variables || []).forEach(function(variable) {
        const column = variable.role + '_col';
        vars[variable.role] = column;
        columnTypes[column] = variable.type;
    });

    let multiIV = [];
    if (requirements.multiIV) {
        multiIV = testId === 'dummy_regression' ?
            ['group_predictor', 'numeric_predictor'] :
            ['predictor_a', 'predictor_b'];
        multiIV.forEach(function(column, index) {
            columnTypes[column] = testId === 'dummy_regression' && index === 0 ?
                'categorical' : 'continuous';
        });
    }

    const extras = {};
    (requirements.extras || []).forEach(function(extra) {
        if (extra.role === 'mu') extras[extra.role] = 0;
        else if (extra.role === 'event_category') extras[extra.role] = 'success';
        else if (extra.role === 'cutoff') extras[extra.role] = 0.5;
        else if (extra.role === 'ref_category') extras[extra.role] = 'stable';
        else if (extra.role === 'ordinal_order') extras[extra.role] = 'mild | moderate | severe';
        else extras[extra.role] = extra.defaultValue || 'value';
    });

    return {
        filePath: 'C:/research data/data.csv',
        fileFormat: 'csv',
        vars: vars,
        multiIV: multiIV,
        extras: extras,
        columnTypes: columnTypes
    };
}

test('relationship goal chooses Pearson for normal data', function() {
    assert.strictEqual(recommendedId({
        dv_type: 'continuous',
        iv_count: 1,
        iv_types: ['continuous'],
        analysis_goal: 'relationship',
        normality: true
    }), 'pearson_correlation');
});

test('unknown normality chooses conservative Spearman correlation', function() {
    assert.strictEqual(recommendedId({
        dv_type: 'continuous',
        iv_count: 1,
        iv_types: ['continuous'],
        analysis_goal: 'relationship',
        normality: false
    }), 'spearman_correlation');
});

test('prediction goal chooses simple regression', function() {
    assert.strictEqual(recommendedId({
        dv_type: 'continuous',
        iv_count: 1,
        iv_types: ['continuous'],
        analysis_goal: 'prediction'
    }), 'simple_regression');
});

test('decision-tree leaves map to the expected primary analysis', function() {
    const cases = [
        ['independent t', { dv_type: 'continuous', iv_count: 1, iv_types: ['categorical'], group_count: 2, paired: false, normality: true }, 'independent_t'],
        ['Mann-Whitney', { dv_type: 'continuous', iv_count: 1, iv_types: ['categorical'], group_count: 2, paired: false, normality: false }, 'mann_whitney'],
        ['paired t', { dv_type: 'continuous', iv_count: 1, iv_types: ['categorical'], group_count: 2, paired: true, normality: true }, 'paired_t'],
        ['Wilcoxon', { dv_type: 'continuous', iv_count: 1, iv_types: ['categorical'], group_count: 2, paired: true, normality: false }, 'wilcoxon_signed_rank'],
        ['one-way ANOVA', { dv_type: 'continuous', iv_count: 1, iv_types: ['categorical'], group_count: 3, paired: false, normality: true }, 'one_way_anova'],
        ['Kruskal-Wallis', { dv_type: 'continuous', iv_count: 1, iv_types: ['categorical'], group_count: 3, paired: false, normality: false }, 'kruskal_wallis'],
        ['repeated ANOVA', { dv_type: 'continuous', iv_count: 1, iv_types: ['categorical'], group_count: 3, paired: true, normality: true }, 'repeated_anova'],
        ['Friedman', { dv_type: 'continuous', iv_count: 1, iv_types: ['categorical'], group_count: 3, paired: true, normality: false }, 'friedman'],
        ['Pearson', { dv_type: 'continuous', iv_count: 1, iv_types: ['continuous'], analysis_goal: 'relationship', normality: true }, 'pearson_correlation'],
        ['Spearman', { dv_type: 'continuous', iv_count: 1, iv_types: ['continuous'], analysis_goal: 'relationship', normality: false }, 'spearman_correlation'],
        ['simple regression', { dv_type: 'continuous', iv_count: 1, iv_types: ['continuous'], analysis_goal: 'prediction' }, 'simple_regression'],
        ['ANCOVA', { dv_type: 'continuous', iv_count: 2, iv_types: ['categorical'], has_covariate: true }, 'ancova'],
        ['mixed ANOVA', { dv_type: 'continuous', iv_count: 2, iv_types: ['categorical'], paired: true, has_covariate: false }, 'mixed_anova'],
        ['two-way ANOVA', { dv_type: 'continuous', iv_count: 2, iv_types: ['categorical'], paired: false, has_covariate: false }, 'two_way_anova'],
        ['multiple regression', { dv_type: 'continuous', iv_count: 2, iv_types: ['continuous'] }, 'multiple_regression'],
        ['GLM covariate', { dv_type: 'continuous', iv_count: 2, iv_types: ['categorical', 'continuous'], has_covariate: true }, 'glm_covariate'],
        ['dummy regression', { dv_type: 'continuous', iv_count: 2, iv_types: ['categorical', 'continuous'], has_covariate: false }, 'dummy_regression'],
        ['McNemar', { dv_type: 'categorical', dv_level: 'binary', iv_count: 1, iv_types: ['categorical'], paired: true }, 'mcnemar'],
        ['chi-square binary', { dv_type: 'categorical', dv_level: 'binary', iv_count: 1, iv_types: ['categorical'], paired: false }, 'chi_square'],
        ['chi-square nominal', { dv_type: 'categorical', dv_level: 'nominal', iv_count: 1, iv_types: ['categorical'] }, 'chi_square'],
        ['ordinal categorical', { dv_type: 'categorical', dv_level: 'ordinal', iv_count: 1, iv_types: ['categorical'] }, 'ordinal_regression'],
        ['binary logistic', { dv_type: 'categorical', dv_level: 'binary', iv_count: 1, iv_types: ['continuous'] }, 'logistic_regression'],
        ['multinomial logistic', { dv_type: 'categorical', dv_level: 'nominal', iv_count: 1, iv_types: ['continuous'] }, 'multinomial_logistic'],
        ['ordinal logistic', { dv_type: 'categorical', dv_level: 'ordinal', iv_count: 2, iv_types: ['categorical', 'continuous'] }, 'ordinal_regression']
    ];

    cases.forEach(function(item) {
        assert.strictEqual(recommendedId(item[1]), item[2], item[0]);
    });
});

test('all valid answer combinations produce a supported recommendation', function() {
    const dvLevels = ['binary', 'nominal', 'ordinal'];
    const predictorSets = {
        1: [['categorical'], ['continuous']],
        2: [['categorical'], ['continuous'], ['categorical', 'continuous']]
    };
    let checked = 0;

    ['continuous', 'categorical'].forEach(function(dvType) {
        (dvType === 'categorical' ? dvLevels : [null]).forEach(function(dvLevel) {
            [1, 2].forEach(function(ivCount) {
                predictorSets[ivCount].forEach(function(ivTypes) {
                    [2, 3].forEach(function(groupCount) {
                        [false, true].forEach(function(paired) {
                            [false, true].forEach(function(normality) {
                                [false, true].forEach(function(hasCovariate) {
                                    ['relationship', 'prediction'].forEach(function(goal) {
                                        const id = recommendedId({
                                            dv_type: dvType,
                                            dv_level: dvLevel,
                                            iv_count: ivCount,
                                            iv_types: ivTypes,
                                            group_count: groupCount,
                                            paired: paired,
                                            normality: normality,
                                            has_covariate: hasCovariate,
                                            analysis_goal: goal
                                        });
                                        assert.ok(AutoStat.RCodeGenerators[id], id);
                                        checked += 1;
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    assert.ok(checked >= 300);
});

test('one predictor cannot have two variable types', function() {
    const result = AutoStat.StatRecommender.recommend({
        dv_type: 'continuous',
        iv_count: 1,
        iv_types: ['continuous', 'categorical']
    });
    assert.strictEqual(result.success, false);
});

test('mixed predictors do not trigger an unused repeated-measures question', function() {
    assert.strictEqual(isQuestionVisible('paired', {
        dv_type: 'continuous',
        iv_count: 2,
        iv_types: ['categorical', 'continuous']
    }), false);
    assert.strictEqual(isQuestionVisible('has_covariate', {
        dv_type: 'continuous',
        iv_count: 2,
        iv_types: ['categorical', 'continuous']
    }), true);
    assert.strictEqual(isQuestionVisible('paired', {
        dv_type: 'continuous',
        iv_count: 2,
        iv_types: ['categorical']
    }), true);
});

test('McNemar is limited to paired binary outcomes', function() {
    assert.strictEqual(recommendedId({
        dv_type: 'categorical',
        dv_level: 'nominal',
        iv_count: 1,
        iv_types: ['categorical'],
        paired: true
    }), 'chi_square');
});

test('every supported analysis has a PubMed search term', function() {
    assert.deepStrictEqual(
        Object.keys(AutoStat.STAT_TESTS).sort(),
        Object.keys(AutoStat.STAT_SEARCH_TERMS).sort()
    );
});

test('journal filtering uses exact normalized names', function() {
    assert.strictEqual(AutoStat.PubMedSearcher.isSciJournal('The Lancet'), true);
    assert.strictEqual(AutoStat.PubMedSearcher.isSciJournal('Lancet Neurology'), false);
    assert.strictEqual(AutoStat.PubMedSearcher.isSciJournal('PM & R'), true);
});

test('unsafe and duplicate spreadsheet headers are rejected', function() {
    const report = AutoStat.DataValidator.validateHeaders([
        'pain score',
        '<img src=x>',
        'pain score',
        'bad`header'
    ]);
    assert.strictEqual(report.valid, false);
    assert.ok(report.errors.some(function(message) { return message.includes('중복'); }));
    assert.ok(report.errors.some(function(message) { return message.includes('따옴표'); }));
});

test('Korean headers, spaces, and hyphens remain supported', function() {
    const report = AutoStat.DataValidator.validateHeaders(['환자 번호', '치료-전 점수', 'group A']);
    assert.strictEqual(report.valid, true, report.errors.join('\n'));
});

test('numeric treatment counts are not mistaken for treatment groups', function() {
    assert.strictEqual(
        AutoStat.DataValidator.inferType('치료 횟수', [4, 6, 8, 10, 12, 14]),
        'continuous'
    );
    assert.strictEqual(
        AutoStat.DataValidator.inferType('치료군', ['실험군', '대조군', '실험군']),
        'categorical'
    );
});

test('mapping validation catches wrong group count and duplicate roles', function() {
    const requirements = AutoStat.TEST_VARIABLE_REQUIREMENTS.independent_t;
    const headers = ['score', 'group'];
    const rows = [[10, 'A'], [12, 'B'], [14, 'C'], [16, 'A']];
    const report = AutoStat.DataValidator.validateMapping({
        testId: 'independent_t',
        requirements: requirements,
        headers: headers,
        rows: rows,
        vars: { dv: 'score', group: 'score' },
        multiIV: [],
        columnTypes: { score: 'continuous', group: 'categorical' },
        extras: {}
    });
    assert.strictEqual(report.valid, false);
    assert.ok(report.errors.some(function(message) { return message.includes('중복 선택'); }));

    const groupReport = AutoStat.DataValidator.validateMapping({
        testId: 'independent_t',
        requirements: requirements,
        headers: headers,
        rows: rows,
        vars: { dv: 'score', group: 'group' },
        multiIV: [],
        columnTypes: { score: 'continuous', group: 'categorical' },
        extras: {}
    });
    assert.strictEqual(groupReport.valid, false);
    assert.ok(groupReport.errors.some(function(message) { return message.includes('2개 범주'); }));
});

test('valid independent t-test mapping passes with a small-sample warning', function() {
    const report = AutoStat.DataValidator.validateMapping({
        testId: 'independent_t',
        requirements: AutoStat.TEST_VARIABLE_REQUIREMENTS.independent_t,
        headers: ['score', 'group'],
        rows: [[10, 'A'], [12, 'B'], [14, 'A'], [16, 'B']],
        vars: { dv: 'score', group: 'group' },
        multiIV: [],
        columnTypes: { score: 'continuous', group: 'categorical' },
        extras: {}
    });
    assert.strictEqual(report.valid, true, report.errors.join('\n'));
    assert.ok(report.warnings.some(function(message) { return message.includes('10개 미만'); }));
});

test('repeated-measures mapping catches missing time points', function() {
    const report = AutoStat.DataValidator.validateMapping({
        testId: 'repeated_anova',
        requirements: AutoStat.TEST_VARIABLE_REQUIREMENTS.repeated_anova,
        headers: ['subject', 'time', 'score'],
        rows: [
            ['P1', 'pre', 10], ['P1', 'post', 15],
            ['P2', 'pre', 11]
        ],
        vars: { subject: 'subject', time: 'time', dv: 'score' },
        multiIV: [],
        columnTypes: { subject: 'categorical', time: 'categorical', score: 'continuous' },
        extras: {}
    });
    assert.strictEqual(report.valid, false);
    assert.ok(report.errors.some(function(message) { return message.includes('모든 시점'); }));
});

test('logistic options must exist in the uploaded data', function() {
    const report = AutoStat.DataValidator.validateMapping({
        testId: 'logistic_regression',
        requirements: AutoStat.TEST_VARIABLE_REQUIREMENTS.logistic_regression,
        headers: ['outcome', 'age'],
        rows: [['yes', 50], ['no', 60], ['yes', 55], ['no', 65]],
        vars: { dv: 'outcome' },
        multiIV: ['age'],
        columnTypes: { outcome: 'categorical', age: 'continuous' },
        extras: { event_category: 'missing', cutoff: 1.2 }
    });
    assert.strictEqual(report.valid, false);
    assert.ok(report.errors.some(function(message) { return message.includes('실제 데이터'); }));
    assert.ok(report.errors.some(function(message) { return message.includes('기준값'); }));
});

test('continuous mappings reject nonnumeric values and too few complete rows', function() {
    const report = AutoStat.DataValidator.validateMapping({
        testId: 'simple_regression',
        requirements: AutoStat.TEST_VARIABLE_REQUIREMENTS.simple_regression,
        headers: ['outcome', 'predictor'],
        rows: [[10, 1], ['not-a-number', 2], ['', 3]],
        vars: { dv: 'outcome', iv: 'predictor' },
        multiIV: [],
        columnTypes: { outcome: 'continuous', predictor: 'continuous' },
        extras: {}
    });
    assert.strictEqual(report.valid, false);
    assert.ok(report.errors.some(function(message) { return message.includes('숫자가 아닌 값'); }));
    assert.ok(report.errors.some(function(message) { return message.includes('최소 3개 행'); }));
});

test('group-level rules cover multi-factor and categorical outcomes', function() {
    const twoWay = AutoStat.DataValidator.validateMapping({
        testId: 'two_way_anova',
        requirements: AutoStat.TEST_VARIABLE_REQUIREMENTS.two_way_anova,
        headers: ['score', 'factor_a', 'factor_b'],
        rows: [[10, 'A', 'only'], [11, 'B', 'only'], [12, 'A', 'only'], [13, 'B', 'only']],
        vars: { dv: 'score', factor1: 'factor_a', factor2: 'factor_b' },
        multiIV: [],
        columnTypes: { score: 'continuous', factor_a: 'categorical', factor_b: 'categorical' },
        extras: {}
    });
    assert.strictEqual(twoWay.valid, false);
    assert.ok(twoWay.errors.some(function(message) { return message.includes('요인 2'); }));

    const multinomial = AutoStat.DataValidator.validateMapping({
        testId: 'multinomial_logistic',
        requirements: AutoStat.TEST_VARIABLE_REQUIREMENTS.multinomial_logistic,
        headers: ['outcome', 'age', 'strength'],
        rows: [['A', 40, 10], ['B', 50, 12], ['A', 60, 14], ['B', 70, 16]],
        vars: { dv: 'outcome' },
        multiIV: ['age', 'strength'],
        columnTypes: { outcome: 'categorical', age: 'continuous', strength: 'continuous' },
        extras: { ref_category: 'A' }
    });
    assert.strictEqual(multinomial.valid, false);
    assert.ok(multinomial.errors.some(function(message) { return message.includes('3개 이상의 범주'); }));
});

test('ordinal ordering must contain each observed category exactly once', function() {
    const report = AutoStat.DataValidator.validateMapping({
        testId: 'ordinal_regression',
        requirements: AutoStat.TEST_VARIABLE_REQUIREMENTS.ordinal_regression,
        headers: ['severity', 'age'],
        rows: [['mild', 40], ['moderate', 50], ['severe', 60], ['mild', 70]],
        vars: { dv: 'severity' },
        multiIV: ['age'],
        columnTypes: { severity: 'ordinal', age: 'continuous' },
        extras: { ordinal_order: 'mild | moderate | moderate' }
    });
    assert.strictEqual(report.valid, false);
    assert.ok(report.errors.some(function(message) { return message.includes('모든 범주'); }));
});

test('repeated-measures mappings reject duplicate visits and changing groups', function() {
    const report = AutoStat.DataValidator.validateMapping({
        testId: 'mixed_anova',
        requirements: AutoStat.TEST_VARIABLE_REQUIREMENTS.mixed_anova,
        headers: ['subject', 'time', 'group', 'score'],
        rows: [
            ['P1', 'pre', 'A', 10], ['P1', 'pre', 'A', 11], ['P1', 'post', 'B', 15],
            ['P2', 'pre', 'A', 12], ['P2', 'post', 'A', 16]
        ],
        vars: { subject: 'subject', time: 'time', group: 'group', dv: 'score' },
        multiIV: [],
        columnTypes: { subject: 'categorical', time: 'categorical', group: 'categorical', score: 'continuous' },
        extras: {}
    });
    assert.strictEqual(report.valid, false);
    assert.ok(report.errors.some(function(message) { return message.includes('중복된 행'); }));
    assert.ok(report.errors.some(function(message) { return message.includes('그룹이 바뀐'); }));
});

test('category values are normalized consistently across spreadsheet cell types', function() {
    assert.deepStrictEqual(AutoStat.DataValidator.uniqueValues([1, '1', 2, '2']), ['1', '2']);
    const report = AutoStat.DataValidator.validateHeaders(['toString', '__proto__', 'score']);
    assert.strictEqual(report.valid, true, report.errors.join('\n'));
});

test('all 26 tests have requirements and parseable generated R code', function() {
    const ids = Object.keys(AutoStat.STAT_TESTS);
    assert.strictEqual(ids.length, 26);
    assert.deepStrictEqual(ids.slice().sort(), Object.keys(AutoStat.TEST_VARIABLE_REQUIREMENTS).sort());

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autostat-r-'));
    ids.forEach(function(testId) {
        const generator = AutoStat.RCodeGenerators[testId];
        assert.strictEqual(typeof generator, 'function', 'Missing generator: ' + testId);
        const params = generatorParams(testId);
        AutoStat.RCodeCustomizer._assertSafeParams(params);
        const code = generator.call(AutoStat.RCodeCustomizer, params);
        assert.ok(code.includes('check.names = FALSE'), 'CSV header preservation missing: ' + testId);

        const filename = path.join(outputDir, testId + '.R');
        fs.writeFileSync(filename, code);
        const parsed = childProcess.spawnSync('Rscript', [
            '-e',
            'parse(file=' + JSON.stringify(filename) + ')'
        ], { encoding: 'utf8' });
        assert.strictEqual(parsed.status, 0, testId + ': ' + (parsed.stderr || parsed.stdout));
    });
});

test('generated logistic code uses the selected event and cutoff', function() {
    const params = generatorParams('logistic_regression');
    params.extras.event_category = 'improved';
    params.extras.cutoff = 0.35;
    const code = AutoStat.RCodeGenerators.logistic_regression.call(AutoStat.RCodeCustomizer, params);
    assert.ok(code.includes('event_category <- "improved"'));
    assert.ok(code.includes('cutoff <- 0.35'));
});

test('manual code setup applies predictor count and type rules', function() {
    const customizer = AutoStat.RCodeCustomizer;
    customizer.testId = 'multiple_regression';
    customizer.variableMapping = { dv: 'score' };
    customizer.multiIVSelections = ['age'];
    customizer.extraValues = {};
    customizer.columnTypes = { score: 'continuous', age: 'continuous' };
    assert.strictEqual(customizer._validateCustomizerSetup().valid, false);

    customizer.multiIVSelections = ['age', 'group'];
    customizer.columnTypes.group = 'categorical';
    assert.strictEqual(customizer._validateCustomizerSetup().valid, false);

    customizer.columnTypes.group = 'continuous';
    assert.strictEqual(customizer._validateCustomizerSetup().valid, true);
});

test('ordinal predictors are factorized in logistic models', function() {
    ['logistic_regression', 'multinomial_logistic', 'ordinal_regression'].forEach(function(testId) {
        const params = generatorParams(testId);
        params.columnTypes.predictor_a = 'ordinal';
        const code = AutoStat.RCodeGenerators[testId].call(AutoStat.RCodeCustomizer, params);
        assert.ok(code.includes('df$`predictor_a` <- factor'), testId);
    });
});

test('dummy regression preserves continuous predictors', function() {
    const params = generatorParams('dummy_regression');
    const code = AutoStat.RCodeGenerators.dummy_regression.call(AutoStat.RCodeCustomizer, params);
    assert.ok(code.includes('df$`group_predictor` <- factor'));
    assert.ok(!code.includes('df$`numeric_predictor` <- factor'));
});

test('multinomial confidence intervals use coefficients and standard errors', function() {
    const code = AutoStat.RCodeGenerators.multinomial_logistic.call(
        AutoStat.RCodeCustomizer,
        generatorParams('multinomial_logistic')
    );
    assert.ok(code.includes('coef_mat - 1.96 * se_mat'));
    assert.ok(!code.includes('confint.default(model)'));
});

test('Excel export metadata uses the current variable role definitions', function() {
    const customizer = AutoStat.RCodeCustomizer;
    customizer.testId = 'ancova';
    customizer.filePath = 'study.csv';
    customizer.variableMapping = {
        dv: 'post_score',
        group: 'treatment_group',
        covariate: 'pre_score'
    };
    customizer.multiIVSelections = [];
    const code = customizer._generateExcelExportCode();
    assert.ok(code.includes('종속변수 (사후 측정값): post_score'));
    assert.ok(code.includes('공변량 (통제 변수): pre_score'));
});

test('WebR adaptor preserves original CSV column names', function() {
    const adapted = AutoStat.WebRAdaptor.adapt('independent_t', generatorParams('independent_t'));
    assert.ok(adapted.steps.length > 0);
    assert.ok(adapted.steps.some(function(step) {
        return step.code.includes('check.names = FALSE');
    }));
});

test('WebR cancellation marks the run and interrupts the active engine', function() {
    const runner = AutoStat.WebRRunner;
    let interrupted = 0;
    runner.webR = {
        interrupt: function() {
            interrupted += 1;
            return Promise.resolve();
        }
    };
    runner.cancelRequested = false;
    runner.cancel();
    assert.strictEqual(runner.cancelRequested, true);
    assert.strictEqual(interrupted, 1);
    runner.webR = null;
    runner.cancelRequested = false;
});

if (!process.exitCode) {
    process.stdout.write('\n' + passed + ' checks passed.\n');
}
