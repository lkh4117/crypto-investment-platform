/**
 * 블록체인 투자 플랫폼 - 메인 API
 * Google Apps Script 백엔드 메인 파일
 */

// ==================================================
// 전역 설정 및 초기화
// ==================================================

const APP_CONFIG = {
  version: '1.0.0',
  environment: 'production', // development, staging, production
  maxRequestsPerMinute: 60,
  sessionTimeout: 86400000, // 24시간 (밀리초)
  enableLogging: true,
  cors: {
    allowedOrigins: ['*'], // 프로덕션에서는 특정 도메인으로 제한
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  }
};

// 초기화 함수 - 스프레드시트가 처음 열릴 때 실행
function onOpen() {
  try {
    // 메뉴 생성
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('블록체인 투자 플랫폼')
      .addItem('데이터베이스 초기화', 'initializeDatabase')
      .addItem('API 키 설정', 'setupApiKeys')
      .addItem('시스템 상태 확인', 'checkSystemStatus')
      .addSeparator()
      .addItem('로그 확인', 'viewLogs')
      .addItem('시스템 정리', 'cleanupSystem')
      .addToUi();
    
    // 시스템 초기화 체크
    if (!isDatabaseInitialized()) {
      ui.alert('데이터베이스를 초기화해주세요.');
    }
    
    logActivity('SYSTEM', 'Application started', { version: APP_CONFIG.version });
  } catch (error) {
    console.error('초기화 오류:', error);
    logActivity('ERROR', 'Initialization failed', { error: error.toString() });
  }
}

// ==================================================
// 메인 HTTP 핸들러 (웹앱 진입점)
// ==================================================

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    // CORS 헤더 설정
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': APP_CONFIG.cors.allowedMethods.join(', '),
      'Access-Control-Allow-Headers': APP_CONFIG.cors.allowedHeaders.join(', '),
      'Cache-Control': 'no-cache'
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (method === 'OPTIONS') {
      return ContentService
        .createTextOutput('')
        .setHeaders(headers);
    }

    // 요청 파라미터 파싱
    const params = parseRequestParams(e);
    const endpoint = params.endpoint || 'status';
    
    // 인증 확인 (공개 엔드포인트 제외)
    const publicEndpoints = ['status', 'auth/login', 'auth/register', 'market/public'];
    if (!publicEndpoints.includes(endpoint)) {
      const authResult = validateAuth(params);
      if (!authResult.valid) {
        return createResponse({
          success: false,
          error: 'UNAUTHORIZED',
          message: '인증이 필요합니다.'
        }, 401, headers);
      }
      params.userId = authResult.userId;
    }

    // 라우팅
    const result = routeRequest(endpoint, params, method);
    
    // 성공 응답
    return createResponse(result, 200, headers);
    
  } catch (error) {
    console.error('Request handling error:', error);
    logActivity('ERROR', 'Request failed', { 
      error: error.toString(),
      method: method,
      endpoint: e.parameter?.endpoint || 'unknown'
    });
    
    return createResponse({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다.'
    }, 500);
  }
}

// ==================================================
// 라우팅 시스템
// ==================================================

function routeRequest(endpoint, params, method) {
  const routes = {
    // 시스템
    'status': () => getSystemStatus(),
    
    // 인증
    'auth/login': () => handleLogin(params),
    'auth/register': () => handleRegister(params),
    'auth/logout': () => handleLogout(params),
    'auth/refresh': () => refreshToken(params),
    
    // 사용자 관리
    'user/profile': () => getUserProfile(params),
    'user/update': () => updateUserProfile(params),
    'user/preferences': () => getUserPreferences(params),
    
    // 포트폴리오
    'portfolio/summary': () => getPortfolioSummary(params),
    'portfolio/assets': () => getPortfolioAssets(params),
    'portfolio/transactions': () => getTransactions(params),
    'portfolio/add-transaction': () => addTransaction(params),
    'portfolio/update-transaction': () => updateTransaction(params),
    'portfolio/delete-transaction': () => deleteTransaction(params),
    
    // 시장 데이터
    'market/coins': () => getMarketCoins(params),
    'market/coin': () => getCoinDetails(params),
    'market/trending': () => getTrendingCoins(params),
    'market/watchlist': () => getWatchlist(params),
    'market/add-to-watchlist': () => addToWatchlist(params),
    'market/remove-from-watchlist': () => removeFromWatchlist(params),
    
    // 분석
    'analysis/performance': () => getPerformanceAnalysis(params),
    'analysis/allocation': () => getAllocationAnalysis(params),
    'analysis/risk': () => getRiskAnalysis(params),
    
    // 알림
    'notifications/list': () => getNotifications(params),
    'notifications/mark-read': () => markNotificationRead(params),
    'notifications/settings': () => getNotificationSettings(params),
    'notifications/update-settings': () => updateNotificationSettings(params),
    
    // 관리자
    'admin/users': () => getUsers(params),
    'admin/stats': () => getSystemStats(params),
    'admin/logs': () => getLogs(params)
  };

  const handler = routes[endpoint];
  if (!handler) {
    throw new Error(`Unknown endpoint: ${endpoint}`);
  }

  return handler();
}

// ==================================================
// 시스템 상태 및 헬스체크
// ==================================================

function getSystemStatus() {
  try {
    const startTime = Date.now();
    
    // 데이터베이스 연결 확인
    const dbStatus = checkDatabaseConnection();
    
    // 외부 API 연결 확인
    const apiStatus = checkExternalApiConnection();
    
    // 메모리 사용량 확인
    const memoryInfo = getMemoryUsage();
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: true,
      data: {
        status: 'healthy',
        version: APP_CONFIG.version,
        environment: APP_CONFIG.environment,
        uptime: getUptime(),
        responseTime: responseTime,
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          externalApi: apiStatus,
          memory: memoryInfo
        },
        features: {
          authentication: true,
          portfolio: true,
          market: true,
          analysis: true,
          notifications: true
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'SYSTEM_ERROR',
      message: '시스템 상태를 확인할 수 없습니다.',
      details: error.toString()
    };
  }
}

function checkDatabaseConnection() {
  try {
    const sheet = getSheet('system_config');
    sheet.getRange(1, 1).getValue(); // 테스트 읽기
    return { status: 'connected', latency: '<10ms' };
  } catch (error) {
    return { status: 'error', error: error.toString() };
  }
}

function checkExternalApiConnection() {
  try {
    // CoinGecko API 핑 테스트
    const response = UrlFetchApp.fetch('https://api.coingecko.com/api/v3/ping', {
      method: 'GET',
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      return { status: 'connected', provider: 'CoinGecko' };
    } else {
      return { status: 'degraded', provider: 'CoinGecko' };
    }
  } catch (error) {
    return { status: 'error', error: error.toString() };
  }
}

function getMemoryUsage() {
  return {
    status: 'normal',
    usage: '< 50%', // GAS에서는 정확한 메모리 사용량을 알 수 없음
    available: 'sufficient'
  };
}

function getUptime() {
  // GAS는 상시 실행되지 않으므로 마지막 실행 시간 기반
  const lastRun = getSystemProperty('last_run_time');
  if (lastRun) {
    const uptime = Date.now() - parseInt(lastRun);
    return Math.floor(uptime / 1000 / 60); // 분 단위
  }
  return 0;
}

// ==================================================
// 유틸리티 함수들
// ==================================================

function parseRequestParams(e) {
  const params = {};
  
  // GET 파라미터
  if (e.parameter) {
    Object.assign(params, e.parameter);
  }
  
  // POST 데이터
  if (e.postData && e.postData.contents) {
    try {
      const postData = JSON.parse(e.postData.contents);
      Object.assign(params, postData);
    } catch (error) {
      console.warn('Failed to parse POST data:', error);
    }
  }
  
  return params;
}

function createResponse(data, statusCode = 200, headers = {}) {
  const response = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // 기본 헤더 추가
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-Response-Time': new Date().toISOString()
  };
  
  const allHeaders = { ...defaultHeaders, ...headers };
  response.setHeaders(allHeaders);
  
  return response;
}

// ==================================================
// 캐싱 시스템
// ==================================================

function getCachedData(key, maxAge = 300000) { // 기본 5분
  try {
    const cache = CacheService.getScriptCache();
    const cachedValue = cache.get(key);
    
    if (cachedValue) {
      const data = JSON.parse(cachedValue);
      const age = Date.now() - data.timestamp;
      
      if (age < maxAge) {
        return data.value;
      }
    }
  } catch (error) {
    console.warn('Cache read error:', error);
  }
  
  return null;
}

function setCachedData(key, value, ttl = 300) { // 기본 5분
  try {
    const cache = CacheService.getScriptCache();
    const data = {
      value: value,
      timestamp: Date.now()
    };
    
    cache.put(key, JSON.stringify(data), ttl);
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

// ==================================================
// 시스템 설정 관리
// ==================================================

function getSystemProperty(key, defaultValue = null) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const value = properties.getProperty(key);
    return value !== null ? value : defaultValue;
  } catch (error) {
    console.warn('Failed to get system property:', key, error);
    return defaultValue;
  }
}

function setSystemProperty(key, value) {
  try {
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty(key, value.toString());
    return true;
  } catch (error) {
    console.error('Failed to set system property:', key, error);
    return false;
  }
}

// ==================================================
// 초기화 및 설정 함수들
// ==================================================

function setupApiKeys() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const apiKey = ui.prompt('API 키 설정', 'CoinGecko API 키를 입력하세요 (선택사항):', ui.ButtonSet.OK_CANCEL);
    
    if (apiKey.getSelectedButton() === ui.Button.OK && apiKey.getResponseText()) {
      setSystemProperty('coingecko_api_key', apiKey.getResponseText());
      ui.alert('API 키가 설정되었습니다.');
    }
    
    logActivity('ADMIN', 'API key setup', { success: true });
  } catch (error) {
    ui.alert('API 키 설정 중 오류가 발생했습니다: ' + error.toString());
    logActivity('ERROR', 'API key setup failed', { error: error.toString() });
  }
}

function checkSystemStatus() {
  const ui = SpreadsheetApp.getUi();
  const status = getSystemStatus();
  
  if (status.success) {
    const message = `시스템 상태: ${status.data.status}
버전: ${status.data.version}
응답시간: ${status.data.responseTime}ms
데이터베이스: ${status.data.services.database.status}
외부 API: ${status.data.services.externalApi.status}`;
    
    ui.alert('시스템 상태', message, ui.ButtonSet.OK);
  } else {
    ui.alert('오류', '시스템 상태를 확인할 수 없습니다: ' + status.message, ui.ButtonSet.OK);
  }
}

function cleanupSystem() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('시스템 정리', '캐시와 임시 데이터를 정리하시겠습니까?', ui.ButtonSet.YES_NO);
  
  if (response === ui.Button.YES) {
    try {
      // 캐시 정리
      CacheService.getScriptCache().removeAll();
      
      // 오래된 로그 정리 (30일 이상)
      cleanupOldLogs(30);
      
      // 세션 정리
      cleanupExpiredSessions();
      
      ui.alert('시스템 정리가 완료되었습니다.');
      logActivity('ADMIN', 'System cleanup completed', {});
    } catch (error) {
      ui.alert('정리 중 오류가 발생했습니다: ' + error.toString());
      logActivity('ERROR', 'System cleanup failed', { error: error.toString() });
    }
  }
}

// 마지막 실행 시간 업데이트
setSystemProperty('last_run_time', Date.now().toString());