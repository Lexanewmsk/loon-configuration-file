/**
 * RU AdBlock Lite Script for Loon
 * Версия: 1.0
 * Автор: Professional AdBlock Team
 * Описание: Точечная блокировка известной рекламы на русских сайтах
 */

const CONFIG = {
    scriptName: "RU-AdBlock-Lite",
    version: "1.0",
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
    
    // Будущие правила (примеры):
    /*
    'example.ru': [
        {
            pattern: /^https?:\/\/example\.ru\/banner\//,
            description: 'Баннеры example.ru',
            action: 'block'
        }
    ]
    */
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
        } else {
            Logger.warn('No request object available');
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
