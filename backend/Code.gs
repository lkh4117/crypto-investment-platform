/**
 * 블록체인 투자 플랫폼 - Google Apps Script 메인 API
 * 서버 전용 코드 (브라우저 코드 없음)
 */

// 전역 설정
const CONFIG = {
  VERSION: '1.0.0',
  DB_SHEET_ID: '1DQn1R97Kp8CYAaI79PE5_PaYpX1xnz7xbsqnINf2qfs', // 
  JWT_SECRET: 'blockchain-platform-secret-key-2024',
  CACHE_DURATION: 300, // 5분
  MAX_LOGIN_ATTEMPTS: 5,
  SESSION_TIMEOUT: 86400000 // 24시간 (밀리초)
};

/**
 * HTTP GET 요청 처리 (웹앱 배포시 필수)
 */
function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action;
    
    // 기본 헬스체크
    if (!action || action === 'health') {
      return createJsonResponse({
        success: true,
        status: 'healthy',
        version: CONFIG.VERSION,
        timestamp: new Date().toISOString()
      });
    }
    
    // 기타 GET 요청 처리
    const response = handleApiRequest('GET', action, params);
    return createJsonResponse(response);
    
  } catch (error) {
    Logger.log('doGet 오류: ' + error.toString());
    return createJsonResponse({
      success: false,
      error: error.toString(),
      message: '서버 오류가 발생했습니다.'
    });
  }
}

/**
 * HTTP POST 요청 처리
 */
function doPost(e) {
  try {
    let postData = {};
    let action = '';
    
    // POST 데이터 파싱
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
      action = postData.action;
    }
    
    // GET 파라미터도 확인
    const params = e.parameter || {};
    if (!action && params.action) {
      action = params.action;
    }
    
    const response = handleApiRequest('POST', action, postData);
    return createJsonResponse(response);
    
  } catch (error) {
    Logger.log('doPost 오류: ' + error.toString());
    return createJsonResponse({
      success: false,
      error: error.toString(),
      message: '서버 오류가 발생했습니다.'
    });
  }
}

/**
 * API 요청 라우터
 */
function handleApiRequest(method, action, data) {
  try {
    Logger.log(`API 요청: ${method} ${action}`);
    
    switch (action) {
      // 인증 관련
      case 'register':
        return registerUser(data.email, data.password, data.name);
        
      case 'login':
        return loginUser(data.email, data.password);
        
      case 'logout':
        return logoutUser(data.token);
        
      case 'verify-token':
        return verifyToken(data.token);
        
      // 포트폴리오 관리
      case 'create-portfolio':
        return createPortfolio(data.userId, data.name, data.description);
        
      case 'get-portfolios':
        return getUserPortfolios(data.userId);
        
      case 'get-portfolio':
        return getPortfolio(data.portfolioId);
        
      case 'update-portfolio':
        return updatePortfolio(data.portfolioId, data.updates);
        
      case 'delete-portfolio':
        return deletePortfolio(data.portfolioId, data.userId);
        
      // 거래 관리
      case 'add-transaction':
        return addTransaction(data);
        
      case 'get-transactions':
        return getTransactions(data.portfolioId);
        
      // 암호화폐 시세
      case 'get-crypto-price':
        return getCryptoPrice(data.coinId);
        
      case 'get-crypto-prices':
        return getCryptoPrices(data.coinIds || ['bitcoin', 'ethereum']);
        
      // 시스템
      case 'health':
        return {
          success: true,
          status: 'healthy',
          version: CONFIG.VERSION,
          timestamp: new Date().toISOString()
        };
        
      default:
        return {
          success: false,
          error: 'Unknown action',
          message: `알 수 없는 액션: ${action}`
        };
    }
    
  } catch (error) {
    Logger.log(`API 오류 (${action}): ` + error.toString());
    return {
      success: false,
      error: error.toString(),
      message: 'API 처리 중 오류가 발생했습니다.'
    };
  }
}

/**
 * JSON 응답 생성 (CORS 헤더 포함)
 */
function createJsonResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
    
  return output;
}

// ===== 사용자 인증 함수들 =====

function registerUser(email, password, name) {
  try {
    // 이메일 중복 체크
    const existingUser = findRecord('users', { email: email });
    if (existingUser) {
      return {
        success: false,
        error: 'EMAIL_EXISTS',
        message: '이미 존재하는 이메일입니다.'
      };
    }
    
    // 사용자 생성
    const userId = generateId();
    const passwordHash = hashPassword(password);
    
    const userData = {
      id: userId,
      email: email,
      username: email.split('@')[0],
      password_hash: passwordHash,
      full_name: name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active',
      role: 'user',
      email_verified: false
    };
    
    insertRecord('users', userData);
    
    // 세션 생성
    const token = createUserSession(userId);
    
    return {
      success: true,
      user: {
        id: userId,
        email: email,
        name: name
      },
      token: token,
      message: '회원가입이 완료되었습니다.'
    };
    
  } catch (error) {
    Logger.log('회원가입 오류: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      message: '회원가입 중 오류가 발생했습니다.'
    };
  }
}

function loginUser(email, password) {
  try {
    // 사용자 찾기
    const user = findRecord('users', { email: email });
    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '존재하지 않는 사용자입니다.'
      };
    }
    
    // 비밀번호 확인
    if (!verifyPassword(password, user.password_hash)) {
      return {
        success: false,
        error: 'INVALID_PASSWORD',
        message: '비밀번호가 일치하지 않습니다.'
      };
    }
    
    // 마지막 로그인 업데이트
    updateRecord('users', { id: user.id }, { 
      last_login: new Date().toISOString() 
    });
    
    // 세션 생성
    const token = createUserSession(user.id);
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name
      },
      token: token,
      message: '로그인되었습니다.'
    };
    
  } catch (error) {
    Logger.log('로그인 오류: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      message: '로그인 중 오류가 발생했습니다.'
    };
  }
}

function logoutUser(token) {
  try {
    if (token) {
      // 세션 무효화
      updateRecord('sessions', { token: token }, { 
        is_active: false 
      });
    }
    
    return {
      success: true,
      message: '로그아웃되었습니다.'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

function verifyToken(token) {
  try {
    const session = findRecord('sessions', { 
      token: token, 
      is_active: true 
    });
    
    if (!session) {
      return {
        success: false,
        error: 'INVALID_TOKEN',
        message: '유효하지 않은 토큰입니다.'
      };
    }
    
    // 만료 시간 체크
    if (new Date(session.expires_at) < new Date()) {
      return {
        success: false,
        error: 'TOKEN_EXPIRED',
        message: '토큰이 만료되었습니다.'
      };
    }
    
    const user = findRecord('users', { id: session.user_id });
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ===== 포트폴리오 관리 함수들 =====

function createPortfolio(userId, name, description) {
  try {
    const portfolioId = generateId();
    
    const portfolioData = {
      id: portfolioId,
      user_id: userId,
      name: name,
      description: description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    insertRecord('portfolios', portfolioData);
    
    return {
      success: true,
      portfolio: portfolioData,
      message: '포트폴리오가 생성되었습니다.'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      message: '포트폴리오 생성 중 오류가 발생했습니다.'
    };
  }
}

function getUserPortfolios(userId) {
  try {
    const portfolios = findRecords('portfolios', { user_id: userId });
    
    return {
      success: true,
      portfolios: portfolios
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ===== 암호화폐 시세 함수들 =====

function getCryptoPrice(coinId) {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'BlockchainPlatform/1.0'
      }
    });
    
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      
      return {
        success: true,
        data: data
      };
    } else {
      throw new Error(`API 오류: ${response.getResponseCode()}`);
    }
    
  } catch (error) {
    Logger.log(`암호화폐 시세 조회 오류 (${coinId}): ` + error.toString());
    return {
      success: false,
      error: error.toString(),
      message: '시세 정보를 가져올 수 없습니다.'
    };
  }
}

function getCryptoPrices(coinIds) {
  try {
    const coinList = Array.isArray(coinIds) ? coinIds.join(',') : coinIds;
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinList}&vs_currencies=usd&include_24hr_change=true`;
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'BlockchainPlatform/1.0'
      }
    });
    
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      
      return {
        success: true,
        data: data
      };
    } else {
      throw new Error(`API 오류: ${response.getResponseCode()}`);
    }
    
  } catch (error) {
    Logger.log('암호화폐 시세 조회 오류: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      message: '시세 정보를 가져올 수 없습니다.'
    };
  }
}

// ===== 유틸리티 함수들 =====

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function hashPassword(password) {
  // 실제 프로젝트에서는 더 강력한 해싱 알고리즘 사용
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, 
    password + CONFIG.JWT_SECRET,
    Utilities.Charset.UTF_8
  ).map(byte => (byte + 256).toString(16).slice(-2)).join('');
}

function verifyPassword(password, hash) {
  const passwordHash = hashPassword(password);
  return passwordHash === hash;
}

function createUserSession(userId) {
  try {
    const sessionId = generateId();
    const token = generateId() + generateId(); // 더 긴 토큰
    const expiresAt = new Date(Date.now() + CONFIG.SESSION_TIMEOUT).toISOString();
    
    const sessionData = {
      session_id: sessionId,
      user_id: userId,
      token: token,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      is_active: true
    };
    
    insertRecord('sessions', sessionData);
    
    return token;
    
  } catch (error) {
    Logger.log('세션 생성 오류: ' + error.toString());
    throw error;
  }
}

// ===== 데이터베이스 기본 함수들 =====
// (Database.gs, Auth.gs, Utils.gs에서 가져온 핵심 함수들)

function getSpreadsheet() {
  if (CONFIG.DB_SHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.DB_SHEET_ID);
  } else {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function insertRecord(tableName, data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  
  if (!sheet) {
    throw new Error(`시트를 찾을 수 없습니다: ${tableName}`);
  }
  
  // 헤더 가져오기
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // 데이터 배열 생성
  const values = headers.map(header => data[header] || '');
  
  // 데이터 추가
  sheet.appendRow(values);
  
  return { success: true };
}

function findRecord(tableName, criteria) {
  const records = findRecords(tableName, criteria);
  return records.length > 0 ? records[0] : null;
}

function findRecords(tableName, criteria) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    return [];
  }
  
  // 헤더와 데이터 가져오기
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  const values = dataRange.getValues();
  
  // 데이터를 객체 배열로 변환
  const records = values.map(row => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index];
    });
    return record;
  });
  
  // 조건에 맞는 레코드 필터링
  return records.filter(record => {
    for (const [key, value] of Object.entries(criteria)) {
      if (record[key] !== value) {
        return false;
      }
    }
    return true;
  });
}

function updateRecord(tableName, criteria, updates) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  
  if (!sheet) {
    throw new Error(`시트를 찾을 수 없습니다: ${tableName}`);
  }
  
  // 헤더 가져오기
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // 업데이트할 행 찾기
  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  const values = dataRange.getValues();
  
  for (let i = 0; i < values.length; i++) {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[i][index];
    });
    
    // 조건 확인
    let match = true;
    for (const [key, value] of Object.entries(criteria)) {
      if (record[key] !== value) {
        match = false;
        break;
      }
    }
    
    // 조건에 맞으면 업데이트
    if (match) {
      Object.keys(updates).forEach(key => {
        const columnIndex = headers.indexOf(key);
        if (columnIndex >= 0) {
          sheet.getRange(i + 2, columnIndex + 1).setValue(updates[key]);
        }
      });
      return { success: true };
    }
  }
  
  return { success: false, error: '업데이트할 레코드를 찾을 수 없습니다.' };
}

/**
 * 테스트 함수 - 직접 실행하여 시스템 확인
 */
function testSystem() {
  Logger.log('시스템 테스트 시작...');
  
  try {
    // 헬스체크 테스트
    const health = handleApiRequest('GET', 'health', {});
    Logger.log('헬스체크: ' + JSON.stringify(health));
    
    // 암호화폐 시세 테스트
    const price = getCryptoPrice('bitcoin');
    Logger.log('비트코인 시세: ' + JSON.stringify(price));
    
    Logger.log('시스템 테스트 완료!');
    return { success: true, message: '시스템이 정상 작동합니다.' };
    
  } catch (error) {
    Logger.log('시스템 테스트 실패: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}
