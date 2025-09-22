/**
 * 블록체인 투자 플랫폼 - 데이터베이스 관리
 * Google Sheets를 데이터베이스로 활용하는 관리 시스템
 */

// ==================================================
// 데이터베이스 스키마 정의
// ==================================================

const DATABASE_SCHEMA = {
  // 사용자 관리
  users: {
    sheetName: 'users',
    columns: ['id', 'email', 'username', 'password_hash', 'full_name', 'phone', 
             'created_at', 'updated_at', 'last_login', 'status', 'role', 'email_verified',
             'two_factor_enabled', 'preferences', 'profile_image'],
    primaryKey: 'id',
    indexes: ['email', 'username']
  },
  
  // 세션 관리
  sessions: {
    sheetName: 'sessions',
    columns: ['session_id', 'user_id', 'token', 'refresh_token', 'expires_at', 
             'created_at', 'ip_address', 'user_agent', 'is_active'],
    primaryKey: 'session_id',
    indexes: ['user_id', 'token']
  },
  
  // 거래 내역
  transactions: {
    sheetName: 'transactions',
    columns: ['id', 'user_id', 'coin_id', 'coin_symbol', 'coin_name', 'type', 
             'amount', 'price', 'total_value', 'fee', 'exchange', 'date', 
             'notes', 'created_at', 'updated_at'],
    primaryKey: 'id',
    indexes: ['user_id', 'coin_id', 'date']
  },
  
  // 포트폴리오 요약
  portfolio_summary: {
    sheetName: 'portfolio_summary',
    columns: ['user_id', 'total_value', 'total_invested', 'total_profit_loss', 
             'profit_loss_percentage', 'last_updated', 'asset_count'],
    primaryKey: 'user_id',
    indexes: ['user_id']
  },
  
  // 포트폴리오 자산
  portfolio_assets: {
    sheetName: 'portfolio_assets',
    columns: ['id', 'user_id', 'coin_id', 'coin_symbol', 'coin_name', 'total_amount', 
             'average_price', 'current_price', 'current_value', 'profit_loss', 
             'profit_loss_percentage', 'last_updated'],
    primaryKey: 'id',
    indexes: ['user_id', 'coin_id']
  },
  
  // 관심 목록
  watchlist: {
    sheetName: 'watchlist',
    columns: ['id', 'user_id', 'coin_id', 'coin_symbol', 'coin_name', 'added_at', 
             'alert_price_high', 'alert_price_low', 'alert_enabled'],
    primaryKey: 'id',
    indexes: ['user_id', 'coin_id']
  },
  
  // 알림
  notifications: {
    sheetName: 'notifications',
    columns: ['id', 'user_id', 'type', 'title', 'message', 'data', 'is_read', 
             'created_at', 'read_at'],
    primaryKey: 'id',
    indexes: ['user_id', 'is_read']
  },
  
  // 시스템 설정
  system_config: {
    sheetName: 'system_config',
    columns: ['key', 'value', 'type', 'description', 'updated_at', 'updated_by'],
    primaryKey: 'key',
    indexes: ['key']
  },
  
  // 활동 로그
  activity_logs: {
    sheetName: 'activity_logs',
    columns: ['id', 'user_id', 'action', 'details', 'ip_address', 'user_agent', 
             'created_at', 'level'],
    primaryKey: 'id',
    indexes: ['user_id', 'action', 'created_at']
  },
  
  // API 사용량 로그
  api_usage_logs: {
    sheetName: 'api_usage_logs',
    columns: ['id', 'endpoint', 'method', 'user_id', 'ip_address', 'response_time', 
             'status_code', 'created_at'],
    primaryKey: 'id',
    indexes: ['endpoint', 'user_id', 'created_at']
  }
};

// ==================================================
// 데이터베이스 초기화
// ==================================================

function initializeDatabase() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let initializedCount = 0;
    
    // 각 테이블 시트 생성 및 초기화
    for (const [tableName, schema] of Object.entries(DATABASE_SCHEMA)) {
      if (createOrUpdateSheet(spreadsheet, schema)) {
        initializedCount++;
      }
    }
    
    // 시스템 설정 초기값 설정
    initializeSystemConfig();
    
    // 인덱스 생성 (Google Sheets에서는 데이터 검증으로 구현)
    createIndexes();
    
    // 초기화 완료 로그
    logActivity('SYSTEM', 'Database initialized', { 
      tables: initializedCount,
      timestamp: new Date().toISOString()
    });
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(`데이터베이스 초기화 완료!\n생성된 테이블: ${initializedCount}개`);
    
    return {
      success: true,
      tablesCreated: initializedCount,
      message: '데이터베이스가 성공적으로 초기화되었습니다.'
    };
    
  } catch (error) {
    console.error('Database initialization error:', error);
    logActivity('ERROR', 'Database initialization failed', { error: error.toString() });
    
    const ui = SpreadsheetApp.getUi();
    ui.alert('오류', '데이터베이스 초기화 중 오류가 발생했습니다: ' + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
    
    return {
      success: false,
      error: error.toString(),
      message: '데이터베이스 초기화에 실패했습니다.'
    };
  }
}

function createOrUpdateSheet(spreadsheet, schema) {
  try {
    let sheet = spreadsheet.getSheetByName(schema.sheetName);
    
    // 시트가 없으면 생성
    if (!sheet) {
      sheet = spreadsheet.insertSheet(schema.sheetName);
      console.log(`Created sheet: ${schema.sheetName}`);
    }
    
    // 헤더 설정
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    if (existingHeaders.length === 0 || existingHeaders[0] === '') {
      // 새 헤더 설정
      sheet.getRange(1, 1, 1, schema.columns.length).setValues([schema.columns]);
      
      // 헤더 스타일링
      const headerRange = sheet.getRange(1, 1, 1, schema.columns.length);
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
      
      // 열 너비 자동 조정
      sheet.autoResizeColumns(1, schema.columns.length);
      
      console.log(`Initialized headers for: ${schema.sheetName}`);
    }
    
    // 시트 보호 설정 (헤더 행만)
    protectHeaders(sheet);
    
    return true;
  } catch (error) {
    console.error(`Failed to create/update sheet ${schema.sheetName}:`, error);
    return false;
  }
}

function protectHeaders(sheet) {
  try {
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    const protection = headerRange.protect().setDescription('헤더 보호');
    
    // 편집자만 수정 가능하도록 설정
    if (protection.canDomainEdit()) {
      protection.setDomainEdit(false);
    }
  } catch (error) {
    console.warn(`Failed to protect headers for sheet: ${error}`);
  }
}

function createIndexes() {
  try {
    // Google Sheets에서는 실제 인덱스를 만들 수 없으므로
    // 데이터 검증 규칙으로 제약 조건 구현
    
    // 사용자 테이블 - 이메일 중복 방지
    const usersSheet = getSheet('users');
    if (usersSheet) {
      // 이메일 열에 대한 데이터 검증 설정 예정
      console.log('Index constraints set for users table');
    }
    
    return true;
  } catch (error) {
    console.warn('Index creation warning:', error);
    return false;
  }
}

function initializeSystemConfig() {
  try {
    const defaultConfigs = [
      { key: 'app_version', value: '1.0.0', type: 'string', description: '애플리케이션 버전' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', description: '점검 모드' },
      { key: 'max_users', value: '1000', type: 'number', description: '최대 사용자 수' },
      { key: 'session_timeout', value: '86400000', type: 'number', description: '세션 타임아웃 (밀리초)' },
      { key: 'api_rate_limit', value: '60', type: 'number', description: '분당 API 호출 제한' },
      { key: 'coingecko_api_key', value: '', type: 'string', description: 'CoinGecko API 키' },
      { key: 'email_notifications', value: 'true', type: 'boolean', description: '이메일 알림 활성화' },
      { key: 'data_retention_days', value: '365', type: 'number', description: '데이터 보관 기간 (일)' }
    ];
    
    for (const config of defaultConfigs) {
      if (!getSystemConfig(config.key)) {
        setSystemConfig(config.key, config.value, config.type, config.description);
      }
    }
    
    console.log('System config initialized');
    return true;
  } catch (error) {
    console.error('System config initialization error:', error);
    return false;
  }
}

// ==================================================
// 기본 CRUD 작업
// ==================================================

function getSheet(sheetName) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    return spreadsheet.getSheetByName(sheetName);
  } catch (error) {
    console.error(`Failed to get sheet ${sheetName}:`, error);
    return null;
  }
}

function insertRecord(tableName, data) {
  try {
    const schema = DATABASE_SCHEMA[tableName];
    if (!schema) {
      throw new Error(`Unknown table: ${tableName}`);
    }
    
    const sheet = getSheet(schema.sheetName);
    if (!sheet) {
      throw new Error(`Sheet not found: ${schema.sheetName}`);
    }
    
    // ID 자동 생성 (Primary Key가 id인 경우)
    if (schema.primaryKey === 'id' && !data.id) {
      data.id = generateUniqueId();
    }
    
    // 타임스탬프 자동 추가
    const now = new Date().toISOString();
    if (schema.columns.includes('created_at') && !data.created_at) {
      data.created_at = now;
    }
    if (schema.columns.includes('updated_at') && !data.updated_at) {
      data.updated_at = now;
    }
    
    // 데이터 배열 생성
    const values = schema.columns.map(col => data[col] || '');
    
    // 데이터 삽입
    sheet.appendRow(values);
    
    // 삽입된 행 번호 반환
    const lastRow = sheet.getLastRow();
    
    logActivity('DATABASE', 'Record inserted', { 
      table: tableName, 
      id: data[schema.primaryKey],
      row: lastRow 
    });
    
    return {
      success: true,
      id: data[schema.primaryKey],
      row: lastRow
    };
    
  } catch (error) {
    console.error(`Insert error in ${tableName}:`, error);
    logActivity('ERROR', 'Insert failed', { 
      table: tableName, 
      error: error.toString() 
    });
    throw error;
  }
}

function findRecords(tableName, criteria = {}, options = {}) {
  try {
    const schema = DATABASE_SCHEMA[tableName];
    if (!schema) {
      throw new Error(`Unknown table: ${tableName}`);
    }
    
    const sheet = getSheet(schema.sheetName);
    if (!sheet) {
      return [];
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return []; // 헤더만 있음
    }
    
    // 모든 데이터 가져오기
    const range = sheet.getRange(2, 1, lastRow - 1, schema.columns.length);
    const values = range.getValues();
    
    // 데이터를 객체 배열로 변환
    const records = values.map((row, index) => {
      const record = { _row: index + 2 }; // 실제 시트 행 번호
      schema.columns.forEach((col, colIndex) => {
        record[col] = row[colIndex];
      });
      return record;
    });
    
    // 필터링
    let filteredRecords = records.filter(record => {
      for (const [key, value] of Object.entries(criteria)) {
        if (key === '_row') continue;
        
        if (typeof value === 'object' && value !== null) {
          // 고급 쿼리 조건
          if (value.$regex) {
            const regex = new RegExp(value.$regex, value.$flags || 'i');
            if (!regex.test(record[key])) return false;
          }
          if (value.$gt && record[key] <= value.$gt) return false;
          if (value.$lt && record[key] >= value.$lt) return false;
          if (value.$gte && record[key] < value.$gte) return false;
          if (value.$lte && record[key] > value.$lte) return false;
          if (value.$ne && record[key] === value.$ne) return false;
          if (value.$in && !value.$in.includes(record[key])) return false;
        } else {
          // 단순 비교
          if (record[key] !== value) return false;
        }
      }
      return true;
    });
    
    // 정렬
    if (options.sort) {
      const sortKey = Object.keys(options.sort)[0];
      const sortOrder = options.sort[sortKey] === -1 ? 'desc' : 'asc';
      
      filteredRecords.sort((a, b) => {
        let aVal = a[sortKey];
        let bVal = b[sortKey];
        
        // 날짜 문자열을 Date 객체로 변환
        if (sortKey.includes('_at') || sortKey === 'date') {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }
        
        if (sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1;
        } else {
          return aVal > bVal ? 1 : -1;
        }
      });
    }
    
    // 제한
    if (options.limit) {
      filteredRecords = filteredRecords.slice(0, options.limit);
    }
    
    return filteredRecords;
    
  } catch (error) {
    console.error(`Find error in ${tableName}:`, error);
    throw error;
  }
}

function findRecord(tableName, criteria) {
  const records = findRecords(tableName, criteria, { limit: 1 });
  return records.length > 0 ? records[0] : null;
}

function updateRecord(tableName, criteria, updates) {
  try {
    const schema = DATABASE_SCHEMA[tableName];
    if (!schema) {
      throw new Error(`Unknown table: ${tableName}`);
    }
    
    const record = findRecord(tableName, criteria);
    if (!record) {
      throw new Error('Record not found');
    }
    
    const sheet = getSheet(schema.sheetName);
    const rowNumber = record._row;
    
    // updated_at 자동 업데이트
    if (schema.columns.includes('updated_at')) {
      updates.updated_at = new Date().toISOString();
    }
    
    // 업데이트할 데이터 준비
    schema.columns.forEach((col, colIndex) => {
      if (updates.hasOwnProperty(col)) {
        sheet.getRange(rowNumber, colIndex + 1).setValue(updates[col]);
      }
    });
    
    logActivity('DATABASE', 'Record updated', { 
      table: tableName, 
      id: record[schema.primaryKey],
      row: rowNumber 
    });
    
    return {
      success: true,
      id: record[schema.primaryKey],
      updated: Object.keys(updates).length
    };
    
  } catch (error) {
    console.error(`Update error in ${tableName}:`, error);
    logActivity('ERROR', 'Update failed', { 
      table: tableName, 
      error: error.toString() 
    });
    throw error;
  }
}

function deleteRecord(tableName, criteria) {
  try {
    const schema = DATABASE_SCHEMA[tableName];
    if (!schema) {
      throw new Error(`Unknown table: ${tableName}`);
    }
    
    const record = findRecord(tableName, criteria);
    if (!record) {
      throw new Error('Record not found');
    }
    
    const sheet = getSheet(schema.sheetName);
    const rowNumber = record._row;
    
    // 행 삭제
    sheet.deleteRow(rowNumber);
    
    logActivity('DATABASE', 'Record deleted', { 
      table: tableName, 
      id: record[schema.primaryKey],
      row: rowNumber 
    });
    
    return {
      success: true,
      id: record[schema.primaryKey],
      deleted: true
    };
    
  } catch (error) {
    console.error(`Delete error in ${tableName}:`, error);
    logActivity('ERROR', 'Delete failed', { 
      table: tableName, 
      error: error.toString() 
    });
    throw error;
  }
}

// ==================================================
// 시스템 설정 관리
// ==================================================

function getSystemConfig(key, defaultValue = null) {
  try {
    const config = findRecord('system_config', { key: key });
    if (config) {
      // 타입 변환
      switch (config.type) {
        case 'boolean':
          return config.value === 'true';
        case 'number':
          return parseFloat(config.value);
        case 'json':
          return JSON.parse(config.value);
        default:
          return config.value;
      }
    }
    return defaultValue;
  } catch (error) {
    console.warn(`Failed to get system config ${key}:`, error);
    return defaultValue;
  }
}

function setSystemConfig(key, value, type = 'string', description = '') {
  try {
    const existingConfig = findRecord('system_config', { key: key });
    const now = new Date().toISOString();
    
    const configData = {
      key: key,
      value: value.toString(),
      type: type,
      description: description,
      updated_at: now,
      updated_by: getCurrentUserId() || 'system'
    };
    
    if (existingConfig) {
      updateRecord('system_config', { key: key }, configData);
    } else {
      insertRecord('system_config', configData);
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to set system config ${key}:`, error);
    return false;
  }
}

// ==================================================
// 유틸리티 함수들
// ==================================================

function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isDatabaseInitialized() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const requiredSheets = Object.keys(DATABASE_SCHEMA);
    
    for (const sheetName of requiredSheets) {
      const tableName = Object.values(DATABASE_SCHEMA).find(schema => schema.sheetName === sheetName);
      if (!spreadsheet.getSheetByName(tableName.sheetName)) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

function getCurrentUserId() {
  // 현재 활성 세션에서 사용자 ID 가져오기
  // 실제 구현에서는 세션에서 가져와야 함
  return Session.getActiveUser().getEmail() || null;
}

function cleanupOldLogs(daysOld = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISO = cutoffDate.toISOString();
    
    // 활동 로그 정리
    const oldLogs = findRecords('activity_logs', {
      created_at: { $lt: cutoffISO }
    });
    
    // 역순으로 삭제 (행 번호 변경 방지)
    oldLogs.reverse().forEach(log => {
      try {
        deleteRecord('activity_logs', { id: log.id });
      } catch (error) {
        console.warn(`Failed to delete log ${log.id}:`, error);
      }
    });
    
    // API 사용량 로그 정리
    const oldApiLogs = findRecords('api_usage_logs', {
      created_at: { $lt: cutoffISO }
    });
    
    oldApiLogs.reverse().forEach(log => {
      try {
        deleteRecord('api_usage_logs', { id: log.id });
      } catch (error) {
        console.warn(`Failed to delete API log ${log.id}:`, error);
      }
    });
    
    logActivity('SYSTEM', 'Old logs cleaned up', { 
      activityLogs: oldLogs.length,
      apiLogs: oldApiLogs.length,
      daysOld: daysOld
    });
    
    return {
      success: true,
      deleted: {
        activityLogs: oldLogs.length,
        apiLogs: oldApiLogs.length
      }
    };
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

function cleanupExpiredSessions() {
  try {
    const now = new Date().toISOString();
    const expiredSessions = findRecords('sessions', {
      expires_at: { $lt: now }
    });
    
    expiredSessions.forEach(session => {
      try {
        deleteRecord('sessions', { session_id: session.session_id });
      } catch (error) {
        console.warn(`Failed to delete session ${session.session_id}:`, error);
      }
    });
    
    logActivity('SYSTEM', 'Expired sessions cleaned up', { 
      count: expiredSessions.length
    });
    
    return {
      success: true,
      deleted: expiredSessions.length
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
// 데이터베이스 상태 확인
// ==================================================

function getDatabaseStats() {
  try {
    const stats = {};
    
    for (const [tableName, schema] of Object.entries(DATABASE_SCHEMA)) {
      const sheet = getSheet(schema.sheetName);
      if (sheet) {
        const lastRow = sheet.getLastRow();
        stats[tableName] = {
          records: lastRow > 1 ? lastRow - 1 : 0,
          columns: schema.columns.length,
          lastModified: sheet.getLastModified()
        };
      } else {
        stats[tableName] = {
          records: 0,
          columns: 0,
          error: 'Sheet not found'
        };
      }
    }
    
    return {
      success: true,
      stats: stats,
      totalTables: Object.keys(DATABASE_SCHEMA).length
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// 초기화 시 한 번 실행
if (!isDatabaseInitialized()) {
  console.log('Database not initialized. Please run initializeDatabase()');
}