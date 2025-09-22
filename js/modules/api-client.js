/**
 * API 클라이언트 모듈
 * 백엔드 API와의 통신을 담당
 */

import { stateManager, actions } from './state-manager.js';

class APIClient {
    constructor() {
        // API 설정
        this.baseURL = this.getBaseURL();
        this.timeout = 15000; // 15초 타임아웃
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1초
        
        // 요청 인터셉터
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // 인증 토큰
        this.authToken = localStorage.getItem('auth_token');
        
        // 요청 큐 및 레이트 리미팅
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.maxConcurrentRequests = 5;
        this.activeRequests = 0;
        
        this.initializeInterceptors();
        
        console.log('[APIClient] API 클라이언트 초기화 완료');
    }

    // 베이스 URL 결정
    getBaseURL() {
        // 환경에 따른 API URL 설정
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // 개발 환경 - Google Apps Script URL
            return 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
        } else {
            // 프로덕션 환경
            return 'https://script.google.com/macros/s/YOUR_PRODUCTION_SCRIPT_ID/exec';
        }
    }

    // 인터셉터 초기화
    initializeInterceptors() {
        // 요청 인터셉터 - 인증 헤더 추가
        this.addRequestInterceptor((config) => {
            if (this.authToken) {
                config.headers = {
                    ...config.headers,
                    'Authorization': `Bearer ${this.authToken}`
                };
            }
            
            // 기본 헤더
            config.headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...config.headers
            };
            
            return config;
        });

        // 응답 인터셉터 - 에러 처리
        this.addResponseInterceptor(
            (response) => response,
            (error) => this.handleResponseError(error)
        );
    }

    // 인터셉터 추가 메서드
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    addResponseInterceptor(successInterceptor, errorInterceptor) {
        this.responseInterceptors.push({ success: successInterceptor, error: errorInterceptor });
    }

    // 기본 HTTP 메서드들
    async get(endpoint, params = {}, options = {}) {
        const url = this.buildURL(endpoint, params);
        return this.request('GET', url, null, options);
    }

    async post(endpoint, data = null, options = {}) {
        const url = this.buildURL(endpoint);
        return this.request('POST', url, data, options);
    }

    async put(endpoint, data = null, options = {}) {
        const url = this.buildURL(endpoint);
        return this.request('PUT', url, data, options);
    }

    async delete(endpoint, options = {}) {
        const url = this.buildURL(endpoint);
        return this.request('DELETE', url, null, options);
    }

    // 메인 요청 메서드
    async request(method, url, data = null, options = {}) {
        const config = {
            method,
            url,
            data,
            timeout: this.timeout,
            retryAttempts: this.retryAttempts,
            ...options
        };

        // 요청 인터셉터 적용
        for (const interceptor of this.requestInterceptors) {
            config.headers = config.headers || {};
            const result = interceptor(config);
            if (result) Object.assign(config, result);
        }

        return this.executeRequest(config);
    }

    // 실제 요청 실행
    async executeRequest(config) {
        return new Promise((resolve, reject) => {
            // 요청 큐에 추가
            this.requestQueue.push({ config, resolve, reject });
            this.processQueue();
        });
    }

    // 요청 큐 처리
    async processQueue() {
        if (this.isProcessingQueue || this.activeRequests >= this.maxConcurrentRequests) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
            const { config, resolve, reject } = this.requestQueue.shift();
            this.activeRequests++;
            
            this.performRequest(config)
                .then(resolve)
                .catch(reject)
                .finally(() => {
                    this.activeRequests--;
                    if (this.requestQueue.length > 0) {
                        setTimeout(() => this.processQueue(), 100);
                    }
                });
        }

        this.isProcessingQueue = false;
    }

    // HTTP 요청 수행
    async performRequest(config) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
            try {
                stateManager.dispatch(actions.setLoading(true));
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);
                
                const fetchOptions = {
                    method: config.method,
                    headers: config.headers,
                    signal: controller.signal
                };
                
                if (config.data && config.method !== 'GET') {
                    fetchOptions.body = JSON.stringify(config.data);
                }
                
                const response = await fetch(config.url, fetchOptions);
                clearTimeout(timeoutId);
                
                // 응답 처리
                let responseData;
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('application/json')) {
                    responseData = await response.json();
                } else {
                    responseData = await response.text();
                }
                
                const result = {
                    data: responseData,
                    status: response.status,
                    statusText: response.statusText,
                    headers: this.parseHeaders(response.headers)
                };
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // 응답 인터셉터 적용 (성공)
                for (const interceptor of this.responseInterceptors) {
                    if (interceptor.success) {
                        const interceptedResult = interceptor.success(result);
                        if (interceptedResult) Object.assign(result, interceptedResult);
                    }
                }
                
                return result;
                
            } catch (error) {
                lastError = error;
                
                // 응답 인터셉터 적용 (에러)
                for (const interceptor of this.responseInterceptors) {
                    if (interceptor.error) {
                        const interceptedError = await interceptor.error(error);
                        if (interceptedError) lastError = interceptedError;
                    }
                }
                
                // 재시도 조건 확인
                if (attempt < config.retryAttempts && this.shouldRetry(error)) {
                    console.warn(`[APIClient] 요청 실패, 재시도 ${attempt}/${config.retryAttempts}:`, error.message);
                    await this.delay(this.retryDelay * attempt);
                    continue;
                }
                
                break;
            } finally {
                stateManager.dispatch(actions.setLoading(false));
            }
        }
        
        throw lastError;
    }

    // API 엔드포인트별 메서드들

    // 사용자 관련 API
    async login(credentials) {
        try {
            const response = await this.post('/auth/login', credentials);
            
            if (response.data.token) {
                this.setAuthToken(response.data.token);
                localStorage.setItem('auth_token', response.data.token);
            }
            
            return response.data;
        } catch (error) {
            console.error('[APIClient] 로그인 오류:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            const response = await this.post('/auth/register', userData);
            return response.data;
        } catch (error) {
            console.error('[APIClient] 회원가입 오류:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await this.post('/auth/logout');
            this.clearAuthToken();
            localStorage.removeItem('auth_token');
        } catch (error) {
            console.error('[APIClient] 로그아웃 오류:', error);
            // 로그아웃은 로컬에서도 처리
            this.clearAuthToken();
            localStorage.removeItem('auth_token');
        }
    }

    async getUserProfile() {
        try {
            const response = await this.get('/user/profile');
            return response.data;
        } catch (error) {
            console.error('[APIClient] 프로필 조회 오류:', error);
            throw error;
        }
    }

    async updateUserProfile(profileData) {
        try {
            const response = await this.put('/user/profile', profileData);
            return response.data;
        } catch (error) {
            console.error('[APIClient] 프로필 업데이트 오류:', error);
            throw error;
        }
    }

    // 포트폴리오 관련 API
    async getPortfolio() {
        try {
            const response = await this.get('/portfolio');
            return response.data;
        } catch (error) {
            console.error('[APIClient] 포트폴리오 조회 오류:', error);
            throw error;
        }
    }

    async updatePortfolio(portfolioData) {
        try {
            const response = await this.put('/portfolio', portfolioData);
            return response.data;
        } catch (error) {
            console.error('[APIClient] 포트폴리오 업데이트 오류:', error);
            throw error;
        }
    }

    async getTransactions(page = 1, limit = 50) {
        try {
            const response = await this.get('/transactions', { page, limit });
            return response.data;
        } catch (error) {
            console.error('[APIClient] 거래내역 조회 오류:', error);
            throw error;
        }
    }

    async addTransaction(transactionData) {
        try {
            const response = await this.post('/transactions', transactionData);
            return response.data;
        } catch (error) {
            console.error('[APIClient] 거래 추가 오류:', error);
            throw error;
        }
    }

    async deleteTransaction(transactionId) {
        try {
            const response = await this.delete(`/transactions/${transactionId}`);
            return response.data;
        } catch (error) {
            console.error('[APIClient] 거래 삭제 오류:', error);
            throw error;
        }
    }

    // 시장 데이터 관련 API (백엔드 캐싱용)
    async getMarketData(symbols = [], currency = 'KRW') {
        try {
            const response = await this.get('/market/data', { symbols: symbols.join(','), currency });
            return response.data;
        } catch (error) {
            console.error('[APIClient] 시장 데이터 조회 오류:', error);
            throw error;
        }
    }

    async getPriceHistory(symbol, days = 30, currency = 'KRW') {
        try {
            const response = await this.get(`/market/history/${symbol}`, { days, currency });
            return response.data;
        } catch (error) {
            console.error('[APIClient] 가격 히스토리 조회 오류:', error);
            throw error;
        }
    }

    // 알림 관련 API
    async getAlerts() {
        try {
            const response = await this.get('/alerts');
            return response.data;
        } catch (error) {
            console.error('[APIClient] 알림 조회 오류:', error);
            throw error;
        }
    }

    async createAlert(alertData) {
        try {
            const response = await this.post('/alerts', alertData);
            return response.data;
        } catch (error) {
            console.error('[APIClient] 알림 생성 오류:', error);
            throw error;
        }
    }

    async deleteAlert(alertId) {
        try {
            const response = await this.delete(`/alerts/${alertId}`);
            return response.data;
        } catch (error) {
            console.error('[APIClient] 알림 삭제 오류:', error);
            throw error;
        }
    }

    // 관심목록 관련 API
    async getWatchlist() {
        try {
            const response = await this.get('/watchlist');
            return response.data;
        } catch (error) {
            console.error('[APIClient] 관심목록 조회 오류:', error);
            throw error;
        }
    }

    async addToWatchlist(coinId) {
        try {
            const response = await this.post('/watchlist', { coinId });
            return response.data;
        } catch (error) {
            console.error('[APIClient] 관심목록 추가 오류:', error);
            throw error;
        }
    }

    async removeFromWatchlist(coinId) {
        try {
            const response = await this.delete(`/watchlist/${coinId}`);
            return response.data;
        } catch (error) {
            console.error('[APIClient] 관심목록 제거 오류:', error);
            throw error;
        }
    }

    // 유틸리티 메서드들
    buildURL(endpoint, params = {}) {
        const url = new URL(endpoint, this.baseURL);
        
        // 쿼리 파라미터 추가
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });
        
        return url.toString();
    }

    parseHeaders(headers) {
        const parsed = {};
        headers.forEach((value, key) => {
            parsed[key] = value;
        });
        return parsed;
    }

    setAuthToken(token) {
        this.authToken = token;
    }

    clearAuthToken() {
        this.authToken = null;
    }

    // 재시도 조건 확인
    shouldRetry(error) {
        // 네트워크 오류나 서버 오류인 경우 재시도
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return true;
        }
        
        // 5xx 서버 오류인 경우 재시도
        if (error.message.includes('HTTP 5')) {
            return true;
        }
        
        // 429 (Too Many Requests) 오류인 경우 재시도
        if (error.message.includes('HTTP 429')) {
            return true;
        }
        
        // 408 (Request Timeout) 오류인 경우 재시도
        if (error.message.includes('HTTP 408')) {
            return true;
        }
        
        return false;
    }

    // 응답 에러 처리
    async handleResponseError(error) {
        console.error('[APIClient] API 오류:', error);
        
        // 401 인증 오류 처리
        if (error.message.includes('HTTP 401')) {
            this.clearAuthToken();
            localStorage.removeItem('auth_token');
            
            stateManager.dispatch(actions.logout());
            stateManager.dispatch(actions.showNotification({
                message: '인증이 만료되었습니다. 다시 로그인해주세요.',
                type: 'error'
            }));
            
            // 로그인 페이지로 리다이렉트
            window.location.href = '#/login';
        }
        
        // 403 권한 오류 처리
        if (error.message.includes('HTTP 403')) {
            stateManager.dispatch(actions.showNotification({
                message: '접근 권한이 없습니다.',
                type: 'error'
            }));
        }
        
        // 404 리소스 없음 처리
        if (error.message.includes('HTTP 404')) {
            stateManager.dispatch(actions.showNotification({
                message: '요청한 데이터를 찾을 수 없습니다.',
                type: 'error'
            }));
        }
        
        // 네트워크 오류 처리
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            stateManager.dispatch(actions.showNotification({
                message: '네트워크 연결을 확인해주세요.',
                type: 'error'
            }));
        }
        
        return error;
    }

    // 지연 함수
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 연결 상태 확인
    async checkConnection() {
        try {
            const response = await this.get('/health', {}, { retryAttempts: 1 });
            return response.status === 200;
        } catch (error) {
            console.warn('[APIClient] 연결 확인 실패:', error);
            return false;
        }
    }

    // 배치 요청 처리
    async batchRequest(requests) {
        try {
            const response = await this.post('/batch', { requests });
            return response.data;
        } catch (error) {
            console.error('[APIClient] 배치 요청 오류:', error);
            
            // 개별 요청으로 fallback
            const results = [];
            for (const request of requests) {
                try {
                    const result = await this.request(
                        request.method, 
                        request.endpoint, 
                        request.data, 
                        request.options
                    );
                    results.push({ success: true, data: result.data });
                } catch (individualError) {
                    results.push({ success: false, error: individualError.message });
                }
            }
            return results;
        }
    }

    // 파일 업로드
    async uploadFile(file, endpoint = '/upload') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(this.buildURL(endpoint), {
                method: 'POST',
                headers: {
                    'Authorization': this.authToken ? `Bearer ${this.authToken}` : undefined
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('[APIClient] 파일 업로드 오류:', error);
            throw error;
        }
    }

    // 파일 다운로드
    async downloadFile(fileId, filename) {
        try {
            const response = await fetch(this.buildURL(`/download/${fileId}`), {
                method: 'GET',
                headers: {
                    'Authorization': this.authToken ? `Bearer ${this.authToken}` : undefined
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            // 다운로드 트리거
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            return true;
            
        } catch (error) {
            console.error('[APIClient] 파일 다운로드 오류:', error);
            throw error;
        }
    }

    // 캐시 관리
    clearCache() {
        // 서버 캐시 클리어 요청
        this.post('/cache/clear').catch(error => {
            console.warn('[APIClient] 서버 캐시 클리어 실패:', error);
        });
    }

    // 통계 및 분석 API
    async getAnalytics(period = '30d') {
        try {
            const response = await this.get('/analytics', { period });
            return response.data;
        } catch (error) {
            console.error('[APIClient] 분석 데이터 조회 오류:', error);
            throw error;
        }
    }

    async getPerformanceReport(startDate, endDate) {
        try {
            const response = await this.get('/reports/performance', {
                start_date: startDate,
                end_date: endDate
            });
            return response.data;
        } catch (error) {
            console.error('[APIClient] 성과 보고서 조회 오류:', error);
            throw error;
        }
    }

    // 백업 및 복원 API
    async backupData() {
        try {
            const response = await this.get('/backup');
            return response.data;
        } catch (error) {
            console.error('[APIClient] 데이터 백업 오류:', error);
            throw error;
        }
    }

    async restoreData(backupData) {
        try {
            const response = await this.post('/restore', backupData);
            return response.data;
        } catch (error) {
            console.error('[APIClient] 데이터 복원 오류:', error);
            throw error;
        }
    }

    // API 상태 및 모니터링
    getStatus() {
        return {
            isOnline: navigator.onLine,
            activeRequests: this.activeRequests,
            queuedRequests: this.requestQueue.length,
            hasAuthToken: !!this.authToken,
            baseURL: this.baseURL
        };
    }

    // 디버그 및 로깅
    enableDebugMode() {
        this.debugMode = true;
        console.log('[APIClient] 디버그 모드 활성화');
    }

    disableDebugMode() {
        this.debugMode = false;
        console.log('[APIClient] 디버그 모드 비활성화');
    }

    // 정리 메서드
    destroy() {
        // 진행 중인 요청들 취소
        this.requestQueue.length = 0;
        this.requestInterceptors.length = 0;
        this.responseInterceptors.length = 0;
        
        console.log('[APIClient] API 클라이언트 정리 완료');
    }
}

// Google Apps Script 특화 API 클라이언트
class GASAPIClient extends APIClient {
    constructor() {
        super();
        this.gasSpecificHeaders = {
            'Content-Type': 'text/plain;charset=utf-8'
        };
    }

    // Google Apps Script에 최적화된 요청 메서드
    async gasRequest(action, data = {}) {
        try {
            const requestData = {
                action,
                data,
                timestamp: Date.now()
            };

            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                    ...this.gasSpecificHeaders
                },
                body: JSON.stringify(requestData),
                redirect: 'follow'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const responseData = await response.json();
            
            if (responseData.error) {
                throw new Error(responseData.error);
            }

            return responseData.result;

        } catch (error) {
            console.error(`[GASAPIClient] ${action} 요청 오류:`, error);
            throw error;
        }
    }

    // GAS 액션별 메서드들
    async gasLogin(credentials) {
        return this.gasRequest('login', credentials);
    }

    async gasGetPortfolio() {
        return this.gasRequest('getPortfolio');
    }

    async gasUpdatePortfolio(portfolioData) {
        return this.gasRequest('updatePortfolio', portfolioData);
    }

    async gasAddTransaction(transactionData) {
        return this.gasRequest('addTransaction', transactionData);
    }

    async gasGetTransactions(page = 1, limit = 50) {
        return this.gasRequest('getTransactions', { page, limit });
    }

    async gasGetMarketData(symbols = []) {
        return this.gasRequest('getMarketData', { symbols });
    }
}

// 싱글톤 인스턴스 생성
const apiClient = new APIClient();
const gasApiClient = new GASAPIClient();

// 전역 접근을 위한 윈도우 객체에 추가 (개발용)
if (typeof window !== 'undefined') {
    window.apiClient = apiClient;
    window.gasApiClient = gasApiClient;
}

export { apiClient, gasApiClient, APIClient, GASAPIClient };