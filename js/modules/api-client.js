/**
 * GitHub Pages용 API 클라이언트
 * Google Apps Script 백엔드와 통신
 */

// ===== 설정 =====
const API_CONFIG = {
    // 여기에 GAS 웹앱 URL을 입력하세요
    BASE_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3
};

// ===== 유틸리티 함수 =====
function getBaseURL() {
    return API_CONFIG.BASE_URL;
}

// 로컬 스토리지에서 토큰 관리
function getAuthToken() {
    return localStorage.getItem('auth_token');
}

function setAuthToken(token) {
    if (token) {
        localStorage.setItem('auth_token', token);
    } else {
        localStorage.removeItem('auth_token');
    }
}

// API 요청 함수 (재시도 로직 포함)
async function makeApiRequest(action, data = {}, method = 'POST') {
    const url = getBaseURL();
    let lastError;
    
    for (let attempt = 1; attempt <= API_CONFIG.RETRY_ATTEMPTS; attempt++) {
        try {
            const requestData = { action, ...data };
            
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: method === 'POST' ? JSON.stringify(requestData) : null
            };
            
            // GET 요청인 경우 URL 파라미터로 전송
            const requestUrl = method === 'GET' 
                ? `${url}?${new URLSearchParams(requestData).toString()}`
                : url;
            
            console.log(`API 요청 시도 ${attempt}:`, { action, url: requestUrl });
            
            const response = await fetch(requestUrl, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            console.log('API 응답:', result);
            
            if (result.success === false && result.error) {
                throw new Error(result.error);
            }
            
            return result;
            
        } catch (error) {
            lastError = error;
            console.warn(`API 요청 실패 (시도 ${attempt}/${API_CONFIG.RETRY_ATTEMPTS}):`, error);
            
            if (attempt < API_CONFIG.RETRY_ATTEMPTS) {
                // 지수적 백오프
                const delay = Math.pow(2, attempt - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    console.error('모든 API 요청 시도 실패:', lastError);
    throw new Error(`API 요청 실패: ${lastError.message}`);
}

// ===== 인증 API =====
const AuthAPI = {
    async register(email, password, name) {
        try {
            const response = await makeApiRequest('register', {
                email: email,
                password: password,
                name: name
            });
            
            if (response.success && response.data && response.data.token) {
                setAuthToken(response.data.token);
                return response.data;
            }
            
            throw new Error(response.message || '회원가입에 실패했습니다.');
        } catch (error) {
            console.error('회원가입 오류:', error);
            throw error;
        }
    },
    
    async login(email, password) {
        try {
            const response = await makeApiRequest('login', {
                email: email,
                password: password
            });
            
            if (response.success && response.data && response.data.token) {
                setAuthToken(response.data.token);
                return response.data;
            }
            
            throw new Error(response.message || '로그인에 실패했습니다.');
        } catch (error) {
            console.error('로그인 오류:', error);
            throw error;
        }
    },
    
    async logout() {
        try {
            const token = getAuthToken();
            if (token) {
                await makeApiRequest('logout', { token });
            }
            setAuthToken(null);
            return true;
        } catch (error) {
            console.error('로그아웃 오류:', error);
            // 로그아웃은 로컬에서도 처리
            setAuthToken(null);
            throw error;
        }
    },
    
    async verifyToken() {
        try {
            const token = getAuthToken();
            if (!token) {
                return null;
            }
            
            const response = await makeApiRequest('verify-token', { token });
            
            if (response.success && response.data) {
                return response.data;
            }
            
            // 토큰이 유효하지 않으면 제거
            setAuthToken(null);
            return null;
        } catch (error) {
            console.error('토큰 검증 오류:', error);
            setAuthToken(null);
            return null;
        }
    }
};

// ===== 포트폴리오 API =====
const PortfolioAPI = {
    async create(name, description = '') {
        try {
            const user = await AuthAPI.verifyToken();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }
            
            const response = await makeApiRequest('create-portfolio', {
                userId: user.user_id,
                name: name,
                description: description
            });
            
            if (response.success) {
                return response.data;
            }
            
            throw new Error(response.message || '포트폴리오 생성에 실패했습니다.');
        } catch (error) {
            console.error('포트폴리오 생성 오류:', error);
            throw error;
        }
    },
    
    async getList() {
        try {
            const user = await AuthAPI.verifyToken();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }
            
            const response = await makeApiRequest('get-portfolios', {
                userId: user.user_id
            });
            
            if (response.success) {
                return response.data || [];
            }
            
            throw new Error(response.message || '포트폴리오 목록 조회에 실패했습니다.');
        } catch (error) {
            console.error('포트폴리오 목록 조회 오류:', error);
            throw error;
        }
    },
    
    async getDetails(portfolioId) {
        try {
            const response = await makeApiRequest('get-portfolio', {
                portfolioId: portfolioId
            });
            
            if (response.success) {
                return response.data;
            }
            
            throw new Error(response.message || '포트폴리오 조회에 실패했습니다.');
        } catch (error) {
            console.error('포트폴리오 조회 오류:', error);
            throw error;
        }
    },
    
    async update(portfolioId, updates) {
        try {
            const response = await makeApiRequest('update-portfolio', {
                portfolioId: portfolioId,
                updates: updates
            });
            
            if (response.success) {
                return response.data;
            }
            
            throw new Error(response.message || '포트폴리오 업데이트에 실패했습니다.');
        } catch (error) {
            console.error('포트폴리오 업데이트 오류:', error);
            throw error;
        }
    },
    
    async delete(portfolioId) {
        try {
            const user = await AuthAPI.verifyToken();
            if (!user) {
                throw new Error('로그인이 필요합니다.');
            }
            
            const response = await makeApiRequest('delete-portfolio', {
                portfolioId: portfolioId,
                userId: user.user_id
            });
            
            if (response.success) {
                return true;
            }
            
            throw new Error(response.message || '포트폴리오 삭제에 실패했습니다.');
        } catch (error) {
            console.error('포트폴리오 삭제 오류:', error);
            throw error;
        }
    }
};

// ===== 거래 API =====
const TransactionAPI = {
    async add(portfolioId, type, coinId, amount, price, date = new Date()) {
        try {
            const response = await makeApiRequest('add-transaction', {
                portfolioId: portfolioId,
                type: type,
                coinId: coinId,
                amount: parseFloat(amount),
                price: parseFloat(price),
                date: date.getTime()
            });
            
            if (response.success) {
                return response.data;
            }
            
            throw new Error(response.message || '거래 추가에 실패했습니다.');
        } catch (error) {
            console.error('거래 추가 오류:', error);
            throw error;
        }
    },
    
    async getList(portfolioId) {
        try {
            const response = await makeApiRequest('get-transactions', {
                portfolioId: portfolioId
            });
            
            if (response.success) {
                return response.data || [];
            }
            
            throw new Error(response.message || '거래 목록 조회에 실패했습니다.');
        } catch (error) {
            console.error('거래 목록 조회 오류:', error);
            throw error;
        }
    }
};

// ===== 시세 API =====
const PriceAPI = {
    async getCryptoPrices(coinIds = ['bitcoin', 'ethereum', 'cardano', 'polkadot', 'chainlink']) {
        try {
            const response = await makeApiRequest('get-crypto-prices', {
                coinIds: coinIds
            });
            
            if (response.success) {
                return response.data || {};
            }
            
            throw new Error(response.message || '시세 조회에 실패했습니다.');
        } catch (error) {
            console.error('시세 조회 오류:', error);
            throw error;
        }
    }
};

// ===== 시스템 API =====
const SystemAPI = {
    async healthCheck() {
        try {
            const response = await makeApiRequest('health-check', {}, 'GET');
            return response.data || {};
        } catch (error) {
            console.error('헬스체크 오류:', error);
            return { performance: 'poor', error: error.message };
        }
    }
};

// ===== 에러 처리 및 알림 =====
function showError(message, error = null) {
    console.error('애플리케이션 오류:', message, error);
    
    // 사용자에게 친화적인 메시지 표시
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // 5초 후 자동 숨김
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

function showSuccess(message) {
    console.log('성공:', message);
    
    const successElement = document.getElementById('success-message');
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 3000);
    }
}

// ===== 초기화 및 테스트 =====
async function testApiConnection() {
    try {
        console.log('API 연결 테스트 시작...');
        const health = await SystemAPI.healthCheck();
        console.log('API 연결 성공:', health);
        return true;
    } catch (error) {
        console.error('API 연결 실패:', error);
        showError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
        return false;
    }
}

// 페이지 로드 시 자동 실행
document.addEventListener('DOMContentLoaded', async () => {
    console.log('API 클라이언트 초기화됨');
    
    // API 연결 테스트
    const connected = await testApiConnection();
    
    if (connected) {
        // 자동 로그인 체크
        const user = await AuthAPI.verifyToken();
        if (user) {
            console.log('자동 로그인 성공:', user);
            // 사용자 정보 업데이트 등의 로직
        }
    }
});

// 전역으로 API 객체들 내보내기
window.AuthAPI = AuthAPI;
window.PortfolioAPI = PortfolioAPI;
window.TransactionAPI = TransactionAPI;
window.PriceAPI = PriceAPI;
window.SystemAPI = SystemAPI;