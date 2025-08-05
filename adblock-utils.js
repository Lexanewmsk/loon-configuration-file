/**
 * adblock-utils.js
 * Утилиты, логгер и анализатор URL
 */

class Logger {
    static log(level, message, data = null) {
        // Получаем настройки дебага из переменной окружения
        const debugEnabled = $environment && $environment.debugEnabled || false;
        
        if (!debugEnabled && level === 'debug') return;
        
        const timestamp = new Date().toISOString();
        const prefix = `[RU-AdBlock][${level.toUpperCase()}]`;
        
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

class ModeManager {
    static getCurrentMode() {
        // Получаем выбранный режим из переменных окружения Loon
        const selectedMode = $environment && $environment['Режим блокировки'] || 'Сбалансированный';
        
        switch (selectedMode) {
            case 'Сбалансированный':
                return 'balanced';
            case 'Агрессивный':
                return 'aggressive';
            case 'Максимальный':
                return 'maximum';
            default:
                return 'balanced';
        }
    }
    
    static getSettings() {
        const mode = this.getCurrentMode();
        const { CONFIG } = require('./adblock-config.js');
        const modeSettings = CONFIG.modes[mode];
        
        // Дополнительные настройки из плагина
        const settings = {
            ...modeSettings,
            httpsRedirect: $environment && $environment['HTTPS редиректы'] === 'Включить',
            cleanHTML: $environment && $environment['Очистка HTML'] === 'Включить',
            antiTracker: $environment && $environment['Антитрекинг'] === 'Включить',
            socialBlock: $environment && $environment['Блокировка соцсетей'] === 'Включить',
            debug: $environment && $environment['Дебаг логи'] === 'Включить'
        };
        
        Logger.debug(`Current mode: ${mode}`, settings);
        return settings;
    }
}

class URLAnalyzer {
    static getBlockLists() {
        const { BLOCK_LISTS } = require('./adblock-config.js');
        const settings = ModeManager.getSettings();
        const mode = ModeManager.getCurrentMode();
        
        let domains = [...BLOCK_LISTS.adDomainsBasic];
        let keywords = [...BLOCK_LISTS.adKeywordsBasic];
        let patterns = [...BLOCK_LISTS.adPatternsBasic];
        
        // Добавляем расширенные списки для aggressive и maximum
        if (mode === 'aggressive' || mode === 'maximum') {
            domains.push(...BLOCK_LISTS.adDomainsExtended);
            keywords.push(...BLOCK_LISTS.adKeywordsExtended);
            patterns.push(...BLOCK_LISTS.adPatternsExtended);
        }
        
        // Добавляем аналитику если включен антитрекинг
        if (settings.antiTracker) {
            domains.push(...BLOCK_LISTS.analyticsDomains);
        }
        
        return { domains, keywords, patterns };
    }
    
    static getWhitelist() {
        const { WHITELIST } = require('./adblock-config.js');
        const mode = ModeManager.getCurrentMode();
        
        let domains = [...WHITELIST.domainsBasic];
        
        // Расширенный белый список для balanced режима
        if (mode === 'balanced') {
            domains.push(...WHITELIST.domainsExtended);
        }
        
        return { domains, paths: WHITELIST.paths };
    }
    
    static isWhitelisted(url) {
        const whitelist = this.getWhitelist();
        const urlLower = url.toLowerCase();
        
        // Проверяем домены
        for (const domain of whitelist.domains) {
            if (urlLower.includes(domain.toLowerCase())) {
                Logger.debug(`Whitelisted by domain: ${domain}`, { url });
                return true;
            }
        }
        
        // Проверяем пути
        for (const path of whitelist.paths) {
            if (urlLower.includes(path.toLowerCase())) {
                Logger.debug(`Whitelisted by path: ${path}`, { url });
                return true;
            }
        }
        
        return false;
    }
    
    static shouldBlock(url) {
        if (this.isWhitelisted(url)) {
            return { blocked: false };
        }
        
        const blockLists = this.getBlockLists();
        const urlLower = url.toLowerCase();
        const settings = ModeManager.getSettings();
        
        // Проверяем домены
        for (const domain of blockLists.domains) {
            if (urlLower.includes(domain.toLowerCase())) {
                Logger.info(`Blocked by domain: ${domain}`, { url });
                return { blocked: true, reason: `domain: ${domain}` };
            }
        }
        
        // Проверяем ключевые слова (только если не balanced режим)
        if (settings.strictPatterns) {
            for (const keyword of blockLists.keywords) {
                if (urlLower.includes(keyword.toLowerCase())) {
                    Logger.info(`Blocked by keyword: ${keyword}`, { url });
                    return { blocked: true, reason: `keyword: ${keyword}` };
                }
            }
        }
        
        // Проверяем паттерны
        for (const pattern of blockLists.patterns) {
            if (pattern.test(url)) {
                Logger.info(`Blocked by pattern: ${pattern}`, { url });
                return { blocked: true, reason: `pattern: ${pattern}` };
            }
        }
        
        return { blocked: false };
    }
}

// Экспортируем для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Logger, ModeManager, URLAnalyzer };
}
