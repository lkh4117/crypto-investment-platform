/**
 * 글로벌 상태 관리 시스템
 * 앱의 모든 상태를 중앙집중식으로 관리
 */

class StateManager {
    constructor() {
        this.state = this.getInitialState();
        this.listeners = new Map();
        this.middlewares = [];
        this.history = [];
        this.maxHistorySize = 50;
        
        // 로컬 스토리지에서 상태 복원
        this.loadFromStorage();
        
        // 상태 변경 디버깅
        this.enableDebugMode = localStorage.getItem('debug_mode') === 'true';
    }

    getInitialState() {
        return {
            // 사용자 관련 상태
            user: {
                isAuthenticated: false,
                profile: null,
                preferences: {
                    theme: 'light',
                    language: 'ko',
                    currency: 'KRW',
                    notifications: true
                }
            },
            
            // 포트폴리오 상태
            portfolio: {
                totalValue: 0,
                totalInvested: 0,
                totalProfit: 0,
                profitRate: 0,
                holdings: [],
                transactions: []
            },
            
            // 시장 데이터 상태
            market: {
                coins: [],
                trending: [],
                topGainers: [],
                topLosers: [],
                marketCap: 0,
                volume24h: 0,
                dominance: {},
                lastUpdated: null
            },
            
            // UI 상태
            ui: {
                currentPage: 'dashboard',
                isLoading: false,
                notifications: [],
                modals: {},
                sidebar: {
                    isOpen: window.innerWidth > 768
                },
                theme: 'light'
            },
            
            // 투자 관련 상태
            investment: {
                availableBalance: 0,
                pendingOrders: [],
                watchlist: [],
                alerts: []
            },
            
            // 차트 상태
            charts: {
                timeframe: '24h',
                selectedCoin: null,
                indicators: [],
                drawings: []
            }
        };
    }

    // 상태 변경 메서드
    setState(path, value) {
        const oldState = JSON.parse(JSON.stringify(this.state));
        
        // 미들웨어 실행
        for (const middleware of this.middlewares) {
            const result = middleware(path, value, this.state);
            if (result === false) return; // 미들웨어에서 변경 차단
        }
        
        // 상태 업데이트
        this.setNestedValue(this.state, path, value);
        
        // 히스토리 저장
        this.addToHistory(oldState, path, value);
        
        // 리스너 알림
        this.notifyListeners(path, value, oldState);
        
        // 로컬 스토리지 저장
        this.saveToStorage();
        
        // 디버그 로그
        if (this.enableDebugMode) {
            console.log(`[StateManager] ${path}:`, value);
        }
    }

    // 상태 조회 메서드
    getState(path) {
        if (!path) return this.state;
        return this.getNestedValue(this.state, path);
    }

    // 구독 메서드
    subscribe(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }
        this.listeners.get(path).add(callback);
        
        // 구독 해제 함수 반환
        return () => {
            const pathListeners = this.listeners.get(path);
            if (pathListeners) {
                pathListeners.delete(callback);
                if (pathListeners.size === 0) {
                    this.listeners.delete(path);
                }
            }
        };
    }

    // 미들웨어 추가
    addMiddleware(middleware) {
        this.middlewares.push(middleware);
    }

    // 액션 디스패치 (Redux 스타일)
    dispatch(action) {
        if (typeof action === 'function') {
            // Thunk 액션
            return action(this.dispatch.bind(this), this.getState.bind(this));
        }
        
        switch (action.type) {
            case 'USER_LOGIN':
                this.handleUserLogin(action.payload);
                break;
                
            case 'USER_LOGOUT':
                this.handleUserLogout();
                break;
                
            case 'UPDATE_PORTFOLIO':
                this.handlePortfolioUpdate(action.payload);
                break;
                
            case 'UPDATE_MARKET_DATA':
                this.handleMarketDataUpdate(action.payload);
                break;
                
            case 'ADD_TRANSACTION':
                this.handleAddTransaction(action.payload);
                break;
                
            case 'SET_LOADING':
                this.setState('ui.isLoading', action.payload);
                break;
                
            case 'SHOW_NOTIFICATION':
                this.handleShowNotification(action.payload);
                break;
                
            case 'TOGGLE_SIDEBAR':
                this.setState('ui.sidebar.isOpen', !this.getState('ui.sidebar.isOpen'));
                break;
                
            case 'CHANGE_THEME':
                this.handleThemeChange(action.payload);
                break;
                
            default:
                console.warn(`[StateManager] Unknown action type: ${action.type}`);
        }
    }

    // 액션 핸들러들
    handleUserLogin(userData) {
        this.setState('user.isAuthenticated', true);
        this.setState('user.profile', userData);
        
        // 사용자 설정 복원
        if (userData.preferences) {
            this.setState('user.preferences', userData.preferences);
        }
        
        this.showNotification('로그인되었습니다.', 'success');
    }

    handleUserLogout() {
        this.setState('user.isAuthenticated', false);
        this.setState('user.profile', null);
        this.setState('portfolio', this.getInitialState().portfolio);
        this.clearStorage();
        this.showNotification('로그아웃되었습니다.', 'info');
    }

    handlePortfolioUpdate(portfolio) {
        this.setState('portfolio', portfolio);
        
        // 수익률 계산
        const profitRate = portfolio.totalInvested > 0 
            ? ((portfolio.totalValue - portfolio.totalInvested) / portfolio.totalInvested) * 100 
            : 0;
        
        this.setState('portfolio.profitRate', profitRate);
        this.setState('portfolio.totalProfit', portfolio.totalValue - portfolio.totalInvested);
    }

    handleMarketDataUpdate(marketData) {
        this.setState('market', {
            ...this.getState('market'),
            ...marketData,
            lastUpdated: new Date().toISOString()
        });
    }

    handleAddTransaction(transaction) {
        const transactions = [...this.getState('portfolio.transactions'), transaction];
        this.setState('portfolio.transactions', transactions);
        
        // 포트폴리오 재계산
        this.recalculatePortfolio();
    }

    handleShowNotification(notification) {
        const notifications = this.getState('ui.notifications');
        const newNotification = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...notification
        };
        
        this.setState('ui.notifications', [...notifications, newNotification]);
        
        // 자동 제거 (5초 후)
        setTimeout(() => {
            this.removeNotification(newNotification.id);
        }, 5000);
    }

    handleThemeChange(theme) {
        this.setState('ui.theme', theme);
        this.setState('user.preferences.theme', theme);
        
        // DOM에 적용
        document.documentElement.setAttribute('data-theme', theme);
        document.body.className = theme === 'dark' ? 'dark-theme' : '';
    }

    // 유틸리티 메서드들
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    getNestedValue(obj, path) {
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current === null || current === undefined || !(key in current)) {
                return undefined;
            }
            current = current[key];
        }
        
        return current;
    }

    notifyListeners(path, value, oldState) {
        // 정확한 경로 리스너
        const exactListeners = this.listeners.get(path);
        if (exactListeners) {
            exactListeners.forEach(callback => {
                callback(value, this.getNestedValue(oldState, path));
            });
        }
        
        // 부모 경로 리스너들
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            const parentListeners = this.listeners.get(parentPath);
            if (parentListeners) {
                parentListeners.forEach(callback => {
                    callback(this.getNestedValue(this.state, parentPath), 
                            this.getNestedValue(oldState, parentPath));
                });
            }
        }
        
        // 루트 리스너
        const rootListeners = this.listeners.get('*');
        if (rootListeners) {
            rootListeners.forEach(callback => {
                callback(this.state, oldState);
            });
        }
    }

    // 히스토리 관리
    addToHistory(oldState, path, value) {
        this.history.push({
            timestamp: Date.now(),
            path,
            oldValue: this.getNestedValue(oldState, path),
            newValue: value,
            state: JSON.parse(JSON.stringify(oldState))
        });
        
        // 히스토리 크기 제한
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    // 되돌리기
    undo() {
        if (this.history.length === 0) return false;
        
        const lastChange = this.history.pop();
        this.state = lastChange.state;
        this.notifyListeners('*', this.state, this.state);
        this.saveToStorage();
        
        return true;
    }

    // 스토리지 관리
    saveToStorage() {
        try {
            const stateToSave = {
                user: this.state.user,
                portfolio: this.state.portfolio,
                investment: this.state.investment,
                ui: {
                    theme: this.state.ui.theme,
                    sidebar: this.state.ui.sidebar
                }
            };
            
            localStorage.setItem('blockchain_app_state', JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('[StateManager] Failed to save state to localStorage:', error);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('blockchain_app_state');
            if (saved) {
                const parsedState = JSON.parse(saved);
                
                // 저장된 상태와 기본 상태 병합
                this.state = this.mergeStates(this.state, parsedState);
                
                // 테마 적용
                if (this.state.ui.theme) {
                    document.documentElement.setAttribute('data-theme', this.state.ui.theme);
                    document.body.className = this.state.ui.theme === 'dark' ? 'dark-theme' : '';
                }
            }
        } catch (error) {
            console.warn('[StateManager] Failed to load state from localStorage:', error);
        }
    }

    mergeStates(defaultState, savedState) {
        const merged = JSON.parse(JSON.stringify(defaultState));
        
        for (const key in savedState) {
            if (savedState[key] && typeof savedState[key] === 'object' && !Array.isArray(savedState[key])) {
                merged[key] = this.mergeStates(merged[key] || {}, savedState[key]);
            } else {
                merged[key] = savedState[key];
            }
        }
        
        return merged;
    }

    clearStorage() {
        localStorage.removeItem('blockchain_app_state');
    }

    // 헬퍼 메서드들
    showNotification(message, type = 'info') {
        this.handleShowNotification({ message, type });
    }

    removeNotification(id) {
        const notifications = this.getState('ui.notifications').filter(n => n.id !== id);
        this.setState('ui.notifications', notifications);
    }

    recalculatePortfolio() {
        const holdings = this.getState('portfolio.holdings');
        const marketData = this.getState('market.coins');
        
        let totalValue = 0;
        let totalInvested = 0;
        
        holdings.forEach(holding => {
            const coinData = marketData.find(coin => coin.id === holding.coinId);
            if (coinData) {
                totalValue += holding.amount * coinData.price;
            }
            totalInvested += holding.averagePrice * holding.amount;
        });
        
        this.setState('portfolio.totalValue', totalValue);
        this.setState('portfolio.totalInvested', totalInvested);
        
        const profitRate = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;
        this.setState('portfolio.profitRate', profitRate);
        this.setState('portfolio.totalProfit', totalValue - totalInvested);
    }

    // 개발용 디버깅 메서드
    getHistory() {
        return this.history;
    }

    enableDebug() {
        this.enableDebugMode = true;
        localStorage.setItem('debug_mode', 'true');
    }

    disableDebug() {
        this.enableDebugMode = false;
        localStorage.setItem('debug_mode', 'false');
    }

    reset() {
        this.state = this.getInitialState();
        this.history = [];
        this.clearStorage();
        this.notifyListeners('*', this.state, {});
    }
}

// 싱글톤 인스턴스 생성
const stateManager = new StateManager();

// 전역 접근을 위한 윈도우 객체에 추가 (개발용)
if (typeof window !== 'undefined') {
    window.stateManager = stateManager;
}

// 액션 생성자들
const actions = {
    // 사용자 액션
    login: (userData) => ({ type: 'USER_LOGIN', payload: userData }),
    logout: () => ({ type: 'USER_LOGOUT' }),
    
    // 포트폴리오 액션
    updatePortfolio: (portfolio) => ({ type: 'UPDATE_PORTFOLIO', payload: portfolio }),
    addTransaction: (transaction) => ({ type: 'ADD_TRANSACTION', payload: transaction }),
    
    // 시장 데이터 액션
    updateMarketData: (data) => ({ type: 'UPDATE_MARKET_DATA', payload: data }),
    
    // UI 액션
    setLoading: (loading) => ({ type: 'SET_LOADING', payload: loading }),
    showNotification: (notification) => ({ type: 'SHOW_NOTIFICATION', payload: notification }),
    toggleSidebar: () => ({ type: 'TOGGLE_SIDEBAR' }),
    changeTheme: (theme) => ({ type: 'CHANGE_THEME', payload: theme }),
    
    // 비동기 액션 (Thunk)
    fetchMarketData: () => async (dispatch, getState) => {
        dispatch(actions.setLoading(true));
        try {
            const response = await fetch('/api/market-data');
            const data = await response.json();
            dispatch(actions.updateMarketData(data));
        } catch (error) {
            dispatch(actions.showNotification({
                message: '시장 데이터를 가져오는데 실패했습니다.',
                type: 'error'
            }));
        } finally {
            dispatch(actions.setLoading(false));
        }
    }
};

export { stateManager, actions };