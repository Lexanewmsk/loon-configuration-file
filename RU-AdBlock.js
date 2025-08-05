/**
 * Professional Russian AdBlock Script for Loon
 * Версия: 3.2
 * Автор: Professional AdBlock Team
 * Описание: Оптимизированная система блокировки рекламы для русскоязычных сайтов
 */

const CONFIG = {
    scriptName: "RU-AdBlock",
    version: "3.2",
    debug: $environment && $environment['Дебаг логи'] === 'Включить' || false,
    
    // Настройки блокировки из плагина
    blockingModes: {
        cleanHTML: $environment && $environment['Очистка HTML'] !== 'Отключить',
        httpsRedirect: $environment && $environment['HTTPS редиректы'] !== 'Отключить',
        antiTracker: $environment && $environment['Антитрекинг'] !== 'Отключить',
        socialBlock: $environment && $environment['Блокировка соцсетей'] === 'Включить'
    }
};

// ===============================================
// ОПТИМИЗИРОВАННЫЕ СПИСКИ БЛОКИРОВКИ
// ===============================================

const BLOCK_LISTS = {
    // Основные рекламные домены
    adDomains: new Set([
        // Яндекс реклама
        "bs.yandex.ru", "an.yandex.ru", "yabs.yandex.ru", 
        "awaps.yandex.ru", "yastatic.net/awaps",
        "yandexadexchange.net", "adfox.ru", "adfox.yandex.ru",
        
        // Яндекс.Дзен реклама
        "dzeninfra.ru", "static.dzeninfra.ru", 
        "clck.dzen.ru", "an.dzen.ru", "ads.dzen.ru",
        
        // Google реклама
        "doubleclick.net", "googlesyndication.com", "googleadservices.com",
        "googletagmanager.com", "googletagservices.com", "adsystem.google.com",
        "pagead2.googlesyndication.com", "tpc.googlesyndication.com",
        
        // VK/Mail.ru реклама
        "go.mail.ru", "rs.mail.ru", "top.mail.ru", "love.mail.ru/ads",
        "vk.com/ads", "ads.vk.com",
        
        // Рамблер
        "top100.rambler.ru", "counter.rambler.ru", "ssp.rambler.ru",
        "nova.rambler.ru", "rbc.ru/ads",
        
        // RTB платформы
        "relap.io", "buzzoola.com", "marketgid.com", "mgid.com",
        "outbrain.com", "taboola.com", "smi2.net", "smi2.ru",
        
        // Криптомайнинг
        "coinhive.com", "coin-hive.com", "jsecoin.com", "crypto-loot.com"
    ]),
    
    // Аналитика (если включен антитрекинг)
    analyticsDomains: new Set([
        "mc.yandex.ru", "informer.yandex.ru", "metrika.yandex.ru",
        "google-analytics.com", "googleanalytics.com", "gtm.js",
        "facebook.com/tr", "connect.facebook.net/signals"
    ]),
    
    // Быстрые проверки по ключевым словам
    adKeywordsRegex: /\/(ads?|banner|reklama|advertising|advert|promo|rtb|ssp|dsp|counter|metric|analytics|tracking|pixel|beacon|affiliate|partner|videoads|preroll|adfox|yabs|awaps|dzeninfra.*zen-lib|clck)\//i,
    
    // Проверка поддоменов
    adSubdomainRegex: /^https?:\/\/(ads?|ad|banner|promo|reklama|commercial|rtb|ssp|tracking|metric|counter)\./i,
    
    // Трекинг параметры
    trackingParamsRegex: /[?&](utm_|fbclid|gclid|yclid|adb-bits|test-tag|ctime|actual-format)=/i
};

// ===============================================
// БЕЛЫЙ СПИСОК
// ===============================================

const WHITELIST = {
    // Домены с путями для точного совпадения
    domains: new Set([
        // Поисковики
        "yandex.ru/search", "google.com/search", "google.ru/search",
        "duckduckgo.com", "bing.com/search",
        
        // Социальные сети (основной функционал)
        "vk.com/im", "vk.com/feed", "vk.com/friends",
        "ok.ru/messages", "ok.ru/feed",
        
        // Дзен контент (не реклама)
        "dzen.ru/news", "dzen.ru/media", "dzen.ru/video",
        
        // Почта
        "mail.ru/inbox", "yandex.ru/mail", "gmail.com",
        
        // Важные сервисы
        "gosuslugi.ru", "nalog.ru", "pfr.ru", "fss.ru",
        "sberbank.ru", "vtb.ru", "alfabank.ru", "tinkoff.ru",
        "yandex.ru/maps", "2gis.ru",
        
        // Работа
        "hh.ru", "superjob.ru", "rabota.ru",
        
        // Золотое яблоко - ДОБАВЛЕНО
        "goldapple.ru", "app.goldapple.ru", "api.goldapple.ru"
    ]),
    
    // Пути API и системные
    pathsRegex: /\/(api|ajax|json|xml|graphql|login|auth|oauth|register|checkout|payment|cart|order)\//i,
    
    // Полные домены в белом списке
    fullDomains: new Set([
        "goldapple.ru", // Золотое яблоко
        "app.goldapple.ru",
        "api.goldapple.ru",
        "gosuslugi.ru",
        "nalog.ru",
        "pfr.ru"
    ])
};

// ===============================================
// HTTPS РЕДИРЕКТ 
// ===============================================

const HTTPS_DOMAINS = new Set([
    "yandex.ru", "ya.ru", "vk.com", "mail.ru", "ok.ru",
    "avito.ru", "pikabu.ru", "habr.com", "lenta.ru", "rbc.ru",
    "kinopoisk.ru", "ozon.ru", "wildberries.ru",
    "sberbank.ru", "vtb.ru", "tinkoff.ru", "dzen.ru",
    "goldapple.ru" // Золотое яблоко
]);

// ===============================================
// ЛОГИРОВАНИЕ
// ===============================================

function log(level, message, data = null) {
    if (!CONFIG.debug && level === 'debug') return;
    
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${CONFIG.scriptName}][${level.toUpperCase()}]`;
    
    if (data) {
        console.log(`${prefix} ${message}`, JSON.stringify(data));
    } else {
        console.log(`${prefix} ${message}`);
    }
}

// ===============================================
// ОПТИМИЗИРОВАННЫЕ ФУНКЦИИ ПРОВЕРКИ
// ===============================================

function isWhitelisted(url) {
    const urlLower = url.toLowerCase();
    
    // Быстрая проверка системных путей
    if (WHITELIST.pathsRegex.test(urlLower)) {
        log('debug', 'Whitelisted by path', { url });
        return true;
    }
    
    // Проверка полных доменов
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        if (WHITELIST.fullDomains.has(hostname)) {
            log('debug', 'Whitelisted full domain', { url });
            return true;
        }
    } catch (e) {}
    
    // Проверка доменов с путями
    for (const domain of WHITELIST.domains) {
        if (urlLower.includes(domain)) {
            log('debug', `Whitelisted by domain: ${domain}`, { url });
            return true;
        }
    }
    
    return false;
}

function shouldBlock(url) {
    if (isWhitelisted(url)) {
        return false;
    }
    
    const urlLower = url.toLowerCase();
    
    // Быстрые regex проверки
    if (BLOCK_LISTS.adKeywordsRegex.test(urlLower)) {
        log('info', 'Blocked by keyword pattern', { url });
        return { blocked: true, reason: 'keyword-pattern' };
    }
    
    if (BLOCK_LISTS.adSubdomainRegex.test(urlLower)) {
        log('info', 'Blocked by subdomain pattern', { url });
        return { blocked: true, reason: 'subdomain-pattern' };
    }
    
    if (BLOCK_LISTS.trackingParamsRegex.test(urlLower)) {
        log('info', 'Blocked by tracking params', { url });
        return { blocked: true, reason: 'tracking-params' };
    }
    
    // Проверка доменов
    for (const domain of BLOCK_LISTS.adDomains) {
        if (urlLower.includes(domain)) {
            log('info', `Blocked by domain: ${domain}`, { url });
            return { blocked: true, reason: `domain: ${domain}` };
        }
    }
    
    // Проверка аналитики если включен антитрекинг
    if (CONFIG.blockingModes.antiTracker) {
        for (const domain of BLOCK_LISTS.analyticsDomains) {
            if (urlLower.includes(domain)) {
                log('info', `Blocked by analytics: ${domain}`, { url });
                return { blocked: true, reason: `analytics: ${domain}` };
            }
        }
    }
    
    return { blocked: false };
}

// ===============================================
// ОПТИМИЗИРОВАННАЯ ОЧИСТКА HTML
// ===============================================

const HTML_CLEAN_PATTERNS = [
    // Яндекс
    /<script[^>]*(?:yandex|ya).*?(?:direct|partner|metrika)[^>]*>.*?<\/script>/gis,
    /<div[^>]*(?:ya-partner|yap-|direct)[^>]*>.*?<\/div>/gis,
    
    // Google
    /<script[^>]*googlesyndication[^>]*>.*?<\/script>/gis,
    /<ins[^>]*adsbygoogle[^>]*>.*?<\/ins>/gis,
    
    // Adfox
    /<script[^>]*adfox[^>]*>.*?<\/script>/gis,
    /<div[^>]*adfox[^>]*>.*?<\/div>/gis,
    
    // Дзен
    /<div[^>]*(?:zen-lib|dzeninfra)[^>]*>.*?<\/div>/gis,
    /<script[^>]*dzeninfra[^>]*>.*?<\/script>/gis,
    
    // Общие рекламные блоки
    /<div[^>]*class="[^"]*(?:ad|ads|banner|reklama|advert)[^"]*"[^>]*>.*?<\/div>/gis,
    /<section[^>]*class="[^"]*(?:ad|ads|banner)[^"]*"[^>]*>.*?<\/section>/gis,
    
    // Трекинг
    /<img[^>]*(?:pixel|beacon|counter|metric|clck)[^>]*>/gi,
    /<noscript[^>]*>.*?<img[^>]*(?:counter|metric|pixel)[^>]*>.*?<\/noscript>/gis
];

function cleanHTML(html) {
    if (!CONFIG.blockingModes.cleanHTML) return html;
    
    const originalLength = html.length;
    let cleanedHTML = html;
    
    // Применяем паттерны очистки
    for (const pattern of HTML_CLEAN_PATTERNS) {
        cleanedHTML = cleanedHTML.replace(pattern, '');
    }
    
    // Внедряем CSS для блокировки
    const css = `
<style id="ru-adblock-css">
[class*="ad-"], [class*="ads-"], [class*="banner"],
[id*="ad-"], [id*="ads-"], [id*="banner"],
.ya-partner, .yap-adunit, .adsbygoogle,
[class*="reklama"], [class*="promo"],
iframe[src*="doubleclick"], iframe[src*="googlesyndication"] {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    overflow: hidden !important;
}
</style>`;
    
    if (cleanedHTML.includes('</head>')) {
        cleanedHTML = cleanedHTML.replace('</head>', css + '</head>');
    } else if (cleanedHTML.includes('<body')) {
        cleanedHTML = cleanedHTML.replace(/(<body[^>]*>)/, '$1' + css);
    }
    
    const bytesRemoved = originalLength - cleanedHTML.length;
    if (bytesRemoved > 0) {
        log('info', `HTML cleaned: ${bytesRemoved} bytes removed`);
    }
    
    return cleanedHTML;
}

// ===============================================
// ОБРАБОТЧИКИ
// ===============================================

function handleRequest(request) {
    const url = request.url;
    const method = request.method || 'GET';
    
    log('debug', `Processing ${method} request`, { url });
    
    // HTTPS редирект
    if (CONFIG.blockingModes.httpsRedirect && url.startsWith('http://')) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            for (const domain of HTTPS_DOMAINS) {
                if (hostname.includes(domain)) {
                    const httpsUrl = url.replace('http://', 'https://');
                    log('info', `HTTPS redirect: ${url} -> ${httpsUrl}`);
                    return {
                        response: {
                            status: 302,
                            headers: {
                                'Location': httpsUrl,
                                'Cache-Control': 'no-cache'
                            }
                        }
                    };
                }
            }
        } catch (e) {}
    }
    
    // Проверка блокировки
    const blockResult = shouldBlock(url);
    if (blockResult.blocked) {
        return {
            response: {
                status: 204,
                headers: {
                    'Content-Type': 'text/plain',
                    'X-Blocked-By': 'RU-AdBlock',
                    'Cache-Control': 'max-age=86400'
                },
                body: ''
            }
        };
    }
    
    log('debug', 'Request allowed', { url });
    return null;
}

function handleResponse(response) {
    const url = response.url || 'unknown';
    const contentType = response.headers && 
        (response.headers['Content-Type'] || response.headers['content-type']) || '';
    
    log('debug', 'Processing response', { url, contentType });
    
    // Обрабатываем только HTML
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        return null;
    }
    
    if (!response.body) {
        return null;
    }
    
    const cleanedBody = cleanHTML(response.body);
    
    if (cleanedBody !== response.body) {
        log('info', 'Response body cleaned', { url });
        return {
            response: {
                status: response.status,
                headers: response.headers,
                body: cleanedBody
            }
        };
    }
    
    return null;
}

// ===============================================
// ТОЧКА ВХОДА
// ===============================================

(function main() {
    log('info', `Script started v${CONFIG.version}`, CONFIG.blockingModes);
    
    try {
        if (typeof $request !== 'undefined' && $request) {
            const result = handleRequest($request);
            $done(result || {});
        } else if (typeof $response !== 'undefined' && $response) {
            const result = handleResponse($response);
            $done(result || {});
        } else {
            log('warn', 'No request or response object');
            $done({});
        }
    } catch (error) {
        log('error', 'Script error', {
            message: error.message,
            stack: error.stack
        });
        $done({});
    }
})();
