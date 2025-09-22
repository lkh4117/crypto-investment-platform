/**
 * 블록체인 투자 플랫폼 - SPA 라우터 모듈
 * 클라이언트 사이드 라우팅 및 페이지 전환 관리
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.defaultRoute = '/';
        this.notFoundRoute = '/404';
        this.isNavigating = false;
        
        // 히스토리 API 지원 확인
        this.historySupported = !!(window.history && window.history.pushState);
        
        // 라우트 정의
        this.defineRoutes();
        
        // 이벤트 리스너 등록
        this.bindEvents();
        
        // 초기 라우트 설정
        this.init();
    }

    /**
     * 라우트 정의
     */
    defineRoutes() {
        // 메인 페이지 라우트
        this.routes.set('/', {
            name: 'home',
            component: 'HomeComponent',
            title: '블록체인 투자 플랫폼 - 스마트한 투자의 시작',
            meta: {
                description: '안전하고 수익성 높은 블록체인 투자를 위한 올인원 플랫폼',
                keywords: '블록체인, 투자, 암호화폐, DeFi, 포트폴리오'
            },
            requiresAuth: false,
            cache: true
        });

        // 5가지 핵심 관점 라우트
        this.routes.set('/safe-investment', {
            name: 'safe-investment',
            component: 'SafeInvestmentComponent',
            title: '안심투자 - 안정성 95% 보장',
            meta: {
                description: '안정적인 수익을 추구하는 보수적 투자자를 위한 안심 투자 상품',
                keywords: '안심투자, 안정성, 보수적투자, 리스크관리'
            },
            requiresAuth: false,
            cache: true,
            theme: 'blue'
        });

        this.routes.set('/small-investment', {
            name: 'small-investment',
            component: 'SmallInvestmentComponent',
            title: '소액투자 - 최소 1만원부터 시작',
            meta: {
                description: '부담 없는 소액으로 시작하는 블록체인 투자',
                keywords: '소액투자, 적금, 투자입문, 분산투자'
            },
            requiresAuth: false,
            cache: true,
            theme: 'green'
        });

        this.routes.set('/high-return', {
            name: 'high-return',
            component: 'HighReturnComponent',
            title: '고수익투자 - 평균 15% 수익률',
            meta: {
                description: '높은 수익률을 추구하는 적극적 투자자를 위한 고수익 상품',
                keywords: '고수익투자, 수익률, 적극적투자, 성장투자'
            },
            requiresAuth: true,
            cache: true,
            theme: 'red'
        });

        this.routes.set('/participation', {
            name: 'participation',
            component: 'ParticipationComponent',
            title: '참여하기 - 재미있는 투자 참여',
            meta: {
                description: '게임화된 투자 경험과 커뮤니티 참여',
                keywords: '투자게임, 커뮤니티, 참여형투자, 소셜투자'
            },
            requiresAuth: false,
            cache: true,
            theme: 'purple'
        });

        this.routes.set('/whale-tracking', {
            name: 'whale-tracking',
            component: 'WhaleTrackingComponent',
            title: '대형투자자동향 - 전문 투자 정보',
            meta: {
                description: '기관투자자와 대형투자자들의 투자 동향 분석',
                keywords: '대형투자자, 기관투자자, 투자동향, 시장분석'
            },
            requiresAuth: true,
            cache: true,
            theme: 'navy'
        });

        // 사용자 관련 라우트
        this.routes.set('/login', {
            name: 'login',
            component: 'LoginComponent',
            title: '로그인 - 블록체인 투자 플랫폼',
            requiresAuth: false,
            cache: false
        });

        this.routes.set('/register', {
            name: 'register',
            component: 'RegisterComponent',
            title: '회원가입 - 블록체인 투자 플랫폼',
            requiresAuth: false,
            cache: false
        });

        this.routes.set('/profile', {
            name: 'profile',
            component: 'ProfileComponent',
            title: '내 정보 - 블록체인 투자 플랫폼',
            requiresAuth: true,
            cache: false
        });

        this.routes.set('/portfolio', {
            name: 'portfolio',
            component: 'PortfolioComponent',
            title: '포트폴리오 - 블록체인 투자 플랫폼',
            requiresAuth: true,
            cache: true
        });

        // 404 라우트
        this.routes.set('/404', {
            name: 'not-found',
            component: 'NotFoundComponent',
            title: '페이지를 찾을 수 없습니다',
            requiresAuth: false,
            cache: false
        });
    }

    /**
     * 이벤트 리스너 등록
     */
    bindEvents() {
        // popstate 이벤트 (뒤로가기/앞으로가기)
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.route) {
                this.handleRoute(event.state.route, false);
            } else {
                this.handleRoute(window.location.pathname, false);
            }
        });

        // 링크 클릭 이벤트
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[data-route]');
            if (link) {
                event.preventDefault();
                const route = link.getAttribute('data-route') || link.getAttribute('href');
                this.navigate(route);
            }
        });

        // 브라우저 언로드 이벤트
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });
    }

    /**
     * 라우터 초기화
     */
    init() {
        const currentPath = window.location.pathname;
        const route = this.routes.has(currentPath) ? currentPath : this.defaultRoute;
        this.handleRoute(route, false);
    }

    /**
     * 라우트 네비게이션
     * @param {string} route - 이동할 라우트
     * @param {boolean} pushState - 히스토리에 추가할지 여부
     */
    navigate(route, pushState = true) {
        if (this.isNavigating) return;
        
        // 현재 라우트와 같으면 무시
        if (this.currentRoute === route) return;

        this.handleRoute(route, pushState);
    }

    /**
     * 라우트 처리
     * @param {string} route - 처리할 라우트
     * @param {boolean} pushState - 히스토리에 추가할지 여부
     */
    async handleRoute(route, pushState = true) {
        this.isNavigating = true;

        try {
            // 라우트 정보 가져오기
            const routeConfig = this.routes.get(route) || this.routes.get(this.notFoundRoute);
            
            // 라우트 유효성 검사
            if (!routeConfig) {
                throw new Error(`라우트를 찾을 수 없습니다: ${route}`);
            }

            // 인증 확인
            if (routeConfig.requiresAuth && !this.isAuthenticated()) {
                this.navigate('/login');
                return;
            }

            // 페이지 전환 애니메이션 시작
            this.startPageTransition();

            // 컴포넌트 로드
            await this.loadComponent(routeConfig);

            // URL 업데이트
            if (pushState && this.historySupported) {
                window.history.pushState(
                    { route, timestamp: Date.now() },
                    routeConfig.title,
                    route
                );
            }

            // 메타데이터 업데이트
            this.updatePageMeta(routeConfig);

            // 현재 라우트 업데이트
            this.currentRoute = route;

            // 네비게이션 상태 업데이트
            this.updateNavigation(route);

            // 페이지 전환 애니메이션 완료
            this.completePageTransition();

            // 라우트 변경 이벤트 발생
            this.dispatchRouteChange(route, routeConfig);

        } catch (error) {
            console.error('라우트 처리 오류:', error);
            this.handleRouteError(error);
        } finally {
            this.isNavigating = false;
        }
    }

    /**
     * 컴포넌트 로드
     * @param {Object} routeConfig - 라우트 설정
     */
    async loadComponent(routeConfig) {
        const { component, theme } = routeConfig;
        
        try {
            // 컴포넌트 모듈 동적 로드
            const ComponentClass = await this.importComponent(component);
            
            // 컴포넌트 인스턴스 생성
            const componentInstance = new ComponentClass();
            
            // 테마 적용
            if (theme) {
                this.applyTheme(theme);
            }
            
            // 컴포넌트 렌더링
            await componentInstance.render();
            
            // 컴포넌트 마운트
            componentInstance.mount();
            
        } catch (error) {
            console.error('컴포넌트 로드 오류:', error);
            throw error;
        }
    }

    /**
     * 컴포넌트 동적 임포트
     * @param {string} componentName - 컴포넌트 이름
     */
    async importComponent(componentName) {
        try {
            const module = await import(`./components.js`);
            return module[componentName] || module.NotFoundComponent;
        } catch (error) {
            console.error('컴포넌트 임포트 오류:', error);
            // 폴백 컴포넌트 반환
            return class FallbackComponent {
                render() {
                    document.getElementById('app').innerHTML = `
                        <div class="error-container">
                            <h2>페이지를 로드할 수 없습니다</h2>
                            <p>잠시 후 다시 시도해주세요.</p>
                            <button onclick="location.reload()">새로고침</button>
                        </div>
                    `;
                }
                mount() {}
            };
        }
    }

    /**
     * 테마 적용
     * @param {string} theme - 테마 이름
     */
    applyTheme(theme) {
        const body = document.body;
        
        // 기존 테마 클래스 제거
        body.className = body.className.replace(/theme-\w+/g, '');
        
        // 새 테마 클래스 추가
        body.classList.add(`theme-${theme}`);
        
        // CSS 변수 업데이트
        const themeColors = {
            blue: '#1e3a8a',
            green: '#059669',
            red: '#dc2626',
            purple: '#7c3aed',
            navy: '#1e293b'
        };
        
        if (themeColors[theme]) {
            document.documentElement.style.setProperty('--theme-color', themeColors[theme]);
        }
    }

    /**
     * 페이지 메타데이터 업데이트
     * @param {Object} routeConfig - 라우트 설정
     */
    updatePageMeta(routeConfig) {
        // 제목 업데이트
        document.title = routeConfig.title;
        
        // 메타 태그 업데이트
        if (routeConfig.meta) {
            this.updateMetaTag('description', routeConfig.meta.description);
            this.updateMetaTag('keywords', routeConfig.meta.keywords);
        }
        
        // 스크롤 위치 초기화
        window.scrollTo(0, 0);
    }

    /**
     * 메타 태그 업데이트
     * @param {string} name - 메타 태그 이름
     * @param {string} content - 메타 태그 내용
     */
    updateMetaTag(name, content) {
        if (!content) return;
        
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = name;
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    /**
     * 네비게이션 상태 업데이트
     * @param {string} route - 현재 라우트
     */
    updateNavigation(route) {
        // 활성 네비게이션 항목 업데이트
        const navItems = document.querySelectorAll('.nav-item, .tab-item');
        navItems.forEach(item => {
            const itemRoute = item.getAttribute('data-route') || item.getAttribute('href');
            if (itemRoute === route) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * 페이지 전환 애니메이션 시작
     */
    startPageTransition() {
        const app = document.getElementById('app');
        if (app) {
            app.classList.add('page-transition-out');
        }
        
        // 로딩 표시
        this.showLoadingIndicator();
    }

    /**
     * 페이지 전환 애니메이션 완료
     */
    completePageTransition() {
        const app = document.getElementById('app');
        if (app) {
            app.classList.remove('page-transition-out');
            app.classList.add('page-transition-in');
            
            setTimeout(() => {
                app.classList.remove('page-transition-in');
            }, 300);
        }
        
        // 로딩 숨김
        this.hideLoadingIndicator();
    }

    /**
     * 로딩 인디케이터 표시
     */
    showLoadingIndicator() {
        let loader = document.getElementById('page-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'page-loader';
            loader.className = 'page-loader';
            loader.innerHTML = `
                <div class="loader-spinner"></div>
                <div class="loader-text">페이지를 로드하는 중...</div>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    }

    /**
     * 로딩 인디케이터 숨김
     */
    hideLoadingIndicator() {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    /**
     * 인증 상태 확인
     * @returns {boolean} 인증 여부
     */
    isAuthenticated() {
        // 간단한 토큰 확인 (실제로는 더 복잡한 로직 필요)
        const token = localStorage.getItem('authToken');
        return token && token !== 'null' && token !== 'undefined';
    }

    /**
     * 라우트 변경 이벤트 발생
     * @param {string} route - 현재 라우트
     * @param {Object} routeConfig - 라우트 설정
     */
    dispatchRouteChange(route, routeConfig) {
        const event = new CustomEvent('routechange', {
            detail: { route, config: routeConfig }
        });
        window.dispatchEvent(event);
    }

    /**
     * 상태 저장
     */
    saveState() {
        const state = {
            currentRoute: this.currentRoute,
            timestamp: Date.now()
        };
        localStorage.setItem('routerState', JSON.stringify(state));
    }

    /**
     * 상태 복원
     */
    restoreState() {
        try {
            const state = JSON.parse(localStorage.getItem('routerState'));
            if (state && state.currentRoute) {
                return state.currentRoute;
            }
        } catch (error) {
            console.error('상태 복원 오류:', error);
        }
        return null;
    }

    /**
     * 라우트 오류 처리
     * @param {Error} error - 오류 객체
     */
    handleRouteError(error) {
        console.error('라우트 오류:', error);
        
        // 에러 페이지로 이동하거나 홈으로 리다이렉트
        const errorMessage = encodeURIComponent(error.message);
        this.navigate(`/404?error=${errorMessage}`);
    }

    /**
     * 뒤로가기
     */
    goBack() {
        if (this.historySupported) {
            window.history.back();
        } else {
            this.navigate(this.defaultRoute);
        }
    }

    /**
     * 앞으로가기
     */
    goForward() {
        if (this.historySupported) {
            window.history.forward();
        }
    }

    /**
     * 특정 라우트로 리다이렉트
     * @param {string} route - 리다이렉트할 라우트
     */
    redirect(route) {
        this.navigate(route, true);
    }

    /**
     * 현재 라우트 정보 반환
     * @returns {Object} 현재 라우트 정보
     */
    getCurrentRoute() {
        return {
            route: this.currentRoute,
            config: this.routes.get(this.currentRoute)
        };
    }

    /**
     * 라우트 존재 여부 확인
     * @param {string} route - 확인할 라우트
     * @returns {boolean} 존재 여부
     */
    routeExists(route) {
        return this.routes.has(route);
    }

    /**
     * 모든 라우트 반환
     * @returns {Map} 모든 라우트
     */
    getAllRoutes() {
        return new Map(this.routes);
    }
}

// 라우터 인스턴스 생성 및 내보내기
const router = new Router();

export default router;