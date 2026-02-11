// ============= КЛЮЧИ STORAGE =============
const STORAGE_KEYS = {
    BANNER_COLOR: 'bannerColor',
    BANNER_GRADIENT: 'bannerGradient',
    UNIQUE_CSS: 'uniqueCSS',
    ORIGINAL_BANNER: 'originalBanner',
    ORIGINAL_BIO: 'originalBio'
};

// ============= СОСТОЯНИЕ =============
let settings = {
    bannerColor: null,
    bannerGradient: false,
    uniqueCSS: null
};

// ============= ЗАГРУЗКА НАСТРОЕК ИЗ STORAGE =============
async function loadSettings() {
    try {
        const data = await chrome.storage.local.get([
            STORAGE_KEYS.BANNER_COLOR,
            STORAGE_KEYS.BANNER_GRADIENT,
            STORAGE_KEYS.UNIQUE_CSS
        ]);
        
        settings.bannerColor = data[STORAGE_KEYS.BANNER_COLOR] || null;
        settings.bannerGradient = data[STORAGE_KEYS.BANNER_GRADIENT] || false;
        settings.uniqueCSS = data[STORAGE_KEYS.UNIQUE_CSS] || null;
        
        console.log('Content: настройки загружены', settings);
        applyAll();
    } catch (e) {
        console.error('Content: ошибка загрузки настроек', e);
    }
}

// ============= ПРИМЕНЕНИЕ ВСЕХ НАСТРОЕК =============
function applyAll() {
    if (settings.bannerGradient) {
        applyGradientBanner();
    } else if (settings.bannerColor) {
        applyBannerColor(settings.bannerColor);
    }
    
    if (settings.uniqueCSS) {
        applyUniqueCSS(settings.uniqueCSS);
    }
}

// ============= СОХРАНЕНИЕ ОРИГИНАЛЬНЫХ СТИЛЕЙ =============
async function saveOriginalBannerIfNeeded() {
    const banner = document.querySelector('.profile-banner__gradient.svelte-9mur0y');
    if (!banner) return;
    
    const stored = await chrome.storage.local.get(STORAGE_KEYS.ORIGINAL_BANNER);
    if (!stored[STORAGE_KEYS.ORIGINAL_BANNER]) {
        const original = {
            background: banner.style.background || window.getComputedStyle(banner).background,
            cssText: banner.style.cssText || ''
        };
        await chrome.storage.local.set({ [STORAGE_KEYS.ORIGINAL_BANNER]: original });
        console.log('Content: оригинальный баннер сохранён');
    }
}

async function saveOriginalBioIfNeeded() {
    const bio = document.querySelector('.profile-bio__name.svelte-p40znu, [class*="profile-bio__name"][class*="svelte"]');
    if (!bio) return;
    
    const stored = await chrome.storage.local.get(STORAGE_KEYS.ORIGINAL_BIO);
    if (!stored[STORAGE_KEYS.ORIGINAL_BIO]) {
        const original = {
            cssText: bio.style.cssText || '',
            color: bio.style.color,
            fontSize: bio.style.fontSize,
            fontWeight: bio.style.fontWeight,
            textShadow: bio.style.textShadow
        };
        await chrome.storage.local.set({ [STORAGE_KEYS.ORIGINAL_BIO]: original });
        console.log('Content: оригинальный bio сохранён');
    }
}

// ============= ПРИМЕНЕНИЕ БАННЕРА =============
function applyBannerColor(color) {
    const banner = document.querySelector('.profile-banner__gradient.svelte-9mur0y');
    if (!banner) return;
    banner.style.animation = '';
    banner.style.background = `linear-gradient(180deg, ${color}80 0%, ${color} 100%)`;
}

function applyGradientBanner() {
    const banner = document.querySelector('.profile-banner__gradient.svelte-9mur0y');
    if (!banner) return;
    banner.style.background = 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7, #ff9ff3, #feca57)';
    banner.style.backgroundSize = '400% 400%';
    banner.style.animation = 'gradientBG 8s ease infinite';
    
    if (!document.getElementById('gradientAnimation')) {
        const style = document.createElement('style');
        style.id = 'gradientAnimation';
        style.textContent = `
            @keyframes gradientBG {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
        `;
        document.head.appendChild(style);
    }
}

// ============= ПРИМЕНЕНИЕ УНИКАЛЬНОГО CSS =============
function applyUniqueCSS(cssText) {
    const bio = document.querySelector('.profile-bio__name.svelte-p40znu, [class*="profile-bio__name"][class*="svelte"]');
    if (!bio) return;
    
    const properties = cssText.split(';').filter(p => p.trim());
    properties.forEach(prop => {
        const [key, value] = prop.split(':').map(s => s.trim());
        if (key && value) {
            bio.style[key] = value;
        }
    });
}

// ============= НАБЛЮДАТЕЛЬ ЗА ПОЯВЛЕНИЕМ ЭЛЕМЕНТОВ =============
const observer = new MutationObserver((mutations, obs) => {
    const banner = document.querySelector('.profile-banner__gradient.svelte-9mur0y');
    const bio = document.querySelector('.profile-bio__name.svelte-p40znu, [class*="profile-bio__name"][class*="svelte"]');
    
    if (banner || bio) {
        applyAll();
        saveOriginalBannerIfNeeded();
        saveOriginalBioIfNeeded();
    }
});

observer.observe(document.documentElement, { childList: true, subtree: true });

// ============= СЛУШАЕМ ИЗМЕНЕНИЯ В STORAGE =============
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    
    let needApply = false;
    
    if (changes[STORAGE_KEYS.BANNER_COLOR]) {
        settings.bannerColor = changes[STORAGE_KEYS.BANNER_COLOR].newValue;
        settings.bannerGradient = false;
        needApply = true;
    }
    if (changes[STORAGE_KEYS.BANNER_GRADIENT]) {
        settings.bannerGradient = changes[STORAGE_KEYS.BANNER_GRADIENT].newValue;
        if (settings.bannerGradient) settings.bannerColor = null;
        needApply = true;
    }
    if (changes[STORAGE_KEYS.UNIQUE_CSS]) {
        settings.uniqueCSS = changes[STORAGE_KEYS.UNIQUE_CSS].newValue;
        needApply = true;
    }
    
    if (needApply) {
        applyAll();
    }
});

// ============= ЗАГРУЗКА ПРИ СТАРТЕ =============
loadSettings();

document.addEventListener('DOMContentLoaded', () => {
    applyAll();
    saveOriginalBannerIfNeeded();
    saveOriginalBioIfNeeded();
});