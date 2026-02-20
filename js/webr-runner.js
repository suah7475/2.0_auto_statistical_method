/**
 * WebR Runner v1.0
 * WebR 엔진 초기화, 패키지 설치, R 코드 실행을 담당
 */

window.AutoStat = window.AutoStat || {};

window.AutoStat.WebRRunner = {
    webR: null,
    isReady: false,
    isLoading: false,
    _initPromise: null,  // init 재진입 방지용 프로미스 캐시
    loadedPackages: [],

    // 콜백
    onProgress: null,   // function(stage, percent, message)
    onError: null,      // function(errorMessage)

    // r-universe 패키지 소스
    REPOS: {
        wasm: 'https://repo.r-wasm.org',
        kassambara: 'https://kassambara.r-universe.dev',
        easystats: 'https://easystats.r-universe.dev',
        rvlenth: 'https://rvlenth.r-universe.dev',
        tidyverse: 'https://tidyverse.r-universe.dev'
    },

    // Core 패키지 (init 시 설치)
    // ※ 설치 순서 중요:
    //   1) rlang 먼저 → 최신 버전(1.1.7+) 선점
    //   2) dplyr, rstatix, effectsize → rlang 1.1.7 이용
    //   3) ggplot2 마지막 → rlang 1.1.7 이미 설치됐으므로 다운그레이드 방지
    CORE_PACKAGES: [
        { name: 'rlang',      repo: 'wasm' },
        { name: 'dplyr',      repo: 'wasm' },
        { name: 'rstatix',    repo: 'wasm' },
        { name: 'effectsize', repo: 'wasm' },
        { name: 'ggplot2',    repo: 'wasm' }
    ],

    // Lazy 패키지 (필요시 설치)
    // ※ r-universe PACKAGES.rds 포맷 미지원으로 모두 repo.r-wasm.org 사용
    LAZY_PACKAGES: {
        ggpubr: 'wasm',
        car: 'wasm',
        emmeans: 'wasm',
        afex: 'wasm',
        performance: 'wasm',
        coin: 'wasm',          // rstatix 효과크기 함수 내부 의존성
        MASS: 'wasm',
        nnet: 'wasm',
        pROC: 'wasm',
        tidyr: 'wasm',
        DescTools: 'wasm',
        effects: 'wasm',
        brant: 'wasm',
        ResourceSelection: 'wasm'
    },

    // ────────────── 브라우저 지원 체크 ──────────────

    checkBrowserSupport: function() {
        if (typeof WebAssembly === 'undefined') {
            return { supported: false, reason: 'WebAssembly를 지원하지 않는 브라우저입니다.' };
        }
        return { supported: true };
    },

    // ────────────── 초기화 ──────────────

    init: async function() {
        if (this.isReady) return true;

        // 이미 초기화 진행 중이면 같은 프로미스를 반환 (레이스 컨디션 방지)
        if (this.isLoading && this._initPromise) {
            return this._initPromise;
        }

        var self = this;
        this.isLoading = true;

        this._initPromise = (async function() {
            var support = self.checkBrowserSupport();
            if (!support.supported) {
                self.isLoading = false;
                self._initPromise = null;
                self._emitError(support.reason);
                return false;
            }

            self._emitProgress('init', 5, 'R 엔진 로딩 중...');

            try {
                // 1. WebR 모듈 로드
                console.log('[WebRRunner] WebR 모듈 로딩 시작...');
                self._emitProgress('init', 8, 'WebR 모듈 다운로드 중...');
                var webRModule;
                try {
                    webRModule = await import('https://webr.r-wasm.org/latest/webr.mjs');
                } catch (importErr) {
                    throw new Error('WebR 모듈을 다운로드할 수 없습니다. 네트워크 연결을 확인하세요. (' + importErr.message + ')');
                }

                var WebR = webRModule.WebR;
                if (!WebR) {
                    throw new Error('WebR 클래스를 찾을 수 없습니다. CDN 문제일 수 있습니다.');
                }

                // 2. WebR 인스턴스 생성
                //    PostMessage 채널 — COOP/COEP 헤더 없이도 작동
                //    GitHub Pages, 일반 정적 호스팅에서 필수
                console.log('[WebRRunner] WebR 인스턴스 생성 중... (PostMessage 채널)');
                self._emitProgress('init', 10, 'R 엔진 생성 중...');

                // ChannelType enum 사용 (공식 문서 방식)
                var channelConfig = {};
                if (webRModule.ChannelType) {
                    channelConfig.channelType = webRModule.ChannelType.PostMessage;
                    console.log('[WebRRunner] ChannelType.PostMessage =', webRModule.ChannelType.PostMessage);
                } else {
                    // enum이 없으면 숫자값 직접 사용
                    channelConfig.channelType = 3;
                    console.log('[WebRRunner] ChannelType enum 없음, 숫자 3 사용');
                }

                self.webR = new WebR(channelConfig);

                // 3. WebR 초기화 (WASM 다운로드 + R 엔진 시작)
                console.log('[WebRRunner] WebR init 시작...');
                self._emitProgress('init', 12, 'R 엔진 초기화 중 (WASM 다운로드)...');
                await self.webR.init();
                console.log('[WebRRunner] WebR init 완료!');
                self._emitProgress('init', 20, 'R 엔진 준비 완료');

                // 2. Core 패키지 설치
                //    r-universe repos는 WebR R 4.5에서 PACKAGES.rds 미지원으로 실패
                //    → repo.r-wasm.org만 사용 (rstatix, effectsize 모두 여기에 있음)
                var allRepos = [ self.REPOS.wasm ];

                var totalPkgs = self.CORE_PACKAGES.length;
                for (var i = 0; i < totalPkgs; i++) {
                    var pkg = self.CORE_PACKAGES[i];
                    var pct = 20 + Math.round((i / totalPkgs) * 60);
                    self._emitProgress('packages', pct, pkg.name + ' 설치 중 (' + (i + 1) + '/' + totalPkgs + ')');

                    try {
                        console.log('[WebRRunner] 패키지 설치:', pkg.name);
                        await self.webR.installPackages([pkg.name], {
                            repos: allRepos
                        });
                        self.loadedPackages.push(pkg.name);
                        console.log('[WebRRunner] 패키지 설치 완료:', pkg.name);
                    } catch (e) {
                        console.warn('패키지 설치 실패 (계속 진행):', pkg.name, e.message);
                    }
                }

                // 3. 공통 라이브러리 로드
                self._emitProgress('loading', 85, '라이브러리 로드 중...');
                for (var li = 0; li < self.loadedPackages.length; li++) {
                    var libName = self.loadedPackages[li];
                    try {
                        console.log('[WebRRunner] 라이브러리 로드:', libName);
                        await self.webR.evalR('suppressWarnings(suppressMessages(library(' + libName + ')))');
                        console.log('[WebRRunner] 라이브러리 로드 완료:', libName);
                    } catch (libErr) {
                        console.warn('[WebRRunner] 라이브러리 로드 실패 (계속 진행):', libName, libErr.message);
                    }
                }

                // 4. 완료
                self.isReady = true;
                self.isLoading = false;
                self._initPromise = null;
                self._emitProgress('ready', 100, '준비 완료');
                return true;

            } catch (e) {
                self.isLoading = false;
                self._initPromise = null;
                // 실패 시 webR 인스턴스 정리
                if (self.webR) {
                    try { self.webR.close(); } catch (_) {}
                    self.webR = null;
                }
                console.error('[WebRRunner] 초기화 실패 상세:', e);
                self._emitError('R 엔진 초기화 실패: ' + e.message);
                return false;
            }
        })();

        return this._initPromise;
    },

    // ────────────── 패키지 설치 (Lazy) ──────────────

    ensurePackages: async function(pkgList) {
        if (!this.isReady) return false;

        // r-universe는 R 4.5에서 미지원 → repo.r-wasm.org만 사용
        var allRepos = [ this.REPOS.wasm ];

        for (var i = 0; i < pkgList.length; i++) {
            var pkg = pkgList[i];
            if (this.loadedPackages.indexOf(pkg) !== -1) continue;

            this._emitProgress('packages', 0, pkg + ' 추가 설치 중...');

            try {
                console.log('[WebRRunner] Lazy 패키지 설치:', pkg);
                await this.webR.installPackages([pkg], {
                    repos: allRepos
                });
                await this.webR.evalR('suppressWarnings(suppressMessages(library(' + pkg + ')))');
                this.loadedPackages.push(pkg);
            } catch (e) {
                console.warn('Lazy 패키지 설치 실패:', pkg, e.message);
            }
        }
        return true;
    },

    // ────────────── R 코드 실행 ──────────────

    executeCode: async function(rCode) {
        if (!this.isReady) {
            this._emitError('WebR이 아직 준비되지 않았습니다.');
            return null;
        }

        try {
            var result = await this.webR.evalR(rCode);
            var jsValue = await result.toJs();
            result.destroy();
            return jsValue;
        } catch (e) {
            this._emitError('R 코드 실행 오류: ' + e.message);
            return null;
        }
    },

    // ────────────── 출력 캡처 실행 ──────────────

    captureOutput: async function(rCode) {
        if (!this.isReady) return { output: '', error: 'WebR 미준비' };

        // R 코드를 논리 블록(빈 줄 기준)별로 tryCatch 감싸기
        // → 블록 A 오류가 블록 B로 전파되지 않음
        // 예: assume 단계에서 rstatix shapiro_test 실패해도 car leveneTest는 실행됨
        var blocks = rCode.split(/\n\n+/);
        var wrappedParts = [];
        for (var b = 0; b < blocks.length; b++) {
            var block = blocks[b].trim();
            if (!block) continue;
            wrappedParts.push(
                'tryCatch({\n' + block + '\n}, error = function(e) {\n' +
                '  cat("\\n[WEBR_ERROR]", conditionMessage(e), "\\n")\n' +
                '})'
            );
        }
        var wrappedCode = wrappedParts.join('\n\n');

        try {
            var shelter = await new this.webR.Shelter();
            var result = await shelter.captureR(wrappedCode, { withAutoprint: true });

            var output = '';
            if (result.output) {
                for (var i = 0; i < result.output.length; i++) {
                    var msg = result.output[i];
                    if (msg.type === 'stdout') {
                        output += msg.data + '\n';
                    }
                }
            }

            var warnings = '';
            if (result.output) {
                for (var j = 0; j < result.output.length; j++) {
                    var msg2 = result.output[j];
                    if (msg2.type === 'stderr') {
                        warnings += msg2.data + '\n';
                    }
                }
            }

            shelter.purge();

            // tryCatch가 잡은 오류 감지 — 출력은 보존하면서 오류도 표시
            var stepError = null;
            var errorMarkers = output.match(/\[WEBR_ERROR\]/g);
            if (errorMarkers && errorMarkers.length > 0) {
                var firstMatch = output.match(/\[WEBR_ERROR\]\s*(.+)/);
                stepError = firstMatch ? firstMatch[1].trim() : 'R 실행 오류';
                if (errorMarkers.length > 1) {
                    stepError += ' (외 ' + (errorMarkers.length - 1) + '건)';
                }
            }

            return { output: output.trim(), warnings: warnings.trim(), error: stepError };

        } catch (e) {
            // tryCatch로도 잡지 못하는 오류 (파싱 오류 등)
            return { output: '', warnings: '', error: e.message };
        }
    },

    // ────────────── 단계별 실행 ──────────────

    // requiredPackages: 이 테스트에 필요한 패키지 목록 (WebRAdaptor.PACKAGE_MAP 기반)
    executeSteps: async function(steps, requiredPackages) {
        if (!this.isReady) return null;

        // r-universe는 R 4.5에서 미지원 → repo.r-wasm.org만 사용
        var allRepos = [ this.REPOS.wasm ];

        // 필요 패키지 = dplyr + 테스트별 패키지 (중복 제거)
        var pkgsToLoad = ['dplyr'].concat(requiredPackages || []);
        var seenPkgs = {};
        pkgsToLoad = pkgsToLoad.filter(function(p) {
            if (seenPkgs[p]) return false;
            seenPkgs[p] = true;
            return true;
        });

        // JS API로 패키지 설치 + 로드 (R 측 webr::install보다 안정적)
        for (var p = 0; p < pkgsToLoad.length; p++) {
            var pkg = pkgsToLoad[p];
            // 미설치 패키지는 installPackages로 설치
            if (this.loadedPackages.indexOf(pkg) === -1) {
                try {
                    console.log('[WebRRunner] executeSteps: 패키지 설치:', pkg);
                    await this.webR.installPackages([pkg], { repos: allRepos });
                    this.loadedPackages.push(pkg);
                } catch (e) {
                    console.warn('[WebRRunner] executeSteps: 설치 실패:', pkg, e.message);
                }
            }
            // evalR로 library() 호출 (captureR 외부 → 세션 전역에 반영)
            try {
                await this.webR.evalR(
                    'suppressWarnings(suppressMessages(library(' + pkg + ', warn.conflicts = FALSE)))'
                );
                console.log('[WebRRunner] executeSteps: library 로드 완료:', pkg);
            } catch (libErr) {
                console.warn('[WebRRunner] executeSteps: library 실패:', pkg, libErr.message);
            }
        }

        var results = {};
        for (var i = 0; i < steps.length; i++) {
            var step = steps[i];
            var pct = Math.round(((i + 1) / steps.length) * 100);
            this._emitProgress('executing', pct, step.label + '...');

            var result = await this.captureOutput(step.code);
            results[step.id] = {
                label: step.label,
                output: result.output,
                warnings: result.warnings,
                error: result.error
            };

            if (result.error) {
                console.warn('Step "' + step.id + '" 에러:', result.error);
            }
        }

        this._emitProgress('done', 100, '분석 완료');
        return results;
    },

    // ────────────── VFS 파일 쓰기 ──────────────

    writeFileToVFS: async function(fileName, content) {
        if (!this.isReady) return false;

        try {
            var encoder = new TextEncoder();
            var data = encoder.encode(content);
            await this.webR.FS.writeFile('/home/web_user/' + fileName, data);
            return true;
        } catch (e) {
            this._emitError('파일 쓰기 실패: ' + e.message);
            return false;
        }
    },

    // ────────────── R 변수 가져오기 ──────────────

    getVariable: async function(varName) {
        if (!this.isReady) return null;

        try {
            var result = await this.webR.evalR(varName);
            var jsValue = await result.toJs();
            result.destroy();
            return jsValue;
        } catch (e) {
            return null;
        }
    },

    // ────────────── 그래픽 캡처 ──────────────

    captureGraphics: async function(rCode, width, height) {
        if (!this.isReady) return null;

        width = width || 600;
        height = height || 400;

        try {
            // PostMessage 채널에서는 canvas() 직접 호출 불가
            // → captureR의 captureGraphics 옵션으로 WebR 내부 디바이스 자동 사용
            var shelter = await new this.webR.Shelter();
            var result = await shelter.captureR(rCode, {
                captureGraphics: { width: width, height: height }
            });

            var images = [];
            if (result.images) {
                for (var i = 0; i < result.images.length; i++) {
                    images.push(result.images[i]);
                }
            }

            shelter.purge();
            return images;

        } catch (e) {
            console.warn('그래픽 캡처 실패:', e.message);
            return null;
        }
    },

    // ────────────── 정리 ──────────────

    destroy: function() {
        if (this.webR) {
            try { this.webR.close(); } catch (_) {}
            this.webR = null;
        }
        this.isReady = false;
        this.isLoading = false;
        this._initPromise = null;
        this.loadedPackages = [];
    },

    // ────────────── 내부 헬퍼 ──────────────

    _emitProgress: function(stage, percent, message) {
        if (typeof this.onProgress === 'function') {
            this.onProgress(stage, percent, message);
        }
    },

    _emitError: function(message) {
        console.error('[WebRRunner]', message);
        if (typeof this.onError === 'function') {
            this.onError(message);
        }
    }
};
