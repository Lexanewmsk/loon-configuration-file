/**
 * RU AdBlock Script for Loon
 * Версия: 4.0
 * Автор: Professional AdBlock Team
 * Описание: Система блокировки рекламы для русскоязычных сайтов
 */

const CONFIG = {
    scriptName: "RU-AdBlock",
    version: "4.0",
    debug: false, // Изменится динамически из настроек плагина
    
    // Настройки блокировки (изменяются из настроек плагина)
    blockingModes: {
        cleanHTML: true,       // Очистка HTML контента
        httpsRedirect: true,   // Принудительный HTTPS
        antiTracker: true      // Антитрекинг
    },
    
    // Таймауты
    timeouts: {
        request: 5000,
        response: 10000
    }
};

// Получаем настройки из плагина
if (typeof $plugin !== 'undefined' && $plugin.config) {
    CONFIG.blockingModes.httpsRedirect = $plugin.config['HTTPS редиректы'] === 'Включить';
    CONFIG.blockingModes.cleanHTML = $plugin.config['Очистка HTML'] === 'Включить';
    CONFIG.blockingModes.antiTracker = $plugin.config['Антитрекинг'] === 'Включить';
    CONFIG.debug = $plugin.config['Дебаг логи'] === 'Включить';
}

// ===============================================
// СПИСКИ ДОМЕНОВ И ПАТТЕРНОВ ДЛЯ БЛОКИРОВКИ
// ===============================================

const BLOCK_LISTS = {
    // Рекламные домены
    adDomains: [
        // Яндекс реклама
        "bs.yandex.ru", "an.yandex.ru", "yabs.yandex.ru", 
        "awaps.yandex.ru", "yastatic.net/awaps",
        "yandexadexchange.net", "adfox.ru", "adfox.yandex.ru",
        
        // Яндекс.Дзен реклама и трекинг (только рекламные части)
        "clck.dzen.ru", "an.dzen.ru", "ads.dzen.ru",
        
        // Google реклама
        "doubleclick.net", "googlesyndication.com", "googleadservices.com",
        "googletagmanager.com", "googletagservices.com", "adsystem.google.com",
        "pagead2.googlesyndication.com", "tpc.googlesyndication.com",
        
        // Mail.ru реклама (расширенный список)
        "go.mail.ru", "rs.mail.ru", "top.mail.ru", 
        "xray.mail.ru", "r0.mail.ru", "r.mail.ru",
        "ad.mail.ru", "adman.mail.ru", "splash.mail.ru",
        
        // VK реклама
        "ads.vk.com", "adsint.vk.com",
        
        // Рамблер
        "top100.rambler.ru", "counter.rambler.ru", "ssp.rambler.ru",
        "nova.rambler.ru",
        
        // RTB платформы
        "relap.io", "buzzoola.com", "marketgid.com", "mgid.com",
        "outbrain.com", "taboola.com", "smi2.net", "recreativ.ru",
        "gnezdo.ru", "teasernet.com",
        
        // Аналитика и трекинг (если включен антитрекинг)
        "mc.yandex.ru", "informer.yandex.ru", "metrika.yandex.ru",
        "google-analytics.com", "googleanalytics.com",
        "facebook.com/tr", "connect.facebook.net/signals",
        
        // Криптомайнинг
        "coinhive.com", "coin-hive.com", "jsecoin.com", "crypto-loot.com"
    ],
    
    // Ключевые слова в URL для блокировки
    adKeywords: [
        // Реклама
        "реклама", "баннер", "объявления", "промо", "рекламный",
        "advertisement", "advertising", "advert", "promo", "banner",
        "ads", "ad_", "_ad", "adnxs", "adsystem", "adserver",
        
        // Mail.ru специфичные
        "xray", "r0", "splash",
        
        // RTB и программатик
        "rtb", "ssp", "dsp", "prebid", "header_bidding", "programmatic",
        "ad_exchange", "adx", "bidder", "auction",
        
        // Трекинг (если включен антитрекинг)
        "counter", "metric", "analytics", "tracking", "tracker",
        "pixel", "beacon", "collect", "stats", "statistic", "telemetry",
        "fingerprint", "visitor", "session", "heatmap", "click",
        
        // Партнерские программы
        "affiliate", "partner", "referral", "commission", "cashback",
        
        // Видеореклама
        "videoads", "preroll", "midroll", "postroll", "overlay",
        
        // Дзен специфичные рекламные элементы
        "zen-lib/ads", "zen-lib/rtb"
    ],
    
    // Паттерны в URL
    adPatterns: [
        // Директории с рекламой
        /\/ads?\//i, /\/ad\//i, /\/banner/i, /\/banners/i,
        /\/reklama/i, /\/advertising/i, /\/advert/i,
        /\/promo/i, /\/commercial/i, /\/sponsored/i,
        
        // Mail.ru паттерны
        /\/xray\//i, /\/r0\//i, /\/splash\//i,
        /mail\.ru\/(xray|r0|r|ad|adman)\//i,
        
        // Поддомены
        /^https?:\/\/ads?\./i, /^https?:\/\/ad\./i,
        /^https?:\/\/banner/i, /^https?:\/\/promo/i,
        /^https?:\/\/reklama/i, /^https?:\/\/commercial/i,
        /^https?:\/\/(xray|r0|r)\./i,
        
        // Файлы
        /\.ads\./i, /ads\d+\./i, /banner\d+\./i,
        /\/ads\.js/i, /\/ad\.js/i, /\/banner\.js/i,
        /\/adsense/i, /\/adnxs/i, /\/prebid/i,
        
        // Трекинг пиксели
        /\/pixel\./i, /\/beacon\./i, /\/collect\?/i,
        /\/counter\./i, /\/metric\./i, /\/track\./i,
        /\/click/i, /\/clck\./i,
        
        // Яндекс специфичные
        /\/an\/count/i, /yandex.*\/an\//i, /\/bs\/yandex/i,
        /\/yabs\//i, /awaps/i,
        
        // Дзен специфичные рекламные паттерны
        /clck\.dzen\.ru/i,
        /dzen.*\/(click|track|pixel)/i,
        /zen-lib\/(ads|rtb)/i,
        
        // Трекинг параметры
        /[?&](adb-bits|test-tag|ctime|actual-format)=/i,
        /[?&](utm_|fbclid|gclid|yclid)/i
    ]
};

// ===============================================
// БЕЛЫЙ СПИСОК И ИСКЛЮЧЕНИЯ
// ===============================================

const WHITELIST = {
    domains: [
        // Критически важные домены - НЕ БЛОКИРОВАТЬ
        "gosuslugi.ru", "esia.gosuslugi.ru", "www.gosuslugi.ru",
        "passport.yandex.ru", "auth.yandex.ru", "oauth.yandex.ru", "login.yandex.ru",
        "api.lamoda.ru", "lamoda.ru", 
        "api.avito.ru", "m.avito.ru", "avito.ru",
        "goldapple.ru", "api.goldapple.ru", "m.goldapple.ru",
        
        // CDN соцсетей
        "okcdn.ru", "vkcdn.net", "userapi.com",
        "vkvd443.okcdn.ru",
        
        // Поисковики
        "yandex.ru/search", "google.com/search", "google.ru/search",
        "duckduckgo.com", "bing.com/search",
        
        // Социальные сети (основной функционал)
        "vk.com/im", "vk.com/feed", "vk.com/friends",
        "ok.ru/messages", "ok.ru/feed",
        
        // Дзен контент (не реклама) - аккуратная обработка
        "dzen.ru/news", "dzen.ru/media", "dzen.ru/video",
        
        // Почта
        "mail.ru/inbox", "yandex.ru/mail", "gmail.com",
        "e.mail.ru", "my.mail.ru",
        
        // Важные сервисы
        "nalog.ru", "pfr.ru", "fss.ru",
        "sberbank.ru", "vtb.ru", "alfabank.ru",
        "yandex.ru/maps", "2gis.ru",
        
        // Образование и работа
        "hh.ru", "superjob.ru", "rabota.ru",
        "coursera.org", "stepik.org", "skillbox.ru",
        
        // Новости (редакционный контент)
        "lenta.ru/news", "rbc.ru/politics", "kommersant.ru/doc",
        "ria.ru", "tass.ru", "interfax.ru"
    ],
    
    paths: [
        "/api/", "/ajax/", "/json/", "/xml/",
        "/login", "/auth", "/oauth", "/register",
        "/checkout", "/payment", "/cart", "/order",
        "/passport", "/signin", "/signup"
    ],
    
    // Домены для особой обработки (не блокировать полностью)
    specialHandling: [
        "dzen.ru", "dzeninfra.ru", // Аккуратная очистка HTML
        "avito.ru", "lamoda.ru",    // Минимальная обработка
        "goldapple.ru"              // Минимальная обработка
    ]
};

// ===============================================
// HTTPS РЕДИРЕКТ КОНФИГУРАЦИЯ  
// ===============================================

const HTTPS_REDIRECT = {
    domains: [
        "yandex.ru", "ya.ru", "yandex.com",
        "vk.com", "vkontakte.ru", 
        "mail.ru", "my.mail.ru", "e.mail.ru",
        "ok.ru", "odnoklassniki.ru",
        "pikabu.ru", "habr.com", "vc.ru",
        "lenta.ru", "rbc.ru", "kommersant.ru",
        "kinopoisk.ru", "ivi.ru", "start.ru",
        "ozon.ru", "wildberries.ru",
        "sberbank.ru", "vtb.ru", "tinkoff.ru"
    ],
    
    // Исключения для HTTPS редиректа
    exclude: [
        "gosuslugi.ru", "esia.gosuslugi.ru",
        "avito.ru", "lamoda.ru",
        "goldapple.ru", "dzen.ru"
    ]
};

// ===============================================
// УТИЛИТЫ И ХЕЛПЕРЫ
// ===============================================

class Logger {
    static log(level, message, data = null) {
        if (!CONFIG.debug && level === 'debug') return;
        
        const timestamp = new Date().toISOString();
        const prefix = `[${CONFIG.scriptName}][${level.toUpperCase()}][${timestamp}]`;
        
        if (data) {
            console.log(`${prefix} ${message}`, JSON.stringify(data));
        } else {
            console.log(`${prefix} ${message}`);
        }
    }
    
    static debug(message, data) { this.log('debug', message, data); }
    static info(message, data) { this.log('info', message, data); }
    static warn(message, data) { this.log('warn', message, data); }
    static error(message, data) { this.log('error', message, data); }
}

class URLAnalyzer {
    static isWhitelisted(url) {
        const urlLower = url.toLowerCase();
        
        // Проверяем критические домены
        for (const domain of WHITELIST.domains) {
            if (urlLower.includes(domain.toLowerCase())) {
                Logger.debug(`Whitelisted by domain: ${domain}`, { url });
                return true;
            }
        }
        
        // Проверяем пути
        for (const path of WHITELIST.paths) {
            if (urlLower.includes(path.toLowerCase())) {
                Logger.debug(`Whitelisted by path: ${path}`, { url });
                return true;
            }
        }
        
        return false;
    }
    
    static needsSpecialHandling(url) {
        const urlLower = url.toLowerCase();
        
        for (const domain of WHITELIST.specialHandling) {
            if (urlLower.includes(domain.toLowerCase())) {
                return domain;
            }
        }
        
        return null;
    }
    
    static shouldBlock(url) {
        if (this.isWhitelisted(url)) {
            return { blocked: false };
        }
        
        const urlLower = url.toLowerCase();
        
        // Проверяем рекламные домены
        for (const domain of BLOCK_LISTS.adDomains) {
            // Пропускаем трекинг домены если антитрекинг выключен
            if (!CONFIG.blockingModes.antiTracker && 
                (domain.includes('metric') || domain.includes('analytics') || 
                 domain.includes('counter') || domain.includes('mc.yandex'))) {
                continue;
            }
            
            if (urlLower.includes(domain.toLowerCase())) {
                Logger.info(`Blocked by domain: ${domain}`, { url });
                return { blocked: true, reason: `domain: ${domain}` };
            }
        }
        
        // Проверяем ключевые слова
        for (const keyword of BLOCK_LISTS.adKeywords) {
            // Пропускаем трекинг ключевые слова если антитрекинг выключен
            if (!CONFIG.blockingModes.antiTracker && 
                ['counter', 'metric', 'analytics', 'tracking', 'tracker', 
                 'pixel', 'beacon', 'collect', 'stats', 'statistic'].includes(keyword)) {
                continue;
            }
            
            if (urlLower.includes(keyword.toLowerCase())) {
                Logger.info(`Blocked by keyword: ${keyword}`, { url });
                return { blocked: true, reason: `keyword: ${keyword}` };
            }
        }
        
        // Проверяем паттерны
        for (const pattern of BLOCK_LISTS.adPatterns) {
            if (pattern.test(url)) {
                Logger.info(`Blocked by pattern: ${pattern}`, { url });
                return { blocked: true, reason: `pattern: ${pattern}` };
            }
        }
        
        return { blocked: false };
    }
    
    static shouldRedirectToHTTPS(url) {
        if (!CONFIG.blockingModes.httpsRedirect) return null;
        if (!url.startsWith('http://')) return null;
        
        const urlLower = url.toLowerCase();
        
        // Проверяем исключения
        for (const excludeDomain of HTTPS_REDIRECT.exclude) {
            if (urlLower.includes(excludeDomain.toLowerCase())) {
                return null;
            }
        }
        
        // Проверяем домены для редиректа
        for (const domain of HTTPS_REDIRECT.domains) {
            if (urlLower.includes(domain.toLowerCase())) {
                const httpsUrl = url.replace('http://', 'https://');
                Logger.info(`HTTPS redirect: ${url} -> ${httpsUrl}`);
                return httpsUrl;
            }
        }
        
        return null;
    }
}

class ContentCleaner {
    static cleanHTML(html, url = '') {
        if (!CONFIG.blockingModes.cleanHTML) return html;
        
        const originalLength = html.length;
        let cleanedHTML = html;
        
        // Определяем особый режим обработки
        const specialDomain = URLAnalyzer.needsSpecialHandling(url);
        
        // Для Дзена используем более аккуратную очистку
        if (specialDomain === 'dzen.ru' || specialDomain === 'dzeninfra.ru') {
            return this.cleanDzenHTML(html);
        }
        
        // Для Авито и Ламоды минимальная очистка
        if (specialDomain === 'avito.ru' || specialDomain === 'lamoda.ru' || specialDomain === 'goldapple.ru') {
            return this.minimalClean(html);
        }
        
        // Стандартная очистка для остальных сайтов
        const cleanupPatterns = [
            // Яндекс.Директ
            /<script[^>]*(?:yandex|ya).*?(?:direct|partner|metrika)[^>]*>.*?<\/script>/gis,
            /<div[^>]*ya-partner[^>]*>.*?<\/div>/gis,
            /<div[^>]*yap-adunit[^>]*>.*?<\/div>/gis,
            
            // Google AdSense
            /<script[^>]*googlesyndication[^>]*>.*?<\/script>/gis,
            /<ins[^>]*adsbygoogle[^>]*>.*?<\/ins>/gis,
            
            // Adfox
            /<script[^>]*adfox[^>]*>.*?<\/script>/gis,
            /<div[^>]*adfox[^>]*>.*?<\/div>/gis,
            
            // Mail.ru реклама
            /<div[^>]*(?:id|class)="[^"]*(?:xray|r0|splash)[^"]*"[^>]*>.*?<\/div>/gis,
            
            // RTB контейнеры
            /<div[^>]*(?:id|class)="[^"]*(?:rtb|ssp|dsp|prebid)[^"]*"[^>]*>.*?<\/div>/gis,
            
            // Общие рекламные блоки
            /<div[^>]*(?:id|class)="[^"]*(?:ad|ads|banner|reklama|advert)[^"]*"[^>]*>.*?<\/div>/gis,
            /<section[^>]*(?:id|class)="[^"]*(?:ad|ads|banner|advertising)[^"]*"[^>]*>.*?<\/section>/gis,
            
            // Трекинг пиксели
            /<img[^>]*(?:pixel|beacon|counter|metric|clck)[^>]*>/gi,
            /<noscript[^>]*>.*?<img[^>]*(?:counter|metric|pixel)[^>]*>.*?<\/noscript>/gis,
            
            // Видеореклама
            /<div[^>]*(?:videoads|ima-|vast-)[^>]*>.*?<\/div>/gis
        ];
        
        // Применяем паттерны очистки
        for (const pattern of cleanupPatterns) {
            cleanedHTML = cleanedHTML.replace(pattern, '');
        }
        
        const bytesRemoved = originalLength - cleanedHTML.length;
        if (bytesRemoved > 0) {
            Logger.info(`HTML cleaned: ${bytesRemoved} bytes removed`);
        }
        
        return cleanedHTML;
    }
    
    static cleanDzenHTML(html) {
        // Для Дзена пока вообще не чистим HTML, чтобы не ломать
        Logger.debug('Dzen HTML - skipping cleaning to prevent errors');
        return html;
        
        /* Закомментировано для тестирования
        // Аккуратная очистка для Дзена - удаляем только явную рекламу
        let cleanedHTML = html;
        
        const dzenAdPatterns = [
            // Только рекламные скрипты Дзена
            /<script[^>]*zen-lib\/ads[^>]*>.*?<\/script>/gis,
            /<script[^>]*zen-lib\/rtb[^>]*>.*?<\/script>/gis,
            /<div[^>]*class="[^"]*zen-ad[^"]*"[^>]*>.*?<\/div>/gis,
            
            // Яндекс.Директ в Дзене
            /<div[^>]*class="[^"]*ya-partner[^"]*"[^>]*>.*?<\/div>/gis,
            
            // Трекинг Дзена
            /<img[^>]*clck\.dzen\.ru[^>]*>/gi
        ];
        
        for (const pattern of dzenAdPatterns) {
            cleanedHTML = cleanedHTML.replace(pattern, '');
        }
        
        Logger.debug('Dzen HTML cleaned (gentle mode)');
        return cleanedHTML;
        */
    }
    
    static minimalClean(html) {
        // Минимальная очистка для проблемных сайтов
        let cleanedHTML = html;
        
        const minimalPatterns = [
            // Только самые явные рекламные блоки
            /<script[^>]*googlesyndication[^>]*>.*?<\/script>/gis,
            /<script[^>]*doubleclick[^>]*>.*?<\/script>/gis,
            /<div[^>]*class="[^"]*google-ad[^"]*"[^>]*>.*?<\/div>/gis
        ];
        
        for (const pattern of minimalPatterns) {
            cleanedHTML = cleanedHTML.replace(pattern, '');
        }
        
        Logger.debug('Minimal HTML cleaning applied');
        return cleanedHTML;
    }
}

// ===============================================
// ОСНОВНАЯ ЛОГИКА ОБРАБОТКИ
// ===============================================

class RequestHandler {
    static handle(request) {
        const url = request.url;
        const method = request.method || 'GET';
        
        Logger.debug(`Processing ${method} request`, { url, headers: request.headers });
        
        // Проверяем HTTPS редирект
        const httpsUrl = URLAnalyzer.shouldRedirectToHTTPS(url);
        if (httpsUrl) {
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
        
        // Проверяем блокировку
        const blockResult = URLAnalyzer.shouldBlock(url);
        if (blockResult.blocked) {
            Logger.info(`REQUEST BLOCKED: ${blockResult.reason}`, { url });
            
            return {
                response: {
                    status: 204,
                    headers: {
                        'Content-Type': 'text/plain',
                        'Cache-Control': 'max-age=86400'
                    },
                    body: ''
                }
            };
        }
        
        Logger.debug('Request allowed', { url });
        return null; // Пропускаем запрос
    }
}

class ResponseHandler {
    static handle(response) {
        const url = response.url || 'unknown';
        const status = response.status;
        const contentType = response.headers && response.headers['Content-Type'] || 
                          response.headers && response.headers['content-type'] || '';
        
        Logger.debug(`Processing response`, { url, status, contentType });
        
        // Обрабатываем только HTML контент
        if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
            return null;
        }
        
        if (!response.body) {
            return null;
        }
        
        // Проверяем, нужна ли особая обработка
        if (URLAnalyzer.isWhitelisted(url)) {
            Logger.debug('Response from whitelisted domain, minimal processing', { url });
            return null;
        }
        
        const cleanedBody = ContentCleaner.cleanHTML(response.body, url);
        
        if (cleanedBody !== response.body) {
            Logger.info('Response body cleaned', { url });
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
}

// ===============================================
// ТОЧКА ВХОДА
// ===============================================

(function main() {
    Logger.info(`Script started v${CONFIG.version}`, CONFIG.blockingModes);
    
    try {
        if (typeof $request !== 'undefined' && $request) {
            // Обработка запроса
            const result = RequestHandler.handle($request);
            if (result) {
                $done(result);
            } else {
                $done({});
            }
        } else if (typeof $response !== 'undefined' && $response) {
            // Обработка ответа
            const result = ResponseHandler.handle($response);
            if (result) {
                $done(result);
            } else {
                $done({});
            }
        } else {
            Logger.warn('No request or response object available');
            $done({});
        }
    } catch (error) {
        Logger.error('Script execution error', {
            message: error.message,
            stack: error.stack
        });
        $done({});
    }
})();
