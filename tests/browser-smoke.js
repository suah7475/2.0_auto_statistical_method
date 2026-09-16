const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const baseUrl = process.env.AUTOSTAT_URL || 'http://127.0.0.1:8765/';
const outputDir = path.resolve(__dirname, '..', 'outputs', 'qa');
fs.mkdirSync(outputDir, { recursive: true });

function visible(locator) {
    return locator.evaluate(function(element) {
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
    });
}

async function assertNoHorizontalPageOverflow(page, label) {
    const dimensions = await page.evaluate(function() {
        return {
            viewport: document.documentElement.clientWidth,
            page: document.documentElement.scrollWidth
        };
    });
    assert.ok(
        dimensions.page <= dimensions.viewport + 1,
        label + ' has horizontal overflow: ' + dimensions.page + ' > ' + dimensions.viewport
    );
}

async function assertKeyTextFits(page, label) {
    const overflow = await page.evaluate(function() {
        const selectors = [
            '.entry-mode-card', '.option-card', '.mode-card', '.btn',
            '.question-title', '#result-title', '.mapping-group', '.step-header'
        ];
        return Array.from(document.querySelectorAll(selectors.join(',')))
            .filter(function(element) {
                const style = getComputedStyle(element);
                return style.display !== 'none' && style.visibility !== 'hidden';
            })
            .filter(function(element) {
                return element.scrollWidth > element.clientWidth + 1;
            })
            .map(function(element) {
                return element.className + ': ' + element.textContent.trim().slice(0, 50);
            });
    });
    assert.deepStrictEqual(overflow, [], label + ' contains clipped text controls.');
}

async function followBeginnerFlow(page) {
    await page.getByRole('button', { name: /질문으로 추천받기/ }).click();
    await page.getByRole('button', { name: /숫자로 측정한 결과/ }).click();
    await page.getByRole('button', { name: /^1개/ }).click();
    await page.getByRole('button', { name: /숫자 변수/ }).click();
    await page.getByRole('button', { name: /두 값의 관계 확인/ }).click();
    await page.getByRole('button', { name: /아니오 \/ 잘 모름/ }).click();

    const title = page.locator('#result-title');
    await title.waitFor({ state: 'visible' });
    assert.match(await title.textContent(), /Spearman|스피어만/i);
    assert.strictEqual(await page.locator('#decision-path-container').getAttribute('open'), null);
}

async function checkUploadValidation(page, runWebR) {
    await page.getByRole('button', { name: /파일로 바로 분석/ }).click();
    await page.waitForFunction(function() { return typeof window.XLSX !== 'undefined'; }, null, { timeout: 20000 });

    const csv = [
        '치료 횟수,회복 점수',
        '4,31',
        '6,38',
        '8,45',
        '10,52',
        '12,58',
        '14,64'
    ].join('\n');

    await page.locator('#file-input').setInputFiles({
        name: 'rehab-sample.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csv, 'utf8')
    });
    await page.locator('#file-preview').waitFor({ state: 'visible' });
    assert.match(await page.locator('#uploaded-file-info').textContent(), /6행 x 2열/);

    await page.locator('#btn-run-webr').click();
    const summary = page.locator('#webr-validation-summary');
    await summary.waitFor({ state: 'visible' });
    assert.match(await summary.textContent(), /분석 전에 2가지를 확인해주세요/);
    assert.strictEqual(await visible(page.locator('#webr-loading-section')), false);

    const firstOptions = await page.locator('.mapping-select[data-role="var_x"] option').evaluateAll(function(options) {
        return options.map(function(option) { return { value: option.value, text: option.textContent }; });
    });
    assert.ok(firstOptions.some(function(option) { return option.value === '치료 횟수'; }), JSON.stringify(firstOptions));
    assert.ok(firstOptions.some(function(option) { return option.value === '회복 점수'; }), JSON.stringify(firstOptions));
    await page.locator('.mapping-select[data-role="var_x"]').selectOption('치료 횟수');
    await page.locator('.mapping-select[data-role="var_y"]').selectOption('회복 점수');
    assert.strictEqual(await page.locator('.type-select[data-type-role="var_x"]').inputValue(), 'continuous');
    assert.strictEqual(await page.locator('.type-select[data-type-role="var_y"]').inputValue(), 'continuous');

    if (runWebR) {
        await page.locator('#btn-run-webr').click();
        await page.locator('#webr-result-section').waitFor({ state: 'visible', timeout: 360000 });
        assert.ok(await page.locator('.result-step[data-step="main"]').count() > 0, 'Main WebR result is missing.');
        assert.match(await page.locator('.result-step[data-step="main"]').textContent(), /Spearman/i);
        assert.strictEqual(await page.locator('#webr-results .result-error').count(), 0);
        assert.ok(
            await page.locator('.result-step[data-step="plot"] canvas, .result-step[data-step="plot"] img').count() > 0,
            'WebR plot image is missing.'
        );
        await page.screenshot({ path: path.join(outputDir, 'desktop-webr-result.png'), fullPage: true });
    }
}

async function runViewport(browser, viewport, name, testUpload) {
    const context = await browser.newContext({
        viewport: viewport,
        locale: 'ko-KR',
        colorScheme: 'light',
        reducedMotion: 'reduce'
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', function(error) { pageErrors.push(error.message); });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('#entry-mode-section').waitFor({ state: 'visible' });
    assert.notStrictEqual(await page.evaluate(function() { return document.activeElement && document.activeElement.id; }), 'entry-title');
    assert.ok(Number.parseFloat(await page.locator('.skip-link').evaluate(function(element) {
        return getComputedStyle(element).top;
    })) < 0);
    await assertNoHorizontalPageOverflow(page, name + ' home');
    await assertKeyTextFits(page, name + ' home');
    await page.screenshot({ path: path.join(outputDir, name + '-home.png'), fullPage: true });

    await followBeginnerFlow(page);
    assert.strictEqual(await page.locator('.alt-card .alt-name').first().evaluate(function(element) {
        return getComputedStyle(element).display;
    }), 'block');
    await assertNoHorizontalPageOverflow(page, name + ' result');
    await assertKeyTextFits(page, name + ' result');
    await page.screenshot({ path: path.join(outputDir, name + '-result.png'), fullPage: true });

    if (testUpload) {
        await checkUploadValidation(page, process.env.AUTOSTAT_RUN_WEBR === '1');
        await assertNoHorizontalPageOverflow(page, name + ' upload');
        await assertKeyTextFits(page, name + ' upload');
        await page.screenshot({ path: path.join(outputDir, name + '-upload.png'), fullPage: true });
    }

    await page.goto(new URL('docs/user-guide.html', baseUrl).toString(), {
        waitUntil: 'domcontentloaded',
        timeout: 30000
    });
    await page.getByRole('heading', { name: '사용 안내', exact: true }).waitFor({ state: 'visible' });
    await assertNoHorizontalPageOverflow(page, name + ' guide');
    await page.screenshot({ path: path.join(outputDir, name + '-guide.png'), fullPage: true });

    assert.deepStrictEqual(pageErrors, [], name + ' page errors: ' + pageErrors.join(' | '));
    await context.close();
}

async function checkAlternateRecommendationFlows(browser) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'ko-KR' });

    async function startPage() {
        const page = await context.newPage();
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.getByRole('button', { name: /질문으로 추천받기/ }).click();
        return page;
    }

    let page = await startPage();
    await page.getByRole('button', { name: /숫자로 측정한 결과/ }).click();
    await page.getByRole('button', { name: /^1개/ }).click();
    await page.getByRole('button', { name: /그룹 변수/ }).click();
    await page.getByRole('button', { name: /2개 그룹/ }).click();
    await page.getByRole('button', { name: /서로 다른 사람 비교/ }).click();
    await page.getByRole('button', { name: /예, 정규분포입니다/ }).click();
    assert.match(await page.locator('#result-title').textContent(), /독립표본 t-검정/);
    await page.close();

    page = await startPage();
    await page.getByRole('button', { name: /그룹이나 종류로 나눈 결과/ }).click();
    await page.getByRole('button', { name: /^2가지/ }).click();
    await page.getByRole('button', { name: /^1개/ }).click();
    await page.getByRole('button', { name: /그룹 변수/ }).click();
    await page.getByRole('button', { name: /같은 사람 반복 측정/ }).click();
    assert.match(await page.locator('#result-title').textContent(), /McNemar|맥니마/i);
    await page.close();

    page = await startPage();
    await page.getByRole('button', { name: /숫자로 측정한 결과/ }).click();
    await page.getByRole('button', { name: /^2개 이상/ }).click();
    await page.getByRole('button', { name: /그룹 변수/ }).click();
    await page.getByRole('button', { name: /숫자 변수/ }).click();
    await page.locator('#btn-confirm-multi').click();
    assert.match(await page.locator('.question-title').textContent(), /영향을 빼고 싶은 다른 요인/);
    await page.getByRole('button', { name: /^없어요/ }).click();
    assert.match(await page.locator('#result-title').textContent(), /더미변수 회귀/);
    await page.close();

    await context.close();
}

async function checkNavigationBrowseAndCodeWizard(browser) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, locale: 'ko-KR' });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', function(error) { pageErrors.push(error.message); });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.getByRole('button', { name: /질문으로 추천받기/ }).click();
    await page.getByRole('button', { name: /숫자로 측정한 결과/ }).click();
    await page.locator('#btn-back').click();
    assert.match(await page.locator('.question-title').textContent(), /알아보고 싶은 '결과'/);
    assert.strictEqual(
        await page.getByRole('button', { name: /숫자로 측정한 결과/ }).getAttribute('aria-pressed'),
        'true'
    );
    await page.getByRole('button', { name: /숫자로 측정한 결과/ }).click();
    await page.locator('#btn-restart').click();
    await page.locator('#entry-mode-section').waitFor({ state: 'visible' });

    await page.getByRole('button', { name: /통계 방법 직접 선택/ }).click();
    await page.locator('#browse-section').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /독립표본 t-검정/ }).first().click();
    assert.match(await page.locator('#result-title').textContent(), /독립표본 t-검정/);
    await page.locator('#btn-restart-bottom').click();

    await followBeginnerFlow(page);
    await page.getByRole('button', { name: /Pearson 상관분석/ }).click();
    assert.match(await page.locator('#result-title').textContent(), /Pearson 상관분석/);

    await page.getByRole('button', { name: /R 코드 만들기/ }).click();
    await page.locator('#r-code-customizer').waitFor({ state: 'visible' });
    await page.locator('#column-input').fill('치료 횟수,회복 점수');
    await page.locator('#file-format-select').selectOption('csv');
    await page.locator('#btn-detect-columns').click();
    await page.locator('.step-2').waitFor({ state: 'visible' });
    await page.locator('#btn-confirm-types').click();
    await page.locator('.mapping-select[data-role="var_x"]').selectOption('치료 횟수');
    await page.locator('.mapping-select[data-role="var_y"]').selectOption('회복 점수');
    await page.locator('#btn-generate-code').click();
    await page.locator('.customizer-result').waitFor({ state: 'visible' });
    assert.match(await page.locator('#customized-code').textContent(), /cor_test|cor\.test/);

    await page.evaluate(function() {
        window.AutoStat.PubMedSearcher.search = async function() {
            return {
                success: true,
                papers: [{
                    title: '<img data-probe src=x onerror="window.paperXss=true"> Rehabilitation study',
                    authors_display: 'Kim et al.',
                    journal: 'Physical Therapy',
                    year: '2026',
                    abstract: '<strong>plain abstract</strong>',
                    pubmed_url: 'https://pubmed.ncbi.nlm.nih.gov/123/'
                }],
                sci_filtered: true
            };
        };
    });
    await page.locator('#btn-search-papers').click();
    await page.locator('.paper-card').waitFor({ state: 'visible' });
    assert.match(await page.locator('.paper-title').textContent(), /<img data-probe/);
    assert.strictEqual(await page.locator('.paper-card img[data-probe]').count(), 0);
    assert.strictEqual(await page.evaluate(function() { return Boolean(window.paperXss); }), false);

    assert.deepStrictEqual(pageErrors, [], 'navigation/browse/code page errors: ' + pageErrors.join(' | '));
    await context.close();
}

(async function() {
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const launchOptions = { headless: true };
    if (fs.existsSync(chromePath)) launchOptions.executablePath = chromePath;
    const browser = await chromium.launch(launchOptions);
    try {
        await runViewport(browser, { width: 1440, height: 900 }, 'desktop', true);
        await runViewport(browser, { width: 390, height: 844 }, 'mobile', false);
        await checkAlternateRecommendationFlows(browser);
        await checkNavigationBrowseAndCodeWizard(browser);
        process.stdout.write('Browser smoke checks passed. Screenshots: ' + outputDir + '\n');
    } finally {
        await browser.close();
    }
})().catch(function(error) {
    process.stderr.write(error.stack + '\n');
    process.exit(1);
});
