}

// 안심투자 컴포넌트
export class SafeInvestmentComponent extends BaseComponent {
    async render() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="safe-investment-container theme-blue">
                <section class="page-header">
                    <div class="container">
                        <div class="breadcrumb">
                            <a href="/" data-route="/">홈</a> > <span>안심투자</span>
                        </div>
                        <h1 class="page-title">
                            <span class="icon">💰</span>
                            안심투자
                        </h1>
                        <p class="page-description">95% 안정성 보장으로 안전하게 투자하세요</p>
                    </div>
                </section>

                <section class="investment-products">
                    <div class="container">
                        <div class="products-grid">
                            <div class="product-card featured">
                                <div class="product-badge">추천</div>
                                <h3 class="product-title">안정형 DeFi 펀드</h3>
                                <div class="product-yield">8.5% 연수익률</div>
                                <div class="product-features">
                                    <div class="feature">✅ 원금 100% 보장</div>
                                    <div class="feature">✅ 보험사 연동</div>
                                    <div class="feature">✅ 언제든 출금 가능</div>
                                </div>
                                <div class="product-stats">
                                    <div class="stat">
                                        <span class="label">최소투자금</span>
                                        <span class="value">100만원</span>
                                    </div>
                                    <div class="stat">
                                        <span class="label">투자기간</span>
                                        <span class="value">제한없음</span>
                                    </div>
                                </div>
                                <button class="btn btn-primary btn-full">투자하기</button>
                            </div>
                            
                            <div class="product-card">
                                <h3 class="product-title">스테이블코인 적금</h3>
                                <div class="product-yield">6.2% 연수익률</div>
                                <div class="product-features">
                                    <div class="feature">✅ 월 자동 적립</div>
                                    <div class="feature">✅ 안정적 수익</div>
                                    <div class="feature">✅ 세금 혜택</div>
                                </div>
                                <div class="product-stats">
                                    <div class="stat">
                                        <span class="label">최소투자금</span>
                                        <span class="value">50만원</span>
                                    </div>
                                    <div class="stat">
                                        <span class="label">투자기간</span>
                                        <span class="value">12개월</span>
                                    </div>
                                </div>
                                <button class="btn btn-outline btn-full">투자하기</button>
                            </div>

                            <div class="product-card">
                                <h3 class="product-title">보험연계 투자</h3>
                                <div class="product-yield">7.8% 연수익률</div>
                                <div class="product-features">
                                    <div class="feature">✅ 생명보험 연계</div>
                                    <div class="feature">✅ 리스크 최소화</div>
                                    <div class="feature">✅ 가족 보장</div>
                                </div>
                                <div class="product-stats">
                                    <div class="stat">
                                        <span class="label">최소투자금</span>
                                        <span class="value">200만원</span>
                                    </div>
                                    <div class="stat">
                                        <span class="label">투자기간</span>
                                        <span class="value">24개월</span>
                                    </div>
                                </div>
                                <button class="btn btn-outline btn-full">투자하기</button>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="safety-features">
                    <div class="container">
                        <h2 class="section-title">안심투자 안전장치</h2>
                        <div class="features-grid">
                            <div class="feature-card">
                                <div class="feature-icon">🛡️</div>
                                <h3>원금보장</h3>
                                <p>투자 원금 100% 보장으로 손실 위험 제로</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">🏦</div>
                                <h3>보험연계</h3>
                                <p>대형 보험사와 연계하여 추가 보장</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">📊</div>
                                <h3>실시간 모니터링</h3>
                                <p>24시간 리스크 모니터링 및 알림</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">💎</div>
                                <h3>우량자산</h3>
                                <p>검증된 우량 자산에만 선별 투자</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }
}

// 소액투자 컴포넌트
export class SmallInvestmentComponent extends BaseComponent {
    async render() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="small-investment-container theme-green">
                <section class="page-header">
                    <div class="container">
                        <div class="breadcrumb">
                            <a href="/" data-route="/">홈</a> > <span>소액투자</span>
                        </div>
                        <h1 class="page-title">
                            <span class="icon">🎯</span>
                            소액투자
                        </h1>
                        <p class="page-description">1만원부터 시작하는 스마트 투자</p>
                    </div>
                </section>

                <section class="investment-calculator">
                    <div class="container">
                        <div class="calculator-card">
                            <h3>소액투자 시뮬레이터</h3>
                            <div class="calculator-form">
                                <div class="form-group">
                                    <label>월 투자금액</label>
                                    <input type="range" id="monthlyAmount" min="10000" max="1000000" value="100000" step="10000">
                                    <div class="amount-display">₩<span id="monthlyDisplay">100,000</span></div>
                                </div>
                                <div class="form-group">
                                    <label>투자기간</label>
                                    <select id="investmentPeriod">
                                        <option value="12">1년</option>
                                        <option value="24">2년</option>
                                        <option value="36" selected>3년</option>
                                        <option value="60">5년</option>
                                    </select>
                                </div>
                                <div class="result-display">
                                    <div class="result-item">
                                        <span class="label">총 투자금액</span>
                                        <span class="value" id="totalInvestment">₩3,600,000</span>
                                    </div>
                                    <div class="result-item">
                                        <span class="label">예상 수익</span>
                                        <span class="value profit" id="expectedProfit">₩540,000</span>
                                    </div>
                                    <div class="result-item">
                                        <span class="label">최종 금액</span>
                                        <span class="value total" id="finalAmount">₩4,140,000</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="small-products">
                    <div class="container">
                        <h2 class="section-title">소액투자 상품</h2>
                        <div class="products-grid">
                            <div class="product-card">
                                <div class="product-badge">인기</div>
                                <h3 class="product-title">코인 적립투자</h3>
                                <div class="product-yield">월 5-8% 수익</div>
                                <div class="product-features">
                                    <div class="feature">✅ 1만원부터 투자</div>
                                    <div class="feature">✅ 매월 자동 투자</div>
                                    <div class="feature">✅ 분산 투자 효과</div>
                                </div>
                                <button class="btn btn-primary btn-full">시작하기</button>
                            </div>
                            
                            <div class="product-card">
                                <h3 class="product-title">DCA 전략투자</h3>
                                <div class="product-yield">연 12-15% 수익</div>
                                <div class="product-features">
                                    <div class="feature">✅ 달러 코스트 애버리징</div>
                                    <div class="feature">✅ 변동성 완화</div>
                                    <div class="feature">✅ 장기 성장성</div>
                                </div>
                                <button class="btn btn-outline btn-full">시작하기</button>
                            </div>

                            <div class="product-card">
                                <h3 class="product-title">마이크로 펀드</h3>
                                <div class="product-yield">연 8-12% 수익</div>
                                <div class="product-features">
                                    <div class="feature">✅ 소액 분산 투자</div>
                                    <div class="feature">✅ 전문가 관리</div>
                                    <div class="feature">✅ 낮은 수수료</div>
                                </div>
                                <button class="btn btn-outline btn-full">시작하기</button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }

    bindEvents() {
        // 계산기 이벤트
        const monthlyAmount = document.getElementById('monthlyAmount');
        const monthlyDisplay = document.getElementById('monthlyDisplay');
        const investmentPeriod = document.getElementById('investmentPeriod');

        if (monthlyAmount && monthlyDisplay) {
            monthlyAmount.addEventListener('input', () => {
                const amount = parseInt(monthlyAmount.value);
                monthlyDisplay.textContent = amount.toLocaleString();
                this.updateCalculation();
            });
        }

        if (investmentPeriod) {
            investmentPeriod.addEventListener('change', () => {
                this.updateCalculation();
            });
        }
    }

    updateCalculation() {
        const monthlyAmount = parseInt(document.getElementById('monthlyAmount')?.value || 100000);
        const period = parseInt(document.getElementById('investmentPeriod')?.value || 36);
        
        const totalInvestment = monthlyAmount * period;
        const expectedReturn = totalInvestment * 0.15; // 15% 예상 수익률
        const finalAmount = totalInvestment + expectedReturn;

        document.getElementById('totalInvestment').textContent = `₩${totalInvestment.toLocaleString()}`;
        document.getElementById('expectedProfit').textContent = `₩${expectedReturn.toLocaleString()}`;
        document.getElementById('finalAmount').textContent = `₩${finalAmount.toLocaleString()}`;
    }
}

// 고수익투자 컴포넌트
export class HighReturnComponent extends BaseComponent {
    async render() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="high-return-container theme-red">
                <section class="page-header">
                    <div class="container">
                        <div class="breadcrumb">
                            <a href="/" data-route="/">홈</a> > <span>고수익투자</span>
                        </div>
                        <h1 class="page-title">
                            <span class="icon">🚀</span>
                            고수익투자
                        </h1>
                        <p class="page-description">평균 15% 수익률의 적극적 투자 전략</p>
                        <div class="warning-notice">
                            ⚠️ 고수익 투자는 높은 리스크를 수반할 수 있습니다.
                        </div>
                    </div>
                </section>

                <section class="performance-dashboard">
                    <div class="container">
                        <div class="dashboard-grid">
                            <div class="dashboard-card">
                                <div class="card-icon">📈</div>
                                <div class="card-content">
                                    <div class="card-value">24.8%</div>
                                    <div class="card-label">최고 수익률</div>
                                </div>
                            </div>
                            <div class="dashboard-card">
                                <div class="card-icon">💰</div>
                                <div class="card-content">
                                    <div class="card-value">15.2%</div>
                                    <div class="card-label">평균 수익률</div>
                                </div>
                            </div>
                            <div class="dashboard-card">
                                <div class="card-icon">🎯</div>
                                <div class="card-content">
                                    <div class="card-value">87%</div>
                                    <div class="card-label">성공률</div>
                                </div>
                            </div>
                            <div class="dashboard-card">
                                <div class="card-icon">⏱️</div>
                                <div class="card-content">
                                    <div class="card-value">6개월</div>
                                    <div class="card-label">평균 투자기간</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="high-return-products">
                    <div class="container">
                        <h2 class="section-title">고수익 투자 상품</h2>
                        <div class="products-grid">
                            <div class="product-card premium">
                                <div class="product-badge">프리미엄</div>
                                <h3 class="product-title">AI 트레이딩 펀드</h3>
                                <div class="product-yield">20-30% 연수익률</div>
                                <div class="product-features">
                                    <div class="feature">✅ AI 알고리즘 거래</div>
                                    <div class="feature">✅ 24시간 자동 매매</div>
                                    <div class="feature">✅ 리스크 관리</div>
                                </div>
                                <div class="product-stats">
                                    <div class="stat">
                                        <span class="label">최소투자금</span>
                                        <span class="value">1,000만원</span>
                                    </div>
                                    <div class="stat">
                                        <span class="label">투자기간</span>
                                        <span class="value">6개월</span>
                                    </div>
                                </div>
                                <button class="btn btn-primary btn-full">투자하기</button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }
}

// 참여하기 컴포넌트
export class ParticipationComponent extends BaseComponent {
    async render() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="participation-container theme-purple">
                <section class="page-header">
                    <div class="container">
                        <h1 class="page-title">
                            <span class="icon">🎮</span>
                            참여하기
                        </h1>
                        <p class="page-description">게임화된 투자 경험을 즐겨보세요</p>
                    </div>
                </section>

                <section class="gamification-features">
                    <div class="container">
                        <div class="features-grid">
                            <div class="feature-card">
                                <div class="feature-icon">🏆</div>
                                <h3>리워드 시스템</h3>
                                <p>투자 활동에 따른 다양한 리워드 획득</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">👥</div>
                                <h3>소셜 투자</h3>
                                <p>다른 투자자들과 함께하는 투자</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">🎪</div>
                                <h3>이벤트 참여</h3>
                                <p>다양한 투자 이벤트와 챌린지</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }
}

// 대형투자자동향 컴포넌트
export class WhaleTrackingComponent extends BaseComponent {
    async render() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="whale-tracking-container theme-navy">
                <section class="page-header">
                    <div class="container">
                        <h1 class="page-title">
                            <span class="icon">🐋</span>
                            대형투자자동향
                        </h1>
                        <p class="page-description">기관투자자들의 움직임을 실시간으로 추적</p>
                    </div>
                </section>

                <section class="whale-dashboard">
                    <div class="container">
                        <div class="tracking-grid">
                            <div class="tracking-card">
                                <h3>실시간 대량 거래</h3>
                                <div class="transaction-list">
                                    <div class="transaction-item">
                                        <span class="amount">+$2.5M BTC</span>
                                        <span class="time">3분 전</span>
                                    </div>
                                    <div class="transaction-item">
                                        <span class="amount">-$1.8M ETH</span>
                                        <span class="time">7분 전</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }
}

// 로그인 컴포넌트
export class LoginComponent extends BaseComponent {
    async render() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="auth-container">
                <div class="auth-form">
                    <h2>로그인</h2>
                    <form id="loginForm">
                        <input type="email" placeholder="이메일" required>
                        <input type="password" placeholder="비밀번호" required>
                        <button type="submit" class="btn btn-primary btn-full">로그인</button>
                    </form>
                    <p>계정이 없으신가요? <a href="/register" data-route="/register">회원가입</a></p>
                </div>
            </div>
        `;
    }
}

// 회원가입 컴포넌트
export class RegisterComponent extends BaseComponent {
    async render() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="auth-container">
                <div class="auth-form">
                    <h2>회원가입</h2>
                    <form id="registerForm">
                        <input type="text" placeholder="이름" required>
                        <input type="email" placeholder="이메일" required>
                        <input type="password" placeholder="비밀번호" required>
                        <input type="password" placeholder="비밀번호 확인" required>
                        <button type="submit" class="btn btn-primary btn-full">회원가입</button>
                    </form>
                    <p>이미 계정이 있으신가요? <a href="/login" data-route="/login">로그인</a></p>
                </div>
            </div>
        `;
    }
}

// 포트폴리오 컴포넌트
export class PortfolioComponent extends BaseComponent {
    async render() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="portfolio-container">
                <section class="portfolio-header">
                    <div class="container">
                        <h1 class="page-title">내 포트폴리오</h1>
                        <div class="portfolio-summary">
                            <div class="summary-card">
                                <div class="summary-value">₩12,450,000</div>
                                <div class="summary-label">총 자산</div>
                                <div class="summary-change positive">+8.3%</div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }
}

// 404 컴포넌트
export class NotFoundComponent extends BaseComponent {
    async render() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="not-found-container">
                <div class="not-found-content">
                    <h1>404</h1>
                    <h2>페이지를 찾을 수 없습니다</h2>
                    <p>요청하신 페이지가 존재하지 않습니다.</p>
                    <button class="btn btn-primary" data-route="/">홈으로 돌아가기</button>
                </div>
            </div>
        `;
    }
}

// 전역 함수들
window.openCalculator = function() {
    alert('수익률 계산기를 준비 중입니다.');
};

window.openRiskAssessment = function() {
    alert('리스크 평가 도구를 준비 중입니다.');
};/**
 * 블록체인 투자 플랫폼 - 컴포넌트 시스템
 * 5가지 핵심 관점별 컴포넌트 및 공통 컴포넌트 관리
 */

// 베이스 컴포넌트 클래스
class BaseComponent {
    constructor() {
        this.element = null;
        this.state = {};
        this.mounted = false;
        this.animations = [];
    }

    /**
     * 컴포넌트 렌더링
     */
    async render() {
        throw new Error('render 메서드를 구현해야 합니다.');
    }

    /**
     * 컴포넌트 마운트
     */
    mount() {
        this.mounted = true;
        this.bindEvents();
        this.startAnimations();
    }

    /**
     * 컴포넌트 언마운트
     */
    unmount() {
        this.mounted = false;
        this.unbindEvents();
        this.stopAnimations();
        if (this.element) {
            this.element.remove();
        }
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        // 하위 클래스에서 구현
    }

    /**
     * 이벤트 언바인딩
     */
    unbindEvents() {
        // 하위 클래스에서 구현
    }

    /**
     * 애니메이션 시작
     */
    startAnimations() {
        // 페이드인 애니메이션
        const cards = document.querySelectorAll('.investment-card, .feature-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    /**
     * 애니메이션 중지
     */
    stopAnimations() {
        this.animations.forEach(animation => {
            if (animation.cancel) animation.cancel();
        });
        this.animations = [];
    }

    /**
     * 상태 업데이트
     * @param {Object} newState - 새로운 상태
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.forceUpdate();
    }

    /**
     * 강제 업데이트
     */
    forceUpdate() {
        if (this.mounted) {
            this.render();
        }
    }
}

// 홈 컴포넌트
export class HomeComponent extends BaseComponent {
    constructor() {
        super();
        this.state = {
            investmentData: [],
            totalInvestment: 0,
            todayProfit: 0,
            loading: true
        };
    }

    async render() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="home-container">
                <!-- 히어로 섹션 -->
                <section class="hero-section">
                    <div class="container">
                        <div class="hero-content">
                            <h1 class="hero-title">
                                <span class="gradient-text">스마트한 블록체인 투자</span><br>
                                지금 시작하세요
                            </h1>
                            <p class="hero-description">
                                AI 기반 분석과 전문가 추천으로<br>
                                안전하고 수익성 높은 투자를 경험하세요
                            </p>
                            <div class="hero-stats">
                                <div class="stat-item">
                                    <div class="stat-value">15.2%</div>
                                    <div class="stat-label">평균 수익률</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">50,000+</div>
                                    <div class="stat-label">누적 투자자</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value">99.8%</div>
                                    <div class="stat-label">안정성 지수</div>
                                </div>
                            </div>
                            <div class="hero-buttons">
                                <button class="btn btn-primary btn-large" data-route="/register">
                                    투자 시작하기
                                </button>
                                <button class="btn btn-outline btn-large" data-route="/portfolio">
                                    포트폴리오 보기
                                </button>
                            </div>
                        </div>
                        <div class="hero-visual">
                            <div class="floating-cards">
                                <div class="floating-card card-1">
                                    <div class="card-icon">💰</div>
                                    <div class="card-title">안심투자</div>
                                    <div class="card-value">+12.5%</div>
                                </div>
                                <div class="floating-card card-2">
                                    <div class="card-icon">🚀</div>
                                    <div class="card-title">고수익</div>
                                    <div class="card-value">+24.8%</div>
                                </div>
                                <div class="floating-card card-3">
                                    <div class="card-icon">🎯</div>
                                    <div class="card-title">소액투자</div>
                                    <div class="card-value">+8.3%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- 5가지 핵심 관점 섹션 -->
                <section class="investment-types-section">
                    <div class="container">
                        <h2 class="section-title">투자 스타일에 맞는 선택</h2>
                        <p class="section-description">5가지 투자 관점으로 나만의 투자 전략을 찾아보세요</p>
                        
                        <div class="investment-grid">
                            <div class="investment-card theme-blue" data-route="/safe-investment">
                                <div class="card-header">
                                    <div class="card-icon">💰</div>
                                    <div class="card-badge">95% 안정성</div>
                                </div>
                                <h3 class="card-title">안심투자</h3>
                                <p class="card-description">
                                    리스크를 최소화하고 안정적인 수익을 추구하는<br>
                                    보수적 투자자를 위한 상품
                                </p>
                                <div class="card-features">
                                    <div class="feature-item">
                                        <span class="feature-icon">🛡️</span>
                                        <span>원금 보장</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-icon">📊</span>
                                        <span>안정적 수익</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-icon">🔒</span>
                                        <span>보험 연동</span>
                                    </div>
                                </div>
                                <div class="card-stats">
                                    <div class="stat">
                                        <span class="stat-label">예상 수익률</span>
                                        <span class="stat-value">8-12%</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">최소 투자금</span>
                                        <span class="stat-value">100만원</span>
                                    </div>
                                </div>
                            </div>

                            <div class="investment-card theme-green" data-route="/small-investment">
                                <div class="card-header">
                                    <div class="card-icon">🎯</div>
                                    <div class="card-badge">1만원부터</div>
                                </div>
                                <h3 class="card-title">소액투자</h3>
                                <p class="card-description">
                                    부담 없는 소액으로 시작하는 블록체인 투자<br>
                                    투자 입문자에게 최적화된 상품
                                </p>
                                <div class="card-features">
                                    <div class="feature-item">
                                        <span class="feature-icon">💳</span>
                                        <span>소액 분할</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-icon">📈</span>
                                        <span>점진적 성장</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-icon">🎓</span>
                                        <span>투자 교육</span>
                                    </div>
                                </div>
                                <div class="card-stats">
                                    <div class="stat">
                                        <span class="stat-label">예상 수익률</span>
                                        <span class="stat-value">5-10%</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">최소 투자금</span>
                                        <span class="stat-value">1만원</span>
                                    </div>
                                </div>
                            </div>

                            <div class="investment-card theme-red" data-route="/high-return">
                                <div class="card-header">
                                    <div class="card-icon">🚀</div>
                                    <div class="card-badge">15% 수익률</div>
                                </div>
                                <h3 class="card-title">고수익투자</h3>
                                <p class="card-description">
                                    높은 수익률을 추구하는 적극적 투자자를 위한<br>
                                    고수익 블록체인 투자 상품
                                </p>
                                <div class="card-features">
                                    <div class="feature-item">
                                        <span class="feature-icon">⚡</span>
                                        <span>고수익 전략</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-icon">🎯</span>
                                        <span>전문가 관리</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-icon">📊</span>
                                        <span>실시간 분석</span>
                                    </div>
                                </div>
                                <div class="card-stats">
                                    <div class="stat">
                                        <span class="stat-label">예상 수익률</span>
                                        <span class="stat-value">15-25%</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">최소 투자금</span>
                                        <span class="stat-value">500만원</span>
                                    </div>
                                </div>
                            </div>

                            <div class="investment-card theme-purple" data-route="/participation">
                                <div class="card-header">
                                    <div class="card-icon">🎮</div>
                                    <div class="card-badge">게임화</div>
                                </div>
                                <h3 class="card-title">참여하기</h3>
                                <p class="card-description">
                                    게임화된 투자 경험과 커뮤니티 참여로<br>
                                    재미있게 투자하는 새로운 방식
                                </p>
                                <div class="card-features">
                                    <div class="feature-item">
                                        <span class="feature-icon">🏆</span>
                                        <span>리워드 시스템</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-icon">👥</span>
                                        <span>소셜 투자</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-icon">🎪</span>
                                        <span>이벤트 참여</span>
                                    </div>
                                </div>
                                <div class="card-stats">
                                    <div class="stat">
                                        <span class="stat-label">리워드 혜택</span>
                                        <span class="stat-value">최대 3%</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">참여 방식</span>
                                        <span class="stat-value">무료</span>
                                    </div>
                                </div>
                            </div>

                            <div class="investment-card theme-navy" data-route="/whale-tracking">
                                <div class="card-header">
                                    <div class="card-icon">🐋</div>
                                    <div class="card-badge">전문 정보</div>
                                </div>
                                <h3 class="card-title">대형투자자동향</h3>
                                <p class="card-description">
                                    기관투자자와 대형투자자들의 투자 동향을<br>
                                    실시간으로 분석하여 제공하는 전문 서비스
                                </p>
                                <div class="card-features">
                                    <div class="feature-item">
                                        <span class="feature-icon">📡</span>
                                        <span>실시간 추적</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-icon">🔍</span>
                                        <span>심층 분석</span>
                                    </div>
                                    <div class="feature-item">
                                        <span class="feature-icon">💡</span>
                                        <span>투자 인사이트</span>
                                    </div>
                                </div>
                                <div class="card-stats">
                                    <div class="stat">
                                        <span class="stat-label">분석 정확도</span>
                                        <span class="stat-value">98.5%</span>
                                    </div>
                                    <div class="stat">
                                        <span class="stat-label">업데이트</span>
                                        <span class="stat-value">실시간</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- 실시간 투자 현황 -->
                <section class="live-stats-section">
                    <div class="container">
                        <h2 class="section-title">실시간 투자 현황</h2>
                        <div class="live-stats-grid">
                            <div class="live-stat-card">
                                <div class="stat-icon">📈</div>
                                <div class="stat-info">
                                    <div class="stat-value" id="totalInvestment">₩0</div>
                                    <div class="stat-label">총 투자금액</div>
                                    <div class="stat-change positive">+12.5%</div>
                                </div>
                            </div>
                            <div class="live-stat-card">
                                <div class="stat-icon">💰</div>
                                <div class="stat-info">
                                    <div class="stat-value" id="todayProfit">₩0</div>
                                    <div class="stat-label">오늘 수익</div>
                                    <div class="stat-change positive">+8.3%</div>
                                </div>
                            </div>
                            <div class="live-stat-card">
                                <div class="stat-icon">👥</div>
                                <div class="stat-info">
                                    <div class="stat-value">1,247</div>
                                    <div class="stat-label">활성 투자자</div>
                                    <div class="stat-change positive">+156</div>
                                </div>
                            </div>
                            <div class="live-stat-card">
                                <div class="stat-icon">🏆</div>
                                <div class="stat-info">
                                    <div class="stat-value">94.2%</div>
                                    <div class="stat-label">성공률</div>
                                    <div class="stat-change positive">+2.1%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- 투자 도구 -->
                <section class="tools-section">
                    <div class="container">
                        <h2 class="section-title">스마트 투자 도구</h2>
                        <div class="tools-grid">
                            <div class="tool-card">
                                <div class="tool-icon">🧮</div>
                                <h3 class="tool-title">수익률 계산기</h3>
                                <p class="tool-description">예상 수익률을 미리 계산해보세요</p>
                                <button class="btn btn-outline" onclick="openCalculator()">사용하기</button>
                            </div>
                            <div class="tool-card">
                                <div class="tool-icon">📊</div>
                                <h3 class="tool-title">포트폴리오 분석</h3>
                                <p class="tool-description">내 투자 현황을 한눈에 확인</p>
                                <button class="btn btn-outline" data-route="/portfolio">분석하기</button>
                            </div>
                            <div class="tool-card">
                                <div class="tool-icon">🎯</div>
                                <h3 class="tool-title">리스크 평가</h3>
                                <p class="tool-description">투자 위험도를 사전에 평가</p>
                                <button class="btn btn-outline" onclick="openRiskAssessment()">평가하기</button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;

        // 애니메이션 적용
        this.animateCounters();
        this.startFloatingAnimation();
    }

    bindEvents() {
        // 투자 카드 클릭 이벤트
        document.querySelectorAll('.investment-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const route = card.getAttribute('data-route');
                if (route) {
                    window.router.navigate(route);
                }
            });
        });

        // 실시간 데이터 업데이트
        this.startLiveUpdates();
    }

    // 카운터 애니메이션
    animateCounters() {
        const counters = document.querySelectorAll('.stat-value');
        counters.forEach(counter => {
            const target = parseInt(counter.textContent.replace(/[^\d]/g, ''));
            if (target) {
                this.animateCounter(counter, 0, target, 2000);
            }
        });
    }

    animateCounter(element, start, end, duration) {
        const startTime = performance.now();
        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const value = Math.floor(start + (end - start) * progress);
            
            if (element.id === 'totalInvestment' || element.id === 'todayProfit') {
                element.textContent = `₩${value.toLocaleString()}`;
            } else {
                element.textContent = value.toLocaleString();
            }
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };
        requestAnimationFrame(update);
    }

    // 플로팅 카드 애니메이션
    startFloatingAnimation() {
        const floatingCards = document.querySelectorAll('.floating-card');
        floatingCards.forEach((card, index) => {
            const animation = card.animate([
                { transform: 'translateY(0px) rotate(0deg)' },
                { transform: 'translateY(-20px) rotate(2deg)' },
                { transform: 'translateY(0px) rotate(0deg)' }
            ], {
                duration: 3000 + (index * 500),
                iterations: Infinity,
                easing: 'ease-in-out'
            });
            this.animations.push(animation);
        });
    }

    // 실시간 업데이트
    startLiveUpdates() {
        setInterval(() => {
            // 실제로는 API에서 데이터를 가져와야 함
            this.updateLiveStats();
        }, 30000); // 30초마다 업데이트
    }

    updateLiveStats() {
        // 모의 데이터 업데이트
        const totalInvestment = document.getElementById('totalInvestment');
        const todayProfit = document.getElementById('todayProfit');
        
        if (totalInvestment) {
            const currentValue = parseInt(totalInvestment.textContent.replace(/[^\d]/g, ''));
            const newValue = currentValue + Math.floor(Math.random() * 100000);
            totalInvestment.textContent = `₩${newValue.toLocaleString()}`;
        }
        
        if (todayProfit) {
            const currentValue = parseInt(todayProfit.textContent.replace(/[^\d]/g, ''));
            const newValue = currentValue + Math.floor(Math.random() * 10000);
            todayProfit.textContent = `₩${newValue.toLocaleString()}`;
        }
    }
}