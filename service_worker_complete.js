/**
 * 블록체인 투자 플랫폼 - PWA 서비스 워커
 * 파일: service-worker.js
 * 
 * 기능:
 * - 오프라인 지원 및 캐싱 전략
 * - 백그라운드 동기화
 * - 푸시 알림
 * - 앱 업데이트 관리
 */

// ==================== 캐시 설정 ====================

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAMES = {
    STATIC: `blockchain-static-${CACHE_VERSION}`,
    DYNAMIC: `blockchain-dynamic-${CACHE_VERSION}`,
    API: `blockchain-api-${CACHE_VERSION}`,
    IMAGES: `blockchain-images-${CACHE_VERSION}`
};

// 정적 자원 목록 (필수 캐시)
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/styles.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/modules/state-manager.js',
    '/js/modules/market-data.js',
    '/js/modules/api-client.js',
    '/offline.html'
];

// API 캐시 패턴
const API_CACHE_PATTERNS = [
    /\/api\/market\/prices/,
    /\/api\/portfolio/,
    /\/api\/user/,
    /coingecko\.com\/api/
];

// 이미지 캐시 패턴  
const IMAGE_CACHE_PATTERNS = [
    /\.(?:png|jpg|jpeg|svg|webp|gif)$/,
    /\/images\//,
    /\/icons\//
];

// ==================== 설치 이벤트 ====================

self.addEventListener('install', (event) => {
    console.log('[SW] 서비스 워커 설치 중...');
    
    event.waitUntil(
        caches.open(CACHE_NAMES.STATIC)
            .then((cache) => {
                console.log('[SW] 정적 자원 캐시 중...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] 정적 자원 캐시 완료');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] 정적 자원 캐시 실패:', error);
            })
    );
});

// ==================== 활성화 이벤트 ====================

self.addEventListener('activate', (event) => {
    console.log('[SW] 서비스 워커 활성화 중...');
    
    event.waitUntil(
        Promise.all([
            // 이전 버전 캐시 정리
            cleanupOldCaches(),
            // 모든 클라이언트 제어 시작
            self.clients.claim()
        ]).then(() => {
            console.log('[SW] 서비스 워커 활성화 완료');
            // 클라이언트에 활성화 알림
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        version: CACHE_VERSION
                    });
                });
            });
        })
    );
});

/**
 * 이전 버전 캐시 정리
 */
async function cleanupOldCaches() {
    try {
        const cacheNames = await caches.keys();
        const currentCaches = Object.values(CACHE_NAMES);
        
        const deletePromises = cacheNames
            .filter(cacheName => !currentCaches.includes(cacheName))
            .map(cacheName => {
                console.log('[SW] 이전 캐시 삭제:', cacheName);
                return caches.delete(cacheName);
            });
            
        await Promise.all(deletePromises);
        console.log('[SW] 캐시 정리 완료');
    } catch (error) {
        console.error('[SW] 캐시 정리 실패:', error);
    }
}

// ==================== 요청 가로채기 ====================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // 같은 origin 요청만 처리
    if (url.origin !== location.origin && !isExternalApi(url)) {
        return;
    }
    
    // 요청 유형별 캐싱 전략 적용
    if (isNavigationRequest(request)) {
        // HTML 페이지 요청
        event.respondWith(handleNavigationRequest(request));
    } else if (isApiRequest(url.pathname)) {
        // API 요청
        event.respondWith(handleApiRequest(request));
    } else if (isImageRequest(url.pathname)) {
        // 이미지 요청
        event.respondWith(handleImageRequest(request));
    } else if (isStaticAsset(url.pathname)) {
        // 정적 자원 요청
        event.respondWith(handleStaticRequest(request));
    }
});

/**
 * 네비게이션 요청 처리 (HTML 페이지)
 */
async function handleNavigationRequest(request) {
    try {
        // Cache First 전략 (빠른 로딩)
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 네트워크에서 가져오기
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // 새로운 응답을 캐시에 저장
            const cache = await caches.open(CACHE_NAMES.STATIC);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('[SW] 네비게이션 오프라인:', error);
        
        // 오프라인 페이지 반환
        const offlineResponse = await caches.match('/offline.html');
        return offlineResponse || createOfflineResponse();
    }
}

/**
 * API 요청 처리
 */
async function handleApiRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Network First 전략 (최신 데이터 우선)
        const networkResponse = await fetch(request, {
            timeout: 5000 // 5초 타임아웃
        });
        
        if (networkResponse.ok) {
            // 성공 응답만 캐시 저장
            const cache = await caches.open(CACHE_NAMES.API);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        throw new Error(`API 응답 오류: ${networkResponse.status}`);
        
    } catch (error) {
        console.log('[SW] API 오프라인 또는 오류:', error);
        
        // 캐시된 응답 반환
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // 오프라인 헤더 추가
            const response = cachedResponse.clone();
            response.headers.set('X-Offline', 'true');
            return response;
        }
        
        // 오프라인 API 응답 생성
        return createOfflineApiResponse(request);
    }
}

/**
 * 이미지 요청 처리
 */
async function handleImageRequest(request) {
    try {
        // Cache First 전략 (이미지는 변경이 적음)
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAMES.IMAGES);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('[SW] 이미지 로딩 실패:', error);
        
        // 기본 이미지 반환 또는 캐시된 이미지
        const cachedResponse = await caches.match(request);
        return cachedResponse || createPlaceholderImage();
    }
}

/**
 * 정적 자원 요청 처리
 */
async function handleStaticRequest(request) {
    try {
        // Cache First 전략 (정적 자원은 변경이 적음)
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAMES.STATIC);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('[SW] 정적 자원 로딩 실패:', error);
        
        // 캐시된 응답 반환
        const cachedResponse = await caches.match(request);
        return cachedResponse || createOfflineResponse();
    }
}

// ==================== 백그라운드 동기화 ====================

self.addEventListener('sync', (event) => {
    console.log('[SW] 백그라운드 동기화:', event.tag);
    
    if (event.tag === 'portfolio-sync') {
        event.waitUntil(syncPortfolioData());
    } else if (event.tag === 'market-data-sync') {
        event.waitUntil(syncMarketData());
    } else if (event.tag === 'transaction-sync') {
        event.waitUntil(syncTransactionData());
    }
});

/**
 * 포트폴리오 데이터 동기화
 */
async function syncPortfolioData() {
    try {
        console.log('[SW] 포트폴리오 동기화 시작');
        
        const clients = await self.clients.matchAll();
        
        for (const client of clients) {
            client.postMessage({
                type: 'SYNC_REQUEST',
                action: 'portfolio'
            });
        }
        
        console.log('[SW] 포트폴리오 동기화 완료');
        
    } catch (error) {
        console.error('[SW] 포트폴리오 동기화 실패:', error);
    }
}

/**
 * 시장 데이터 동기화
 */
async function syncMarketData() {
    try {
        console.log('[SW] 시장 데이터 동기화 시작');
        
        // 최신 시장 데이터 요청
        const response = await fetch('/api/market/prices');
        
        if (response.ok) {
            const cache = await caches.open(CACHE_NAMES.API);
            cache.put('/api/market/prices', response.clone());
            
            // 클라이언트에 업데이트 알림
            const clients = await self.clients.matchAll();
            const data = await response.json();
            
            clients.forEach(client => {
                client.postMessage({
                    type: 'MARKET_DATA_UPDATE',
                    data: data
                });
            });
        }
        
        console.log('[SW] 시장 데이터 동기화 완료');
        
    } catch (error) {
        console.error('[SW] 시장 데이터 동기화 실패:', error);
    }
}

/**
 * 거래 데이터 동기화
 */
async function syncTransactionData() {
    try {
        console.log('[SW] 거래 데이터 동기화 시작');
        
        const clients = await self.clients.matchAll();
        
        for (const client of clients) {
            client.postMessage({
                type: 'SYNC_REQUEST',
                action: 'transactions'
            });
        }
        
        console.log('[SW] 거래 데이터 동기화 완료');
        
    } catch (error) {
        console.error('[SW] 거래 데이터 동기화 실패:', error);
    }
}

// ==================== 푸시 알림 ====================

self.addEventListener('push', (event) => {
    console.log('[SW] 푸시 알림 수신');
    
    let notificationData = {
        title: '블록체인 투자 플랫폼',
        body: '새로운 알림이 있습니다.',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: 'general'
    };
    
    if (event.data) {
        try {
            const data = event.data.json();
            notificationData = { ...notificationData, ...data };
        } catch (error) {
            console.error('[SW] 푸시 데이터 파싱 실패:', error);
        }
    }
    
    const options = {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: notificationData.tag,
        requireInteraction: notificationData.requireInteraction || false,
        actions: notificationData.actions || [],
        data: notificationData.data || {}
    };
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] 알림 클릭:', event.notification);
    
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(clientList => {
            // 이미 열려있는 창이 있으면 포커스
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // 새 창 열기
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});

// ==================== 메시지 처리 ====================

self.addEventListener('message', (event) => {
    console.log('[SW] 메시지 수신:', event.data);
    
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({
                version: CACHE_VERSION
            });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'CACHE_URLS':
            cacheUrls(data.urls).then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        default:
            console.log('[SW] 알 수 없는 메시지 타입:', type);
    }
});

/**
 * 모든 캐시 삭제
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames.map(name => caches.delete(name));
    await Promise.all(deletePromises);
    console.log('[SW] 모든 캐시 삭제 완료');
}

/**
 * URL 목록 캐시
 */
async function cacheUrls(urls) {
    const cache = await caches.open(CACHE_NAMES.DYNAMIC);
    await cache.addAll(urls);
    console.log('[SW] URL 목록 캐시 완료:', urls);
}

// ==================== 유틸리티 함수 ====================

function isNavigationRequest(request) {
    return request.mode === 'navigate' || 
           (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

function isApiRequest(pathname) {
    return pathname.startsWith('/api/') || 
           API_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

function isImageRequest(pathname) {
    return IMAGE_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

function isStaticAsset(pathname) {
    return pathname.endsWith('.css') || 
           pathname.endsWith('.js') || 
           pathname.endsWith('.json') ||
           pathname.endsWith('.woff') ||
           pathname.endsWith('.woff2');
}

function isExternalApi(url) {
    return url.hostname.includes('coingecko.com') ||
           url.hostname.includes('googleapis.com') ||
           url.hostname.includes('script.google.com');
}

function createOfflineResponse() {
    return new Response('오프라인 상태입니다.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
            'Content-Type': 'text/plain; charset=utf-8'
        }
    });
}

function createOfflineApiResponse(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    let offlineData = { 
        error: 'offline',
        message: '오프라인 상태입니다.',
        timestamp: Date.now()
    };
    
    // API별 기본 데이터
    if (pathname.includes('/api/market/prices')) {
        offlineData = {
            prices: {
                BTC: 50000000,
                ETH: 4000000,
                BNB: 500000
            },
            lastUpdate: Date.now() - 300000,
            offline: true
        };
    } else if (pathname.includes('/api/portfolio')) {
        offlineData = {
            portfolio: [],
            totalValue: 0,
            offline: true
        };
    }
    
    return new Response(JSON.stringify(offlineData), {
        headers: {
            'Content-Type': 'application/json',
            'X-Offline': 'true'
        }
    });
}

function createPlaceholderImage() {
    // 1x1 투명 PNG (base64)
    const transparentPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    return new Response(atob(transparentPng), {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000'
        }
    });
}

// ==================== 초기화 완료 ====================

console.log('[SW] 서비스 워커 스크립트 로드 완료');
console.log('[SW] 캐시 버전:', CACHE_VERSION);