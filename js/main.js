/**
 * 블록체인 투자 플랫폼 - 메인 JavaScript 파일
 * 쿠팡 스타일 부드러운 인터랙션과 사용자 경험 구현
 */

/* ===== 전역 설정 ===== */
const CONFIG = {
  // 애니메이션 설정 (쿠팡 기준)
  animations: {
    fast: 150,    // 빠른 전환 (0.15s)
    normal: 300,  // 일반 전환 (0.3s)
    slow: 500     // 느린 전환 (0.5s)
  },
  
  // 쿠팡 브레이크포인트
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  },
  
  // 5가지 관점 테마
  themes: {
    safe: { name: '안심투자', color: '#1e3a8a', icon: '💰' },
    small: { name: '소액투자', color: '#059669', icon: '🎯' },
    high: { name: '고수익투자', color: '#dc2626', icon: '🚀' },
    participation: { name: '참여하기', color: '#7c3aed', icon: '🎮' },
    whale: { name: '대형투자자동향', color: '#1e293b', icon: '🐋' }
  }
};

/* ===== DOM 요소 캐싱 ===== */
let elements = {};

/* ===== 초기화 함수 ===== */
document.addEventListener('DOMContentLoaded', function() {
  initializeElements();
  initializeNavigation();
  initializeSearch();
  initializeTabs();
  initializeCards();
  initializeScrollEffects();
  initializeTooltips();
  initializeMobileMenu();
  initializeThemeDetection();
  
  console.log('🚀 블록체인 투자 플랫폼 초기화 완료');
});

/* ===== DOM 요소 초기화 ===== */
function initializeElements() {
  elements = {
    // 네비게이션
    navbar: document.querySelector('.navbar'),
    mobileMenu: document.querySelector('.mobile-menu'),
    mobileMenuToggle: document.querySelector('.mobile-menu-toggle'),
    
    // 검색
    searchBar: document.querySelector('.search-bar'),
    searchInput: document.querySelector('.search-input'),
    searchResults: document.querySelector('.search-results'),
    
    // 탭 시스템
    tabs: document.querySelectorAll('.tab-button'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // 카드 시스템
    cards: document.querySelectorAll('.investment-card'),
    
    // 기타
    scrollToTop: document.querySelector('.scroll-to-top'),
    tooltips: document.querySelectorAll('[data-tooltip]')
  };
}

/* ===== 네비게이션 기능 ===== */
function initializeNavigation() {
  const navbar = elements.navbar;
  if (!navbar) return;
  
  // 스크롤 시 네비게이션 스타일 변경 (쿠팡 스타일)
  let lastScrollY = window.scrollY;
  
  window.addEventListener('scroll', debounce(() => {
    const currentScrollY = window.scrollY;
    
    if (currentScrollY > 100) {
      navbar.classList.add('navbar-scrolled');
    } else {
      navbar.classList.remove('navbar-scrolled');
    }
    
    // 스크롤 방향에 따른 네비게이션 표시/숨김
    if (currentScrollY > lastScrollY && currentScrollY > 200) {
      navbar.classList.add('navbar-hidden');
    } else {
      navbar.classList.remove('navbar-hidden');
    }
    
    lastScrollY = currentScrollY;
  }, 50));
  
  // 부드러운 스크롤 네비게이션
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      
      if (target) {
        const navbarHeight = navbar.offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navbarHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/* ===== 검색 기능 ===== */
function initializeSearch() {
  const searchInput = elements.searchInput;
  const searchResults = elements.searchResults;
  
  if (!searchInput || !searchResults) return;
  
  // 실시간 검색 (디바운스 적용)
  searchInput.addEventListener('input', debounce((e) => {
    const query = e.target.value.trim();
    
    if (query.length >= 2) {
      performSearch(query);
    } else {
      hideSearchResults();
    }
  }, 300));
  
  // 검색 포커스/블러 처리
  searchInput.addEventListener('focus', () => {
    elements.searchBar.classList.add('search-focused');
  });
  
  searchInput.addEventListener('blur', () => {
    setTimeout(() => {
      elements.searchBar.classList.remove('search-focused');
      hideSearchResults();
    }, 200);
  });
}

function performSearch(query) {
  const searchResults = elements.searchResults;
  
  // 모의 검색 데이터 (실제로는 API에서 가져옴)
  const mockResults = [
    { type: 'safe', title: '안정형 비트코인 펀드', description: '월 2-3% 안정 수익' },
    { type: 'small', title: '소액 이더리움 적립', description: '1만원부터 시작' },
    { type: 'high', title: '고수익 DeFi 상품', description: '연 15% 목표 수익률' },
    { type: 'participation', title: '투자 게임 챌린지', description: '재미있는 투자 참여' },
    { type: 'whale', title: '기관투자자 동향', description: '대형 투자자 분석' }
  ];
  
  const filteredResults = mockResults.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase())
  );
  
  if (filteredResults.length > 0) {
    displaySearchResults(filteredResults);
  } else {
    displayNoResults(query);
  }
}

function displaySearchResults(results) {
  const searchResults = elements.searchResults;
  
  const resultHTML = results.map(item => {
    const theme = CONFIG.themes[item.type];
    return `
      <div class="search-result-item" data-type="${item.type}">
        <div class="result-icon" style="color: ${theme.color}">
          ${theme.icon}
        </div>
        <div class="result-content">
          <div class="result-title">${item.title}</div>
          <div class="result-description">${item.description}</div>
        </div>
        <div class="result-category" style="background-color: ${theme.color}20; color: ${theme.color}">
          ${theme.name}
        </div>
      </div>
    `;
  }).join('');
  
  searchResults.innerHTML = resultHTML;
  searchResults.classList.add('search-results-visible');
  
  // 검색 결과 클릭 이벤트
  searchResults.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.dataset.type;
      navigateToSection(type);
      hideSearchResults();
    });
  });
}

function displayNoResults(query) {
  const searchResults = elements.searchResults;
  
  searchResults.innerHTML = `
    <div class="search-no-results">
      <div class="no-results-icon">🔍</div>
      <div class="no-results-text">"${query}"에 대한 검색 결과가 없습니다</div>
      <div class="no-results-suggestion">다른 키워드로 검색해보세요</div>
    </div>
  `;
  
  searchResults.classList.add('search-results-visible');
}

function hideSearchResults() {
  const searchResults = elements.searchResults;
  if (searchResults) {
    searchResults.classList.remove('search-results-visible');
  }
}

/* ===== 탭 시스템 ===== */
function initializeTabs() {
  const tabs = elements.tabs;
  const tabContents = elements.tabContents;
  
  if (tabs.length === 0) return;
  
  // 탭 클릭 이벤트
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = tab.dataset.tab;
      
      if (tab.classList.contains('tab-active')) return;
      
      switchTab(targetTab);
    });
  });
  
  // 첫 번째 탭 활성화
  if (tabs.length > 0) {
    const firstTab = tabs[0].dataset.tab;
    switchTab(firstTab);
  }
}

function switchTab(targetTab) {
  const tabs = elements.tabs;
  const tabContents = elements.tabContents;
  
  // 모든 탭 비활성화
  tabs.forEach(tab => {
    tab.classList.remove('tab-active');
  });
  
  tabContents.forEach(content => {
    content.classList.remove('tab-content-active');
  });
  
  // 선택된 탭 활성화
  const activeTab = document.querySelector(`[data-tab="${targetTab}"]`);
  const activeContent = document.querySelector(`[data-tab-content="${targetTab}"]`);
  
  if (activeTab && activeContent) {
    activeTab.classList.add('tab-active');
    
    // 부드러운 애니메이션으로 콘텐츠 전환
    setTimeout(() => {
      activeContent.classList.add('tab-content-active');
    }, 50);
    
    // 탭 인디케이터 이동 (쿠팡 스타일)
    moveTabIndicator(activeTab);
  }
}

function moveTabIndicator(activeTab) {
  let indicator = document.querySelector('.tab-indicator');
  
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'tab-indicator';
    activeTab.parentNode.appendChild(indicator);
  }
  
  const tabRect = activeTab.getBoundingClientRect();
  const containerRect = activeTab.parentNode.getBoundingClientRect();
  
  const left = tabRect.left - containerRect.left;
  const width = tabRect.width;
  
  indicator.style.transform = `translateX(${left}px)`;
  indicator.style.width = `${width}px`;
}

/* ===== 카드 인터랙션 ===== */
function initializeCards() {
  const cards = elements.cards;
  
  cards.forEach(card => {
    // 호버 효과 (쿠팡 스타일)
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-6px)';
      card.style.boxShadow = 'var(--shadow-hover)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = 'var(--shadow-card)';
    });
    
    // 클릭 리플 효과
    card.addEventListener('click', function(e) {
      createRippleEffect(e, this);
    });
    
    // 카드 내 버튼 이벤트
    const favoriteBtn = card.querySelector('.btn-favorite');
    const shareBtn = card.querySelector('.btn-share');
    const learnMoreBtn = card.querySelector('.btn-learn-more');
    
    if (favoriteBtn) {
      favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleFavoriteAction(favoriteBtn);
      });
    }
    
    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleShareAction(shareBtn);
      });
    }
    
    if (learnMoreBtn) {
      learnMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleLearnMoreAction(learnMoreBtn);
      });
    }
  });
}

/* ===== 스크롤 효과 ===== */
function initializeScrollEffects() {
  // Intersection Observer로 스크롤 애니메이션
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, observerOptions);
  
  // 애니메이션 대상 요소들 관찰
  document.querySelectorAll('.fade-in, .slide-up, .investment-card').forEach(el => {
    observer.observe(el);
  });
  
  // 스크롤 투 탑 버튼
  const scrollToTop = elements.scrollToTop;
  if (scrollToTop) {
    window.addEventListener('scroll', debounce(() => {
      if (window.scrollY > 500) {
        scrollToTop.classList.add('scroll-to-top-visible');
      } else {
        scrollToTop.classList.remove('scroll-to-top-visible');
      }
    }, 100));
    
    scrollToTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

/* ===== 툴팁 시스템 ===== */
function initializeTooltips() {
  const tooltips = elements.tooltips;
  
  tooltips.forEach(element => {
    let tooltip = null;
    
    element.addEventListener('mouseenter', (e) => {
      const text = element.dataset.tooltip;
      if (!text) return;
      
      tooltip = createTooltip(text);
      document.body.appendChild(tooltip);
      positionTooltip(tooltip, element);
      
      setTimeout(() => {
        tooltip.classList.add('tooltip-visible');
      }, 50);
    });
    
    element.addEventListener('mouseleave', () => {
      if (tooltip) {
        tooltip.classList.remove('tooltip-visible');
        setTimeout(() => {
          if (tooltip && tooltip.parentNode) {
            tooltip.remove();
          }
        }, CONFIG.animations.fast);
      }
    });
  });
}

function createTooltip(text) {
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = text;
  return tooltip;
}

function positionTooltip(tooltip, element) {
  const elementRect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  let top = elementRect.top - tooltipRect.height - 8;
  let left = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);
  
  // 화면 경계 확인
  if (top < 10) {
    top = elementRect.bottom + 8;
    tooltip.classList.add('tooltip-bottom');
  }
  
  if (left < 10) {
    left = 10;
  } else if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }
  
  tooltip.style.top = `${top + window.scrollY}px`;
  tooltip.style.left = `${left}px`;
}

function hideTooltip() {
  const tooltip = document.querySelector('.tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}

/* ===== 모바일 메뉴 ===== */
function initializeMobileMenu() {
  const mobileMenuToggle = elements.mobileMenuToggle;
  const mobileMenu = elements.mobileMenu;
  
  if (!mobileMenuToggle || !mobileMenu) return;
  
  mobileMenuToggle.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMobileMenu();
  });
  
  // 메뉴 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (mobileMenu.classList.contains('mobile-menu-open') && 
        !mobileMenu.contains(e.target) && 
        !mobileMenuToggle.contains(e.target)) {
      closeMobileMenu();
    }
  });
  
  // 메뉴 링크 클릭 시 닫기
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      closeMobileMenu();
    });
  });
}

function toggleMobileMenu() {
  const mobileMenu = elements.mobileMenu;
  const mobileMenuToggle = elements.mobileMenuToggle;
  
  if (mobileMenu.classList.contains('mobile-menu-open')) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

function openMobileMenu() {
  const mobileMenu = elements.mobileMenu;
  const mobileMenuToggle = elements.mobileMenuToggle;
  
  mobileMenu.classList.add('mobile-menu-open');
  mobileMenuToggle.classList.add('menu-toggle-active');
  document.body.classList.add('mobile-menu-no-scroll');
}

function closeMobileMenu() {
  const mobileMenu = elements.mobileMenu;
  const mobileMenuToggle = elements.mobileMenuToggle;
  
  mobileMenu.classList.remove('mobile-menu-open');
  mobileMenuToggle.classList.remove('menu-toggle-active');
  document.body.classList.remove('mobile-menu-no-scroll');
}

/* ===== 테마 감지 ===== */
function initializeThemeDetection() {
  // 시스템 테마 감지
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark-theme');
  }
  
  // 테마 변경 감지
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (e.matches) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  });
}

/* ===== 유틸리티 함수들 ===== */

// 디바운스 함수
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 리플 효과 생성
function createRippleEffect(event, element) {
  const ripple = document.createElement('div');
  ripple.className = 'ripple-effect';
  
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  
  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

// 섹션으로 이동
function navigateToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    const navbar = elements.navbar;
    const navbarHeight = navbar ? navbar.offsetHeight : 0;
    const targetPosition = section.getBoundingClientRect().top + window.scrollY - navbarHeight - 20;
    
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  }
}

// 즐겨찾기 액션
function handleFavoriteAction(button) {
  if (button.classList.contains('favorited')) {
    button.classList.remove('favorited');
    showNotification('즐겨찾기에서 제거되었습니다.', 'info');
  } else {
    button.classList.add('favorited');
    showNotification('즐겨찾기에 추가되었습니다.', 'success');
  }
}

// 공유 액션
function handleShareAction(button) {
  const card = button.closest('.investment-card');
  const projectTitle = card.querySelector('.card-title').textContent;
  const url = window.location.href;
  
  if (navigator.share) {
    navigator.share({
      title: projectTitle,
      text: '블록체인 투자 기회를 확인해보세요!',
      url: url
    });
  } else {
    // 클립보드 복사 대체
    navigator.clipboard.writeText(url).then(() => {
      showNotification('링크가 클립보드에 복사되었습니다.', 'success');
    });
  }
}

// 더보기 액션
function handleLearnMoreAction(button) {
  const card = button.closest('.investment-card');
  const link = card.querySelector('.card-link');
  
  if (link) {
    window.location.href = link.href;
  }
}

// 알림 표시
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('notification-visible');
  }, 50);
  
  setTimeout(() => {
    notification.classList.remove('notification-visible');
    setTimeout(() => {
      notification.remove();
    }, CONFIG.animations.normal);
  }, 3000);
}

/* ===== 전역 이벤트 리스너 ===== */

// 윈도우 리사이즈 처리
window.addEventListener('resize', debounce(() => {
  // 모바일 메뉴 자동 닫기 (데스크톱으로 전환 시)
  if (window.innerWidth >= CONFIG.breakpoints.tablet) {
    closeMobileMenu();
  }
  
  // 검색 결과 숨기기
  hideSearchResults();
}, 250));

// 키보드 네비게이션
document.addEventListener('keydown', (e) => {
  // Escape 키 처리
  if (e.key === 'Escape') {
    hideSearchResults();
    hideTooltip();
  }
  
  // Tab 키 포커스 관리
  if (e.key === 'Tab') {
    document.body.classList.add('keyboard-navigation');
  }
});

// 마우스 클릭 시 키보드 네비게이션 해제
document.addEventListener('mousedown', () => {
  document.body.classList.remove('keyboard-navigation');
});

console.log('🎯 Main.js 로드 완료 - 쿠팡 스타일 인터랙션 시스템 준비됨');