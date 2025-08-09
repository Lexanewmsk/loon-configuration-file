/**
 * RU Clean URL Script for Loon
 * Версия: 1.0
 * Автор: Professional AdBlock Team
 * Описание: Очистка URL от трекинга и блокировка рекламы
 */

const CONFIG = {
    scriptName: "RU-Clean-URL",
    version: "1.0",
    debug: false,
    cleanHTML: false,
    cleanURL: true
};

// Получаем настройки из плагина
if (typeof $plugin !== 'undefined' && $plugin.config) {
    CONFIG.debug = $plugin.config['Дебаг логи'] === 'Включить';
    CONFIG.cleanHTML = $plugin.config['Очистка HTML'] === 'Включить';
    CONFIG.cleanURL = $plugin.config['Очистка URL'] === 'Включить';
}

// ===============================================
// ТРЕКИНГ ПАРАМЕТРЫ
// ===============================================

const TRACKING_PARAMS = new Set([
    // Google Analytics & Ads
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'utm_id', 'utm_cid', 'utm_reader', 'utm_referrer', 'utm_name',
    'gclid', 'gclsrc', 'dclid', '_ga', '_gl', 'gbraid', 'wbraid',
    
    // Facebook & Meta
    'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source',
    'fbadid', 'fb_comment_id', 'fbc', 'fbp',
    
    // Яндекс
    'yclid', '_openstat', 'ymclid', 'ysclid', 'yadclid', 'yaclid',
    'from', 'from_source',
    
    // TikTok
    'ttclid', 'tt_content', 'tt_medium',
    
    // Microsoft
    'msclkid', 'pc', 'ptid',
    
    // Email & Newsletter
    'campaign_id', 'subscriber_id', 'email_id', 'newsletter_id',
    'campaign', 'source', 'medium', 'ref', 'referrer',
    'ml_subscriber', 'ml_subscriber_hash', 'eid',
    
    // A/B Testing
    'variant', 'test_group', 'experiment', 'ab_test', 'ab_version',
    
    // Social Media
    'share', 'shared', 'via', 'twitter_impression_id',
    '__twitter_impression', 'twclid',
    
    // Analytics общие
    'mc_cid', 'mc_eid', 'mkt_tok', '_hsenc', '_hsmi', 'hsCtaTracking',
    'vero_conv', 'vero_id', 'nr_email_referer',
    '_ke', 'ki_t', 'ki_u', 'sid',
    
    // Affiliate
    'affiliate', 'partner', 'promo_code', 'ref_id', 'referral',
    'aff_id', 'aff_sub', 'click_id',
    
    // Russian specific
    'etext', 'yclid', 'ymclid', 'from_source', 'rs', 'sbid'
]);

// Префиксы для частичного совпадения
const TRACKING_PREFIXES = [
    'ga_', 'google_', 'from_', 'ya_', 'yandex_',
    'app_', 'mobile_', 'android_', 'ios_', 
    'aff_', 'utm_', 'mc_', 'mk_', 'ml_',
    'ym_', 'yp_', '_ym_', 'vk_', 'ok_'
];

// ===============================================
// РЕКЛАМНЫЕ ПАТТЕРНЫ
// ===============================================

const AD_PATTERNS = {
    // URL паттерны для блокировки
    blockPatterns: [
        /\/(ads?|advertisement|reklama|banner|promo)\//i,
        /\/(popunder|popup|sponsor)\//i,
        /\/(metrika|analytics|counter|metric|pixel|beacon|track)\//i,
        /\/(collect|telemetry|stats|statistic)\//i,
        /\/(ads?|banner|reklama)\.(js|json|php)/i,
        /\/(prebid|bidder|rtb|ssp)\.js/i
    ],
    
    // Рекламные домены
    adDomains: [
        'googlesyndication.com',
        'doubleclick.net',
        'googleadservices.com',
        'google-analytics.com',
        'googletagmanager.com',
        'facebook.com/tr',
        'yabs.yandex',
        'an.yandex',
        'adfox.ru',
        'mc.yandex',
        'metrika.yandex'
    ],
    
    // HTML паттерны для очистки
    htmlPatterns: [
        /<div[^>]*class="[^"]*\b(banner|ads?|reklama|promo)\b[^"]*"[^>]*>.*?<\/div>/gis,
        /<script[^>]*(googlesyndication|doubleclick|adfox|yandex.*direct)[^>]*>.*?<\/script>/gis,
        /<iframe[^>]*(ads?|banner|reklama)[^>]*>.*?<\/iframe>/gis,
        /<img[^>]*(pixel|beacon|counter|metric)[^>]*>/gi
    ]
};

// ===============================================
// ИСКЛЮЧЕНИЯ
// ===============================================

const EXCLUDE_SITES = [
    'gosuslugi.ru',
    'esia.gosuslugi.ru',
    'nalog.ru',
    'sberbank.ru',
    'vtb.ru',
    'tinkoff.ru',
    'alfabank.ru',
    'avito.ru',
    'lamoda.ru',
    'goldapple.ru'
];

// ===============================================
// УТИЛИТЫ
// ===============================================

class Logger {
    static log(level, message, data = null) {
        if (!CONFIG.debug && level === 'debug') return;
        
        const timestamp = new Date().toISOString();
        const prefix = `[${CONFIG.scriptName}][${level.toUpperCase()}]`;
        
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

// ===============================================
// ОЧИСТИТЕЛЬ URL
// ===============================================

class URLCleaner {
    static clean(url) {
        if (!CONFIG.cleanURL) {
            return null;
        }
        
        // Быстрая проверка - есть ли параметры
        if (!url.includes('?')) {
            return null;
        }
        
        try {
            const urlObj = new URL(url);
            const params = urlObj.searchParams;
            const keysToDelete = [];
            
            // Собираем ключи для удаления
            for (const [key] of params) {
                // Точное совпадение
                if (TRACKING_PARAMS.has(key)) {
                    keysToDelete.push(key);
                    continue;
                }
                
                // Проверяем префиксы
                for (const prefix of TRACKING_PREFIXES) {
                    if (key.startsWith(prefix)) {
                        keysToDelete.push(key);
                        break;
                    }
                }
            }
            
            // Если нечего удалять
            if (keysToDelete.length === 0) {
                return null;
            }
            
            // Удаляем параметры
            keysToDelete.forEach(key => params.delete(key));
            
            const cleanUrl = urlObj.toString();
            Logger.info(`URL cleaned: removed ${keysToDelete.length} params`, { 
                original: url,
                cleaned: cleanUrl,
                removed: keysToDelete
            });
            
            return cleanUrl;
            
        } catch (error) {
            Logger.error('Error cleaning URL', { url, error: error.message });
            return null;
        }
    }
}

// ===============================================
// БЛОКИРОВЩИК
// ===============================================

class AdBlocker {
    static shouldBlock(url) {
        // Проверяем исключения
        const urlLower = url.toLowerCase();
        for (const site of EXCLUDE_SITES) {
            if (urlLower.includes(site)) {
                return false;
            }
        }
        
        // Проверяем рекламные домены
        for (const domain of AD_PATTERNS.adDomains) {
            if (urlLower.includes(domain)) {
                Logger.info(`Blocked by ad domain: ${domain}`, { url });
                return true;
            }
        }
        
        // Проверяем паттерны
        for (const pattern of AD_PATTERNS.blockPatterns) {
            if (pattern.test(url)) {
                Logger.info(`Blocked by pattern`, { url });
                return true;
            }
        }
        
        return false;
    }
}

// ===============================================
// ОЧИСТИТЕЛЬ HTML
// ===============================================

class HTMLCleaner {
    static clean(html, url) {
        if (!CONFIG.cleanHTML) {
            return html;
        }
        
        // Проверяем исключения
        const urlLower = url.toLowerCase();
        for (const site of EXCLUDE_SITES) {
            if (urlLower.includes(site)) {
                return html;
            }
        }
        
        // Особая обработка для Яндекса/Дзена - не чистим
        if (urlLower.includes('yandex.ru') || urlLower.includes('dzen.ru')) {
            return html;
        }
        
        let cleanedHTML = html;
        let totalRemoved = 0;
        
        for (const pattern of AD_PATTERNS.htmlPatterns) {
            const beforeLength = cleanedHTML.length;
            cleanedHTML = cleanedHTML.replace(pattern, '');
            const removed = beforeLength - cleanedHTML.length;
            totalRemoved += removed;
        }
        
        if (totalRemoved > 0) {
            Logger.info(`HTML cleaned: ${totalRemoved} bytes removed`, { url });
        }
        
        return cleanedHTML;
    }
}

// ===============================================
// ОБРАБОТЧИКИ
// ===============================================

class RequestHandler {
    static handle(request) {
        const url = request.url;
        const method = request.method || 'GET';
        
        Logger.debug(`Processing ${method} request`, { url });
        
        // Сначала пробуем очистить URL
        const cleanedUrl = URLCleaner.clean(url);
        if (cleanedUrl) {
            Logger.info('URL modified', { original: url, cleaned: cleanedUrl });
            return { url: cleanedUrl };
        }
        
        // Если URL не изменился, проверяем нужно ли блокировать
        if (AdBlocker.shouldBlock(url)) {
            Logger.info('REQUEST BLOCKED', { url });
            return {
                response: {
                    status: 204,
                    headers: {
                        'Content-Type': 'text/plain',
                        'X-Blocked-By': 'RU-Clean-URL'
                    },
                    body: ''
                }
            };
        }
        
        return null;
    }
}

class ResponseHandler {
    static handle(response) {
        const url = response.url || '';
        const contentType = response.headers && response.headers['Content-Type'] || 
                          response.headers && response.headers['content-type'] || '';
        
        Logger.debug(`Processing response`, { url, contentType });
        
        // Обрабатываем только HTML
        if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
            return null;
        }
        
        if (!response.body) {
            return null;
        }
        
        const cleanedBody = HTMLCleaner.clean(response.body, url);
        
        if (cleanedBody !== response.body) {
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
    Logger.info(`Script started v${CONFIG.version}`);
    
    try {
        if (typeof $request !== 'undefined' && $request) {
            const result = RequestHandler.handle($request);
            if (result) {
                $done(result);
            } else {
                $done({});
            }
        } else if (typeof $response !== 'undefined' && $response) {
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
