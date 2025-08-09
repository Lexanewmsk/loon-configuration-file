/**
 * RU AdBlock Lite Script for Loon
 * Версия: 2.0
 * Автор: Professional AdBlock Team
 * Описание: Универсальная блокировка рекламы
 */

const CONFIG = {
    scriptName: "RU-AdBlock-Lite",
    version: "2.0",
    debug: false,
    cleanHTML: true
};

// Получаем настройки из плагина
if (typeof $plugin !== 'undefined' && $plugin.config) {
    CONFIG.debug = $plugin.config['Дебаг логи'] === 'Включить';
    CONFIG.cleanHTML = $plugin.config['Очистка HTML'] === 'Включить';
}

// ===============================================
// УНИВЕРСАЛЬНЫЕ ПРАВИЛА
// ===============================================

const UNIVERSAL_RULES = {
    // URL паттерны для блокировки
    blockPatterns: [
        // Рекламные директории
        /\/(ads?|advertisement|reklama|banner|promo)\//i,
        /\/(popunder|popup|sponsor)\//i,
        
        // Трекинг и аналитика
        /\/(metrika|analytics|counter|metric|pixel|beacon|track)\//i,
        /\/(collect|telemetry|stats|statistic)\//i,
        
        // Рекламные файлы
        /\/(ads?|banner|reklama)\.(js|json|php)/i,
        /\/(prebid|bidder|rtb|ssp)\.js/i,
        
        // Рекламные параметры
        /[?&](utm_|fbclid|gclid|yclid)/i,
        /[?&](test-tag|adb-bits)=/i
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
        'adfox.yandex',
        'mc.yandex',
        'metrika.yandex',
        'awaps.yandex'
    ],
    
    // HTML паттерны для очистки
    htmlPatterns: [
        // Универсальные рекламные блоки
        /<div[^>]*class="[^"]*\b(banner|ads?|reklama|promo|sponsor)\b[^"]*"[^>]*>.*?<\/div>/gis,
        /<section[^>]*class="[^"]*\b(advertisement|commercial)\b[^"]*"[^>]*>.*?<\/section>/gis,
        
        // Рекламные скрипты
        /<script[^>]*(googlesyndication|doubleclick|adfox|yandex.*direct)[^>]*>.*?<\/script>/gis,
        
        // Рекламные фреймы
        /<iframe[^>]*(ads?|banner|reklama)[^>]*>.*?<\/iframe>/gis,
        
        // Трекинг пиксели
        /<img[^>]*(pixel|beacon|counter|metric)[^>]*>/gi,
        
        // Cookie баннеры
        /<div[^>]*class="[^"]*\b(cookie|gdpr|consent)\b[^"]*"[^>]*>.*?<\/div>/gis
    ]
};

// ===============================================
// ИСКЛЮЧЕНИЯ
// ===============================================

const EXCLUDE_SITES = [
    // Государственные сайты
    'gosuslugi.ru',
    'esia.gosuslugi.ru',
    'nalog.ru',
    'pfr.ru',
    
    // Банки
    'sberbank.ru',
    'vtb.ru',
    'tinkoff.ru',
    'alfabank.ru',
    'raiffeisen.ru',
    
    // Проблемные сайты
    'avito.ru',
    'lamoda.ru',
    'goldapple.ru',
    
    // Яндекс сервисы (особая обработка)
    'passport.yandex',
    'auth.yandex',
    'oauth.yandex',
    'login.yandex'
];

// ===============================================
// СПЕЦИАЛЬНЫЕ ПРАВИЛА ДЛЯ САЙТОВ
// ===============================================

const SPECIAL_RULES = {
    // Яндекс и Дзен - не чистим HTML, только блокируем запросы
    'yandex.ru': {
        cleanHTML: false,
        blockPatterns: [
            /\/an\/count\//,
            /\/watch\//,
            /\/metrika\//
        ]
    },
    
    'dzen.ru': {
        cleanHTML: false,
        blockPatterns: [
            /\/clck\//,
            /\/an\/count\//
        ]
    },
    
    // 4PDA - агрессивная очистка
    '4pda.to': {
        cleanHTML: true,
        blockPatterns: [
            /\/\d{4}\/\d{2}\/\d{2}\/\d+\//  // Рекламные редиректы
        ],
        htmlPatterns: [
            /<div[^>]*class="[^"]*promo-box[^"]*"[^>]*>.*?<\/div>/gis
        ]
    }
};

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
// ПРОВЕРКА ИСКЛЮЧЕНИЙ
// ===============================================

class SiteChecker {
    static isExcluded(url) {
        const urlLower = url.toLowerCase();
        
        for (const site of EXCLUDE_SITES) {
            if (urlLower.includes(site)) {
                Logger.debug(`Site excluded: ${site}`, { url });
                return true;
            }
        }
        
        return false;
    }
    
    static getSpecialRules(url) {
        const urlLower = url.toLowerCase();
        
        for (const [site, rules] of Object.entries(SPECIAL_RULES)) {
            if (urlLower.includes(site)) {
                Logger.debug(`Special rules applied: ${site}`, { url });
                return rules;
            }
        }
        
        return null;
    }
}

// ===============================================
// БЛОКИРОВЩИК
// ===============================================

class AdBlocker {
    static shouldBlock(url) {
        // Проверяем исключения
        if (SiteChecker.isExcluded(url)) {
            return false;
        }
        
        const urlLower = url.toLowerCase();
        
        // Проверяем специальные правила
        const specialRules = SiteChecker.getSpecialRules(url);
        if (specialRules && specialRules.blockPatterns) {
            for (const pattern of specialRules.blockPatterns) {
                if (pattern.test(url)) {
                    Logger.info(`Blocked by special rule`, { url });
                    return true;
                }
            }
        }
        
        // Проверяем рекламные домены
        for (const domain of UNIVERSAL_RULES.adDomains) {
            if (urlLower.includes(domain)) {
                Logger.info(`Blocked by ad domain: ${domain}`, { url });
                return true;
            }
        }
        
        // Проверяем универсальные паттерны
        for (const pattern of UNIVERSAL_RULES.blockPatterns) {
            if (pattern.test(url)) {
                Logger.info(`Blocked by universal pattern`, { url });
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
        if (SiteChecker.isExcluded(url)) {
            return html;
        }
        
        // Проверяем специальные правила
        const specialRules = SiteChecker.getSpecialRules(url);
        if (specialRules) {
            if (specialRules.cleanHTML === false) {
                Logger.debug('HTML cleaning disabled by special rules', { url });
                return html;
            }
            
            // Применяем специальные паттерны если есть
            if (specialRules.htmlPatterns) {
                html = this.applyPatterns(html, specialRules.htmlPatterns, url);
            }
        }
        
        // Применяем универсальные паттерны
        html = this.applyPatterns(html, UNIVERSAL_RULES.htmlPatterns, url);
        
        return html;
    }
    
    static applyPatterns(html, patterns, url) {
        let totalRemoved = 0;
        let cleanedHTML = html;
        
        for (const pattern of patterns) {
            const beforeLength = cleanedHTML.length;
            cleanedHTML = cleanedHTML.replace(pattern, '');
            const removed = beforeLength - cleanedHTML.length;
            
            if (removed > 0) {
                totalRemoved += removed;
            }
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
        
        if (AdBlocker.shouldBlock(url)) {
            Logger.info(`REQUEST BLOCKED`, { url });
            
            return {
                response: {
                    status: 204,
                    headers: {
                        'Content-Type': 'text/plain',
                        'X-Blocked-By': 'RU-AdBlock-Lite'
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
