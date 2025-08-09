/**
 * RU AdBlock Lite Script for Loon
 * Версия: 1.2
 * Автор: Professional AdBlock Team
 * Описание: Точечная блокировка известной рекламы на русских сайтах
 */

const CONFIG = {
    scriptName: "RU-AdBlock-Lite",
    version: "1.2",
    debug: false // Изменится из настроек плагина
};

// Получаем настройки из плагина
if (typeof $plugin !== 'undefined' && $plugin.config) {
    CONFIG.debug = $plugin.config['Дебаг логи'] === 'Включить';
}

// ===============================================
// ПРАВИЛА БЛОКИРОВКИ
// ===============================================

const BLOCK_RULES = {
    // 4PDA рекламные редиректы
    '4pda.to': [
        {
            pattern: /^https?:\/\/4pda\.to\/\d{4}\/\d{2}\/\d{2}\/\d+\//,
            description: '4PDA рекламные редиректы',
            action: 'block'
        }
    ],
    
    // Яндекс реклама
    'yandex.ru': [
        {
            pattern: /yandex\.ru\/an\/count\//,
            description: 'Яндекс.Директ счётчики',
            action: 'block'
        },
        {
            pattern: /yandex\.ru\/an\/rtb\//,
            description: 'Яндекс RTB реклама',
            action: 'block'
        },
        {
            pattern: /yabs\.yandex\.ru/,
            description: 'Яндекс рекламная система',
            action: 'block'
        },
        {
            pattern: /awaps\.yandex\.ru/,
            description: 'Яндекс AWAPS реклама',
            action: 'block'
        }
    ],
    
    // Дзен реклама
    'dzen.ru': [
        {
            pattern: /[?&](test-tag|adb-bits|yredirect)=/,
            description: 'Дзен рекламные параметры',
            action: 'block'
        },
        {
            pattern: /dzen\.ru\/.*\/an\/count\//,
            description: 'Дзен счётчики рекламы',
            action: 'block'
        }
    ],
    
    // Mail.ru реклама
    'mail.ru': [
        {
            pattern: /r\.mail\.ru\/\w+\/\d+\/\d+/,
            description: 'Mail.ru рекламные редиректы',
            action: 'block'
        },
        {
            pattern: /xray\.mail\.ru/,
            description: 'Mail.ru Xray реклама',
            action: 'block'
        },
        {
            pattern: /r0\.mail\.ru/,
            description: 'Mail.ru R0 реклама',
            action: 'block'
        }
    ],
    
    // Google реклама (на русских сайтах)
    'googlesyndication.com': [
        {
            pattern: /googlesyndication\.com/,
            description: 'Google AdSense',
            action: 'block'
        }
    ],
    
    'doubleclick.net': [
        {
            pattern: /doubleclick\.net/,
            description: 'Google DoubleClick',
            action: 'block'
        }
    ],
    
    // Adfox (Яндекс)
    'adfox.ru': [
        {
            pattern: /adfox\.ru/,
            description: 'AdFox реклама',
            action: 'block'
        }
    ],
    
    // Cookie consent (по запросу)
    'cookiebot.com': [
        {
            pattern: /cookiebot\.com/,
            description: 'Cookie consent баннеры',
            action: 'block'
        }
    ],
    
    'cookieconsent.com': [
        {
            pattern: /cookieconsent\.com/,
            description: 'Cookie consent баннеры',
            action: 'block'
        }
    ]
};

// ===============================================
// ПРАВИЛА ОЧИСТКИ HTML
// ===============================================

const HTML_CLEAN_RULES = {
    'dzen.ru': [
        {
            // Яндекс.Плюс баннер
            patterns: [
                /<div[^>]*class="[^"]*plus-banner[^"]*"[^>]*>.*?<\/div>/gis,
                /<div[^>]*>.*?Яндекс\s*Плюс.*?ПРОМОКОД.*?<\/div>/gis,
                /<div[^>]*>.*?plus\.yandex.*?реклама.*?<\/div>/gis,
                /<div[^>]*>.*?Активируйте промокод на 30 дней.*?<\/div>/gis
            ],
            description: 'Яндекс.Плюс баннеры'
        }
    ],
    
    '4pda.to': [
        {
            patterns: [
                /<div[^>]*class="[^"]*(?:banner|promo-box|adblock)[^"]*"[^>]*>.*?<\/div>/gis,
                /<iframe[^>]*(?:banner|ad|reklama)[^>]*>.*?<\/iframe>/gis
            ],
            description: '4PDA баннеры'
        }
    ]
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
// АНАЛИЗАТОР URL
// ===============================================

class AdBlocker {
    static shouldBlock(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            // Проверяем есть ли правила для этого хоста
            for (const [domain, rules] of Object.entries(BLOCK_RULES)) {
                if (hostname.includes(domain)) {
                    // Проверяем каждое правило
                    for (const rule of rules) {
                        if (rule.pattern.test(url)) {
                            Logger.info(`Blocked by rule: ${rule.description}`, { url });
                            return true;
                        }
                    }
                }
            }
        } catch (e) {
            Logger.error('Error parsing URL', { url, error: e.message });
        }
        
        return false;
    }
}

// ===============================================
// ОЧИСТИТЕЛЬ HTML
// ===============================================

class HTMLCleaner {
    static clean(html, url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            let cleanedHTML = html;
            let totalRemoved = 0;
            
            // Проверяем есть ли правила очистки для этого хоста
            for (const [domain, rules] of Object.entries(HTML_CLEAN_RULES)) {
                if (hostname.includes(domain)) {
                    for (const rule of rules) {
                        for (const pattern of rule.patterns) {
                            const beforeLength = cleanedHTML.length;
                            cleanedHTML = cleanedHTML.replace(pattern, '');
                            const removed = beforeLength - cleanedHTML.length;
                            
                            if (removed > 0) {
                                totalRemoved += removed;
                                Logger.info(`HTML cleaned: ${rule.description}`, { 
                                    url, 
                                    bytesRemoved: removed 
                                });
                            }
                        }
                    }
                }
            }
            
            if (totalRemoved > 0) {
                Logger.info(`Total HTML cleaned`, { url, totalBytesRemoved: totalRemoved });
            }
            
            return cleanedHTML;
        } catch (e) {
            Logger.error('Error cleaning HTML', { url, error: e.message });
            return html; // Возвращаем оригинал при ошибке
        }
    }
}

// ===============================================
// ОБРАБОТЧИК ЗАПРОСОВ
// ===============================================

class RequestHandler {
    static handle(request) {
        const url = request.url;
        const method = request.method || 'GET';
        
        Logger.debug(`Processing ${method} request`, { url });
        
        // Проверяем нужно ли блокировать
        if (AdBlocker.shouldBlock(url)) {
            Logger.info(`REQUEST BLOCKED`, { url });
            
            // Возвращаем пустой ответ
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
        
        Logger.debug('Request allowed', { url });
        return null; // Пропускаем запрос
    }
}

// ===============================================
// ОБРАБОТЧИК ОТВЕТОВ
// ===============================================

class ResponseHandler {
    static handle(response) {
        const url = response.url || '';
        const contentType = response.headers && response.headers['Content-Type'] || 
                          response.headers && response.headers['content-type'] || '';
        
        Logger.debug(`Processing response`, { url, contentType });
        
        // Обрабатываем только HTML контент
        if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
            return null;
        }
        
        if (!response.body) {
            return null;
        }
        
        // Чистим HTML от рекламы
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
            // Обработка запроса
            const result = RequestHandler.handle($request);
            if (result) {
                $done(result);
            } else {
                $done({});
            }
        } else if (typeof $response !== 'undefined' && $response) {
            // Обработка ответа (очистка HTML)
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
