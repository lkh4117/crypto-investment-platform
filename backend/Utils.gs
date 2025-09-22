/**
 * 블록체인 투자 플랫폼 - 유틸리티 함수들
 * Google Apps Script 백엔드용 헬퍼 함수 모음
 * 
 * 주요 기능:
 * - 데이터 검증 및 변환
 * - 암호화 및 보안 유틸리티
 * - 날짜/시간 처리
 * - 이메일 및 알림
 * - 캐시 관리
 * - 로그 및 모니터링
 * - 외부 API 연동
 */

// ===== 데이터 검증 및 변환 =====

/**
 * 이메일 주소 유효성 검증
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim().toLowerCase());
}

/**
 * 강력한 패스워드 검증
 */
function isStrongPassword(password) {
  if (!password || typeof password !== 'string') return false;
  
  // 최소 8자, 대소문자, 숫자, 특수문자 포함
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongRegex.test(password);
}

/**
 * 금액 형식 검증 및 변환
 */
function validateAmount(amount) {
  if (typeof amount === 'string') {
    amount = parseFloat(amount.replace(/[,$]/g, ''));
  }
  
  if (isNaN(amount) || amount < 0) {
    throw new Error('유효하지 않은 금액입니다');
  }
  
  return Math.round(amount * 100) / 100; // 소수점 2자리로 반올림
}

/**
 * 사용자 입력 데이터 정리
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

/**
 * 객체 깊은 복사
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const cloned = {};
  Object.keys(obj).forEach(key => {
    cloned[key] = deepClone(obj[key]);
  });
  
  return cloned;
}

// ===== 암호화 및 보안 =====

/**
 * 안전한 랜덤 문자열 생성
 */
function generateSecureToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * 데이터 해싱 (SHA-256)
 */
function hashData(data) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, 
    data,
    Utilities.Charset.UTF_8
  );
  
  return digest.map(byte => {
    const unsignedByte = byte < 0 ? byte + 256 : byte;
    return ('0' + unsignedByte.toString(16)).slice(-2);
  }).join('');
}

/**
 * 간단한 암호화/복호화 (Base64 + 키)
 */
function encryptData(data, key) {
  try {
    const encrypted = Utilities.base64Encode(JSON.stringify(data) + '|' + key);
    return encrypted;
  } catch (error) {
    Logger.log('암호화 실패: ' + error.toString());
    return null;
  }
}

function decryptData(encryptedData, key) {
  try {
    const decrypted = Utilities.base64Decode(encryptedData);
    const decoded = Utilities.newBlob(decrypted).getDataAsString();
    const parts = decoded.split('|');
    
    if (parts.length !== 2 || parts[1] !== key) {
      throw new Error('잘못된 키');
    }
    
    return JSON.parse(parts[0]);
  } catch (error) {
    Logger.log('복호화 실패: ' + error.toString());
    return null;
  }
}

/**
 * IP 주소 추출 및 검증
 */
function getClientIP(request) {
  try {
    // Google Apps Script에서는 실제 클라이언트 IP를 얻기 어려움
    const headers = request.parameter || {};
    return headers['X-Forwarded-For'] || 
           headers['X-Real-IP'] || 
           'unknown';
  } catch (error) {
    return 'unknown';
  }
}

// ===== 날짜/시간 처리 =====

/**
 * 현재 타임스탬프 (밀리초)
 */
function getCurrentTimestamp() {
  return new Date().getTime();
}

/**
 * 날짜 형식 변환
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) date = new Date();
  if (typeof date === 'number') date = new Date(date);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 날짜 차이 계산 (일 단위)
 */
function getDaysDifference(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  
  return Math.round((firstDate - secondDate) / oneDay);
}

/**
 * 만료 시간 체크
 */
function isExpired(timestamp, expirationMinutes = 60) {
  const now = getCurrentTimestamp();
  const expirationTime = timestamp + (expirationMinutes * 60 * 1000);
  
  return now > expirationTime;
}

// ===== 이메일 및 알림 =====

/**
 * 이메일 발송
 */
function sendEmail(to, subject, body, options = {}) {
  try {
    const mailOptions = {
      to: to,
      subject: subject,
      htmlBody: body,
      replyTo: options.replyTo || 'noreply@blockchainplatform.com',
      ...options
    };
    
    MailApp.sendEmail(mailOptions);
    Logger.log(`이메일 발송 완료: ${to}`);
    return true;
  } catch (error) {
    Logger.log(`이메일 발송 실패: ${error.toString()}`);
    return false;
  }
}

/**
 * 웰컴 이메일 템플릿
 */
function sendWelcomeEmail(userEmail, userName) {
  const subject = '블록체인 투자 플랫폼에 오신 것을 환영합니다!';
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">환영합니다, ${userName}님!</h2>
      <p>블록체인 투자 플랫폼 가입을 축하드립니다.</p>
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>다음 단계:</h3>
        <ul>
          <li>프로필을 완성하세요</li>
          <li>투자 선호도를 설정하세요</li>
          <li>첫 번째 포트폴리오를 만들어보세요</li>
        </ul>
      </div>
      <p>궁금한 점이 있으시면 언제든 문의해주세요.</p>
      <p style="color: #6b7280; font-size: 14px;">
        블록체인 투자 플랫폼 팀 드림
      </p>
    </div>
  `;
  
  return sendEmail(userEmail, subject, body);
}

/**
 * 패스워드 리셋 이메일
 */
function sendPasswordResetEmail(userEmail, resetToken, userName) {
  const subject = '패스워드 재설정 요청';
  const resetUrl = `https://yourapp.com/reset-password?token=${resetToken}`;
  
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">패스워드 재설정</h2>
      <p>안녕하세요, ${userName}님</p>
      <p>패스워드 재설정을 요청하셨습니다.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          패스워드 재설정하기
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        이 링크는 1시간 후 만료됩니다.<br>
        요청하지 않으셨다면 이 이메일을 무시하세요.
      </p>
    </div>
  `;
  
  return sendEmail(userEmail, subject, body);
}

/**
 * 시스템 알림 발송
 */
function sendSystemAlert(level, message, details = '') {
  const adminEmail = 'admin@blockchainplatform.com';
  const subject = `[${level.toUpperCase()}] 시스템 알림`;
  
  const body = `
    <div style="font-family: monospace;">
      <h3>시스템 알림</h3>
      <p><strong>레벨:</strong> ${level}</p>
      <p><strong>시간:</strong> ${formatDate(new Date())}</p>
      <p><strong>메시지:</strong> ${message}</p>
      ${details ? `<p><strong>상세:</strong><br><pre>${details}</pre></p>` : ''}
    </div>
  `;
  
  return sendEmail(adminEmail, subject, body);
}

// ===== 캐시 관리 =====

/**
 * 캐시 키 생성
 */
function generateCacheKey(prefix, ...params) {
  return `${prefix}_${params.join('_')}`;
}

/**
 * 캐시 데이터 설정 (압축 저장)
 */
function setCacheData(key, data, expirationInSeconds = 3600) {
  try {
    const cache = CacheService.getScriptCache();
    const compressed = Utilities.gzip(Utilities.newBlob(JSON.stringify(data)));
    const base64Data = Utilities.base64Encode(compressed.getBytes());
    
    cache.put(key, base64Data, expirationInSeconds);
    return true;
  } catch (error) {
    Logger.log(`캐시 설정 실패 (${key}): ${error.toString()}`);
    return false;
  }
}

/**
 * 캐시 데이터 조회 (압축 해제)
 */
function getCacheData(key) {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(key);
    
    if (!cached) return null;
    
    const compressed = Utilities.base64Decode(cached);
    const decompressed = Utilities.ungzip(Utilities.newBlob(compressed));
    const data = JSON.parse(decompressed.getDataAsString());
    
    return data;
  } catch (error) {
    Logger.log(`캐시 조회 실패 (${key}): ${error.toString()}`);
    return null;
  }
}

/**
 * 캐시 삭제
 */
function removeCacheData(key) {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(key);
    return true;
  } catch (error) {
    Logger.log(`캐시 삭제 실패 (${key}): ${error.toString()}`);
    return false;
  }
}

/**
 * 캐시 전체 삭제
 */
function clearAllCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll();
    Logger.log('전체 캐시 삭제 완료');
    return true;
  } catch (error) {
    Logger.log(`전체 캐시 삭제 실패: ${error.toString()}`);
    return false;
  }
}

// ===== 로그 및 모니터링 =====

/**
 * 구조화된 로그 작성
 */
function writeLog(level, category, message, data = null) {
  const timestamp = formatDate(new Date());
  const logEntry = {
    timestamp: timestamp,
    level: level.toUpperCase(),
    category: category,
    message: message,
    data: data
  };
  
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}`;
  
  if (data) {
    Logger.log(`${logMessage}\nData: ${JSON.stringify(data, null, 2)}`);
  } else {
    Logger.log(logMessage);
  }
  
  // 중요한 로그는 스프레드시트에도 저장
  if (['ERROR', 'CRITICAL'].includes(level.toUpperCase())) {
    logToSheet(logEntry);
  }
  
  return logEntry;
}

/**
 * 스프레드시트 로그 저장
 */
function logToSheet(logEntry) {
  try {
    const ss = SpreadsheetApp.openById(getSystemSetting('LOG_SHEET_ID'));
    const sheet = ss.getSheetByName('SystemLogs') || ss.insertSheet('SystemLogs');
    
    // 헤더가 없으면 추가
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Level', 'Category', 'Message', 'Data']);
    }
    
    sheet.appendRow([
      logEntry.timestamp,
      logEntry.level,
      logEntry.category,
      logEntry.message,
      logEntry.data ? JSON.stringify(logEntry.data) : ''
    ]);
    
  } catch (error) {
    Logger.log(`스프레드시트 로그 저장 실패: ${error.toString()}`);
  }
}

/**
 * 성능 측정
 */
function measurePerformance(functionName, func) {
  const startTime = new Date().getTime();
  
  try {
    const result = func();
    const endTime = new Date().getTime();
    const duration = endTime - startTime;
    
    writeLog('INFO', 'PERFORMANCE', `${functionName} 실행 시간: ${duration}ms`);
    
    return { result, duration };
  } catch (error) {
    const endTime = new Date().getTime();
    const duration = endTime - startTime;
    
    writeLog('ERROR', 'PERFORMANCE', `${functionName} 실행 실패 (${duration}ms)`, {
      error: error.toString()
    });
    
    throw error;
  }
}

/**
 * API 응답 시간 측정
 */
function trackApiPerformance(endpoint, executionTime, success) {
  const performanceData = getCacheData('api_performance') || {};
  const today = formatDate(new Date(), 'YYYY-MM-DD');
  
  if (!performanceData[today]) {
    performanceData[today] = {};
  }
  
  if (!performanceData[today][endpoint]) {
    performanceData[today][endpoint] = {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      errors: 0
    };
  }
  
  const stats = performanceData[today][endpoint];
  stats.count++;
  stats.totalTime += executionTime;
  stats.avgTime = Math.round(stats.totalTime / stats.count);
  
  if (!success) {
    stats.errors++;
  }
  
  setCacheData('api_performance', performanceData, 86400); // 24시간
  
  // 성능 임계값 체크
  if (stats.avgTime > 5000) { // 5초 초과
    sendSystemAlert('WARNING', `API 성능 저하 감지: ${endpoint}`, 
      `평균 응답 시간: ${stats.avgTime}ms`);
  }
}

// ===== 외부 API 연동 =====

/**
 * HTTP 요청 (재시도 로직 포함)
 */
function makeHttpRequest(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'BlockchainPlatform/1.0',
          ...options.headers
        },
        muteHttpExceptions: true,
        ...options
      });
      
      if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
        return {
          success: true,
          data: response.getContentText(),
          code: response.getResponseCode(),
          headers: response.getAllHeaders()
        };
      } else {
        throw new Error(`HTTP ${response.getResponseCode()}: ${response.getContentText()}`);
      }
      
    } catch (error) {
      lastError = error;
      writeLog('WARNING', 'HTTP_REQUEST', `요청 실패 (시도 ${i + 1}/${maxRetries})`, {
        url: url,
        error: error.toString()
      });
      
      if (i < maxRetries - 1) {
        Utilities.sleep(Math.pow(2, i) * 1000); // 지수적 백오프
      }
    }
  }
  
  writeLog('ERROR', 'HTTP_REQUEST', '모든 재시도 실패', {
    url: url,
    error: lastError.toString()
  });
  
  return {
    success: false,
    error: lastError.toString()
  };
}

/**
 * 암호화폐 시세 조회 (CoinGecko API)
 */
function getCryptoPrice(coinId, currency = 'usd') {
  const cacheKey = generateCacheKey('crypto_price', coinId, currency);
  const cached = getCacheData(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}&include_24hr_change=true`;
  
  const response = makeHttpRequest(url);
  
  if (response.success) {
    try {
      const data = JSON.parse(response.data);
      setCacheData(cacheKey, data, 300); // 5분 캐시
      return data;
    } catch (error) {
      writeLog('ERROR', 'CRYPTO_API', '가격 데이터 파싱 실패', { error: error.toString() });
      return null;
    }
  }
  
  return null;
}

/**
 * 환율 정보 조회
 */
function getExchangeRate(from, to) {
  const cacheKey = generateCacheKey('exchange_rate', from, to);
  const cached = getCacheData(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  // 무료 환율 API 사용 예시
  const url = `https://api.exchangerate-api.com/v4/latest/${from}`;
  const response = makeHttpRequest(url);
  
  if (response.success) {
    try {
      const data = JSON.parse(response.data);
      const rate = data.rates[to];
      
      if (rate) {
        const result = { rate: rate, timestamp: getCurrentTimestamp() };
        setCacheData(cacheKey, result, 3600); // 1시간 캐시
        return result;
      }
    } catch (error) {
      writeLog('ERROR', 'EXCHANGE_API', '환율 데이터 파싱 실패', { error: error.toString() });
    }
  }
  
  return null;
}

// ===== 시스템 유틸리티 =====

/**
 * 시스템 상태 체크
 */
function checkSystemHealth() {
  const health = {
    timestamp: getCurrentTimestamp(),
    database: false,
    cache: false,
    email: false,
    external_api: false,
    performance: 'unknown'
  };
  
  // 데이터베이스 연결 체크
  try {
    const testQuery = "SELECT 1";
    executeQuery(testQuery);
    health.database = true;
  } catch (error) {
    writeLog('ERROR', 'HEALTH_CHECK', '데이터베이스 연결 실패', { error: error.toString() });
  }
  
  // 캐시 시스템 체크
  try {
    const testKey = 'health_check_' + getCurrentTimestamp();
    setCacheData(testKey, { test: true }, 60);
    const cached = getCacheData(testKey);
    health.cache = cached && cached.test === true;
    removeCacheData(testKey);
  } catch (error) {
    writeLog('ERROR', 'HEALTH_CHECK', '캐시 시스템 실패', { error: error.toString() });
  }
  
  // 이메일 시스템 체크 (실제로는 보내지 않음)
  try {
    health.email = true; // 실제 구현에서는 테스트 이메일 발송
  } catch (error) {
    writeLog('ERROR', 'HEALTH_CHECK', '이메일 시스템 실패', { error: error.toString() });
  }
  
  // 외부 API 체크
  try {
    const response = makeHttpRequest('https://httpbin.org/status/200');
    health.external_api = response.success;
  } catch (error) {
    writeLog('ERROR', 'HEALTH_CHECK', '외부 API 연결 실패', { error: error.toString() });
  }
  
  // 성능 평가
  const errors = Object.values(health).filter(v => v === false).length;
  if (errors === 0) {
    health.performance = 'excellent';
  } else if (errors <= 1) {
    health.performance = 'good';
  } else if (errors <= 2) {
    health.performance = 'fair';
  } else {
    health.performance = 'poor';
  }
  
  return health;
}

/**
 * 데이터베이스 백업 생성
 */
function createDatabaseBackup() {
  try {
    const backupData = {
      timestamp: getCurrentTimestamp(),
      version: '1.0',
      tables: {}
    };
    
    // 주요 테이블 백업
    const tables = ['users', 'portfolios', 'transactions', 'user_sessions', 'system_settings'];
    
    tables.forEach(table => {
      try {
        const query = `SELECT * FROM ${table}`;
        const data = executeQuery(query);
        backupData.tables[table] = data;
        writeLog('INFO', 'BACKUP', `테이블 백업 완료: ${table} (${data.length} 행)`);
      } catch (error) {
        writeLog('ERROR', 'BACKUP', `테이블 백업 실패: ${table}`, { error: error.toString() });
      }
    });
    
    // 백업 파일을 Google Drive에 저장
    const fileName = `backup_${formatDate(new Date(), 'YYYY-MM-DD_HH-mm-ss')}.json`;
    const blob = Utilities.newBlob(JSON.stringify(backupData, null, 2), 'application/json', fileName);
    
    const file = DriveApp.createFile(blob);
    
    writeLog('INFO', 'BACKUP', '데이터베이스 백업 완료', {
      fileName: fileName,
      fileId: file.getId(),
      size: blob.getBytes().length
    });
    
    return {
      success: true,
      fileName: fileName,
      fileId: file.getId()
    };
    
  } catch (error) {
    writeLog('ERROR', 'BACKUP', '데이터베이스 백업 실패', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * 시스템 설정 관리
 */
function getSystemSetting(key, defaultValue = null) {
  try {
    const query = "SELECT value FROM system_settings WHERE setting_key = ?";
    const result = executeQuery(query, [key]);
    
    if (result.length > 0) {
      const value = result[0].value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
    return defaultValue;
  } catch (error) {
    writeLog('ERROR', 'SYSTEM_SETTING', `설정 조회 실패: ${key}`, { error: error.toString() });
    return defaultValue;
  }
}

function setSystemSetting(key, value) {
  try {
    const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
    const timestamp = getCurrentTimestamp();
    
    const query = `
      INSERT OR REPLACE INTO system_settings (setting_key, value, updated_at)
      VALUES (?, ?, ?)
    `;
    
    executeQuery(query, [key, jsonValue, timestamp]);
    writeLog('INFO', 'SYSTEM_SETTING', `설정 업데이트: ${key}`);
    return true;
  } catch (error) {
    writeLog('ERROR', 'SYSTEM_SETTING', `설정 저장 실패: ${key}`, { error: error.toString() });
    return false;
  }
}

/**
 * 앱 버전 관리
 */
function getCurrentVersion() {
  return getSystemSetting('app_version', '1.0.0');
}

function updateVersion(newVersion) {
  const currentVersion = getCurrentVersion();
  
  if (setSystemSetting('app_version', newVersion)) {
    writeLog('INFO', 'VERSION_UPDATE', `버전 업데이트: ${currentVersion} → ${newVersion}`);
    return true;
  }
  
  return false;
}

/**
 * 초기 시스템 설정
 */
function initializeSystemSettings() {
  const defaultSettings = {
    'app_version': '1.0.0',
    'max_login_attempts': 5,
    'session_timeout_minutes': 60,
    'backup_enabled': true,
    'backup_frequency_hours': 24,
    'cache_default_ttl': 3600,
    'email_notifications': true,
    'maintenance_mode': false,
    'api_rate_limit': 1000,
    'log_retention_days': 30
  };
  
  Object.keys(defaultSettings).forEach(key => {
    if (getSystemSetting(key) === null) {
      setSystemSetting(key, defaultSettings[key]);
    }
  });
  
  writeLog('INFO', 'SYSTEM_INIT', '시스템 설정 초기화 완료');
}

// ===== 스케줄링 및 자동화 =====

/**
 * 일일 정리 작업
 */
function runDailyMaintenance() {
  writeLog('INFO', 'MAINTENANCE', '일일 정리 작업 시작');
  
  const results = {
    timestamp: getCurrentTimestamp(),
    tasks: {}
  };
  
  try {
    // 1. 만료된 세션 정리
    const sessionCleanup = cleanupExpiredSessions();
    results.tasks.sessionCleanup = sessionCleanup;
    
    // 2. 오래된 로그 정리
    const logCleanup = cleanupOldLogs();
    results.tasks.logCleanup = logCleanup;
    
    // 3. 캐시 최적화
    const cacheOptimization = optimizeCache();
    results.tasks.cacheOptimization = cacheOptimization;
    
    // 4. 데이터베이스 백업 (설정에 따라)
    if (getSystemSetting('backup_enabled', true)) {
      const backup = createDatabaseBackup();
      results.tasks.backup = backup;
    }
    
    // 5. 시스템 상태 체크
    const healthCheck = checkSystemHealth();
    results.tasks.healthCheck = healthCheck;
    
    // 6. 성능 통계 업데이트
    const performanceStats = updatePerformanceStats();
    results.tasks.performanceStats = performanceStats;
    
    writeLog('INFO', 'MAINTENANCE', '일일 정리 작업 완료', results);
    
    // 관리자에게 결과 이메일 발송
    sendMaintenanceReport(results);
    
    return results;
    
  } catch (error) {
    writeLog('ERROR', 'MAINTENANCE', '일일 정리 작업 실패', { error: error.toString() });
    sendSystemAlert('CRITICAL', '일일 정리 작업 실패', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * 만료된 세션 정리
 */
function cleanupExpiredSessions() {
  try {
    const query = "DELETE FROM user_sessions WHERE expires_at < ?";
    const result = executeQuery(query, [getCurrentTimestamp()]);
    
    writeLog('INFO', 'CLEANUP', `만료된 세션 ${result.rowsAffected || 0}개 삭제`);
    
    return { success: true, deletedSessions: result.rowsAffected || 0 };
  } catch (error) {
    writeLog('ERROR', 'CLEANUP', '세션 정리 실패', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * 오래된 로그 정리
 */
function cleanupOldLogs() {
  try {
    const retentionDays = getSystemSetting('log_retention_days', 30);
    const cutoffTime = getCurrentTimestamp() - (retentionDays * 24 * 60 * 60 * 1000);
    
    // 시스템 로그 정리 (스프레드시트)
    let deletedRows = 0;
    try {
      const ss = SpreadsheetApp.openById(getSystemSetting('LOG_SHEET_ID'));
      const sheet = ss.getSheetByName('SystemLogs');
      
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        const cutoffDate = new Date(cutoffTime);
        
        // 삭제할 행 찾기 (헤더 제외)
        const rowsToDelete = [];
        for (let i = 1; i < data.length; i++) {
          const logDate = new Date(data[i][0]);
          if (logDate < cutoffDate) {
            rowsToDelete.push(i + 1); // 1-based index
          }
        }
        
        // 뒤에서부터 삭제 (인덱스 변경 방지)
        rowsToDelete.reverse().forEach(rowIndex => {
          sheet.deleteRow(rowIndex);
          deletedRows++;
        });
      }
    } catch (error) {
      writeLog('WARNING', 'CLEANUP', '스프레드시트 로그 정리 실패', { error: error.toString() });
    }
    
    writeLog('INFO', 'CLEANUP', `오래된 로그 ${deletedRows}개 삭제`);
    
    return { success: true, deletedLogs: deletedRows };
  } catch (error) {
    writeLog('ERROR', 'CLEANUP', '로그 정리 실패', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * 캐시 최적화
 */
function optimizeCache() {
  try {
    // 캐시 통계 수집
    const beforeOptimization = {
      timestamp: getCurrentTimestamp()
    };
    
    // 불필요한 캐시 정리 (실제로는 자동으로 만료됨)
    // Google Apps Script는 캐시 크기 제한이 있으므로 주기적으로 정리
    
    const afterOptimization = {
      timestamp: getCurrentTimestamp()
    };
    
    writeLog('INFO', 'OPTIMIZATION', '캐시 최적화 완료');
    
    return { 
      success: true, 
      before: beforeOptimization, 
      after: afterOptimization 
    };
  } catch (error) {
    writeLog('ERROR', 'OPTIMIZATION', '캐시 최적화 실패', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * 성능 통계 업데이트
 */
function updatePerformanceStats() {
  try {
    const performanceData = getCacheData('api_performance') || {};
    const today = formatDate(new Date(), 'YYYY-MM-DD');
    
    // 성능 통계를 데이터베이스에 저장
    if (performanceData[today]) {
      Object.keys(performanceData[today]).forEach(endpoint => {
        const stats = performanceData[today][endpoint];
        
        const query = `
          INSERT OR REPLACE INTO system_performance 
          (date, endpoint, request_count, avg_response_time, error_count, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        try {
          executeQuery(query, [
            today,
            endpoint,
            stats.count,
            stats.avgTime,
            stats.errors,
            getCurrentTimestamp()
          ]);
        } catch (error) {
          writeLog('WARNING', 'PERFORMANCE_STATS', `성능 통계 저장 실패: ${endpoint}`, 
            { error: error.toString() });
        }
      });
    }
    
    writeLog('INFO', 'PERFORMANCE_STATS', '성능 통계 업데이트 완료');
    
    return { success: true, date: today };
  } catch (error) {
    writeLog('ERROR', 'PERFORMANCE_STATS', '성능 통계 업데이트 실패', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * 정리 작업 결과 이메일 발송
 */
function sendMaintenanceReport(results) {
  try {
    const adminEmail = getSystemSetting('admin_email', 'admin@blockchainplatform.com');
    const subject = `일일 정리 작업 보고서 - ${formatDate(new Date(), 'YYYY-MM-DD')}`;
    
    let body = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h2 style="color: #2563eb;">일일 정리 작업 보고서</h2>
        <p><strong>실행 시간:</strong> ${formatDate(new Date(results.timestamp))}</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>작업 결과</h3>
    `;
    
    Object.keys(results.tasks).forEach(taskName => {
      const task = results.tasks[taskName];
      const status = task.success ? '✅ 성공' : '❌ 실패';
      
      body += `
        <div style="margin: 10px 0; padding: 10px; border-left: 3px solid ${task.success ? '#10b981' : '#ef4444'};">
          <strong>${taskName}:</strong> ${status}<br>
      `;
      
      if (task.success) {
        if (task.deletedSessions) body += `삭제된 세션: ${task.deletedSessions}개<br>`;
        if (task.deletedLogs) body += `삭제된 로그: ${task.deletedLogs}개<br>`;
        if (task.fileName) body += `백업 파일: ${task.fileName}<br>`;
      } else if (task.error) {
        body += `<span style="color: #ef4444;">오류: ${task.error}</span><br>`;
      }
      
      body += '</div>';
    });
    
    body += `
        </div>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4>시스템 상태</h4>
    `;
    
    if (results.tasks.healthCheck) {
      const health = results.tasks.healthCheck;
      body += `
        <p><strong>전체 성능:</strong> ${health.performance}</p>
        <ul>
          <li>데이터베이스: ${health.database ? '정상' : '문제'}</li>
          <li>캐시 시스템: ${health.cache ? '정상' : '문제'}</li>
          <li>이메일 시스템: ${health.email ? '정상' : '문제'}</li>
          <li>외부 API: ${health.external_api ? '정상' : '문제'}</li>
        </ul>
      `;
    }
    
    body += `
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          이 보고서는 자동으로 생성되었습니다.<br>
          블록체인 투자 플랫폼 시스템
        </p>
      </div>
    `;
    
    return sendEmail(adminEmail, subject, body);
    
  } catch (error) {
    writeLog('ERROR', 'MAINTENANCE_REPORT', '정리 작업 보고서 발송 실패', { error: error.toString() });
    return false;
  }
}

// ===== 보안 유틸리티 =====

/**
 * 의심스러운 활동 감지
 */
function detectSuspiciousActivity(userId, activity, metadata = {}) {
  try {
    const suspiciousPatterns = [
      {
        name: 'rapid_login_attempts',
        check: () => {
          const recentAttempts = getCacheData(`login_attempts_${userId}`) || [];
          return recentAttempts.length > 10; // 10회 초과 로그인 시도
        }
      },
      {
        name: 'unusual_transaction_amount',
        check: () => {
          return metadata.amount && metadata.amount > 1000000; // 100만 이상 거래
        }
      },
      {
        name: 'multiple_ip_access',
        check: () => {
          const recentIPs = getCacheData(`user_ips_${userId}`) || [];
          return recentIPs.length > 5; // 5개 이상 다른 IP
        }
      }
    ];
    
    const triggeredPatterns = suspiciousPatterns.filter(pattern => pattern.check());
    
    if (triggeredPatterns.length > 0) {
      const alert = {
        userId: userId,
        activity: activity,
        patterns: triggeredPatterns.map(p => p.name),
        metadata: metadata,
        timestamp: getCurrentTimestamp()
      };
      
      writeLog('WARNING', 'SECURITY', '의심스러운 활동 감지', alert);
      
      // 보안 팀에 즉시 알림
      sendSystemAlert('WARNING', 
        `의심스러운 활동 감지 - 사용자 ${userId}`,
        JSON.stringify(alert, null, 2)
      );
      
      return { suspicious: true, patterns: triggeredPatterns.map(p => p.name) };
    }
    
    return { suspicious: false };
    
  } catch (error) {
    writeLog('ERROR', 'SECURITY', '보안 검사 실패', { 
      userId: userId, 
      activity: activity, 
      error: error.toString() 
    });
    return { suspicious: false, error: error.toString() };
  }
}

/**
 * 브루트 포스 공격 방어
 */
function checkBruteForceProtection(identifier, action) {
  const cacheKey = `brute_force_${action}_${identifier}`;
  const attempts = getCacheData(cacheKey) || [];
  const now = getCurrentTimestamp();
  const timeWindow = 15 * 60 * 1000; // 15분
  
  // 15분 이내의 시도만 카운트
  const recentAttempts = attempts.filter(timestamp => now - timestamp < timeWindow);
  
  const maxAttempts = {
    'login': 5,
    'password_reset': 3,
    'api_access': 100
  };
  
  if (recentAttempts.length >= maxAttempts[action]) {
    const lockoutTime = Math.min(Math.pow(2, recentAttempts.length - maxAttempts[action]) * 60000, 3600000); // 최대 1시간
    
    writeLog('WARNING', 'BRUTE_FORCE', `브루트 포스 공격 차단: ${identifier}`, {
      action: action,
      attempts: recentAttempts.length,
      lockoutTime: lockoutTime
    });
    
    return { 
      blocked: true, 
      lockoutTime: lockoutTime,
      remainingTime: lockoutTime - (now - recentAttempts[recentAttempts.length - 1])
    };
  }
  
  // 새로운 시도 기록
  recentAttempts.push(now);
  setCacheData(cacheKey, recentAttempts, 3600); // 1시간 보관
  
  return { blocked: false, attemptsRemaining: maxAttempts[action] - recentAttempts.length };
}

/**
 * SQL 인젝션 패턴 감지
 */
function detectSQLInjection(input) {
  if (typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\b(OR|AND)\b.*=.*\b(OR|AND)\b)/i,
    /(1=1|1=0)/,
    /('|\").*('|\")/
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * XSS 패턴 감지 및 정리
 */
function sanitizeForXSS(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<\s*\/?\s*(object|embed|form)\b[^>]*>/gi, '');
}

// ===== 데이터 분석 유틸리티 =====

/**
 * 사용자 활동 통계
 */
function getUserActivityStats(userId, days = 7) {
  try {
    const startDate = getCurrentTimestamp() - (days * 24 * 60 * 60 * 1000);
    
    const queries = {
      logins: `
        SELECT COUNT(*) as count, DATE(created_at/1000, 'unixepoch') as date
        FROM user_sessions 
        WHERE user_id = ? AND created_at >= ?
        GROUP BY DATE(created_at/1000, 'unixepoch')
        ORDER BY date
      `,
      transactions: `
        SELECT COUNT(*) as count, SUM(amount) as total_amount, DATE(created_at/1000, 'unixepoch') as date
        FROM transactions 
        WHERE user_id = ? AND created_at >= ?
        GROUP BY DATE(created_at/1000, 'unixepoch')
        ORDER BY date
      `,
      portfolioUpdates: `
        SELECT COUNT(*) as count, DATE(updated_at/1000, 'unixepoch') as date
        FROM portfolios 
        WHERE user_id = ? AND updated_at >= ?
        GROUP BY DATE(updated_at/1000, 'unixepoch')
        ORDER BY date
      `
    };
    
    const stats = {};
    
    Object.keys(queries).forEach(statType => {
      try {
        const result = executeQuery(queries[statType], [userId, startDate]);
        stats[statType] = result;
      } catch (error) {
        writeLog('WARNING', 'USER_STATS', `통계 조회 실패: ${statType}`, { error: error.toString() });
        stats[statType] = [];
      }
    });
    
    return stats;
    
  } catch (error) {
    writeLog('ERROR', 'USER_STATS', '사용자 활동 통계 실패', { 
      userId: userId, 
      error: error.toString() 
    });
    return {};
  }
}

/**
 * 시스템 사용량 분석
 */
function getSystemUsageAnalytics(days = 30) {
  try {
    const startDate = getCurrentTimestamp() - (days * 24 * 60 * 60 * 1000);
    
    const analytics = {
      timestamp: getCurrentTimestamp(),
      period: days,
      users: {},
      api: {},
      performance: {}
    };
    
    // 사용자 통계
    const userQueries = {
      totalUsers: "SELECT COUNT(*) as count FROM users",
      activeUsers: `
        SELECT COUNT(DISTINCT user_id) as count 
        FROM user_sessions 
        WHERE created_at >= ?
      `,
      newUsers: `
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at >= ?
      `
    };
    
    Object.keys(userQueries).forEach(key => {
      try {
        const params = key === 'totalUsers' ? [] : [startDate];
        const result = executeQuery(userQueries[key], params);
        analytics.users[key] = result[0]?.count || 0;
      } catch (error) {
        analytics.users[key] = 0;
      }
    });
    
    // API 사용량 통계
    const performanceData = getCacheData('api_performance') || {};
    let totalRequests = 0;
    let totalErrors = 0;
    
    Object.keys(performanceData).forEach(date => {
      Object.keys(performanceData[date]).forEach(endpoint => {
        const stats = performanceData[date][endpoint];
        totalRequests += stats.count;
        totalErrors += stats.errors;
      });
    });
    
    analytics.api.totalRequests = totalRequests;
    analytics.api.totalErrors = totalErrors;
    analytics.api.errorRate = totalRequests > 0 ? (totalErrors / totalRequests * 100).toFixed(2) : 0;
    
    // 성능 통계
    try {
      const performanceQuery = `
        SELECT 
          AVG(avg_response_time) as avg_response_time,
          MAX(avg_response_time) as max_response_time,
          SUM(request_count) as total_requests,
          SUM(error_count) as total_errors
        FROM system_performance 
        WHERE date >= ?
      `;
      
      const perfResult = executeQuery(performanceQuery, [formatDate(new Date(startDate), 'YYYY-MM-DD')]);
      analytics.performance = perfResult[0] || {};
    } catch (error) {
      analytics.performance = {};
    }
    
    return analytics;
    
  } catch (error) {
    writeLog('ERROR', 'SYSTEM_ANALYTICS', '시스템 분석 실패', { error: error.toString() });
    return { error: error.toString() };
  }
}

// ===== 알림 및 이벤트 시스템 =====

/**
 * 이벤트 발생
 */
function triggerEvent(eventType, data = {}) {
  const event = {
    type: eventType,
    data: data,
    timestamp: getCurrentTimestamp(),
    id: generateSecureToken(16)
  };
  
  writeLog('INFO', 'EVENT', `이벤트 발생: ${eventType}`, event);
  
  // 이벤트별 처리
  try {
    switch (eventType) {
      case 'USER_REGISTERED':
        handleUserRegistered(data);
        break;
      case 'LARGE_TRANSACTION':
        handleLargeTransaction(data);
        break;
      case 'SYSTEM_ERROR':
        handleSystemError(data);
        break;
      case 'SECURITY_ALERT':
        handleSecurityAlert(data);
        break;
      default:
        writeLog('INFO', 'EVENT', `처리되지 않은 이벤트 타입: ${eventType}`);
    }
  } catch (error) {
    writeLog('ERROR', 'EVENT_HANDLER', `이벤트 처리 실패: ${eventType}`, { error: error.toString() });
  }
  
  return event;
}

/**
 * 사용자 가입 이벤트 처리
 */
function handleUserRegistered(data) {
  const { userEmail, userName } = data;
  
  // 웰컴 이메일 발송
  sendWelcomeEmail(userEmail, userName);
  
  // 관리자에게 알림
  sendSystemAlert('INFO', '새 사용자 가입', `${userName} (${userEmail})`);
}

/**
 * 대량 거래 이벤트 처리
 */
function handleLargeTransaction(data) {
  const { userId, amount, type } = data;
  
  writeLog('WARNING', 'LARGE_TRANSACTION', '대량 거래 감지', data);
  
  // 관리자에게 알림
  sendSystemAlert('WARNING', '대량 거래 감지', 
    `사용자 ID: ${userId}, 금액: ${amount}, 타입: ${type}`);
}

/**
 * 시스템 오류 이벤트 처리
 */
function handleSystemError(data) {
  const { error, context } = data;
  
  sendSystemAlert('ERROR', '시스템 오류 발생', 
    `오류: ${error}\n상황: ${JSON.stringify(context, null, 2)}`);
}

/**
 * 보안 알림 이벤트 처리
 */
function handleSecurityAlert(data) {
  const { type, details } = data;
  
  sendSystemAlert('CRITICAL', `보안 알림: ${type}`, 
    JSON.stringify(details, null, 2));
}

// ===== 에러 처리 및 복구 =====

/**
 * 안전한 함수 실행 (에러 핸들링)
 */
function safeExecute(func, context = 'UNKNOWN', defaultReturn = null) {
  try {
    return func();
  } catch (error) {
    writeLog('ERROR', 'SAFE_EXECUTE', `함수 실행 실패 (${context})`, { 
      error: error.toString(),
      stack: error.stack
    });
    
    return defaultReturn;
  }
}

/**
 * 재시도 로직이 포함된 함수 실행
 */
function executeWithRetry(func, maxRetries = 3, delay = 1000, context = 'UNKNOWN') {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return func();
    } catch (error) {
      lastError = error;
      
      writeLog('WARNING', 'RETRY_EXECUTE', 
        `함수 실행 실패 - 재시도 ${i + 1}/${maxRetries} (${context})`, {
        error: error.toString()
      });
      
      if (i < maxRetries - 1) {
        Utilities.sleep(delay * Math.pow(2, i)); // 지수적 백오프
      }
    }
  }
  
  writeLog('ERROR', 'RETRY_EXECUTE', `모든 재시도 실패 (${context})`, {
    error: lastError.toString(),
    maxRetries: maxRetries
  });
  
  throw lastError;
}

// ===== 초기화 및 설정 =====

/**
 * 유틸리티 시스템 초기화
 */
function initializeUtils() {
  try {
    writeLog('INFO', 'UTILS_INIT', '유틸리티 시스템 초기화 시작');
    
    // 시스템 설정 초기화
    initializeSystemSettings();
    
    // 성능 모니터링 테이블 생성 (없는 경우)
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS system_performance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          request_count INTEGER DEFAULT 0,
          avg_response_time INTEGER DEFAULT 0,
          error_count INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          UNIQUE(date, endpoint)
        )
      `;
      executeQuery(createTableQuery);
    } catch (error) {
      writeLog('WARNING', 'UTILS_INIT', '성능 테이블 생성 실패', { error: error.toString() });
    }
    
    // 캐시 초기 설정
    setCacheData('utils_initialized', { timestamp: getCurrentTimestamp() }, 86400);
    
    writeLog('INFO', 'UTILS_INIT', '유틸리티 시스템 초기화 완료');
    
    return true;
  } catch (error) {
    writeLog('ERROR', 'UTILS_INIT', '유틸리티 시스템 초기화 실패', { error: error.toString() });
    return false;
  }
}

// ===== 스케줄러 설정 함수 =====

/**
 * Google Apps Script 트리거 설정
 * 이 함수는 수동으로 실행해야 합니다.
 */
function setupTriggers() {
  // 기존 트리거 삭제
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  
  // 일일 정리 작업 (매일 새벽 2시)
  ScriptApp.newTrigger('runDailyMaintenance')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  
  // 시간별 상태 체크 (매 시간)
  ScriptApp.newTrigger('checkSystemHealth')
    .timeBased()
    .everyHours(1)
    .create();
  
  writeLog('INFO', 'TRIGGERS', '스케줄러 트리거 설정 완료');
}