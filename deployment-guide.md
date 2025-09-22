# 블록체인 투자 플랫폼 - 완전한 배포 가이드

## 📋 목차
1. [시스템 요구사항](#시스템-요구사항)
2. [백엔드 배포 (Google Apps Script)](#백엔드-배포-google-apps-script)
3. [프론트엔드 배포](#프론트엔드-배포)
4. [데이터베이스 설정](#데이터베이스-설정)
5. [도메인 및 SSL 설정](#도메인-및-ssl-설정)
6. [환경 설정](#환경-설정)
7. [보안 설정](#보안-설정)
8. [모니터링 및 로깅](#모니터링-및-로깅)
9. [테스트 및 검증](#테스트-및-검증)
10. [유지보수 및 업데이트](#유지보수-및-업데이트)
11. [문제 해결](#문제-해결)
12. [성능 최적화](#성능-최적화)

---

## 🔧 시스템 요구사항

### 필수 계정
- **Google 계정** (Google Apps Script, Google Drive 용)
- **GitHub 계정** (코드 저장소 관리)
- **도메인 제공업체** (선택사항 - 커스텀 도메인)

### 기술 스택
- **백엔드**: Google Apps Script (JavaScript)
- **프론트엔드**: HTML5, CSS3, Vanilla JavaScript
- **데이터베이스**: SQLite (Google Apps Script 내장)
- **인증**: JWT + Session 기반
- **캐싱**: Google Apps Script Cache Service
- **이메일**: Gmail API / MailApp
- **호스팅**: GitHub Pages (프론트엔드), Google Apps Script (백엔드)

---

## 🚀 백엔드 배포 (Google Apps Script)

### 1단계: Google Apps Script 프로젝트 생성

1. **Apps Script 콘솔 접속**
   ```
   https://script.google.com/
   ```

2. **새 프로젝트 생성**
   - "새 프로젝트" 클릭
   - 프로젝트 이름: "BlockchainPlatform-Backend"

3. **파일 구조 설정**
   ```
   📁 BlockchainPlatform-Backend
   ├── 📄 Code.gs          (메인 API 엔드포인트)
   ├── 📄 Database.gs      (데이터베이스 관리)
   ├── 📄 Auth.gs          (인증 시스템)
   ├── 📄 Utils.gs         (유틸리티 함수)
   └── 📄 appsscript.json  (매니페스트)
   ```

### 2단계: 백엔드 코드 업로드

1. **기본 Code.gs 파일 내용 교체**
   - 완성된 Code.gs 파일 내용 복사 후 붙여넣기

2. **추가 파일들 생성**
   ```javascript
   // Apps Script 에디터에서
   // + 버튼 클릭 → "스크립트" 선택
   // 파일명: Database.gs, Auth.gs, Utils.gs
   ```

3. **매니페스트 파일 설정**
   ```json
   {
     "timeZone": "Asia/Seoul",
     "dependencies": {},
     "exceptionLogging": "STACKDRIVER",
     "runtimeVersion": "V8",
     "webapp": {
       "executeAs": "USER_DEPLOYING",
       "access": "ANYONE"
     },
     "oauthScopes": [
       "https://www.googleapis.com/auth/spreadsheets",
       "https://www.googleapis.com/auth/drive",
       "https://www.googleapis.com/auth/script.external_request",
       "https://www.googleapis.com/auth/gmail.send"
     ]
   }
   ```

### 3단계: 데이터베이스 초기화

1. **실행 함수 설정**
   ```javascript
   // Code.gs에서 실행할 함수 선택
   function initializeSystem() {
     initializeDatabase();
     initializeUtils();
     Logger.log('시스템 초기화 완료');
   }
   ```

2. **권한 승인**
   - 함수 실행 시 권한 요청 승인
   - Gmail, Drive, 외부 요청 권한 허용

### 4단계: 웹앱 배포

1. **배포 설정**
   ```
   Apps Script 에디터 → 배포 → 새 배포
   ```

2. **배포 구성**
   - **유형**: 웹앱
   - **설명**: "BlockchainPlatform API v1.0"
   - **실행**: 나
   - **액세스 권한**: 모든 사용자

3. **배포 URL 확인**
   ```
   https://script.google.com/macros/s/[SCRIPT_ID]/exec
   ```
   - 이 URL이 API 엔드포인트가 됩니다

### 5단계: API 테스트

1. **기본 연결 테스트**
   ```bash
   curl https://script.google.com/macros/s/[SCRIPT_ID]/exec
   ```

2. **헬스체크 테스트**
   ```bash
   curl "https://script.google.com/macros/s/[SCRIPT_ID]/exec?action=health"
   ```

3. **사용자 등록 테스트**
   ```bash
   curl -X POST \
     "https://script.google.com/macros/s/[SCRIPT_ID]/exec" \
     -H "Content-Type: application/json" \
     -d '{
       "action": "register",
       "email": "test@example.com",
       "password": "Test123!@#",
       "name": "테스트 사용자"
     }'
   ```

---

## 🌐 프론트엔드 배포

### 1단계: GitHub 저장소 설정

1. **새 저장소 생성**
   ```
   저장소 이름: blockchainplatform-frontend
   공개/비공개: 공개 (GitHub Pages 사용)
   README.md 포함
   ```

2. **파일 구조 업로드**
   ```
   📁 blockchainplatform-frontend/
   ├── 📄 index.html
   ├── 📄 manifest.json
   ├── 📄 service-worker.js
   ├── 📁 css/
   │   └── 📄 styles.css
   ├── 📁 js/
   │   ├── 📄 app.js
   │   ├── 📄 auth.js
   │   ├── 📁 modules/
   │   │   ├── 📄 state-manager.js
   │   │   ├── 📄 market-data.js
   │   │   └── 📄 api-client.js
   │   └── 📁 components/
   │       ├── 📄 dashboard.js
   │       ├── 📄 portfolio.js
   │       ├── 📄 transactions.js
   │       └── 📄 settings.js
   └── 📁 assets/
       └── 📁 images/
           ├── 📄 logo.png
           ├── 📄 icon-192.png
           └── 📄 icon-512.png
   ```

### 2단계: API 엔드포인트 설정

1. **js/modules/api-client.js 수정**
   ```javascript
   // API 기본 URL 설정
   const API_BASE_URL = 'https://script.google.com/macros/s/[SCRIPT_ID]/exec';
   
   // SCRIPT_ID를 실제 배포된 Google Apps Script ID로 교체
   ```

2. **CORS 설정 확인**
   - Google Apps Script에서 CORS는 자동으로 처리됨
   - 추가 설정 불필요

### 3단계: GitHub Pages 활성화

1. **저장소 설정**
   ```
   Settings → Pages → Source: Deploy from a branch
   Branch: main / (root)
   ```

2. **배포 URL 확인**
   ```
   https://[USERNAME].github.io/blockchainplatform-frontend/
   ```

3. **커스텀 도메인 설정 (선택사항)**
   ```
   Settings → Pages → Custom domain
   CNAME 파일에 도메인 추가
   ```

### 4단계: PWA 설정 검증

1. **매니페스트 파일 확인**
   ```bash
   curl https://[USERNAME].github.io/blockchainplatform-frontend/manifest.json
   ```

2. **서비스 워커 등록 확인**
   - 브라우저 개발자 도구 → Application → Service Workers

---

## 🗄️ 데이터베이스 설정

### 1단계: 스프레드시트 로그 설정 (선택사항)

1. **Google Sheets 생성**
   - 새 스프레드시트: "BlockchainPlatform-Logs"
   - 시트 이름: "SystemLogs"

2. **스프레드시트 ID 복사**
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

3. **Utils.gs에서 ID 설정**
   ```javascript
   // setSystemSetting 함수로 설정
   setSystemSetting('LOG_SHEET_ID', '[SPREADSHEET_ID]');
   ```

### 2단계: 데이터 백업 설정

1. **Google Drive 백업 폴더 생성**
   ```javascript
   // Apps Script에서 실행
   function createBackupFolder() {
     const folder = DriveApp.createFolder('BlockchainPlatform-Backups');
     console.log('백업 폴더 ID:', folder.getId());
   }
   ```

2. **자동 백업 트리거 설정**
   ```javascript
   // Utils.gs의 setupTriggers() 함수 실행
   setupTriggers();
   ```

---

## 🌍 도메인 및 SSL 설정

### GitHub Pages 커스텀 도메인

1. **도메인 구매 및 DNS 설정**
   ```dns
   Type: CNAME
   Name: www
   Value: [USERNAME].github.io

   Type: A
   Name: @
   Value: 185.199.108.153
   Value: 185.199.109.153  
   Value: 185.199.110.153
   Value: 185.199.111.153
   ```

2. **GitHub Pages에서 도메인 설정**
   ```
   Settings → Pages → Custom domain: yourdomain.com
   ✅ Enforce HTTPS 체크
   ```

3. **SSL 인증서 자동 발급**
   - GitHub Pages에서 Let's Encrypt 자동 발급
   - 설정 후 24시간 이내 활성화

---

## ⚙️ 환경 설정

### 1단계: 시스템 설정 초기화

1. **Apps Script에서 설정 초기화**
   ```javascript
   // 한 번만 실행
   function setupInitialSettings() {
     initializeSystemSettings();
     
     // 관리자 설정
     setSystemSetting('admin_email', 'admin@yourdomain.com');
     setSystemSetting('app_name', '블록체인 투자 플랫폼');
     setSystemSetting('app_version', '1.0.0');
     
     console.log('초기 설정 완료');
   }
   ```

### 2단계: 이메일 설정

1. **Gmail API 활성화**
   ```javascript
   // 이미 권한에 포함됨
   // 추가 설정 불필요
   ```

2. **이메일 템플릿 테스트**
   ```javascript
   function testEmail() {
     sendWelcomeEmail('test@example.com', '테스트 사용자');
   }
   ```

### 3단계: 외부 API 설정

1. **암호화폐 API 테스트**
   ```javascript
   function testCryptoAPI() {
     const price = getCryptoPrice('bitcoin');
     console.log('비트코인 가격:', price);
   }
   ```

---

## 🔒 보안 설정

### 1단계: API 보안 강화

1. **Rate Limiting 설정**
   ```javascript
   // Code.gs에서 이미 구현됨
   // 필요시 제한값 조정
   setSystemSetting('api_rate_limit', 1000); // 시간당 요청 수
   ```

2. **IP 화이트리스트 설정 (선택사항)**
   ```javascript
   function setupIPWhitelist() {
     setSystemSetting('ip_whitelist', [
       '127.0.0.1',
       'your-office-ip'
     ]);
   }
   ```

### 2단계: 데이터 암호화

1. **암호화 키 설정**
   ```javascript
   function generateEncryptionKey() {
     const key = generateSecureToken(32);
     setSystemSetting('encryption_key', key);
     console.log('암호화 키 생성 완료');
   }
   ```

### 3단계: 보안 모니터링 활성화

1. **보안 알림 설정**
   ```javascript
   // Auth.gs에서 이미 구현됨
   // 의심스러운 활동 자동 감지 및 알림
   ```

---

## 📊 모니터링 및 로깅

### 1단계: 로그 시스템 활성화

1. **Stackdriver 로깅 활성화**
   ```javascript
   // appsscript.json에 이미 설정됨
   "exceptionLogging": "STACKDRIVER"
   ```

2. **커스텀 로그 확인**
   ```
   Google Cloud Console → Logging → Logs Explorer
   프로젝트: Apps Script 프로젝트 선택
   ```

### 2단계: 성능 모니터링

1. **API 성능 추적**
   ```javascript
   // Utils.gs에서 자동으로 추적됨
   // 성능 데이터는 캐시와 데이터베이스에 저장
   ```

2. **일일 보고서 설정**
   ```javascript
   // setupTriggers() 실행으로 자동 설정됨
   // 매일 새벽 2시에 정리 작업 및 보고서 발송
   ```

### 3단계: 알림 설정

1. **시스템 알림 테스트**
   ```javascript
   function testSystemAlert() {
     sendSystemAlert('INFO', '테스트 알림', '시스템이 정상 작동 중입니다.');
   }
   ```

---

## ✅ 테스트 및 검증

### 1단계: 백엔드 API 테스트

```bash
# 1. 헬스체크
curl "https://script.google.com/macros/s/[SCRIPT_ID]/exec?action=health"

# 2. 사용자 등록
curl -X POST \
  "https://script.google.com/macros/s/[SCRIPT_ID]/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "register",
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "테스트 사용자"
  }'

# 3. 로그인
curl -X POST \
  "https://script.google.com/macros/s/[SCRIPT_ID]/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# 4. 사용자 정보 조회 (토큰 필요)
curl -X GET \
  "https://script.google.com/macros/s/[SCRIPT_ID]/exec?action=user_info" \
  -H "Authorization: Bearer [ACCESS_TOKEN]"
```

### 2단계: 프론트엔드 테스트

1. **브라우저에서 접속**
   ```
   https://[USERNAME].github.io/blockchainplatform-frontend/
   ```

2. **기능 테스트 체크리스트**
   - [ ] 페이지 로딩
   - [ ] 회원가입
   - [ ] 로그인/로그아웃
   - [ ] 대시보드 표시
   - [ ] 포트폴리오 생성/수정
   - [ ] 거래 내역 조회
   - [ ] 설정 변경
   - [ ] PWA 설치

### 3단계: 성능 테스트

1. **Lighthouse 테스트**
   ```
   Chrome DevTools → Lighthouse → Generate report
   ```
   - 성능: 90+ 점
   - 접근성: 90+ 점
   - PWA: 100점 목표

2. **로드 테스트 (선택사항)**
   ```bash
   # Apache Bench 사용 예시
   ab -n 100 -c 10 "https://script.google.com/macros/s/[SCRIPT_ID]/exec?action=health"
   ```

### 4단계: 보안 테스트

1. **SQL 인젝션 테스트**
   ```javascript
   // Utils.gs의 detectSQLInjection 함수 테스트
   console.log(detectSQLInjection("'; DROP TABLE users; --"));
   ```

2. **XSS 방어 테스트**
   ```javascript
   // 입력 필드에 스크립트 태그 입력하여 필터링 확인
   console.log(sanitizeForXSS("<script>alert('xss')</script>"));
   ```

---

## 🔄 유지보수 및 업데이트

### 1단계: 정기 백업 확인

1. **백업 상태 모니터링**
   ```javascript
   function checkBackupStatus() {
     const health = checkSystemHealth();
     console.log('시스템 상태:', health);
   }
   ```

2. **수동 백업 실행**
   ```javascript
   function manualBackup() {
     const result = createDatabaseBackup();
     console.log('백업 결과:', result);
   }
   ```

### 2단계: 코드 업데이트 절차

1. **버전 관리**
   ```javascript
   // 새 버전 배포 전 실행
   function deployNewVersion(version) {
     updateVersion(version);
     runDailyMaintenance(); // 정리 작업
     console.log(`버전 ${version} 배포 완료`);
   }
   ```

2. **롤백 절차**
   ```javascript
   function rollbackVersion(previousVersion) {
     // 이전 버전 코드로 복원
     updateVersion(previousVersion);
     console.log(`버전 ${previousVersion}으로 롤백 완료`);
   }
   ```

### 3단계: 성능 최적화

1. **캐시 최적화**
   ```javascript
   // 정기적으로 실행
   function optimizePerformance() {
     optimizeCache();
     clearAllCache(); // 필요시
   }
   ```

2. **데이터베이스 정리**
   ```javascript
   // 월 1회 실행 권장
   function monthlyMaintenance() {
     cleanupOldLogs();
     cleanupExpiredSessions();
   }
   ```

---

## 🔧 문제 해결

### 자주 발생하는 문제들

#### 1. "권한이 거부되었습니다" 오류
```javascript
// 해결방법: 권한 재승인
function reauthorize() {
  // Apps Script 에디터에서 함수 실행
  // 권한 요청 팝업에서 모든 권한 승인
}
```

#### 2. API 응답이 느림
```javascript
// 해결방법: 캐시 확인 및 최적화
function debugPerformance() {
  const stats = getCacheData('api_performance');
  console.log('API 성능 통계:', stats);
}
```

#### 3. 이메일 발송 실패
```javascript
// 해결방법: Gmail API 권한 확인
function testEmailService() {
  try {
    sendEmail('test@example.com', '테스트', '이메일 테스트');
    console.log('이메일 발송 성공');
  } catch (error) {
    console.error('이메일 발송 실패:', error);
  }
}
```

#### 4. 데이터베이스 연결 오류
```javascript
// 해결방법: 데이터베이스 재초기화
function resetDatabase() {
  try {
    initializeDatabase();
    console.log('데이터베이스 재초기화 완료');
  } catch (error) {
    console.error('데이터베이스 초기화 실패:', error);
  }
}
```

### 로그 분석 방법

1. **Apps Script 로그 확인**
   ```
   Apps Script 에디터 → 실행 → 로그 보기
   ```

2. **Stackdriver 로그 확인**
   ```
   Google Cloud Console → Logging → Apps Script 프로젝트 선택
   ```

3. **브라우저 콘솔 확인**
   ```javascript
   // 프론트엔드 디버깅
   console.log('API 응답:', response);
   ```

---

## ⚡ 성능 최적화

### 1단계: 백엔드 최적화

1. **쿼리 최적화**
   ```javascript
   // 인덱스 활용한 효율적인 쿼리 작성
   const optimizedQuery = `
     SELECT * FROM users 
     WHERE email = ? AND status = 'active'
     LIMIT 1
   `;
   ```

2. **캐싱 전략**
   ```javascript
   // 자주 조회되는 데이터 캐싱
   function getCachedUserData(userId) {
     const cacheKey = `user_data_${userId}`;
     let userData = getCacheData(cacheKey);
     
     if (!userData) {
       userData = getUserById(userId);
       setCacheData(cacheKey, userData, 1800); // 30분
     }
     
     return userData;
   }
   ```

3. **배치 처리**
   ```javascript
   // 대량 데이터 처리시 배치로 나누어 처리
   function processBatchData(dataArray, batchSize = 100) {
     for (let i = 0; i < dataArray.length; i += batchSize) {
       const batch = dataArray.slice(i, i + batchSize);
       processBatch(batch);
       
       // 배치 간 잠시 대기 (API 제한 방지)
       if (i + batchSize < dataArray.length) {
         Utilities.sleep(100);
       }
     }
   }
   ```

### 2단계: 프론트엔드 최적화

1. **지연 로딩**
   ```javascript
   // 필요한 시점에만 컴포넌트 로드
   async function loadDashboard() {
     if (!window.dashboardLoaded) {
       await import('./components/dashboard.js');
       window.dashboardLoaded = true;
     }
     showDashboard();
   }
   ```

2. **이미지 최적화**
   ```html
   <!-- WebP 형식 사용 -->
   <picture>
     <source srcset="logo.webp" type="image/webp">
     <img src="logo.png" alt="로고" loading="lazy">
   </picture>
   ```

3. **서비스 워커 캐싱**
   ```javascript
   // 정적 자원 적극적 캐싱
   const CACHE_NAME = 'blockchain-platform-v1.0';
   const urlsToCache = [
     '/',
     '/css/styles.css',
     '/js/app.js',
     '/assets/images/logo.png'
   ];
   ```

### 3단계: 모니터링 및 분석

1. **성능 메트릭 수집**
   ```javascript
   function trackUserInteraction(action, duration) {
     const metrics = getCacheData('user_metrics') || [];
     metrics.push({
       action: action,
       duration: duration,
       timestamp: getCurrentTimestamp()
     });
     
     setCacheData('user_metrics', metrics, 3600);
   }
   ```

2. **실시간 성능 알림**
   ```javascript
   function monitorPerformance() {
     const avgResponseTime = getAverageResponseTime();
     
     if (avgResponseTime > 5000) { // 5초 초과
       sendSystemAlert('WARNING', 
         '성능 저하 감지', 
         `평균 응답 시간: ${avgResponseTime}ms`
       );
     }
   }
   ```

---

## 📞 지원 및 문의

### 기술 지원
- **이메일**: support@blockchainplatform.com
- **문서**: https://docs.blockchainplatform.com
- **GitHub Issues**: https://github.com/username/blockchainplatform/issues

### 커뮤니티
- **Discord**: https://discord.gg/blockchainplatform
- **Telegram**: https://t.me/blockchainplatform

---

## 📝 배포 체크리스트

### 배포 전 확인사항
- [ ] 모든 코드 파일 업로드 완료
- [ ] API 엔드포인트 URL 설정 완료
- [ ] 데이터베이스 초기화 완료
- [ ] 권한 승인 완료
- [ ] 이메일 설정 테스트 완료
- [ ] 보안 설정 완료

### 배포 후 확인사항
- [ ] 웹앱 접속 가능
- [ ] 회원가입/로그인 기능 정상
- [ ] API 응답 정상
- [ ] 이메일 발송 정상
- [ ] PWA 설치 가능
- [ ] 모바일 반응형 정상
- [ ] 성능 기준치 달성
- [ ] 보안 테스트 통과

### 운영 준비사항
- [ ] 백업 시스템 설정
- [ ] 모니터링 알림 설정
- [ ] 관리자 계정 생성
- [ ] 사용자 매뉴얼 준비
- [ ] 고객 지원 체계 구축

---

## 🎉 배포 완료!

축하합니다! 블록체인 투자 플랫폼이 성공적으로 배포되었습니다.

### 접속 URL
- **프론트엔드**: `https://[USERNAME].github.io/blockchainplatform-frontend/`
- **백엔드 API**: `https://script.google.com/macros/s/[SCRIPT_ID]/exec`

### 다음 단계
1. 실제 사용자 테스트 진행
2. 피드백 수집 및 개선사항 도출
3. 추가 기능 개발 계획 수립
4. 마케팅 및 사용자 확보 전략 실행

### 추가 개발 권장사항
- 실시간 알림 시스템
- 고급 차트 및 분석 도구
- 소셜 로그인 연동
- 모바일 앱 개발
- 결제 시스템 연동
- 다국어 지원

성공적인 서비스 운영을 위해 지속적인 모니터링과 개선을 잊지 마세요! 🚀