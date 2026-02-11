// Разрешенные домены
const ALLOWED_DOMAINS = [
    'xn--d1ah4a.com',
    'итд.com'
];

let menuState = {
    banner: false,
    unique: false
};

const STORAGE_KEYS = {
    BANNER_COLOR: 'bannerColor',
    BANNER_GRADIENT: 'bannerGradient',
    UNIQUE_CSS: 'uniqueCSS'
};

function isStorageAvailable() {
    return chrome && chrome.storage && chrome.storage.local;
}

async function safeStorageSet(data) {
    if (!isStorageAvailable()) return false;
    try {
        await chrome.storage.local.set(data);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

async function safeStorageRemove(keys) {
    if (!isStorageAvailable()) return false;
    try {
        await chrome.storage.local.remove(keys);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

function isAllowedDomain(url) {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        return ALLOWED_DOMAINS.some(d => urlObj.hostname === d || urlObj.hostname.endsWith(`.${d}`));
    } catch {
        return false;
    }
}

function toggleSubmenu(menuId, submenuId) {
    const submenu = document.getElementById(submenuId);
    const menuItem = document.getElementById(menuId);
    const arrow = menuItem?.querySelector('.menu-arrow');
    
    if (!submenu) return;
    
    Object.keys(menuState).forEach(key => {
        if (key !== menuId.replace('menu', '').toLowerCase()) {
            const otherSub = document.getElementById(`submenu${key.charAt(0).toUpperCase() + key.slice(1)}`);
            const otherItem = document.getElementById(`menu${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (otherSub) otherSub.classList.remove('active');
            if (otherItem?.querySelector('.menu-arrow')) {
                otherItem.querySelector('.menu-arrow').style.transform = 'rotate(0deg)';
            }
            menuState[key] = false;
        }
    });
    
    submenu.classList.toggle('active');
    menuState[menuId.replace('menu', '').toLowerCase()] = submenu.classList.contains('active');
    if (arrow) {
        arrow.style.transform = submenu.classList.contains('active') ? 'rotate(90deg)' : 'rotate(0deg)';
    }
}

async function updateUIForDomain() {
    const tab = await getCurrentTab();
    const domainMsg = document.getElementById('domainMessage');
    const statusText = document.getElementById('statusText');
    const statusIcon = document.querySelector('.status-icon');
    const items = document.querySelectorAll('.menu-item, .submenu-item, .color-picker, .css-textarea');
    
    if (!tab?.url) {
        domainMsg.innerHTML = '<div class="message warning">⚠️ Нет активной вкладки</div>';
        return;
    }
    
    const allowed = isAllowedDomain(tab.url);
    
    if (allowed) {
        domainMsg.innerHTML = '<div class="message success">✅ Разрешенный домен</div>';
        statusText.textContent = 'Готов к работе';
        statusIcon.textContent = '✅';
        items.forEach(i => i.classList.remove('disabled'));
    } else {
        domainMsg.innerHTML = '<div class="message warning">❌ Работает только на xn--d1ah4a.com и итд.com</div>';
        statusText.textContent = 'Домен не поддерживается';
        statusIcon.textContent = '❌';
        items.forEach(i => i.classList.add('disabled'));
        
        Object.keys(menuState).forEach(key => {
            const sub = document.getElementById(`submenu${key.charAt(0).toUpperCase() + key.slice(1)}`);
            const it = document.getElementById(`menu${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (sub) sub.classList.remove('active');
            if (it?.querySelector('.menu-arrow')) {
                it.querySelector('.menu-arrow').style.transform = 'rotate(0deg)';
            }
            menuState[key] = false;
        });
    }
}

// ============ БАННЕР ============
async function applyGradientBanner() {
    const tab = await getCurrentTab();
    if (!isAllowedDomain(tab?.url)) return;
    await safeStorageSet({ 
        [STORAGE_KEYS.BANNER_GRADIENT]: true,
        [STORAGE_KEYS.BANNER_COLOR]: null 
    });
    document.getElementById('statusText').textContent = '🌈 Градиент применён';
    document.querySelector('.status-icon').textContent = '🌈';
}

async function changeBannerColor(color) {
    const tab = await getCurrentTab();
    if (!isAllowedDomain(tab?.url)) return;
    if (!color) {
        const colors = ['#7c3aed', '#ef4444', '#22c55e', '#eab308', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];
        color = colors[Math.floor(Math.random() * colors.length)];
    }
    await safeStorageSet({ 
        [STORAGE_KEYS.BANNER_COLOR]: color,
        [STORAGE_KEYS.BANNER_GRADIENT]: false 
    });
    document.getElementById('statusText').textContent = `✅ Цвет баннера: ${color}`;
    document.querySelector('.status-icon').textContent = '🎨';
}

async function resetBanner() {
    await safeStorageRemove([STORAGE_KEYS.BANNER_COLOR, STORAGE_KEYS.BANNER_GRADIENT]);
    document.getElementById('statusText').textContent = '🔄 Баннер сброшен к оригиналу';
    document.querySelector('.status-icon').textContent = '🔄';
}

// ============ УНИК ============
async function applyUniqueCSS() {
    const cssInput = document.getElementById('cssInput');
    const css = cssInput?.value.trim();
    if (!css) {
        document.getElementById('statusText').textContent = '❌ Введите CSS';
        document.querySelector('.status-icon').textContent = '❌';
        return;
    }
    const tab = await getCurrentTab();
    if (!isAllowedDomain(tab?.url)) return;
    await safeStorageSet({ [STORAGE_KEYS.UNIQUE_CSS]: css });
    document.getElementById('statusText').textContent = '✨ CSS применён';
    document.querySelector('.status-icon').textContent = '✨';
}

async function resetUnique() {
    await safeStorageRemove(STORAGE_KEYS.UNIQUE_CSS);
    const cssInput = document.getElementById('cssInput');
    if (cssInput) {
        cssInput.value = 'color: #7c3aed; font-weight: bold; text-shadow: 0 0 5px #7c3aed;';
    }
    document.getElementById('statusText').textContent = '🔄 Уник сброшен к оригиналу';
    document.querySelector('.status-icon').textContent = '🔄';
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', () => {
    updateUIForDomain();
    
    // Color picker синхронизация (только для баннера)
    const customPicker = document.getElementById('customColorPicker');
    const customHex = document.getElementById('colorHexValue');
    if (customPicker && customHex) {
        customPicker.addEventListener('input', () => customHex.value = customPicker.value);
    }
    
    // Меню баннера
    document.getElementById('menuBanner')?.addEventListener('click', () => toggleSubmenu('menuBanner', 'submenuBanner'));
    document.getElementById('gradientBanner')?.addEventListener('click', applyGradientBanner);
    document.getElementById('randomBannerColor')?.addEventListener('click', () => changeBannerColor());
    document.getElementById('applyCustomColor')?.addEventListener('click', () => {
        const color = document.getElementById('customColorPicker')?.value || '#7c3aed';
        changeBannerColor(color);
    });
    document.getElementById('resetBanner')?.addEventListener('click', resetBanner);
    
    // Меню уника
    document.getElementById('menuUnique')?.addEventListener('click', () => toggleSubmenu('menuUnique', 'submenuUnique'));
    document.getElementById('applyUniqueCSS')?.addEventListener('click', applyUniqueCSS);
    document.getElementById('resetUniqueEffect')?.addEventListener('click', resetUnique);
});

chrome.tabs.onUpdated.addListener((id, info, tab) => {
    if (info.status === 'complete') updateUIForDomain();
});
chrome.tabs.onActivated.addListener(updateUIForDomain);