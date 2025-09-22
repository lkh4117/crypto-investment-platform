/**
 * 암호화폐 시장 데이터 관리 모듈
 * CoinGecko API와 실시간 데이터 처리
 */

import { stateManager, actions } from './state-manager.js';
import { apiClient } from './api-client.js';

class MarketDataManager {
    constructor() {
        this.updateInterval = null;
        this.updateFrequency = 30000; // 30초마다 업데이트
        this.websocket = null;
        this.isConnected = false;
        
        // 캐시 설정
        this.cache = new Map();
        this.cacheExpiry = 60000; // 1분 캐시
        
        // 지원 통화
        this.supportedCurrencies = ['USD', 'KRW', 'BTC', 'ETH'];
        this.defaultCurrency = 'KRW';
        
        // API 설정
        this.apiConfig = {
            coingecko: {
                baseUrl: 'https://api.coingecko.com/api/v3',
                rateLimit: 10000, // 10초당 요청 제한
                lastRequest: 0
            }
        };
        
        this.initializeMarketData();
    }

    // 초기화
    async initializeMarketData() {
        try {
            // 초기 데이터 로드
            await this.loadInitialData();
            
            // 자동 업데이트 시작
            this.startAutoUpdate();
            
            // 웹소켓 연결 (가능한 경우)
            this.connectWebSocket();
            
            console.log('[MarketData] 시장 데이터 매니저 초기화 완료');
        } catch (error) {
            console.error('[MarketData] 초기화 오류:', error);
            stateManager.dispatch(actions.showNotification({
                message: '시장 데이터 초기화에 실패했습니다.',
                type: 'error'
            }));
        }
    }

    // 초기 데이터 로드
    async loadInitialData() {
        const currency = stateManager.getState('user.preferences.currency') || this.defaultCurrency;
        
        const [marketData, trending, globalData] = await Promise.all([
            this.getTopCoins(100, currency),
            this.getTrendingCoins(),
            this.getGlobalMarketData()
        ]);
        
        stateManager.dispatch(actions.updateMarketData({
            coins: marketData,
            trending: trending,
            ...globalData
        }));
    }

    // 상위 코인 데이터 가져오기
    async getTopCoins(limit = 100, currency = 'KRW') {
        const cacheKey = `top_coins_${limit}_${currency}`;
        
        // 캐시 확인
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            await this.waitForRateLimit();
            
            const response = await fetch(
                `${this.apiConfig.coingecko.baseUrl}/coins/markets?` +
                `vs_currency=${currency.toLowerCase()}&` +
                `order=market_cap_desc&` +
                `per_page=${limit}&` +
                `page=1&` +
                `sparkline=true&` +
                `price_change_percentage=1h,24h,7d,30d,1y`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const processedData = data.map(coin => this.processCoinData(coin, currency));
            
            // 캐시 저장
            this.cache.set(cacheKey, processedData);
            
            return processedData;
            
        } catch (error) {
            console.error('[MarketData] 상위 코인 데이터 조회 오류:', error);
            
            // 캐시된 데이터 반환 (있는 경우)
            const cached = this.cache.get(cacheKey);
            if (cached) {
                console.log('[MarketData] 캐시된 데이터 사용');
                return cached;
            }
            
            throw error;
        }
    }

    // 개별 코인 상세 데이터
    async getCoinDetail(coinId, currency = 'KRW') {
        const cacheKey = `coin_detail_${coinId}_${currency}`;
        
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            await this.waitForRateLimit();
            
            const response = await fetch(
                `${this.apiConfig.coingecko.baseUrl}/coins/${coinId}?` +
                `localization=false&` +
                `tickers=true&` +
                `market_data=true&` +
                `community_data=true&` +
                `developer_data=true&` +
                `sparkline=true`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const processedData = this.processCoinDetailData(data, currency);
            
            this.cache.set(cacheKey, processedData);
            return processedData;
            
        } catch (error) {
            console.error(`[MarketData] ${coinId} 상세 데이터 조회 오류:`, error);
            throw error;
        }
    }

    // 가격 히스토리 데이터
    async getPriceHistory(coinId, days = 30, currency = 'KRW') {
        const cacheKey = `price_history_${coinId}_${days}_${currency}`;
        
        if (this.isCacheValid(cacheKey, 300000)) { // 5분 캐시
            return this.cache.get(cacheKey);
        }
        
        try {
            await this.waitForRateLimit();
            
            const response = await fetch(
                `${this.apiConfig.coingecko.baseUrl}/coins/${coinId}/market_chart?` +
                `vs_currency=${currency.toLowerCase()}&` +
                `days=${days}&` +
                `interval=${this.getChartInterval(days)}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const processedData = this.processPriceHistory(data);
            
            this.cache.set(cacheKey, processedData);
            return processedData;
            
        } catch (error) {
            console.error(`[MarketData] ${coinId} 가격 히스토리 조회 오류:`, error);
            throw error;
        }
    }

    // 트렌딩 코인
    async getTrendingCoins() {
        const cacheKey = 'trending_coins';
        
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            await this.waitForRateLimit();
            
            const response = await fetch(
                `${this.apiConfig.coingecko.baseUrl}/search/trending`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const processedData = data.coins.map(item => ({
                id: item.item.id,
                name: item.item.name,
                symbol: item.item.symbol,
                rank: item.item.market_cap_rank,
                image: item.item.large,
                score: item.item.score
            }));
            
            this.cache.set(cacheKey, processedData);
            return processedData;
            
        } catch (error) {
            console.error('[MarketData] 트렌딩 코인 조회 오류:', error);
            return [];
        }
    }

    // 글로벌 시장 데이터
    async getGlobalMarketData() {
        const cacheKey = 'global_market_data';
        
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        try {
            await this.waitForRateLimit();
            
            const response = await fetch(
                `${this.apiConfig.coingecko.baseUrl}/global`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const processedData = {
                totalMarketCap: data.data.total_market_cap,
                totalVolume: data.data.total_volume_24h,
                marketCapPercentage: data.data.market_cap_percentage,
                activeCryptocurrencies: data.data.active_cryptocurrencies,
                upcomingIcos: data.data.upcoming_icos,
                ongoingIcos: data.data.ongoing_icos,
                endedIcos: data.data.ended_icos,
                markets: data.data.markets
            };
            
            this.cache.set(cacheKey, processedData);
            return processedData;
            
        } catch (error) {
            console.error('[MarketData] 글로벌 시장 데이터 조회 오류:', error);
            return {};
        }
    }

    // 코인 검색
    async searchCoins(query) {
        if (!query || query.length < 2) return [];
        
        const cacheKey = `search_${query.toLowerCase()}`;
        
        if (this.isCacheValid(cacheKey, 300000)) { // 5분 캐시
            return this.cache.get(cacheKey);
        }
        
        try {
            await this.waitForRateLimit();
            
            const response = await fetch(
                `${this.apiConfig.coingecko.baseUrl}/search?query=${encodeURIComponent(query)}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const processedData = data.coins.slice(0, 10).map(coin => ({
                id: coin.id,
                name: coin.name,
                symbol: coin.symbol,
                image: coin.large,
                marketCapRank: coin.market_cap_rank
            }));
            
            this.cache.set(cacheKey, processedData);
            return processedData;
            
        } catch (error) {
            console.error(`[MarketData] 코인 검색 오류 (${query}):`, error);
            return [];
        }
    }

    // 데이터 처리 메서드들
    processCoinData(coin, currency) {
        return {
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            image: coin.image,
            price: coin.current_price,
            marketCap: coin.market_cap,
            marketCapRank: coin.market_cap_rank,
            fullyDilutedValuation: coin.fully_diluted_valuation,
            totalVolume: coin.total_volume,
            high24h: coin.high_24h,
            low24h: coin.low_24h,
            priceChange24h: coin.price_change_24h,
            priceChangePercentage24h: coin.price_change_percentage_24h,
            marketCapChange24h: coin.market_cap_change_24h,
            marketCapChangePercentage24h: coin.market_cap_change_percentage_24h,
            circulatingSupply: coin.circulating_supply,
            totalSupply: coin.total_supply,
            maxSupply: coin.max_supply,
            ath: coin.ath,
            athChangePercentage: coin.ath_change_percentage,
            athDate: coin.ath_date,
            atl: coin.atl,
            atlChangePercentage: coin.atl_change_percentage,
            atlDate: coin.atl_date,
            lastUpdated: coin.last_updated,
            sparklineIn7d: coin.sparkline_in_7d,
            priceChangePercentage: {
                '1h': coin.price_change_percentage_1h_in_currency,
                '24h': coin.price_change_percentage_24h,
                '7d': coin.price_change_percentage_7d_in_currency,
                '30d': coin.price_change_percentage_30d_in_currency,
                '1y': coin.price_change_percentage_1y_in_currency
            },
            currency: currency.toUpperCase()
        };
    }

    processCoinDetailData(coin, currency) {
        return {
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            image: coin.image,
            description: coin.description,
            links: coin.links,
            marketData: {
                price: coin.market_data.current_price[currency.toLowerCase()],
                marketCap: coin.market_data.market_cap[currency.toLowerCase()],
                totalVolume: coin.market_data.total_volume[currency.toLowerCase()],
                priceChange24h: coin.market_data.price_change_24h_in_currency[currency.toLowerCase()],
                priceChangePercentage24h: coin.market_data.price_change_percentage_24h,
                marketCapRank: coin.market_data.market_cap_rank,
                fullyDilutedValuation: coin.market_data.fully_diluted_valuation[currency.toLowerCase()],
                totalSupply: coin.market_data.total_supply,
                maxSupply: coin.market_data.max_supply,
                circulatingSupply: coin.market_data.circulating_supply,
                ath: coin.market_data.ath[currency.toLowerCase()],
                atl: coin.market_data.atl[currency.toLowerCase()],
                sparkline: coin.market_data.sparkline_7d
            },
            communityData: coin.community_data,
            developerData: coin.developer_data,
            lastUpdated: coin.last_updated
        };
    }

    processPriceHistory(data) {
        return {
            prices: data.prices.map(([timestamp, price]) => ({
                timestamp,
                price,
                date: new Date(timestamp).toISOString()
            })),
            marketCaps: data.market_caps.map(([timestamp, marketCap]) => ({
                timestamp,
                marketCap,
                date: new Date(timestamp).toISOString()
            })),
            totalVolumes: data.total_volumes.map(([timestamp, volume]) => ({
                timestamp,
                volume,
                date: new Date(timestamp).toISOString()
            }))
        };
    }

    // 차트 간격 결정
    getChartInterval(days) {
        if (days <= 1) return 'hourly';
        if (days <= 30) return 'daily';
        if (days <= 365) return 'weekly';
        return 'monthly';
    }

    // 자동 업데이트 시작
    startAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(async () => {
            try {
                await this.updateMarketData();
            } catch (error) {
                console.error('[MarketData] 자동 업데이트 오류:', error);
            }
        }, this.updateFrequency);
    }

    // 자동 업데이트 중지
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // 시장 데이터 업데이트
    async updateMarketData() {
        try {
            const currency = stateManager.getState('user.preferences.currency') || this.defaultCurrency;
            const coins = await this.getTopCoins(100, currency);
            
            // 상위/하위 종목 계산
            const gainers = [...coins]
                .filter(coin => coin.priceChangePercentage24h > 0)
                .sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h)
                .slice(0, 10);
            
            const losers = [...coins]
                .filter(coin => coin.priceChangePercentage24h < 0)
                .sort((a, b) => a.priceChangePercentage24h - b.priceChangePercentage24h)
                .slice(0, 10);
            
            stateManager.dispatch(actions.updateMarketData({
                coins,
                topGainers: gainers,
                topLosers: losers,
                lastUpdated: new Date().toISOString()
            }));
            
            console.log('[MarketData] 시장 데이터 업데이트 완료');
            
        } catch (error) {
            console.error('[MarketData] 시장 데이터 업데이트 오류:', error);
        }
    }

    // 웹소켓 연결
    connectWebSocket() {
        // 실제 환경에서는 웹소켓 서비스 사용
        // 현재는 시뮬레이션
        console.log('[MarketData] 웹소켓 연결 시뮬레이션');
        this.isConnected = true;
    }

    // 웹소켓 연결 해제
    disconnectWebSocket() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        this.isConnected = false;
    }

    // 레이트 리미트 대기
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.apiConfig.coingecko.lastRequest;
        
        if (timeSinceLastRequest < this.apiConfig.coingecko.rateLimit) {
            const waitTime = this.apiConfig.coingecko.rateLimit - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.apiConfig.coingecko.lastRequest = Date.now();
    }

    // 캐시 관리
    isCacheValid(key, customExpiry = null) {
        const cached = this.cache.get(key);
        if (!cached) return false;
        
        const expiry = customExpiry || this.cacheExpiry;
        return (Date.now() - cached.timestamp) < expiry;
    }

    clearCache() {
        this.cache.clear();
    }

    // 포트폴리오 관련 메서드들
    async updatePortfolioValues() {
        try {
            const portfolio = stateManager.getState('portfolio');
            if (!portfolio.holdings.length) return;
            
            const coinIds = portfolio.holdings.map(h => h.coinId);
            const currency = stateManager.getState('user.preferences.currency') || this.defaultCurrency;
            
            // 보유 코인들의 현재 가격 가져오기
            const coins = await this.getTopCoins(250, currency);
            const priceMap = new Map(coins.map(coin => [coin.id, coin.price]));
            
            // 포트폴리오 값 계산
            let totalValue = 0;
            let totalInvested = 0;
            
            const updatedHoldings = portfolio.holdings.map(holding => {
                const currentPrice = priceMap.get(holding.coinId) || holding.averagePrice;
                const value = holding.amount * currentPrice;
                const invested = holding.amount * holding.averagePrice;
                
                totalValue += value;
                totalInvested += invested;
                
                return {
                    ...holding,
                    currentPrice,
                    value,
                    profitLoss: value - invested,
                    profitLossPercentage: ((value - invested) / invested) * 100
                };
            });
            
            stateManager.dispatch(actions.updatePortfolio({
                ...portfolio,
                holdings: updatedHoldings,
                totalValue,
                totalInvested,
                totalProfit: totalValue - totalInvested,
                profitRate: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0
            }));
            
        } catch (error) {
            console.error('[MarketData] 포트폴리오 값 업데이트 오류:', error);
        }
    }

    // 알림 관련 메서드들
    async checkPriceAlerts() {
        try {
            const alerts = stateManager.getState('investment.alerts');
            if (!alerts.length) return;
            
            const coins = stateManager.getState('market.coins');
            
            alerts.forEach(alert => {
                const coin = coins.find(c => c.id === alert.coinId);
                if (!coin) return;
                
                let triggered = false;
                let message = '';
                
                switch (alert.type) {
                    case 'price_above':
                        if (coin.price >= alert.value) {
                            triggered = true;
                            message = `${coin.name}이(가) ${alert.value.toLocaleString()}원을 넘었습니다.`;
                        }
                        break;
                        
                    case 'price_below':
                        if (coin.price <= alert.value) {
                            triggered = true;
                            message = `${coin.name}이(가) ${alert.value.toLocaleString()}원 아래로 떨어졌습니다.`;
                        }
                        break;
                        
                    case 'change_above':
                        if (coin.priceChangePercentage24h >= alert.value) {
                            triggered = true;
                            message = `${coin.name}이(가) 24시간 동안 ${alert.value}% 이상 상승했습니다.`;
                        }
                        break;
                        
                    case 'change_below':
                        if (coin.priceChangePercentage24h <= alert.value) {
                            triggered = true;
                            message = `${coin.name}이(가) 24시간 동안 ${Math.abs(alert.value)}% 이상 하락했습니다.`;
                        }
                        break;
                }
                
                if (triggered) {
                    stateManager.dispatch(actions.showNotification({
                        message,
                        type: 'warning'
                    }));
                    
                    // 알림 제거 (일회성)
                    if (alert.once) {
                        const updatedAlerts = alerts.filter(a => a.id !== alert.id);
                        stateManager.setState('investment.alerts', updatedAlerts);
                    }
                }
            });
            
        } catch (error) {
            console.error('[MarketData] 가격 알림 확인 오류:', error);
        }
    }

    // 유틸리티 메서드들
    formatPrice(price, currency = 'KRW') {
        const options = {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: currency === 'KRW' ? 0 : 2,
            maximumFractionDigits: currency === 'KRW' ? 0 : 6
        };
        
        try {
            return new Intl.NumberFormat('ko-KR', options).format(price);
        } catch (error) {
            return price.toLocaleString();
        }
    }

    formatPercentage(percentage) {
        const sign = percentage >= 0 ? '+' : '';
        return `${sign}${percentage.toFixed(2)}%`;
    }

    formatMarketCap(marketCap) {
        if (marketCap >= 1e12) {
            return `${(marketCap / 1e12).toFixed(2)}조`;
        } else if (marketCap >= 1e8) {
            return `${(marketCap / 1e8).toFixed(2)}억`;
        } else if (marketCap >= 1e4) {
            return `${(marketCap / 1e4).toFixed(2)}만`;
        }
        return marketCap.toLocaleString();
    }

    // 기술적 분석 관련
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return null;
        
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }
        
        const avgGain = gains.slice(-period).reduce((a, b) => a + b) / period;
        const avgLoss = losses.slice(-period).reduce((a, b) => a + b) / period;
        
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        return rsi;
    }

    calculateSMA(prices, period) {
        if (prices.length < period) return null;
        const sum = prices.slice(-period).reduce((a, b) => a + b);
        return sum / period;
    }

    calculateEMA(prices, period) {
        if (prices.length < period) return null;
        
        const multiplier = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
        
        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    // 정리 메서드
    destroy() {
        this.stopAutoUpdate();
        this.disconnectWebSocket();
        this.clearCache();
        console.log('[MarketData] 시장 데이터 매니저 정리 완료');
    }
}

// 싱글톤 인스턴스 생성
const marketDataManager = new MarketDataManager();

// 전역 접근을 위한 윈도우 객체에 추가 (개발용)
if (typeof window !== 'undefined') {
    window.marketDataManager = marketDataManager;
}

export { marketDataManager };