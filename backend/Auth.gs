/**
 * 블록체인 투자 플랫폼 - 인증 및 보안
 * JWT 기반 인증, 세션 관리, 보안 기능
 */

// ==================================================
// 보안 설정 및 상수
// ==================================================

const AUTH_CONFIG = {
  // JWT 설정
  jwt: {
    secret: 'blockchain_investment_platform_2024_secret_key', // 프로덕션에서는 환경변수로
    algorithm: 'HS256',
    expiresIn: '24h',
    refreshExpiresIn: '7d'
  },
  
  // 패스워드 정책
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // 90일
    historyCount: 5 // 마지막 5개 패스워드 기억
  },
  
  // 계정 잠금 정책
  lockout: {
    maxAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30분 (밀리초)
    resetAttemptsPeriod: 15 * 60 * 1000 // 15분
  },
  
  // 세션 설정
  session: {
    timeout: 24 * 60 * 60 * 1000, // 24시간
    maxConcurrentSessions: 3,
    secureCookies: true
  },
  
  // 2FA 설정
  twoFactor: {
    enabled: true,
    tokenLength: 6,
    tokenExpiry: 5 * 60 * 1000, // 5분
    maxVerificationAttempts: 3
  }
};

// ==================================================
// 인증 메인 함수들
// ==================================================

function handleLogin(params) {
  try {
    const { email, password, remember = false } = params;
    
    // 입력 검증
    if (!email || !password) {
      return {
        success: false,
        error: 'MISSING_CREDENTIALS',
        message: '이메일과 패스워드를 입력해주세요.'
      };
    }
    
    // 이메일 형식 검증
    if (!isValidEmail(email)) {
      return {
        success: false,
        error: 'INVALID_EMAIL',
        message: '올바른 이메일 형식이 아닙니다.'
      };
    }
    
    // 사용자 조회
    const user = findRecord('users', { email: email.toLowerCase() });
    if (!user) {
      // 보안을 위해 사용자 없음과 패스워드 틀림을 구분하지 않음
      logActivity('AUTH', 'Login attempt - user not found', { email });
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: '이메일 또는 패스워드가 올바르지 않습니다.'
      };
    }
    
    // 계정 상태 확인
    if (user.status === 'locked') {
      return {
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: '계정이 잠겨있습니다. 관리자에게 문의하세요.'
      };
    }
    
    if (user.status === 'suspended') {
      return {
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        message: '계정이 정지되었습니다.'
      };
    }
    
    // 로그인 시도 횟수 확인
    const loginAttempts = getLoginAttempts(user.id);
    if (loginAttempts.isLocked) {
      return {
        success: false,
        error: 'ACCOUNT_TEMPORARILY_LOCKED',
        message: `너무 많은 로그인 시도로 계정이 일시적으로 잠겼습니다. ${Math.ceil(loginAttempts.lockoutRemaining / 60000)}분 후 다시 시도하세요.`
      };
    }
    
    // 패스워드 검증
    const isValidPassword = verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      recordFailedLogin(user.id);
      logActivity('AUTH', 'Login failed - invalid password', { 
        userId: user.id, 
        email: user.email,
        attempts: loginAttempts.attempts + 1
      });
      
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: '이메일 또는 패스워드가 올바르지 않습니다.'
      };
    }
    
    // 2FA 확인 (활성화된 경우)
    if (user.two_factor_enabled) {
      const { twoFactorToken } = params;
      if (!twoFactorToken) {
        return {
          success: false,
          error: 'TWO_FACTOR_REQUIRED',
          message: '2단계 인증 코드를 입력해주세요.',
          requiresTwoFactor: true,
          tempToken: generateTempToken(user.id)
        };
      }
      
      if (!verify2FAToken(user.id, twoFactorToken)) {
        recordFailedLogin(user.id);
        return {
          success: false,
          error: 'INVALID_TWO_FACTOR',
          message: '2단계 인증 코드가 올바르지 않습니다.'
        };
      }
    }
    
    // 로그인 성공 처리
    clearLoginAttempts(user.id);
    
    // 세션 생성
    const session = createSession(user, remember);
    
    // 사용자 정보 업데이트
    updateRecord('users', { id: user.id }, {
      last_login: new Date().toISOString()
    });
    
    // 활동 로그
    logActivity('AUTH', 'Login successful', { 
      userId: user.id, 
      email: user.email,
      sessionId: session.sessionId
    });
    
    return {
      success: true,
      data: {
        users: safeUsers.slice((page - 1) * limit, page * limit),
        pagination: {
          page: page,
          limit: limit,
          total: safeUsers.length,
          totalPages: Math.ceil(safeUsers.length / limit)
        }
      }
    };
    
  } catch (error) {
    console.error('Get users error:', error);
    return {
      success: false,
      error: 'FETCH_USERS_ERROR',
      message: '사용자 목록을 가져오는 중 오류가 발생했습니다.'
    };
  }
}

function updateUserStatus(params) {
  try {
    const { userId, status } = params;
    
    const validStatuses = ['active', 'suspended', 'locked', 'deleted'];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: 'INVALID_STATUS',
        message: '유효하지 않은 상태입니다.'
      };
    }
    
    const user = findRecord('users', { id: userId });
    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.'
      };
    }
    
    updateRecord('users', { id: userId }, { status: status });
    
    // 상태 변경 시 활성 세션 무효화
    if (status !== 'active') {
      const sessions = findRecords('sessions', { user_id: userId, is_active: true });
      sessions.forEach(session => {
        updateRecord('sessions', { session_id: session.session_id }, {
          is_active: false
        });
      });
    }
    
    logActivity('ADMIN', 'User status updated', { 
      userId: userId,
      oldStatus: user.status,
      newStatus: status
    });
    
    return {
      success: true,
      message: '사용자 상태가 업데이트되었습니다.'
    };
    
  } catch (error) {
    console.error('Update user status error:', error);
    return {
      success: false,
      error: 'UPDATE_STATUS_ERROR',
      message: '사용자 상태 업데이트 중 오류가 발생했습니다.'
    };
  }
}

// ==================================================
// 보안 모니터링
// ==================================================

function getSecurityStats() {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // 활성 세션 수
    const activeSessions = findRecords('sessions', { is_active: true });
    
    // 최근 24시간 로그인 시도
    const recentLogins = findRecords('activity_logs', {
      action: { $regex: 'Login' },
      created_at: { $gte: last24h.toISOString() }
    });
    
    // 실패한 로그인 시도
    const failedLogins = recentLogins.filter(log => 
      log.action.includes('failed') || log.action.includes('attempt')
    );
    
    // 성공한 로그인
    const successfulLogins = recentLogins.filter(log => 
      log.action.includes('successful')
    );
    
    // 새 사용자 등록 (지난 7일)
    const newUsers = findRecords('users', {
      created_at: { $gte: last7d.toISOString() }
    });
    
    // 잠긴 계정
    const lockedAccounts = findRecords('users', { status: 'locked' });
    
    // 정지된 계정
    const suspendedAccounts = findRecords('users', { status: 'suspended' });
    
    return {
      success: true,
      data: {
        sessions: {
          active: activeSessions.length,
          details: activeSessions.map(session => ({
            userId: session.user_id,
            createdAt: session.created_at,
            expiresAt: session.expires_at
          }))
        },
        logins: {
          last24h: {
            total: recentLogins.length,
            successful: successfulLogins.length,
            failed: failedLogins.length,
            successRate: recentLogins.length > 0 ? 
              (successfulLogins.length / recentLogins.length * 100).toFixed(1) + '%' : '0%'
          }
        },
        users: {
          newLast7d: newUsers.length,
          locked: lockedAccounts.length,
          suspended: suspendedAccounts.length
        },
        alerts: generateSecurityAlerts(failedLogins, lockedAccounts, suspendedAccounts)
      }
    };
    
  } catch (error) {
    console.error('Security stats error:', error);
    return {
      success: false,
      error: 'SECURITY_STATS_ERROR',
      message: '보안 통계를 가져오는 중 오류가 발생했습니다.'
    };
  }
}

function generateSecurityAlerts(failedLogins, lockedAccounts, suspendedAccounts) {
  const alerts = [];
  
  // 과도한 실패한 로그인 시도
  if (failedLogins.length > 50) {
    alerts.push({
      level: 'high',
      type: 'excessive_failed_logins',
      message: `지난 24시간 동안 ${failedLogins.length}번의 실패한 로그인 시도가 있었습니다.`,
      count: failedLogins.length
    });
  }
  
  // 새로 잠긴 계정들
  const recentlyLocked = lockedAccounts.filter(account => {
    const updatedAt = new Date(account.updated_at);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return updatedAt > oneDayAgo;
  });
  
  if (recentlyLocked.length > 0) {
    alerts.push({
      level: 'medium',
      type: 'accounts_locked',
      message: `지난 24시간 동안 ${recentlyLocked.length}개의 계정이 잠겼습니다.`,
      count: recentlyLocked.length
    });
  }
  
  // 정지된 계정 알림
  if (suspendedAccounts.length > 0) {
    alerts.push({
      level: 'info',
      type: 'suspended_accounts',
      message: `현재 ${suspendedAccounts.length}개의 계정이 정지되어 있습니다.`,
      count: suspendedAccounts.length
    });
  }
  
  return alerts;
}

// ==================================================
// 패스워드 재설정
// ==================================================

function initiatePasswordReset(params) {
  try {
    const { email } = params;
    
    if (!email) {
      return {
        success: false,
        error: 'MISSING_EMAIL',
        message: '이메일을 입력해주세요.'
      };
    }
    
    const user = findRecord('users', { email: email.toLowerCase() });
    if (!user) {
      // 보안을 위해 사용자가 없어도 성공 응답
      return {
        success: true,
        message: '패스워드 재설정 링크를 이메일로 발송했습니다.'
      };
    }
    
    // 재설정 토큰 생성
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1시간
    
    // 토큰 저장 (캐시 사용)
    const resetKey = `password_reset_${user.id}`;
    setCachedData(resetKey, {
      token: resetToken,
      email: user.email,
      expiresAt: expiresAt.toISOString()
    }, 3600); // 1시간
    
    // 실제 구현에서는 이메일 발송
    // sendPasswordResetEmail(user.email, resetToken);
    
    logActivity('AUTH', 'Password reset initiated', { 
      userId: user.id,
      email: user.email
    });
    
    return {
      success: true,
      message: '패스워드 재설정 링크를 이메일로 발송했습니다.',
      // 개발 환경에서만 토큰 반환
      ...(APP_CONFIG.environment === 'development' && { resetToken: resetToken })
    };
    
  } catch (error) {
    console.error('Password reset initiation error:', error);
    return {
      success: false,
      error: 'RESET_ERROR',
      message: '패스워드 재설정 중 오류가 발생했습니다.'
    };
  }
}

function resetPassword(params) {
  try {
    const { token, newPassword, confirmPassword } = params;
    
    if (!token || !newPassword || !confirmPassword) {
      return {
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: '모든 필드를 입력해주세요.'
      };
    }
    
    if (newPassword !== confirmPassword) {
      return {
        success: false,
        error: 'PASSWORD_MISMATCH',
        message: '패스워드가 일치하지 않습니다.'
      };
    }
    
    // 패스워드 정책 검증
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: 'WEAK_PASSWORD',
        message: passwordValidation.message
      };
    }
    
    // 토큰 확인
    const cache = CacheService.getScriptCache();
    let resetData = null;
    
    // 모든 재설정 토큰을 확인 (사용자 ID를 모르므로)
    const users = findRecords('users', {});
    for (const user of users) {
      const resetKey = `password_reset_${user.id}`;
      const cached = getCachedData(resetKey);
      if (cached && cached.token === token) {
        resetData = cached;
        resetData.userId = user.id;
        cache.remove(resetKey);
        break;
      }
    }
    
    if (!resetData) {
      return {
        success: false,
        error: 'INVALID_TOKEN',
        message: '유효하지 않은 재설정 토큰입니다.'
      };
    }
    
    // 토큰 만료 확인
    const now = new Date();
    const expiresAt = new Date(resetData.expiresAt);
    if (now > expiresAt) {
      return {
        success: false,
        error: 'TOKEN_EXPIRED',
        message: '재설정 토큰이 만료되었습니다.'
      };
    }
    
    // 패스워드 업데이트
    const passwordHash = hashPassword(newPassword);
    updateRecord('users', { id: resetData.userId }, {
      password_hash: passwordHash,
      updated_at: new Date().toISOString()
    });
    
    // 모든 활성 세션 무효화
    const sessions = findRecords('sessions', { 
      user_id: resetData.userId, 
      is_active: true 
    });
    
    sessions.forEach(session => {
      updateRecord('sessions', { session_id: session.session_id }, {
        is_active: false
      });
    });
    
    logActivity('AUTH', 'Password reset completed', { 
      userId: resetData.userId,
      email: resetData.email
    });
    
    return {
      success: true,
      message: '패스워드가 성공적으로 재설정되었습니다. 새 패스워드로 로그인해주세요.'
    };
    
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: 'RESET_ERROR',
      message: '패스워드 재설정 중 오류가 발생했습니다.'
    };
  }
}

function generateResetToken() {
  return generateUniqueId() + '-reset-' + Date.now();
}

// ==================================================
// 세션 정리 및 유지보수
// ==================================================

function cleanupExpiredSessions() {
  try {
    const now = new Date().toISOString();
    const expiredSessions = findRecords('sessions', {
      expires_at: { $lt: now },
      is_active: true
    });
    
    let cleanedCount = 0;
    expiredSessions.forEach(session => {
      try {
        updateRecord('sessions', { session_id: session.session_id }, {
          is_active: false
        });
        cleanedCount++;
      } catch (error) {
        console.warn(`Failed to cleanup session ${session.session_id}:`, error);
      }
    });
    
    if (cleanedCount > 0) {
      logActivity('SYSTEM', 'Expired sessions cleaned', { count: cleanedCount });
    }
    
    return {
      success: true,
      cleaned: cleanedCount
    };
    
  } catch (error) {
    console.error('Session cleanup error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ==================================================
// 권한 관리
// ==================================================

function hasPermission(user, permission) {
  const rolePermissions = {
    admin: ['*'], // 모든 권한
    manager: [
      'portfolio:read', 'portfolio:write',
      'market:read', 'analysis:read',
      'notifications:read', 'notifications:write',
      'users:read'
    ],
    user: [
      'portfolio:read', 'portfolio:write',
      'market:read', 'analysis:read',
      'notifications:read'
    ]
  };
  
  const userPermissions = rolePermissions[user.role] || [];
  
  return userPermissions.includes('*') || userPermissions.includes(permission);
}

function requirePermission(user, permission) {
  if (!hasPermission(user, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

// ==================================================
// API 키 관리
// ==================================================

function generateApiKey(params) {
  try {
    const { userId, name, permissions = [] } = params;
    
    const user = findRecord('users', { id: userId });
    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.'
      };
    }
    
    const apiKey = 'bip_' + generateUniqueId();
    const hashedKey = hashPassword(apiKey);
    
    // API 키 저장 (별도 테이블 필요 시 구현)
    const keyData = {
      api_key: hashedKey,
      name: name,
      permissions: JSON.stringify(permissions),
      is_active: true
    };
    
    updateRecord('users', { id: userId }, {
      api_key: hashedKey,
      api_key_name: name,
      api_key_permissions: JSON.stringify(permissions)
    });
    
    logActivity('AUTH', 'API key generated', { 
      userId: userId,
      keyName: name
    });
    
    return {
      success: true,
      data: {
        apiKey: apiKey, // 한 번만 표시
        name: name,
        permissions: permissions
      },
      message: 'API 키가 생성되었습니다. 안전한 곳에 보관하세요.'
    };
    
  } catch (error) {
    console.error('API key generation error:', error);
    return {
      success: false,
      error: 'KEY_GENERATION_ERROR',
      message: 'API 키 생성 중 오류가 발생했습니다.'
    };
  }
}

// ==================================================
// 로깅 및 활동 기록
// ==================================================

function logActivity(level, action, details = {}) {
  try {
    insertRecord('activity_logs', {
      user_id: details.userId || getCurrentUserId() || 'system',
      action: action,
      details: JSON.stringify(details),
      ip_address: '', // GAS에서는 직접 얻을 수 없음
      user_agent: '', // GAS에서는 직접 얻을 수 없음
      level: level
    });
  } catch (error) {
    console.error('Activity logging error:', error);
  }
}

function getLogs(params) {
  try {
    const { 
      page = 1, 
      limit = 100, 
      level = '', 
      action = '',
      userId = '',
      startDate = '',
      endDate = ''
    } = params;
    
    let criteria = {};
    
    if (level) criteria.level = level;
    if (action) criteria.action = { $regex: action };
    if (userId) criteria.user_id = userId;
    
    if (startDate) {
      criteria.created_at = criteria.created_at || {};
      criteria.created_at.$gte = startDate;
    }
    
    if (endDate) {
      criteria.created_at = criteria.created_at || {};
      criteria.created_at.$lte = endDate;
    }
    
    const logs = findRecords('activity_logs', criteria, {
      sort: { created_at: -1 },
      limit: limit * page
    });
    
    // details JSON 파싱
    const parsedLogs = logs.map(log => {
      try {
        log.details = JSON.parse(log.details || '{}');
      } catch (error) {
        log.details = {};
      }
      return log;
    });
    
    return {
      success: true,
      data: {
        logs: parsedLogs.slice((page - 1) * limit, page * limit),
        pagination: {
          page: page,
          limit: limit,
          total: parsedLogs.length,
          totalPages: Math.ceil(parsedLogs.length / limit)
        }
      }
    };
    
  } catch (error) {
    console.error('Get logs error:', error);
    return {
      success: false,
      error: 'FETCH_LOGS_ERROR',
      message: '로그를 가져오는 중 오류가 발생했습니다.'
    };
  }
}

// 주기적 정리 작업을 위한 트리거 설정
function setupPeriodicCleanup() {
  // 매일 자정에 실행되는 트리거 설정
  ScriptApp.newTrigger('performDailyCleanup')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .create();
}

function performDailyCleanup() {
  try {
    // 만료된 세션 정리
    cleanupExpiredSessions();
    
    // 30일 이상된 로그 정리
    cleanupOldLogs(30);
    
    // 캐시 정리
    CacheService.getScriptCache().removeAll();
    
    logActivity('SYSTEM', 'Daily cleanup completed', {
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Daily cleanup error:', error);
    logActivity('ERROR', 'Daily cleanup failed', {
      error: error.toString()
    });
  }
}
        user: sanitizeUserData(user),
        session: {
          token: session.token,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt
        }
      },
      message: '로그인되었습니다.'
    };
    
  } catch (error) {
    console.error('Login error:', error);
    logActivity('ERROR', 'Login system error', { error: error.toString() });
    
    return {
      success: false,
      error: 'SYSTEM_ERROR',
      message: '로그인 중 시스템 오류가 발생했습니다.'
    };
  }
}

function handleRegister(params) {
  try {
    const { email, password, confirmPassword, username, fullName, phone, terms = false } = params;
    
    // 필수 필드 검증
    if (!email || !password || !confirmPassword || !username || !terms) {
      return {
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: '필수 정보를 모두 입력해주세요.'
      };
    }
    
    // 약관 동의 확인
    if (!terms) {
      return {
        success: false,
        error: 'TERMS_NOT_AGREED',
        message: '이용약관에 동의해주세요.'
      };
    }
    
    // 이메일 형식 검증
    if (!isValidEmail(email)) {
      return {
        success: false,
        error: 'INVALID_EMAIL',
        message: '올바른 이메일 형식이 아닙니다.'
      };
    }
    
    // 패스워드 확인
    if (password !== confirmPassword) {
      return {
        success: false,
        error: 'PASSWORD_MISMATCH',
        message: '패스워드가 일치하지 않습니다.'
      };
    }
    
    // 패스워드 정책 검증
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: 'WEAK_PASSWORD',
        message: passwordValidation.message
      };
    }
    
    // 중복 확인
    const existingUser = findRecord('users', { email: email.toLowerCase() });
    if (existingUser) {
      return {
        success: false,
        error: 'EMAIL_ALREADY_EXISTS',
        message: '이미 사용 중인 이메일입니다.'
      };
    }
    
    const existingUsername = findRecord('users', { username: username.toLowerCase() });
    if (existingUsername) {
      return {
        success: false,
        error: 'USERNAME_ALREADY_EXISTS',
        message: '이미 사용 중인 사용자명입니다.'
      };
    }
    
    // 사용자 생성
    const userId = generateUniqueId();
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();
    
    const userData = {
      id: userId,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password_hash: passwordHash,
      full_name: fullName || '',
      phone: phone || '',
      created_at: now,
      updated_at: now,
      last_login: null,
      status: 'active',
      role: 'user',
      email_verified: false,
      two_factor_enabled: false,
      preferences: JSON.stringify({
        theme: 'dark',
        language: 'ko',
        notifications: {
          email: true,
          push: true,
          priceAlerts: true
        }
      })
    };
    
    // 데이터베이스에 저장
    const insertResult = insertRecord('users', userData);
    if (!insertResult.success) {
      throw new Error('Failed to create user');
    }
    
    // 초기 포트폴리오 요약 생성
    insertRecord('portfolio_summary', {
      user_id: userId,
      total_value: 0,
      total_invested: 0,
      total_profit_loss: 0,
      profit_loss_percentage: 0,
      last_updated: now,
      asset_count: 0
    });
    
    // 환영 알림 생성
    insertRecord('notifications', {
      user_id: userId,
      type: 'welcome',
      title: '환영합니다!',
      message: '블록체인 투자 플랫폼에 가입해주셔서 감사합니다. 포트폴리오 관리를 시작해보세요.',
      data: JSON.stringify({}),
      is_read: false
    });
    
    // 활동 로그
    logActivity('AUTH', 'User registered', { 
      userId: userId, 
      email: userData.email,
      username: userData.username
    });
    
    return {
      success: true,
      data: {
        userId: userId,
        email: userData.email,
        username: userData.username
      },
      message: '회원가입이 완료되었습니다. 로그인해주세요.'
    };
    
  } catch (error) {
    console.error('Registration error:', error);
    logActivity('ERROR', 'Registration system error', { error: error.toString() });
    
    return {
      success: false,
      error: 'SYSTEM_ERROR',
      message: '회원가입 중 시스템 오류가 발생했습니다.'
    };
  }
}

function handleLogout(params) {
  try {
    const { sessionId, token } = params;
    
    // 세션 무효화
    if (sessionId) {
      updateRecord('sessions', { session_id: sessionId }, {
        is_active: false,
        updated_at: new Date().toISOString()
      });
    } else if (token) {
      // 토큰으로 세션 찾기
      const session = findRecord('sessions', { token: token });
      if (session) {
        updateRecord('sessions', { session_id: session.session_id }, {
          is_active: false,
          updated_at: new Date().toISOString()
        });
      }
    }
    
    logActivity('AUTH', 'User logged out', { sessionId, token: token ? '***' : null });
    
    return {
      success: true,
      message: '로그아웃되었습니다.'
    };
    
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: 'LOGOUT_ERROR',
      message: '로그아웃 중 오류가 발생했습니다.'
    };
  }
}

// ==================================================
// 세션 관리
// ==================================================

function createSession(user, remember = false) {
  try {
    const sessionId = generateUniqueId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (remember ? 7 * 24 * 60 * 60 * 1000 : AUTH_CONFIG.session.timeout));
    
    // JWT 토큰 생성
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: sessionId,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000)
    };
    
    const token = generateJWT(tokenPayload);
    const refreshToken = generateRefreshToken();
    
    // 기존 세션 수 확인 및 정리
    const existingSessions = findRecords('sessions', { 
      user_id: user.id, 
      is_active: true 
    });
    
    if (existingSessions.length >= AUTH_CONFIG.session.maxConcurrentSessions) {
      // 가장 오래된 세션 무효화
      const oldestSession = existingSessions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
      updateRecord('sessions', { session_id: oldestSession.session_id }, {
        is_active: false
      });
    }
    
    // 새 세션 저장
    insertRecord('sessions', {
      session_id: sessionId,
      user_id: user.id,
      token: token,
      refresh_token: refreshToken,
      expires_at: expiresAt.toISOString(),
      ip_address: '', // GAS에서는 IP 주소를 직접 얻을 수 없음
      user_agent: '', // GAS에서는 User Agent를 직접 얻을 수 없음
      is_active: true
    });
    
    return {
      sessionId,
      token,
      refreshToken,
      expiresAt: expiresAt.toISOString()
    };
    
  } catch (error) {
    console.error('Session creation error:', error);
    throw error;
  }
}

function validateAuth(params) {
  try {
    const { authorization, token } = params;
    const authToken = authorization?.replace('Bearer ', '') || token;
    
    if (!authToken) {
      return { valid: false, error: 'NO_TOKEN' };
    }
    
    // JWT 토큰 검증
    const decoded = verifyJWT(authToken);
    if (!decoded) {
      return { valid: false, error: 'INVALID_TOKEN' };
    }
    
    // 세션 확인
    const session = findRecord('sessions', { 
      session_id: decoded.sessionId,
      is_active: true 
    });
    
    if (!session) {
      return { valid: false, error: 'SESSION_NOT_FOUND' };
    }
    
    // 만료 확인
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    
    if (now > expiresAt) {
      // 세션 무효화
      updateRecord('sessions', { session_id: session.session_id }, {
        is_active: false
      });
      return { valid: false, error: 'SESSION_EXPIRED' };
    }
    
    // 사용자 확인
    const user = findRecord('users', { id: decoded.userId });
    if (!user || user.status !== 'active') {
      return { valid: false, error: 'USER_INVALID' };
    }
    
    return { 
      valid: true, 
      userId: decoded.userId,
      user: user,
      session: session
    };
    
  } catch (error) {
    console.error('Auth validation error:', error);
    return { valid: false, error: 'VALIDATION_ERROR' };
  }
}

function refreshToken(params) {
  try {
    const { refreshToken } = params;
    
    if (!refreshToken) {
      return {
        success: false,
        error: 'MISSING_REFRESH_TOKEN',
        message: '리프레시 토큰이 필요합니다.'
      };
    }
    
    // 리프레시 토큰으로 세션 찾기
    const session = findRecord('sessions', { 
      refresh_token: refreshToken,
      is_active: true 
    });
    
    if (!session) {
      return {
        success: false,
        error: 'INVALID_REFRESH_TOKEN',
        message: '유효하지 않은 리프레시 토큰입니다.'
      };
    }
    
    // 사용자 정보 가져오기
    const user = findRecord('users', { id: session.user_id });
    if (!user || user.status !== 'active') {
      return {
        success: false,
        error: 'USER_INVALID',
        message: '사용자 계정이 유효하지 않습니다.'
      };
    }
    
    // 새 토큰 생성
    const now = new Date();
    const expiresAt = new Date(now.getTime() + AUTH_CONFIG.session.timeout);
    
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.session_id,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000)
    };
    
    const newToken = generateJWT(tokenPayload);
    const newRefreshToken = generateRefreshToken();
    
    // 세션 업데이트
    updateRecord('sessions', { session_id: session.session_id }, {
      token: newToken,
      refresh_token: newRefreshToken,
      expires_at: expiresAt.toISOString()
    });
    
    logActivity('AUTH', 'Token refreshed', { 
      userId: user.id,
      sessionId: session.session_id
    });
    
    return {
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresAt: expiresAt.toISOString()
      }
    };
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      success: false,
      error: 'REFRESH_ERROR',
      message: '토큰 갱신 중 오류가 발생했습니다.'
    };
  }
}

// ==================================================
// 패스워드 관리
// ==================================================

function hashPassword(password) {
  // Google Apps Script에는 bcrypt가 없으므로 SHA-256 + 솔트 사용
  const salt = generateSalt();
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + salt,
    Utilities.Charset.UTF_8
  );
  
  const hashString = hash.map(byte => (byte + 256).toString(16).slice(-2)).join('');
  return `${salt}:${hashString}`;
}

function verifyPassword(password, hash) {
  try {
    const [salt, storedHash] = hash.split(':');
    const computedHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      password + salt,
      Utilities.Charset.UTF_8
    );
    
    const computedHashString = computedHash.map(byte => (byte + 256).toString(16).slice(-2)).join('');
    return computedHashString === storedHash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

function validatePassword(password) {
  const errors = [];
  
  if (password.length < AUTH_CONFIG.password.minLength) {
    errors.push(`최소 ${AUTH_CONFIG.password.minLength}자 이상`);
  }
  
  if (AUTH_CONFIG.password.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('대문자 포함');
  }
  
  if (AUTH_CONFIG.password.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('소문자 포함');
  }
  
  if (AUTH_CONFIG.password.requireNumbers && !/\d/.test(password)) {
    errors.push('숫자 포함');
  }
  
  if (AUTH_CONFIG.password.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('특수문자 포함');
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? `패스워드는 ${errors.join(', ')}해야 합니다.` : '유효한 패스워드입니다.'
  };
}

function generateSalt() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let salt = '';
  for (let i = 0; i < 16; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

// ==================================================
// JWT 토큰 관리
// ==================================================

function generateJWT(payload) {
  try {
    // 간단한 JWT 구현 (프로덕션에서는 더 강력한 라이브러리 사용 권장)
    const header = {
      alg: AUTH_CONFIG.jwt.algorithm,
      typ: 'JWT'
    };
    
    const encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header));
    const encodedPayload = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
    
    const signature = Utilities.computeHmacSignature(
      Utilities.MacAlgorithm.HMAC_SHA_256,
      encodedHeader + '.' + encodedPayload,
      AUTH_CONFIG.jwt.secret
    );
    
    const encodedSignature = Utilities.base64EncodeWebSafe(signature);
    
    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  } catch (error) {
    console.error('JWT generation error:', error);
    throw error;
  }
}

function verifyJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    
    // 서명 검증
    const expectedSignature = Utilities.computeHmacSignature(
      Utilities.MacAlgorithm.HMAC_SHA_256,
      encodedHeader + '.' + encodedPayload,
      AUTH_CONFIG.jwt.secret
    );
    
    const expectedEncodedSignature = Utilities.base64EncodeWebSafe(expectedSignature);
    
    if (expectedEncodedSignature !== encodedSignature) {
      return null;
    }
    
    // 페이로드 디코딩
    const payloadJson = Utilities.newBlob(Utilities.base64DecodeWebSafe(encodedPayload)).getDataAsString();
    const payload = JSON.parse(payloadJson);
    
    // 만료 시간 확인
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

function generateRefreshToken() {
  return generateUniqueId() + '-' + Date.now();
}

function generateTempToken(userId) {
  const payload = {
    userId: userId,
    type: 'temp',
    exp: Math.floor((Date.now() + 10 * 60 * 1000) / 1000) // 10분
  };
  return generateJWT(payload);
}

// ==================================================
// 로그인 시도 관리
// ==================================================

function getLoginAttempts(userId) {
  const cacheKey = `login_attempts_${userId}`;
  const cached = getCachedData(cacheKey);
  
  if (cached) {
    const now = Date.now();
    const timeSinceLastAttempt = now - cached.lastAttempt;
    
    // 리셋 기간이 지났으면 시도 횟수 초기화
    if (timeSinceLastAttempt > AUTH_CONFIG.lockout.resetAttemptsPeriod) {
      setCachedData(cacheKey, { attempts: 0, lastAttempt: now });
      return { attempts: 0, isLocked: false };
    }
    
    // 잠금 상태 확인
    const isLocked = cached.attempts >= AUTH_CONFIG.lockout.maxAttempts;
    const lockoutRemaining = isLocked ? 
      AUTH_CONFIG.lockout.lockoutDuration - timeSinceLastAttempt : 0;
    
    return {
      attempts: cached.attempts,
      isLocked: isLocked && lockoutRemaining > 0,
      lockoutRemaining: Math.max(0, lockoutRemaining)
    };
  }
  
  return { attempts: 0, isLocked: false };
}

function recordFailedLogin(userId) {
  const cacheKey = `login_attempts_${userId}`;
  const current = getLoginAttempts(userId);
  
  setCachedData(cacheKey, {
    attempts: current.attempts + 1,
    lastAttempt: Date.now()
  }, 1800); // 30분 캐시
  
  // 로그 기록
  logActivity('AUTH', 'Failed login attempt', { 
    userId: userId,
    attempts: current.attempts + 1
  });
}

function clearLoginAttempts(userId) {
  const cacheKey = `login_attempts_${userId}`;
  setCachedData(cacheKey, { attempts: 0, lastAttempt: Date.now() });
}

// ==================================================
// 2단계 인증 (2FA)
// ==================================================

function verify2FAToken(userId, token) {
  try {
    // 실제 구현에서는 TOTP 라이브러리를 사용해야 함
    // 여기서는 간단한 시간 기반 토큰 시뮬레이션
    const cacheKey = `2fa_token_${userId}`;
    const cachedToken = getCachedData(cacheKey);
    
    if (cachedToken && cachedToken.token === token) {
      // 토큰 사용 후 삭제
      CacheService.getScriptCache().remove(cacheKey);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('2FA verification error:', error);
    return false;
  }
}

function generate2FAToken(userId) {
  try {
    // 6자리 랜덤 숫자 생성
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const cacheKey = `2fa_token_${userId}`;
    
    setCachedData(cacheKey, {
      token: token,
      created: Date.now()
    }, 300); // 5분
    
    return token;
  } catch (error) {
    console.error('2FA token generation error:', error);
    return null;
  }
}

// ==================================================
// 유틸리티 함수들
// ==================================================

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sanitizeUserData(user) {
  const { password_hash, ...safeUser } = user;
  
  // preferences JSON 파싱
  if (safeUser.preferences) {
    try {
      safeUser.preferences = JSON.parse(safeUser.preferences);
    } catch (error) {
      safeUser.preferences = {};
    }
  }
  
  return safeUser;
}

// ==================================================
// 관리자 함수들
// ==================================================

function getUsers(params) {
  try {
    const { page = 1, limit = 50, search = '', status = '' } = params;
    let criteria = {};
    
    if (search) {
      criteria.email = { $regex: search };
    }
    
    if (status) {
      criteria.status = status;
    }
    
    const users = findRecords('users', criteria, {
      sort: { created_at: -1 },
      limit: limit * page
    });
    
    // 패스워드 해시 제거
    const safeUsers = users.map(sanitizeUserData);
    
    return {
      success: true,
      data: {