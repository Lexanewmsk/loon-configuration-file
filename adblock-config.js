/**
 * adblock-config.js
 * Конфигурация и списки блокировки
 */

const CONFIG = {
    scriptName: "Professional-RU-AdBlock",
    version: "3.2",
    debug: false,
    
    // Режимы блокировки будут настраиваться из плагина
    modes: {
        balanced: {
            aggressive: false,
            cleanHTML: true,
            httpsRedirect: true,
            antiTracker: false,
            socialBlock: false,
            strictPatterns: false
        },
        aggressive: {
            aggressive: true,
            cleanHTML: true,
            httpsRedirect: true,
            antiTracker: true,
            socialBlock: false,
            strictPatterns: true
        },
        maximum: {
            aggressive: true,
            cleanHTML: true,
            httpsRedirect: true,
            antiTracker: true,
            socialBlock: true,
            strictPatterns: true,
            deepClean: true
        }
    }
};

// Экспортируем списки блокировки
const BLOCK_LISTS = {
    // Базовые рекламные домены (для всех режимов)
    adDomainsBasic: [
        // Яндекс реклама
        "bs.yandex.ru", "an.yandex.ru", "yabs.yandex.ru",
        "yandexadexchange.net", "adfox.ru",
        
        // Google реклама
        "doubleclick.net", "googlesyndication.com",
        "googleadservices.com",
        
        // Mail.ru реклама
        "go.mail.ru", "rs.mail.ru",
        
        // RTB платформы
        "relap.io", "buzzoola.com", "marketgid.com"
    ],
    
    // Расширенные домены (для aggressive и maximum)
    adDomainsExtended: [
        "awaps.yandex.ru", "adfox.yandex.ru",
        "dzeninfra.ru", "static.dzeninfra.ru",
        "clck.dzen.ru", "an.dzen.ru", "ads.dzen.ru",
        "googletagmanager.com", "googletagservices.com",
        "pagead2.googlesyndication.com",
        "top.mail.ru", "love.mail.ru/ads",
        "vk.com/ads", "ads.vk.com",
        "mgid.com", "outbrain.com", "taboola.com", "smi2.net"
    ],
    
    // Аналитика (для режима antiTracker)
    analyticsDomains: [
        "mc.yandex.ru", "informer.yandex.ru", "metrika.yandex.ru",
        "google-analytics.com", "googleanalytics.com",
        "facebook.com/tr", "connect.facebook.net/signals",
        "top100.rambler.ru", "counter.rambler.ru"
    ],
    
    // Ключевые слова
    adKeywordsBasic: [
        "ads", "ad_", "_ad", "banner", "reklama",
        "advertisement", "advertising"
    ],
    
    adKeywordsExtended: [
        "rtb", "ssp", "dsp", "prebid", "programmatic",
        "counter", "metric", "analytics", "tracking",
        "pixel", "beacon", "affiliate", "partner"
    ],
    
    // Паттерны (упрощенные для базового режима)
    adPatternsBasic: [
        /\/ads?\//i,
        /\/banner/i,
        /\/reklama/i,
        /^https?:\/\/ads?\./i
    ],
    
    adPatternsExtended: [
        /\/ad\//i, /\/banners/i,
        /\/advertising/i, /\/advert/i,
        /\/promo/i, /\/commercial/i,
        /\/pixel\./i, /\/beacon\./i,
        /\/counter\./i, /\/metric\./i,
        /\/click/i, /\/clck\./i,
        /\/adfox/i, /\/yabs\//i,
        /dzeninfra\.ru.*zen-lib/i,
        /[?&](utm_|fbclid|gclid|yclid)/i
    ]
};

const WHITELIST = {
    // Базовый белый список
    domainsBasic: [
        "yandex.ru/search", "google.com/search",
        "vk.com/im", "vk.com/feed",
        "mail.ru/inbox", "yandex.ru/mail",
        "gosuslugi.ru", "nalog.ru",
        "sberbank.ru", "vtb.ru"
    ],
    
    // Расширенный белый список для balanced режима
    domainsExtended: [
        "dzen.ru/news", "dzen.ru/media",
        "ok.ru/messages", "ok.ru/feed",
        "hh.ru", "superjob.ru",
        "lenta.ru/news", "rbc.ru/politics"
    ],
    
    paths: [
        "/api/", "/ajax/", "/json/",
        "/login", "/auth", "/oauth",
        "/checkout", "/payment", "/cart"
    ]
};

// Экспортируем для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, BLOCK_LISTS, WHITELIST };
}
