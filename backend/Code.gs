/**
 * Google Apps Script 웹앱 진입점
 * GitHub Pages 프론트엔드와 통신하기 위한 API 엔드포인트
 */

// GET 요청 처리 (웹앱 배포 시 필수)
function doGet(e) {
  // CORS 헤더 설정
  return handleRequest(e);
}

// POST 요청 처리
function doPost(e) {
  return handleRequest(e);
}

// 메인 요청 처리기
function handleRequest(e) {
  try {
    // CORS 헤더 설정을 위한 응답 객체 생성
    const response = {
      success: true,
      data: null,
      message: '',
      timestamp: new Date().getTime()
    };
    
    // 요청 파라미터 파싱
    const params = e.parameter || {};
    const postData = e.postData ? JSON.parse(e.postData.contents) : {};
    const action = params.action || postData.action;
    
    // 로그 기록
    writeLog('INFO', 'API_REQUEST', `API 요청: ${action}`, { params, postData });
    
    // 액션별 라우팅
    switch (action) {
      // 인증 관련
      case 'register':
        response.data = registerUser(postData.email, postData.password, postData.name);
        response.message = '회원가입이 완료되었습니다.';
        break;
        
      case 'login':
        response.data = loginUser(postData.email, postData.password);
        response.message = '로그인되었습니다.';
        break;
        
      case 'logout':
        response.data = logoutUser(postData.token);
        response.message = '로그아웃되었습니다.';
        break;
        
      case 'verify-token':
        response.data = verifyUserToken(postData.token);
        break;
        
      // 포트폴리오 관리
      case 'create-portfolio':
        response.data = createPortfolio(postData.userId, postData.name, postData.description);
        response.message = '포트폴리오가 생성되었습니다.';
        break;
        
      case 'get-portfolios':
        response.data = getUserPortfolios(postData.userId);
        break;
        
      case 'get-portfolio':
        response.data = getPortfolio(postData.portfolioId);
        break;
        
      case 'update-portfolio':
        response.data = updatePortfolio(postData.portfolioId, postData.updates);
        response.message = '포트폴리오가 업데이트되었습니다.';
        break;
        
      case 'delete-portfolio':
        response.data = deletePortfolio(postData.portfolioId, postData.userId);
        response.message = '포트폴리오가 삭제되었습니다.';
        break;
        
      // 거래 관리
      case 'add-transaction':
        response.data = addTransaction(
          postData.portfolioId,
          postData.type,
          postData.coinId,
          postData.amount,
          postData.price,
          postData.date
        );
        response.message = '거래가 추가되었습니다.';
        break;
        
      case 'get-transactions':
        response.data = getPortfolioTransactions(postData.portfolioId);
        break;
        
      // 시세 정보
      case 'get-crypto-prices':
        const coinIds = postData.coinIds || ['bitcoin', 'ethereum'];
        response.data = getCryptoPrices(coinIds);
        break;
        
      // 시스템 상태
      case 'health-check':
        response.data = checkSystemHealth();
        break;
        
      // 기본 응답
      default:
        response.success = false;
        response.message = `알 수 없는 액션: ${action}`;
        writeLog('WARNING', 'API_REQUEST', '알 수 없는 액션', { action });
    }
    
  } catch (error) {
    writeLog('ERROR', 'API_REQUEST', 'API 오류', { error: error.toString() });
    
    return createJsonResponse({
      success: false,
      error: error.toString(),
      message: '서버 오류가 발생했습니다.'
    });
  }
  
  return createJsonResponse(response);
}

// JSON 응답 생성 (CORS 헤더 포함)
function createJsonResponse(data) {
  const response = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // CORS 헤더 설정 (중요!)
  response.getHeaders = function() {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '3600'
    };
  };
  
  return response;
}

// 암호화폐 가격 조회 함수 (CoinGecko API 사용)
function getCryptoPrices(coinIds) {
  const prices = {};
  
  coinIds.forEach(coinId => {
    const priceData = getCryptoPrice(coinId, 'usd');
    if (priceData && priceData[coinId]) {
      prices[coinId] = {
        usd: priceData[coinId].usd,
        usd_24h_change: priceData[coinId].usd_24h_change || 0
      };
    }
  });
  
  return prices;
}

// 테스트용 함수 - 직접 실행하여 시스템 확인
function testSystem() {
  try {
    // 데이터베이스 초기화
    initializeDatabase();
    
    // 시스템 설정 초기화
    initializeSystemSettings();
    
    // 건강 상태 체크
    const health = checkSystemHealth();
    
    Logger.log('시스템 테스트 완료');
    Logger.log(JSON.stringify(health, null, 2));
    
    return health;
  } catch (error) {
    Logger.log('시스템 테스트 실패: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// 데이터베이스 초기 설정
function setupInitialData() {
  try {
    // 스프레드시트 생성 또는 기존 시트 사용
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 필요한 시트들 생성
    const sheetNames = ['users', 'portfolios', 'transactions', 'user_sessions', 'system_settings'];
    
    sheetNames.forEach(sheetName => {
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        
        // 각 시트별 헤더 설정
        switch (sheetName) {
          case 'users':
            sheet.getRange(1, 1, 1, 6).setValues([
              ['user_id', 'email', 'password_hash', 'name', 'created_at', 'last_login']
            ]);
            break;
            
          case 'portfolios':
            sheet.getRange(1, 1, 1, 6).setValues([
              ['portfolio_id', 'user_id', 'name', 'description', 'created_at', 'updated_at']
            ]);
            break;
            
          case 'transactions':
            sheet.getRange(1, 1, 1, 8).setValues([
              ['transaction_id', 'portfolio_id', 'type', 'coin_id', 'amount', 'price', 'total_value', 'date']
            ]);
            break;
            
          case 'user_sessions':
            sheet.getRange(1, 1, 1, 5).setValues([
              ['session_id', 'user_id', 'token', 'expires_at', 'created_at']
            ]);
            break;
            
          case 'system_settings':
            sheet.getRange(1, 1, 1, 3).setValues([
              ['setting_key', 'value', 'updated_at']
            ]);
            break;
        }
        
        Logger.log(`시트 생성됨: ${sheetName}`);
      }
    });
    
    // 시스템 설정 초기화
    initializeSystemSettings();
    
    Logger.log('초기 데이터 설정 완료');
    return { success: true, message: '초기 설정이 완료되었습니다.' };
    
  } catch (error) {
    Logger.log('초기 설정 실패: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}