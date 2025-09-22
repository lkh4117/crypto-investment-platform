/**
 * 블록체인 투자 플랫폼 - 인증 및 보안 시스템
 * Google Apps Script 백엔드용 인증 모듈
 * 
 * 주요 기능:
 * - JWT 토큰 기반 인증
 * - 세션 관리
 * - 패스워드 보안
 * - 사용자 권한 관리
 * - 2단계 인증 지원
 * - 보안 로깅
 */

// ===== 전역 설정 =====

const AUTH_CONFIG = {
  JWT_SECRET: PropertiesService.getScriptProperties().getProperty('JWT_SECRET') || 'blockchain-platform-secret',
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24시간
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7일
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30분
  SESSION_TIMEOUT: 60 * 60 * 1000, // 1시간
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_UPPER: true,
  PASSWORD_REQUIRE_LOWER: true,
  PASSWORD_REQUIRE_DIGIT: true,
  PASSWORD_REQUIRE_SPECIAL: true
};

// ===== 인증 핵심 함수들 =====

/**
 * 사용자 로그인 처리
 */
function handleLogin(params) {
  try {
    const { email, password, rememberMe = false } = params;
    
    // 입력 검증
    if (!email || !password) {
      return {
        success: false,
        error: 'MISSING_CREDENTIALS',
        message: '이메일과 비밀번호를 입력해주세요.'
      };
    }
    
    // 이메일 형식 검증
    if (!isValidEmail(email)) {
      return {
        success: false,
        error: 'INVALID_EMAIL',
        message: '유효하지 않은 이메일 형식입니다.'
      };
    }
    
    // 계정 잠금 상태 확인
    const lockStatus = checkAccountLockStatus(email);
    if (lockStatus.isLocked) {
      return {
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: `계정이 잠겨있습니다. ${Math.ceil(lockStatus.remainingTime / 60000)}분 후 다시 시도해주세요.`
      };
    }
    
    // 사용자 조회
    const user = findRecord('users', { email: email });
    if (!user) {
      recordFailedLogin(email);
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      };
    }
    
    // 계정 상태 확인
    if (user.status === 'suspended') {
      return {
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        message: '계정이 일시 정지되었습니다. 관리자에게 문의하세요.'
      };
    }
    
    if (user.status === 'deleted') {
      return {
        success: false,
        error: 'ACCOUNT_DELETED',
        message: '삭제된 계정입니다.'
      };
    }
    
    // 비밀번호 검증
    const passwordValid = verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      recordFailedLogin(email);
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      };
    }
    
    // 로그인 성공 처리
    clearFailedLoginAttempts(email);
    
    // JWT 토큰 생성
    const accessToken = generateJWTToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'user'
    });
    
    const refreshToken = generateRefreshToken(user.id);
    
    // 세션 생성
    const sessionId = createUserSession({
      userId: user.id,
      email: user.email,
      rememberMe: rememberMe,
      ipAddress: getCurrentIP(),
      userAgent: getCurrentUserAgent()
    });
    
    // 마지막 로그인 시간 업데이트
    updateRecord('users', { id: user.id }, {
      last_login: getCurrentTimestamp(),
      login_count: (user.login_count || 0) + 1
    });
    
    // 로그인 성공 로그
    logActivity('AUTH', 'User login success', {
      userId: user.id,
      email: user.email,
      sessionId: sessionId
    });
    
    return {
      success: true,
      data: {
        user: sanitizeUserData(user),
        tokens: {
          accessToken: accessToken,
          refreshToken: refreshToken
        },
        sessionId: sessionId
      },
      message: '로그인되었습니다.'
    };
    
  } catch (error) {
    console.error('Login error:', error);
    logActivity('ERROR', 'Login failed', { error: error.toString() });
    return {
      success: false,
      error: 'LOGIN_ERROR',
      message: '로그인 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 사용자 회원가입 처리
 */
function handleRegister(params) {
  try {
    const { email, password, confirmPassword, username, terms } = params;
    
    // 입력 검증
    if (!email || !password || !confirmPassword || !username) {
      return {
        success: false,
        error: 'MISSING_FIELDS',
        message: '모든 필수 항목을 입력해주세요.'
      };
    }
    
    // 이메일 형식 검증
    if (!isValidEmail(email)) {
      return {
        success: false,
        error: 'INVALID_EMAIL',
        message: '유효하지 않은 이메일 형식입니다.'
      };
    }
    
    // 비밀번호 일치 확인
    if (password !== confirmPassword) {
      return {
        success: false,
        error: 'PASSWORD_MISMATCH',
        message: '비밀번호가 일치하지 않습니다.'
      };
    }
    
    // 비밀번호 강도 검증
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: 'WEAK_PASSWORD',
        message: passwordValidation.message
      };
    }
    
    // 약관 동의 확인
    if (!terms) {
      return {
        success: false,
        error: 'TERMS_NOT_ACCEPTED',
        message: '이용약관에 동의해주세요.'
      };
    }
    
    // 이메일 중복 확인
    const existingUser = findRecord('users', { email: email });
    if (existingUser) {
      return {
        success: false,
        error: 'EMAIL_EXISTS',
        message: '이미 등록된 이메일입니다.'
      };
    }
    
    // 사용자명 중복 확인
    const existingUsername = findRecord('users', { username: username });
    if (existingUsername) {
      return {
        success: false,
        error: 'USERNAME_EXISTS',
        message: '이미 사용 중인 사용자명입니다.'
      };
    }
    
    // 비밀번호 해시 생성
    const passwordHash = hashPassword(password);
    if (!passwordHash) {
      return {
        success: false,
        error: 'HASH_ERROR',
        message: '회원가입 처리 중 오류가 발생했습니다.'
      };
    }
    
    // 새 사용자 생성
    const userId = generateUniqueId();
    const newUser = {
      id: userId,
      email: email,
      username: username,
      password_hash: passwordHash,
      role: 'user',
      status: 'active',
      email_verified: false,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
      login_count: 0,
      preferences: JSON.stringify({
        theme: 'light',
        currency: 'KRW',
        notifications: true,
        language: 'ko'
      })
    };
    
    // 사용자 저장
    const success = insertRecord('users', newUser);
    if (!success) {
      return {
        success: false,
        error: 'SAVE_ERROR',
        message: '회원가입 처리 중 오류가 발생했습니다.'
      };
    }
    
    // 기본 포트폴리오 생성
    createDefaultPortfolio(userId);
    
    // 회원가입 성공 로그
    logActivity('AUTH', 'User registration success', {
      userId: userId,
      email: email,
      username: username
    });
    
    // 환영 이메일 발송 (선택적)
    try {
      sendWelcomeEmail(email, username);
    } catch (emailError) {
      console.warn('Welcome email failed:', emailError);
    }
    
    return {
      success: true,
      data: {
        userId: userId,
        email: email,
        username: username
      },
      message: '회원가입이 완료되었습니다.'
    };
    
  } catch (error) {
    console.error('Registration error:', error);
    logActivity('ERROR', 'Registration failed', { error: error.toString() });
    return {
      success: false,
      error: 'REGISTRATION_ERROR',
      message: '회원가입 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 토큰 검증
 */
function verifyToken(params) {
  try {
    const { token } = params;
    
    if (!token) {
      return {
        success: false,
        error: 'MISSING_TOKEN',
        message: '토큰이 제공되지 않았습니다.'
      };
    }
    
    const decoded = verifyJWTToken(token);
    if (!decoded) {
      return {
        success: false,
        error: 'INVALID_TOKEN',
        message: '유효하지 않은 토큰입니다.'
      };
    }
    
    // 사용자 존재 확인
    const user = findRecord('users', { id: decoded.userId });
    if (!user || user.status !== 'active') {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.'
      };
    }
    
    return {
      success: true,
      data: {
        user: sanitizeUserData(user),
        tokenData: decoded
      }
    };
    
  } catch (error) {
    console.error('Token verification error:', error);
    return {
      success: false,
      error: 'TOKEN_ERROR',
      message: '토큰 검증 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 토큰 갱신
 */
function refreshToken(params) {
  try {
    const { refreshToken } = params;
    
    if (!refreshToken) {
      return {
        success: false,
        error: 'MISSING_REFRESH_TOKEN',
        message: '리프레시 토큰이 제공되지 않았습니다.'
      };
    }
    
    // 리프레시 토큰 검증
    const tokenData = findRecord('refresh_tokens', { token: refreshToken });
    if (!tokenData || tokenData.expires_at < getCurrentTimestamp()) {
      return {
        success: false,
        error: 'INVALID_REFRESH_TOKEN',
        message: '유효하지 않거나 만료된 리프레시 토큰입니다.'
      };
    }
    
    // 사용자 확인
    const user = findRecord('users', { id: tokenData.user_id });
    if (!user || user.status !== 'active') {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.'
      };
    }
    
    // 새 액세스 토큰 생성
    const newAccessToken = generateJWTToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'user'
    });
    
    // 리프레시 토큰 갱신
    const newRefreshToken = generateRefreshToken(user.id);
    
    // 기존 리프레시 토큰 무효화
    updateRecord('refresh_tokens', { token: refreshToken }, {
      is_active: false
    });
    
    logActivity('AUTH', 'Token refreshed', {
      userId: user.id,
      email: user.email
    });
    
    return {
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
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

/**
 * 로그아웃 처리
 */
function handleLogout(params) {
  try {
    const { token, sessionId } = params;
    
    // 토큰에서 사용자 정보 추출
    if (token) {
      const decoded = verifyJWTToken(token);
      if (decoded) {
        // 모든 세션 무효화 (선택적)
        const sessions = findRecords('user_sessions', { 
          user_id: decoded.userId, 
          is_active: true 
        });
        
        sessions.forEach(session => {
          updateRecord('user_sessions', { session_id: session.session_id }, {
            is_active: false,
            logout_at: getCurrentTimestamp()
          });
        });
        
        // 리프레시 토큰 무효화
        updateRecord('refresh_tokens', { user_id: decoded.userId }, {
          is_active: false
        });
        
        logActivity('AUTH', 'User logout', {
          userId: decoded.userId,
          sessionId: sessionId
        });
      }
    }
    
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

/**
 * 비밀번호 재설정 요청
 */
function requestPasswordReset(params) {
  try {
    const { email } = params;
    
    if (!email || !isValidEmail(email)) {
      return {
        success: false,
        error: 'INVALID_EMAIL',
        message: '유효한 이메일 주소를 입력해주세요.'
      };
    }
    
    const user = findRecord('users', { email: email });
    if (!user) {
      // 보안상 이유로 성공 응답 반환 (이메일 존재 여부 숨김)
      return {
        success: true,
        message: '비밀번호 재설정 링크가 이메일로 전송되었습니다.'
      };
    }
    
    // 재설정 토큰 생성
    const resetToken = generateSecureToken(32);
    const resetTokenExpiry = getCurrentTimestamp() + (60 * 60 * 1000); // 1시간
    
    // 토큰 저장
    const tokenData = {
      token: resetToken,
      user_id: user.id,
      type: 'password_reset',
      expires_at: resetTokenExpiry,
      created_at: getCurrentTimestamp(),
      is_used: false
    };
    
    insertRecord('auth_tokens', tokenData);
    
    // 재설정 이메일 발송
    try {
      sendPasswordResetEmail(email, resetToken, user.username);
    } catch (emailError) {
      console.warn('Password reset email failed:', emailError);
      return {
        success: false,
        error: 'EMAIL_SEND_ERROR',
        message: '이메일 전송 중 오류가 발생했습니다.'
      };
    }
    
    logActivity('AUTH', 'Password reset requested', {
      userId: user.id,
      email: email
    });
    
    return {
      success: true,
      message: '비밀번호 재설정 링크가 이메일로 전송되었습니다.'
    };
    
  } catch (error) {
    console.error('Password reset request error:', error);
    return {
      success: false,
      error: 'RESET_REQUEST_ERROR',
      message: '비밀번호 재설정 요청 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 비밀번호 재설정 실행
 */
function resetPassword(params) {
  try {
    const { token, newPassword, confirmPassword } = params;
    
    // 입력 검증
    if (!token || !newPassword || !confirmPassword) {
      return {
        success: false,
        error: 'MISSING_FIELDS',
        message: '모든 필수 항목을 입력해주세요.'
      };
    }
    
    if (newPassword !== confirmPassword) {
      return {
        success: false,
        error: 'PASSWORD_MISMATCH',
        message: '비밀번호가 일치하지 않습니다.'
      };
    }
    
    // 비밀번호 강도 검증
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: 'WEAK_PASSWORD',
        message: passwordValidation.message
      };
    }
    
    // 토큰 검증
    const tokenData = findRecord('auth_tokens', { 
      token: token, 
      type: 'password_reset',
      is_used: false 
    });
    
    if (!tokenData || tokenData.expires_at < getCurrentTimestamp()) {
      return {
        success: false,
        error: 'INVALID_TOKEN',
        message: '유효하지 않거나 만료된 토큰입니다.'
      };
    }
    
    // 사용자 확인
    const user = findRecord('users', { id: tokenData.user_id });
    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.'
      };
    }
    
    // 새 비밀번호 해시 생성
    const newPasswordHash = hashPassword(newPassword);
    if (!newPasswordHash) {
      return {
        success: false,
        error: 'HASH_ERROR',
        message: '비밀번호 처리 중 오류가 발생했습니다.'
      };
    }
    
    // 비밀번호 업데이트
    updateRecord('users', { id: user.id }, {
      password_hash: newPasswordHash,
      updated_at: getCurrentTimestamp()
    });
    
    // 토큰 사용 처리
    updateRecord('auth_tokens', { token: token }, {
      is_used: true,
      used_at: getCurrentTimestamp()
    });
    
    // 모든 세션 무효화 (보안상)
    const sessions = findRecords('user_sessions', { user_id: user.id, is_active: true });
    sessions.forEach(session => {
      updateRecord('user_sessions', { session_id: session.session_id }, {
        is_active: false
      });
    });
    
    logActivity('AUTH', 'Password reset completed', {
      userId: user.id,
      email: user.email
    });
    
    return {
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    };
    
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: 'RESET_ERROR',
      message: '비밀번호 재설정 중 오류가 발생했습니다.'
    };
  }
}

// ===== JWT 토큰 관리 =====

/**
 * JWT 토큰 생성
 */
function generateJWTToken(payload) {
  try {
    const header = {
      typ: 'JWT',
      alg: 'HS256'
    };
    
    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24시간
    };
    
    const encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header));
    const encodedPayload = Utilities.base64EncodeWebSafe(JSON.stringify(tokenPayload));
    
    const signature = Utilities.computeHmacSha256Signature(
      encodedHeader + '.' + encodedPayload,
      AUTH_CONFIG.JWT_SECRET
    );
    
    const encodedSignature = Utilities.base64EncodeWebSafe(signature);
    
    return encodedHeader + '.' + encodedPayload + '.' + encodedSignature;
    
  } catch (error) {
    console.error('JWT generation error:', error);
    return null;
  }
}

/**
 * JWT 토큰 검증
 */
function verifyJWTToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    
    // 서명 검증
    const expectedSignature = Utilities.computeHmacSha256Signature(
      encodedHeader + '.' + encodedPayload,
      AUTH_CONFIG.JWT_SECRET
    );
    
    const expectedEncodedSignature = Utilities.base64EncodeWebSafe(expectedSignature);
    
    if (encodedSignature !== expectedEncodedSignature) {
      return null;
    }
    
    // 페이로드 디코딩
    const payload = JSON.parse(Utilities.newBlob(
      Utilities.base64DecodeWebSafe(encodedPayload)
    ).getDataAsString());
    
    // 만료 시간 확인
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
    
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * 리프레시 토큰 생성
 */
function generateRefreshToken(userId) {
  try {
    const token = generateSecureToken(64);
    const expiresAt = getCurrentTimestamp() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY;
    
    // 기존 리프레시 토큰 무효화
    updateRecord('refresh_tokens', { user_id: userId }, { is_active: false });
    
    // 새 리프레시 토큰 저장
    const tokenData = {
      token: token,
      user_id: userId,
      expires_at: expiresAt,
      created_at: getCurrentTimestamp(),
      is_active: true
    };
    
    insertRecord('refresh_tokens', tokenData);
    
    return token;
    
  } catch (error) {
    console.error('Refresh token generation error:', error);
    return null;
  }
}

// ===== 세션 관리 =====

/**
 * 사용자 세션 생성
 */
function createUserSession(sessionData) {
  try {
    const sessionId = generateSecureToken(32);
    const expiresAt = getCurrentTimestamp() + AUTH_CONFIG.SESSION_TIMEOUT;
    
    const session = {
      session_id: sessionId,
      user_id: sessionData.userId,
      ip_address: sessionData.ipAddress || 'unknown',
      user_agent: sessionData.userAgent || 'unknown',
      created_at: getCurrentTimestamp(),
      expires_at: expiresAt,
      is_active: true,
      remember_me: sessionData.rememberMe || false
    };
    
    insertRecord('user_sessions', session);
    
    return sessionId;
    
  } catch (error) {
    console.error('Session creation error:', error);
    return null;
  }
}

/**
 * 세션 검증
 */
function validateSession(sessionId) {
  try {
    const session = findRecord('user_sessions', { 
      session_id: sessionId, 
      is_active: true 
    });
    
    if (!session) {
      return { valid: false, reason: 'SESSION_NOT_FOUND' };
    }
    
    if (session.expires_at < getCurrentTimestamp()) {
      // 만료된 세션 무효화
      updateRecord('user_sessions', { session_id: sessionId }, {
        is_active: false
      });
      return { valid: false, reason: 'SESSION_EXPIRED' };
    }
    
    // 세션 활동 시간 업데이트
    updateRecord('user_sessions', { session_id: sessionId }, {
      last_activity: getCurrentTimestamp()
    });
    
    return {
      valid: true,
      session: session
    };
    
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, reason: 'SESSION_ERROR' };
  }
}

// ===== 보안 기능들 =====

/**
 * 계정 잠금 상태 확인
 */
function checkAccountLockStatus(email) {
  try {
    const attempts = findRecord('login_attempts', { email: email });
    if (!attempts) {
      return { isLocked: false, remainingTime: 0 };
    }
    
    if (attempts.attempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
      const lockTime = attempts.last_attempt + AUTH_CONFIG.LOCKOUT_DURATION;
      const currentTime = getCurrentTimestamp();
      
      if (currentTime < lockTime) {
        return {
          isLocked: true,
          remainingTime: lockTime - currentTime
        };
      } else {
        // 잠금 해제
        deleteRecord('login_attempts', { email: email });
        return { isLocked: false, remainingTime: 0 };
      }
    }
    
    return { isLocked: false, remainingTime: 0 };
    
  } catch (error) {
    console.error('Lock status check error:', error);
    return { isLocked: false, remainingTime: 0 };
  }
}

/**
 * 로그인 실패 기록
 */
function recordFailedLogin(email) {
  try {
    const attempts = findRecord('login_attempts', { email: email });
    
    if (attempts) {
      updateRecord('login_attempts', { email: email }, {
        attempts: attempts.attempts + 1,
        last_attempt: getCurrentTimestamp()
      });
    } else {
      insertRecord('login_attempts', {
        email: email,
        attempts: 1,
        last_attempt: getCurrentTimestamp()
      });
    }
    
  } catch (error) {
    console.error('Failed login record error:', error);
  }
}

/**
 * 로그인 실패 시도 초기화
 */
function clearFailedLoginAttempts(email) {
  try {
    deleteRecord('login_attempts', { email: email });
  } catch (error) {
    console.error('Clear failed attempts error:', error);
  }
}

/**
 * 비밀번호 강도 검증
 */
function validatePasswordStrength(password) {
  const issues = [];
  
  if (password.length < AUTH_CONFIG.PASSWORD_MIN_LENGTH) {
    issues.push(`최소 ${AUTH_CONFIG.PASSWORD_MIN_LENGTH}자 이상이어야 합니다`);
  }
  
  if (AUTH_CONFIG.PASSWORD_REQUIRE_UPPER && !/[A-Z]/.test(password)) {
    issues.push('대문자를 포함해야 합니다');
  }
  
  if (AUTH_CONFIG.PASSWORD_REQUIRE_LOWER && !/[a-z]/.test(password)) {
    issues.push('소문자를 포함해야 합니다');
  }
  
  if (AUTH_CONFIG.PASSWORD_REQUIRE_DIGIT && !/\d/.test(password)) {
    issues.push('숫자를 포함해야 합니다');
  }
  
  if (AUTH_CONFIG.PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    issues.push('특수문자를 포함해야 합니다');
  }
  
  return {
    isValid: issues.length === 0,
    message: issues.length > 0 ? '비밀번호는 ' + issues.join(', ') : '안전한 비밀번호입니다'
  };
}

/**
 * 비밀번호 해시 생성
 */
function hashPassword(password) {
  try {
    const salt = generateSecureToken(16);
    const combined = password + salt + AUTH_CONFIG.JWT_SECRET;
    
    const hash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      combined,
      Utilities.Charset.UTF_8
    );
    
    const hashHex = hash.map(byte => {
      const unsignedByte = byte < 0 ? byte + 256 : byte;
      return ('0' + unsignedByte.toString(16)).slice(-2);
    }).join('');
    
    return salt + ':' + hashHex;
    
  } catch (error) {
    console.error('Password hash error:', error);
    return null;
  }
}

/**
 * 비밀번호 검증
 */
function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) {
      return false;
    }
    
    const [salt, hash] = parts;
    const combined = password + salt + AUTH_CONFIG.JWT_SECRET;
    
    const computedHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      combined,
      Utilities.Charset.UTF_8
    );
    
    const computedHashHex = computedHash.map(byte => {
      const unsignedByte = byte < 0 ? byte + 256 : byte;
      return ('0' + unsignedByte.toString(16)).slice(-2);
    }).join('');
    
    return hash === computedHashHex;
    
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

// ===== 사용자 관리 함수들 =====

/**
 * 사용자 프로필 조회
 */
function getUserProfile(params) {
  try {
    const { userId } = params;
    
    const user = findRecord('users', { id: userId });
    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.'
      };
    }
    
    return {
      success: true,
      data: {
        user: sanitizeUserData(user)
      }
    };
    
  } catch (error) {
    console.error('Get user profile error:', error);
    return {
      success: false,
      error: 'PROFILE_ERROR',
      message: '프로필 조회 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 사용자 프로필 업데이트
 */
function updateUserProfile(params) {
  try {
    const { userId, username, preferences } = params;
    
    const user = findRecord('users', { id: userId });
    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.'
      };
    }
    
    const updateData = {
      updated_at: getCurrentTimestamp()
    };
    
    // 사용자명 업데이트
    if (username && username !== user.username) {
      const existingUsername = findRecord('users', { 
        username: username,
        id: { $ne: userId }
      });
      
      if (existingUsername) {
        return {
          success: false,
          error: 'USERNAME_EXISTS',
          message: '이미 사용 중인 사용자명입니다.'
        };
      }
      
      updateData.username = username;
    }
    
    // 환경설정 업데이트
    if (preferences) {
      updateData.preferences = JSON.stringify(preferences);
    }
    
    updateRecord('users', { id: userId }, updateData);
    
    logActivity('USER', 'Profile updated', {
      userId: userId,
      changes: Object.keys(updateData)
    });
    
    return {
      success: true,
      message: '프로필이 업데이트되었습니다.'
    };
    
  } catch (error) {
    console.error('Update profile error:', error);
    return {
      success: false,
      error: 'UPDATE_ERROR',
      message: '프로필 업데이트 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 비밀번호 변경
 */
function changePassword(params) {
  try {
    const { userId, currentPassword, newPassword, confirmPassword } = params;
    
    // 입력 검증
    if (!currentPassword || !newPassword || !confirmPassword) {
      return {
        success: false,
        error: 'MISSING_FIELDS',
        message: '모든 필드를 입력해주세요.'
      };
    }
    
    if (newPassword !== confirmPassword) {
      return {
        success: false,
        error: 'PASSWORD_MISMATCH',
        message: '새 비밀번호가 일치하지 않습니다.'
      };
    }
    
    // 비밀번호 강도 검증
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: 'WEAK_PASSWORD',
        message: passwordValidation.message
      };
    }
    
    // 사용자 확인
    const user = findRecord('users', { id: userId });
    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.'
      };
    }
    
    // 현재 비밀번호 확인
    if (!verifyPassword(currentPassword, user.password_hash)) {
      return {
        success: false,
        error: 'INVALID_CURRENT_PASSWORD',
        message: '현재 비밀번호가 올바르지 않습니다.'
      };
    }
    
    // 새 비밀번호 해시 생성
    const newPasswordHash = hashPassword(newPassword);
    if (!newPasswordHash) {
      return {
        success: false,
        error: 'HASH_ERROR',
        message: '비밀번호 처리 중 오류가 발생했습니다.'
      };
    }
    
    // 비밀번호 업데이트
    updateRecord('users', { id: userId }, {
      password_hash: newPasswordHash,
      updated_at: getCurrentTimestamp()
    });
    
    logActivity('AUTH', 'Password changed', {
      userId: userId,
      email: user.email
    });
    
    return {
      success: true,
      message: '비밀번호가 변경되었습니다.'
    };
    
  } catch (error) {
    console.error('Change password error:', error);
    return {
      success: false,
      error: 'PASSWORD_CHANGE_ERROR',
      message: '비밀번호 변경 중 오류가 발생했습니다.'
    };
  }
}

// ===== 관리자 함수들 =====

/**
 * 사용자 목록 조회 (관리자용)
 */
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

/**
 * 사용자 상태 업데이트 (관리자용)
 */
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
      const sessions = findRecords('user_sessions', { user_id: userId, is_active: true });
      sessions.forEach(session => {
        updateRecord('user_sessions', { session_id: session.session_id }, {
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
      error: 'STATUS_UPDATE_ERROR',
      message: '사용자 상태 업데이트 중 오류가 발생했습니다.'
    };
  }
}

// ===== 2단계 인증 (2FA) =====

/**
 * 2FA 설정 시작
 */
function setup2FA(params) {
  try {
    const { userId } = params;
    
    const user = findRecord('users', { id: userId });
    if (!user) {
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.'
      };
    }
    
    // 2FA 시크릿 생성 (실제로는 TOTP 라이브러리 사용)
    const secret = generateSecureToken(32);
    const qrCodeUrl = `otpauth://totp/BlockchainPlatform:${user.email}?secret=${secret}&issuer=BlockchainPlatform`;
    
    // 임시 시크릿 저장
    insertRecord('temp_2fa_secrets', {
      user_id: userId,
      secret: secret,
      created_at: getCurrentTimestamp(),
      expires_at: getCurrentTimestamp() + (10 * 60 * 1000) // 10분
    });
    
    return {
      success: true,
      data: {
        secret: secret,
        qrCodeUrl: qrCodeUrl
      }
    };
    
  } catch (error) {
    console.error('2FA setup error:', error);
    return {
      success: false,
      error: '2FA_SETUP_ERROR',
      message: '2단계 인증 설정 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 2FA 확인 및 활성화
 */
function verify2FA(params) {
  try {
    const { userId, token } = params;
    
    const tempSecret = findRecord('temp_2fa_secrets', { 
      user_id: userId,
      expires_at: { $gt: getCurrentTimestamp() }
    });
    
    if (!tempSecret) {
      return {
        success: false,
        error: 'SECRET_NOT_FOUND',
        message: '2FA 설정이 만료되었습니다. 다시 설정해주세요.'
      };
    }
    
    // TOTP 토큰 검증 (실제로는 라이브러리 사용)
    const isValid = verifyTOTP(token, tempSecret.secret);
    if (!isValid) {
      return {
        success: false,
        error: 'INVALID_TOKEN',
        message: '유효하지 않은 인증 코드입니다.'
      };
    }
    
    // 2FA 활성화
    updateRecord('users', { id: userId }, {
      two_factor_secret: tempSecret.secret,
      two_factor_enabled: true,
      updated_at: getCurrentTimestamp()
    });
    
    // 임시 시크릿 삭제
    deleteRecord('temp_2fa_secrets', { user_id: userId });
    
    logActivity('AUTH', '2FA enabled', { userId: userId });
    
    return {
      success: true,
      message: '2단계 인증이 활성화되었습니다.'
    };
    
  } catch (error) {
    console.error('2FA verification error:', error);
    return {
      success: false,
      error: '2FA_VERIFICATION_ERROR',
      message: '2단계 인증 확인 중 오류가 발생했습니다.'
    };
  }
}

/**
 * TOTP 토큰 검증 (간단한 구현)
 */
function verifyTOTP(token, secret) {
  try {
    // 실제로는 Google Authenticator와 호환되는 TOTP 알고리즘 사용
    // 여기서는 간단한 시간 기반 검증으로 대체
    const timeWindow = Math.floor(Date.now() / 30000);
    const expectedToken = hashData(secret + timeWindow).slice(0, 6);
    
    return token === expectedToken;
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

// ===== 유틸리티 함수들 =====

/**
 * 이메일 유효성 검사
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 사용자 데이터 정제 (민감 정보 제거)
 */
function sanitizeUserData(user) {
  const { password_hash, two_factor_secret, ...safeUser } = user;
  
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

/**
 * 기본 포트폴리오 생성
 */
function createDefaultPortfolio(userId) {
  try {
    const defaultPortfolio = {
      id: generateUniqueId(),
      user_id: userId,
      name: '기본 포트폴리오',
      description: '자동 생성된 기본 포트폴리오',
      total_value: 0,
      total_invested: 0,
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
      is_default: true
    };
    
    insertRecord('portfolios', defaultPortfolio);
    
  } catch (error) {
    console.error('Create default portfolio error:', error);
  }
}

/**
 * 현재 IP 주소 가져오기 (제한적)
 */
function getCurrentIP() {
  try {
    // Google Apps Script에서는 실제 클라이언트 IP를 얻기 어려움
    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * 현재 User Agent 가져오기 (제한적)
 */
function getCurrentUserAgent() {
  try {
    // Google Apps Script에서는 실제 User Agent를 얻기 어려움
    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

// ===== 세션 정리 및 유지보수 =====

/**
 * 만료된 세션 정리
 */
function cleanupExpiredSessions() {
  try {
    const expiredSessions = findRecords('user_sessions', {
      expires_at: { $lt: getCurrentTimestamp() },
      is_active: true
    });
    
    expiredSessions.forEach(session => {
      updateRecord('user_sessions', { session_id: session.session_id }, {
        is_active: false
      });
    });
    
    logActivity('SYSTEM', 'Expired sessions cleaned up', {
      count: expiredSessions.length
    });
    
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}

/**
 * 오래된 로그 정리
 */
function cleanupOldLogs(days = 30) {
  try {
    const cutoffTime = getCurrentTimestamp() - (days * 24 * 60 * 60 * 1000);
    
    // 활동 로그 정리
    const oldLogs = findRecords('activity_logs', {
      timestamp: { $lt: cutoffTime }
    });
    
    oldLogs.forEach(log => {
      deleteRecord('activity_logs', { id: log.id });
    });
    
    logActivity('SYSTEM', 'Old logs cleaned up', {
      days: days,
      count: oldLogs.length
    });
    
  } catch (error) {
    console.error('Log cleanup error:', error);
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