/**
 * adblock-main.js
 * Основной файл обработки запросов и ответов
 * Версия: 3.2
 */

// ===============================================
// ВСТРОЕННЫЕ МОДУЛИ (для Loon)
// ===============================================

// Поскольку Loon не поддерживает модули, включаем код inline
// В production можно загружать через $httpClient.get()

// --- Конфигурация ---
const CONFIG = {
    scriptName: "Professional-RU-AdBlock",
    version: "3.2",
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

// --- Утилиты ---
class Logger {
    static log(level, message, data = null) {
        const debugEnabled = $environment && $environment['Дебаг логи'] === 'Включить';
        
        if (!debugEnabled && level === 'debug') return;
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[RU-AdBlock][${level.toUpperCase()}][${timestamp}]`;
        
        if (data) {
            console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
        } else {
            console.log(`${prefix} ${message}`);
        }
    }
    
    static debug(message, data) { this.log('debug', message, data); }
    static info(message, data) { this.log('info', message, data); }
    static warn(message, data) { this.log('warn', message, data); }
    static error(message, data) { this.log('error', message, data); }
}

class ModeManager {
    static getCurrentMode() {
        const selectedMode = $environment && $environment['Режим блокировки'] || 'Сбалансированный';
        
        const modeMap = {
            'Сбалансированный': 'balanced',
            'Агрессивный': 'aggressive',
            'Максимальный': 'maximum'
        };
        
        return modeMap[selectedMode] || 'balanced';
    }
    
    static getSettings() {
        const mode = this.getCurrentMode();
        const modeSettings = CONFIG.modes[mode];
        
        // Переопределяем настройки из плагина
        const settings = {
            ...modeSettings,
            httpsRedirect: $environment && $environment['HTTPS редиректы'] !== 'Отключить',
            cleanHTML: $environment && $environment['Очистка HTML'] !== 'Отключить',
            antiTracker: $environment && $environment['Антитрекинг'] !== 'Отключить',
            socialBlock: $environment && $environment['Блокировка соцсетей'] === 'Включить',
            debug: $environment && $environment['Дебаг логи'] === 'Включить'
        };
        
        Logger.debug(`Mode: ${mode}`, settings);
        return settings;
    }
}

// --- Загрузка внешних списков блокировки ---
class BlockListLoader {
    static async loadExternalLists() {
        try {
            // Можно загружать актуальные списки с GitHub
            const listsUrl = 'https://raw.githubusercontent.com/professional-adblock/lists/main/ru-blocklist.json';
            
            return new Promise((resolve, reject) => {
                $httpClient.get(listsUrl, (error, response, data) => {
                    if (error) {
                        Logger.warn('Failed to load external lists', error);
                        resolve(null);
                    } else {
                        try {
                            const lists = JSON.parse(data);
                            Logger.info('External lists loaded successfully');
                            resolve(lists);
                        } catch (e) {
                            Logger.warn('Failed to parse external lists', e);
                            resolve(null);
                        }
                    }
                });
            });
        } catch (e) {
            return null;
        }
    }
}

// ===============================================
// ОСНОВНЫЕ ОБРАБОТЧИКИ
// ===============================================

class RequestHandler {
    static handle(request) {
        const url = request.url;
        const method = request.method || 'GET';
        const settings = ModeManager.getSettings();
        
        Logger.debug(`Processing ${method} request`, { url });
        
        // 1. Проверяем HTTPS редирект
        if (settings.httpsRedirect && url.startsWith('http://')) {
            const httpsUrl = this.checkHTTPSRedirect(url);
            if (httpsUrl) {
                return {
                    response: {
                        status: 302,
                        headers: {
                            'Location': httpsUrl,
                            'Cache-Control': 'no-cache',
                            'X-Redirected-By': 'RU-AdBlock'
                        }
                    }
                };
            }
        }
        
        // 2. Проверяем блокировку URL
        const blockResult = this.shouldBlockRequest(url);
        if (blockResult.blocked) {
            Logger.info(`BLOCKED: ${blockResult.reason}`, { url });
            
            return {
                response: {
                    status: 204,
                    headers: {
                        'Content-Type': 'text/plain',
                        'X-Blocked-By': 'RU-AdBlock',
                        'X-Block-Reason': blockResult.reason,
                        'Cache-Control': 'max-age=86400'
                    },
                    body: ''
                }
            };
        }
        
        // 3. Модифицируем заголовки для обхода детекторов
        const modifiedRequest = this.modifyRequest(request);
        if (modifiedRequest) {
            return { request: modifiedRequest };
        }
        
        Logger.debug('Request allowed', { url });
        return null;
    }
    
    static checkHTTPSRedirect(url) {
        const httpsDomainsBasic = [
            'yandex.ru', 'ya.ru', 'vk.com', 'mail.ru', 'ok.ru',
            'sberbank.ru', 'vtb.ru', 'tinkoff.ru'
        ];
        
        const httpsDomainsExtended = [
            'avito.ru', 'pikabu.ru', 'habr.com', 'lenta.ru', 'rbc.ru',
            'kinopoisk.ru', 'ozon.ru', 'wildberries.ru', 'dzen.ru'
        ];
        
        const mode = ModeManager.getCurrentMode();
        const domains = mode === 'balanced' ? httpsDomainsBasic : 
                       [...httpsDomainsBasic, ...httpsDomainsExtended];
        
        const urlLower = url.toLowerCase();
        for (const domain of domains) {
            if (urlLower.includes(domain)) {
                return url.replace('http://', 'https://');
            }
        }
        
        return null;
    }
    
    static shouldBlockRequest(url) {
        const mode = ModeManager.getCurrentMode();
        const settings = ModeManager.getSettings();
        
        // Белый список
        if (this.isWhitelisted(url)) {
            return { blocked: false };
        }
        
        // Получаем списки блокировки в зависимости от режима
        const blockLists = this.getBlockLists(mode, settings);
        
        // Проверяем домены
        for (const domain of blockLists.domains) {
            if (url.toLowerCase().includes(domain.toLowerCase())) {
                return { blocked: true, reason: `domain: ${domain}` };
            }
        }
        
        // Проверяем паттерны URL
        for (const pattern of blockLists.patterns) {
            if (pattern.test(url)) {
                return { blocked: true, reason: `pattern: ${pattern.toString()}` };
            }
        }
        
        // Проверяем ключевые слова (только для aggressive/maximum)
        if (settings.strictPatterns) {
            for (const keyword of blockLists.keywords) {
                if (url.toLowerCase().includes(keyword)) {
                    return { blocked: true, reason: `keyword: ${keyword}` };
                }
            }
        }
        
        return { blocked: false };
    }
    
    static isWhitelisted(url) {
        const whitelistBasic = [
            'yandex.ru/search', 'google.com/search',
            'vk.com/im', 'vk.com/feed', 'vk.com/friends',
            'mail.ru/inbox', 'yandex.ru/mail',
            'gosuslugi.ru', 'nalog.ru',
            'sberbank.ru/online', 'vtb.ru/personal'
        ];
        
        const whitelistExtended = [
            'dzen.ru/news', 'dzen.ru/media',
            'ok.ru/messages', 'ok.ru/feed',
            'hh.ru', 'superjob.ru',
            'lenta.ru/news', 'rbc.ru/politics'
        ];
        
        const whitelistPaths = [
            '/api/', '/ajax/', '/json/', '/graphql/',
            '/login', '/auth', '/oauth', '/signin',
            '/checkout', '/payment', '/cart', '/order'
        ];
        
        const mode = ModeManager.getCurrentMode();
        const urlLower = url.toLowerCase();
        
        // Проверяем домены
        const domains = mode === 'balanced' ? 
            [...whitelistBasic, ...whitelistExtended] : whitelistBasic;
            
        for (const domain of domains) {
            if (urlLower.includes(domain)) {
                Logger.debug(`Whitelisted: ${domain}`);
                return true;
            }
        }
        
        // Проверяем пути
        for (const path of whitelistPaths) {
            if (urlLower.includes(path)) {
                Logger.debug(`Whitelisted path: ${path}`);
                return true;
            }
        }
        
        return false;
    }
    
    static getBlockLists(mode, settings) {
        const lists = {
            domains: [],
            patterns: [],
            keywords: []
        };
        
        // Базовые домены для всех режимов
        lists.domains.push(
            // Яндекс
            'bs.yandex.ru', 'an.yandex.ru', 'yabs.yandex.ru',
            'yandexadexchange.net', 'adfox.ru',
            // Google
            'doubleclick.net', 'googlesyndication.com',
            'googleadservices.com',
            // Mail.ru
            'go.mail.ru', 'rs.mail.ru',
            // RTB
            'relap.io', 'buzzoola.com', 'marketgid.com'
        );
        
        // Базовые паттерны
        lists.patterns.push(
            /\/ads?\//i,
            /\/banner/i,
            /\/reklama/i,
            /^https?:\/\/ads?\./i
        );
        
        // Расширенные списки для aggressive/maximum
        if (mode === 'aggressive' || mode === 'maximum') {
            lists.domains.push(
                'awaps.yandex.ru', 'adfox.yandex.ru',
                'dzeninfra.ru', 'clck.dzen.ru',
                'googletagmanager.com', 'googletagservices.com',
                'top.mail.ru', 'vk.com/ads',
                'mgid.com', 'outbrain.com', 'taboola.com'
            );
            
            lists.patterns.push(
                /\/advertising/i,
                /\/advert/i,
                /\/pixel\./i,
                /\/beacon\./i,
                /\/counter\./i,
                /\/adfox/i,
                /dzeninfra\.ru.*zen-lib/i,
                /[?&](utm_|fbclid|gclid|yclid)/i
            );
            
            lists.keywords.push(
                'rtb', 'ssp', 'dsp', 'prebid',
                'counter', 'metric', 'analytics',
                'pixel', 'beacon', 'affiliate'
            );
        }
        
        // Аналитика (если включен антитрекинг)
        if (settings.antiTracker) {
            lists.domains.push(
                'mc.yandex.ru', 'metrika.yandex.ru',
                'google-analytics.com', 'googleanalytics.com',
                'top100.rambler.ru', 'counter.rambler.ru'
            );
        }
        
        // Максимальная блокировка
        if (mode === 'maximum') {
            lists.domains.push(
                'an.dzen.ru', 'ads.dzen.ru',
                'connect.facebook.net', 'facebook.com/tr',
                'vk.com/js/api/openapi.js'
            );
            
            lists.patterns.push(
                /\/click/i,
                /\/clck\./i,
                /\/partner/i,
                /\/referral/i,
                /\/sponsor/i
            );
        }
        
        return lists;
    }
    
    static modifyRequest(request) {
        const settings = ModeManager.getSettings();
        const mode = ModeManager.getCurrentMode();
        
        if (!settings.antiTracker) return null;
        
        const headers = { ...request.headers };
        let modified = false;
        
        // Добавляем заголовки приватности
        headers['DNT'] = '1';
        headers['Sec-GPC'] = '1';
        modified = true;
        
        // Удаляем трекинг заголовки в maximum режиме
        if (mode === 'maximum') {
            const removeHeaders = ['X-Requested-With', 'X-Forwarded-For', 'X-Real-IP'];
            for (const header of removeHeaders) {
                if (headers[header]) {
                    delete headers[header];
                    modified = true;
                }
            }
        }
        
        return modified ? { ...request, headers } : null;
    }
}

class ResponseHandler {
    static handle(response) {
        const url = response.url || 'unknown';
        const contentType = this.getContentType(response);
        const settings = ModeManager.getSettings();
        
        Logger.debug('Processing response', { url, contentType });
        
        // Обрабатываем только HTML
        if (!this.isHTMLContent(contentType)) {
            return null;
        }
        
        if (!response.body || !settings.cleanHTML) {
            return null;
        }
        
        // Очищаем HTML контент
        const cleanedBody = this.cleanHTML(response.body);
        
        if (cleanedBody !== response.body) {
            const saved = response.body.length - cleanedBody.length;
            Logger.info(`HTML cleaned: ${saved} bytes removed`, { url });
            
            return {
                response: {
                    ...response,
                    body: cleanedBody
                }
            };
        }
        
        return null;
    }
    
    static getContentType(response) {
        if (!response.headers) return '';
        return response.headers['Content-Type'] || 
               response.headers['content-type'] || '';
    }
    
    static isHTMLContent(contentType) {
        return contentType.includes('text/html') || 
               contentType.includes('application/xhtml');
    }
    
    static cleanHTML(html) {
        const mode = ModeManager.getCurrentMode();
        const settings = ModeManager.getSettings();
        
        let cleaned = html;
        
        // Получаем паттерны очистки для текущего режима
        const patterns = this.getCleanPatterns(mode);
        
        // Применяем очистку
        for (const pattern of patterns) {
            cleaned = cleaned.replace(pattern, '');
        }
        
        // Внедряем CSS для блокировки
        cleaned = this.injectBlockingCSS(cleaned, mode);
        
        // Удаляем пустые контейнеры
        if (settings.deepClean) {
            cleaned = this.removeEmptyContainers(cleaned);
        }
        
        return cleaned;
    }
    
    static getCleanPatterns(mode) {
        const patterns = [];
        
        // Базовые паттерны
        patterns.push(
            // Яндекс
            /<script[^>]*yandex.*direct[^>]*>.*?<\/script>/gis,
            /<div[^>]*ya-partner[^>]*>.*?<\/div>/gis,
            // Google
            /<script[^>]*googlesyndication[^>]*>.*?<\/script>/gis,
            /<ins[^>]*adsbygoogle[^>]*>.*?<\/ins>/gis,
            // Общие
            /<div[^>]*class="[^"]*(?:ad|ads|banner|reklama)[^"]*"[^>]*>.*?<\/div>/gis
        );
        
        // Расширенные паттерны
        if (mode === 'aggressive' || mode === 'maximum') {
            patterns.push(
                // Метрика
                /<script[^>]*metrika[^>]*>.*?<\/script>/gis,
                // Adfox
                /<script[^>]*adfox[^>]*>.*?<\/script>/gis,
                /<div[^>]*adfox[^>]*>.*?<\/div>/gis,
                // RTB
                /<div[^>]*(?:rtb|ssp|dsp)[^>]*>.*?<\/div>/gis,
                // Трекинг
                /<img[^>]*(?:pixel|beacon|counter)[^>]*>/gi
            );
        }
        
        // Максимальные паттерны
        if (mode === 'maximum') {
            patterns.push(
                // Дзен
                /<div[^>]*dzeninfra[^>]*>.*?<\/div>/gis,
                /<script[^>]*dzen[^>]*>.*?<\/script>/gis,
                // Расширенные секции
                /<section[^>]*(?:ad|ads|banner)[^>]*>.*?<\/section>/gis,
                /<aside[^>]*(?:ad|ads|sidebar-ad)[^>]*>.*?<\/aside>/gis,
                // Партнерки
                /<div[^>]*(?:affiliate|partner|sponsor)[^>]*>.*?<\/div>/gis,
                // Комментарии
                /<!--[\s\S]*?(?:ad|banner|reklama)[\s\S]*?-->/gi
            );
        }
        
        return patterns;
    }
    
    static injectBlockingCSS(html, mode) {
        const rules = [];
        
        // Базовые правила
        rules.push(
            '[class*="ad-"], [class*="ads-"], [class*="banner"]',
            '[id*="ad-"], [id*="ads-"], [id*="banner"]',
            '.ya-partner, .yap-adunit, .adsbygoogle'
        );
        
        // Расширенные правила
        if (mode === 'aggressive' || mode === 'maximum') {
            rules.push(
                '[class*="reklama"], [class*="promo"]',
                '[class*="rtb-"], [class*="ssp-"]',
                'iframe[src*="doubleclick"]'
            );
        }
        
        // Максимальные правила
        if (mode === 'maximum') {
            rules.push(
                '[class*="affiliate"], [class*="sponsor"]',
                '[class*="dzen-lib"], [class*="dzeninfra"]',
                'div[style*="position: fixed"][style*="z-index: 9"]'
            );
        }
        
        const css = `
<style id="ru-adblock-css">
${rules.join(',\n')} {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    width: 0 !important;
    overflow: hidden !important;
    position: absolute !important;
    left: -9999px !important;
}
</style>`;
        
        // Вставляем перед </head> или после <body>
        if (html.includes('</head>')) {
            return html.replace('</head>', css + '\n</head>');
        } else if (html.includes('<body')) {
            return html.replace(/(<body[^>]*>)/, '$1\n' + css);
        }
        
        return html;
    }
    
    static removeEmptyContainers(html) {
        let cleaned = html;
        let previousLength;
        
        const patterns = [
            /<div[^>]*>\s*<\/div>/gi,
            /<section[^>]*>\s*<\/section>/gi,
            /<aside[^>]*>\s*<\/aside>/gi,
            /<span[^>]*>\s*<\/span>/gi
        ];
        
        // Повторяем пока есть изменения
        do {
            previousLength = cleaned.length;
            for (const pattern of patterns) {
                cleaned = cleaned.replace(pattern, '');
            }
        } while (cleaned.length < previousLength);
        
        return cleaned;
    }
}

// ===============================================
// ТОЧКА ВХОДА
// ===============================================

(function main() {
    const mode = ModeManager.getCurrentMode();
    const settings = ModeManager.getSettings();
    
    Logger.info(`Started v${CONFIG.version}`, { mode, settings });
    
    try {
        // Обработка запроса
        if (typeof $request !== 'undefined' && $request) {
            const result = RequestHandler.handle($request);
            $done(result || {});
        }
        // Обработка ответа
        else if (typeof $response !== 'undefined' && $response) {
            const result = ResponseHandler.handle($response);
            $done(result || {});
        }
        // Нет данных
        else {
            Logger.warn('No request or response object');
            $done({});
        }
    } catch (error) {
        Logger.error('Script error', {
            message: error.message,
            stack: error.stack
        });
        $done({});
    }
})();
