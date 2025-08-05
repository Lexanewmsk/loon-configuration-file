/**
 * adblock-main.js
 * Основной файл обработки запросов и ответов с загрузчиком модулей
 * Версия: 3.2
 */

// ===============================================
// ЗАГРУЗЧИК МОДУЛЕЙ ДЛЯ LOON
// ===============================================

const MODULE_BASE_URL = 'https://raw.githubusercontent.com/Lexanewmsk/loon-configuration-file/refs/heads/loon/';

// Кэш для загруженных модулей
const moduleCache = {};

// Загрузчик модулей
function loadModuleSync(moduleName) {
    try {
        const url = MODULE_BASE_URL + moduleName;
        const response = $httpClient.get({
            url: url,
            timeout: 5000
        });
        
        if (response.error) {
            throw new Error(`Failed to load ${moduleName}: ${response.error}`);
        }
        
        // Создаем модуль
        const module = { exports: {} };
        const exports = module.exports;
        
        // Выполняем код модуля
        eval(response.data);
        
        moduleCache[moduleName] = module.exports;
        return module.exports;
    } catch (e) {
        console.error(`Error loading module ${moduleName}:`, e);
        return null;
    }
}

// Функция require для совместимости
function require(modulePath) {
    const moduleName = modulePath.replace('./', '');
    
    if (moduleCache[moduleName]) {
        return moduleCache[moduleName];
    }
    
    const loaded = loadModuleSync(moduleName);
    if (loaded) {
        return loaded;
    }
    
    // Возвращаем встроенные модули как fallback
    return getBuiltinModule(moduleName);
}

// ===============================================
// ВСТРОЕННЫЕ МОДУЛИ (FALLBACK)
// ===============================================

function getBuiltinModule(moduleName) {
    const builtinModules = {
        'adblock-config.js': {
            CONFIG: {
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
            },
            BLOCK_LISTS: {
                adDomainsBasic: [
                    "bs.yandex.ru", "an.yandex.ru", "yabs.yandex.ru",
                    "yandexadexchange.net", "adfox.ru",
                    "doubleclick.net", "googlesyndication.com",
                    "googleadservices.com", "go.mail.ru", "rs.mail.ru",
                    "relap.io", "buzzoola.com", "marketgid.com"
                ],
                adDomainsExtended: [
                    "awaps.yandex.ru", "adfox.yandex.ru",
                    "dzeninfra.ru", "static.dzeninfra.ru",
                    "clck.dzen.ru", "an.dzen.ru", "ads.dzen.ru",
                    "googletagmanager.com", "googletagservices.com",
                    "top.mail.ru", "vk.com/ads", "ads.vk.com",
                    "mgid.com", "outbrain.com", "taboola.com"
                ],
                analyticsDomains: [
                    "mc.yandex.ru", "metrika.yandex.ru",
                    "google-analytics.com", "googleanalytics.com",
                    "top100.rambler.ru", "counter.rambler.ru"
                ],
                adKeywordsBasic: [
                    "ads", "ad_", "_ad", "banner", "reklama",
                    "advertisement", "advertising"
                ],
                adKeywordsExtended: [
                    "rtb", "ssp", "dsp", "prebid", "programmatic",
                    "counter", "metric", "analytics", "tracking",
                    "pixel", "beacon", "affiliate", "partner"
                ],
                adPatternsBasic: [
                    /\/ads?\//i, /\/banner/i, /\/reklama/i, /^https?:\/\/ads?\./i
                ],
                adPatternsExtended: [
                    /\/advertising/i, /\/advert/i, /\/pixel\./i, /\/beacon\./i,
                    /\/counter\./i, /\/metric\./i, /\/adfox/i, /\/yabs\//i,
                    /dzeninfra\.ru.*zen-lib/i, /[?&](utm_|fbclid|gclid|yclid)/i
                ]
            },
            WHITELIST: {
                domainsBasic: [
                    "yandex.ru/search", "google.com/search",
                    "vk.com/im", "vk.com/feed",
                    "mail.ru/inbox", "yandex.ru/mail",
                    "gosuslugi.ru", "nalog.ru",
                    "sberbank.ru", "vtb.ru"
                ],
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
            }
        },
        
        'adblock-utils.js': {
            Logger: {
                log: function(level, message, data) {
                    const debugEnabled = $environment && $environment['Дебаг логи'] === 'Включить';
                    if (!debugEnabled && level === 'debug') return;
                    
                    const timestamp = new Date().toLocaleTimeString();
                    const prefix = `[RU-AdBlock][${level.toUpperCase()}][${timestamp}]`;
                    
                    if (data) {
                        console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
                    } else {
                        console.log(`${prefix} ${message}`);
                    }
                },
                debug: function(message, data) { this.log('debug', message, data); },
                info: function(message, data) { this.log('info', message, data); },
                warn: function(message, data) { this.log('warn', message, data); },
                error: function(message, data) { this.log('error', message, data); }
            },
            
            ModeManager: {
                getCurrentMode: function() {
                    const selectedMode = $environment && $environment['Режим блокировки'] || 'Сбалансированный';
                    const modeMap = {
                        'Сбалансированный': 'balanced',
                        'Агрессивный': 'aggressive',
                        'Максимальный': 'maximum'
                    };
                    return modeMap[selectedMode] || 'balanced';
                },
                
                getSettings: function() {
                    const { CONFIG } = require('./adblock-config.js');
                    const mode = this.getCurrentMode();
                    const modeSettings = CONFIG.modes[mode];
                    
                    const settings = {
                        ...modeSettings,
                        httpsRedirect: $environment && $environment['HTTPS редиректы'] !== 'Отключить',
                        cleanHTML: $environment && $environment['Очистка HTML'] !== 'Отключить',
                        antiTracker: $environment && $environment['Антитрекинг'] !== 'Отключить',
                        socialBlock: $environment && $environment['Блокировка соцсетей'] === 'Включить',
                        debug: $environment && $environment['Дебаг логи'] === 'Включить'
                    };
                    
                    return settings;
                }
            },
            
            URLAnalyzer: {
                getBlockLists: function() {
                    const { BLOCK_LISTS } = require('./adblock-config.js');
                    const { ModeManager } = require('./adblock-utils.js');
                    const settings = ModeManager.getSettings();
                    const mode = ModeManager.getCurrentMode();
                    
                    let domains = [...BLOCK_LISTS.adDomainsBasic];
                    let keywords = [...BLOCK_LISTS.adKeywordsBasic];
                    let patterns = [...BLOCK_LISTS.adPatternsBasic];
                    
                    if (mode === 'aggressive' || mode === 'maximum') {
                        domains.push(...BLOCK_LISTS.adDomainsExtended);
                        keywords.push(...BLOCK_LISTS.adKeywordsExtended);
                        patterns.push(...BLOCK_LISTS.adPatternsExtended);
                    }
                    
                    if (settings.antiTracker) {
                        domains.push(...BLOCK_LISTS.analyticsDomains);
                    }
                    
                    return { domains, keywords, patterns };
                },
                
                getWhitelist: function() {
                    const { WHITELIST } = require('./adblock-config.js');
                    const { ModeManager } = require('./adblock-utils.js');
                    const mode = ModeManager.getCurrentMode();
                    
                    let domains = [...WHITELIST.domainsBasic];
                    
                    if (mode === 'balanced') {
                        domains.push(...WHITELIST.domainsExtended);
                    }
                    
                    return { domains, paths: WHITELIST.paths };
                },
                
                isWhitelisted: function(url) {
                    const whitelist = this.getWhitelist();
                    const urlLower = url.toLowerCase();
                    
                    for (const domain of whitelist.domains) {
                        if (urlLower.includes(domain.toLowerCase())) {
                            return true;
                        }
                    }
                    
                    for (const path of whitelist.paths) {
                        if (urlLower.includes(path.toLowerCase())) {
                            return true;
                        }
                    }
                    
                    return false;
                },
                
                shouldBlock: function(url) {
                    if (this.isWhitelisted(url)) {
                        return { blocked: false };
                    }
                    
                    const blockLists = this.getBlockLists();
                    const urlLower = url.toLowerCase();
                    const { ModeManager } = require('./adblock-utils.js');
                    const settings = ModeManager.getSettings();
                    
                    for (const domain of blockLists.domains) {
                        if (urlLower.includes(domain.toLowerCase())) {
                            return { blocked: true, reason: `domain: ${domain}` };
                        }
                    }
                    
                    if (settings.strictPatterns) {
                        for (const keyword of blockLists.keywords) {
                            if (urlLower.includes(keyword.toLowerCase())) {
                                return { blocked: true, reason: `keyword: ${keyword}` };
                            }
                        }
                    }
                    
                    for (const pattern of blockLists.patterns) {
                        if (pattern.test(url)) {
                            return { blocked: true, reason: `pattern: ${pattern}` };
                        }
                    }
                    
                    return { blocked: false };
                }
            }
        },
        
        'adblock-cleaner.js': {
            ContentCleaner: {
                cleanHTML: function(html) {
                    const { ModeManager } = require('./adblock-utils.js');
                    const settings = ModeManager.getSettings();
                    
                    if (!settings.cleanHTML) {
                        return html;
                    }
                    
                    const mode = ModeManager.getCurrentMode();
                    let cleaned = html;
                    
                    // Базовые паттерны
                    const basicPatterns = [
                        /<script[^>]*yandex.*direct[^>]*>.*?<\/script>/gis,
                        /<div[^>]*ya-partner[^>]*>.*?<\/div>/gis,
                        /<script[^>]*googlesyndication[^>]*>.*?<\/script>/gis,
                        /<ins[^>]*adsbygoogle[^>]*>.*?<\/ins>/gis,
                        /<div[^>]*class="[^"]*(?:ad|ads|banner|reklama)[^"]*"[^>]*>.*?<\/div>/gis
                    ];
                    
                    for (const pattern of basicPatterns) {
                        cleaned = cleaned.replace(pattern, '');
                    }
                    
                    // Расширенные паттерны для aggressive/maximum
                    if (mode === 'aggressive' || mode === 'maximum') {
                        const aggressivePatterns = [
                            /<script[^>]*metrika[^>]*>.*?<\/script>/gis,
                            /<script[^>]*adfox[^>]*>.*?<\/script>/gis,
                            /<div[^>]*adfox[^>]*>.*?<\/div>/gis,
                            /<div[^>]*(?:rtb|ssp|dsp)[^>]*>.*?<\/div>/gis,
                            /<img[^>]*(?:pixel|beacon|counter)[^>]*>/gi
                        ];
                        
                        for (const pattern of aggressivePatterns) {
                            cleaned = cleaned.replace(pattern, '');
                        }
                    }
                    
                    // Максимальная очистка
                    if (mode === 'maximum') {
                        const maximumPatterns = [
                            /<div[^>]*dzeninfra[^>]*>.*?<\/div>/gis,
                            /<section[^>]*(?:ad|ads|banner)[^>]*>.*?<\/section>/gis,
                            /<aside[^>]*(?:ad|ads|sidebar-ad)[^>]*>.*?<\/aside>/gis,
                            /<!--[\s\S]*?(?:ad|banner|reklama)[\s\S]*?-->/gi
                        ];
                        
                        for (const pattern of maximumPatterns) {
                            cleaned = cleaned.replace(pattern, '');
                        }
                    }
                    
                    // Внедряем CSS
                    cleaned = this.injectCSS(cleaned);
                    
                    return cleaned;
                },
                
                injectCSS: function(html) {
                    const { ModeManager } = require('./adblock-utils.js');
                    const mode = ModeManager.getCurrentMode();
                    
                    const rules = [
                        '[class*="ad-"], [class*="ads-"], [class*="banner"]',
                        '[id*="ad-"], [id*="ads-"], [id*="banner"]',
                        '.ya-partner, .yap-adunit, .adsbygoogle'
                    ];
                    
                    if (mode === 'aggressive' || mode === 'maximum') {
                        rules.push(
                            '[class*="reklama"], [class*="promo"]',
                            '[class*="rtb-"], [class*="ssp-"]',
                            'iframe[src*="doubleclick"]'
                        );
                    }
                    
                    if (mode === 'maximum') {
                        rules.push(
                            '[class*="affiliate"], [class*="sponsor"]',
                            '[class*="dzen-lib"], [class*="dzeninfra"]'
                        );
                    }
                    
                    const css = `<style id="ru-adblock-css">${rules.join(', ')} { display: none !important; }</style>`;
                    
                    if (html.includes('</head>')) {
                        return html.replace('</head>', css + '\n</head>');
                    } else if (html.includes('<body')) {
                        return html.replace(/(<body[^>]*>)/, '$1\n' + css);
                    }
                    
                    return html;
                }
            }
        }
    };
    
    return builtinModules[moduleName] || {};
}

// ===============================================
// ОСНОВНЫЕ ОБРАБОТЧИКИ
// ===============================================

class RequestHandler {
    static handle(request) {
        const { Logger, ModeManager, URLAnalyzer } = require('./adblock-utils.js');
        
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
        const blockResult = URLAnalyzer.shouldBlock(url);
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
        
        // 3. Модифицируем заголовки
        const modifiedRequest = this.modifyRequest(request, settings);
        if (modifiedRequest) {
            return { request: modifiedRequest };
        }
        
        Logger.debug('Request allowed', { url });
        return null;
    }
    
    static checkHTTPSRedirect(url) {
        const { ModeManager } = require('./adblock-utils.js');
        
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
    
    static modifyRequest(request, settings) {
        if (!settings.antiTracker) return null;
        
        const headers = { ...request.headers };
        let modified = false;
        
        // Добавляем заголовки приватности
        headers['DNT'] = '1';
        headers['Sec-GPC'] = '1';
        modified = true;
        
        // Удаляем трекинг заголовки в maximum режиме
        const { ModeManager } = require('./adblock-utils.js');
        const mode = ModeManager.getCurrentMode();
        
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
        const { Logger, ModeManager } = require('./adblock-utils.js');
        const { ContentCleaner } = require('./adblock-cleaner.js');
        
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
        const cleanedBody = ContentCleaner.cleanHTML(response.body);
        
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
}

// ===============================================
// ТОЧКА ВХОДА
// ===============================================

(function main() {
    try {
        // Предзагружаем все модули
        const modules = ['adblock-config.js', 'adblock-utils.js', 'adblock-cleaner.js'];
        for (const module of modules) {
            require('./' + module);
        }
        
        const { Logger, ModeManager } = require('./adblock-utils.js');
        const { CONFIG } = require('./adblock-config.js');
        
        const mode = ModeManager.getCurrentMode();
        const settings = ModeManager.getSettings();
        
        Logger.info(`Started v${CONFIG.version}`, { mode, settings });
        
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
        console.error('[RU-AdBlock] Error:', error.message);
        $done({});
    }
})();
