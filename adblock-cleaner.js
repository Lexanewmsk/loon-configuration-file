/**
 * adblock-cleaner.js
 * Модуль очистки HTML контента от рекламы
 */

const { Logger, ModeManager } = require('./adblock-utils.js');

class ContentCleaner {
    static getCleanupPatterns() {
        const mode = ModeManager.getCurrentMode();
        const settings = ModeManager.getSettings();
        
        // Базовые паттерны для всех режимов
        const basicPatterns = [
            // Яндекс.Директ
            /<script[^>]*yandex.*direct[^>]*>.*?<\/script>/gis,
            /<div[^>]*ya-partner[^>]*>.*?<\/div>/gis,
            
            // Google AdSense
            /<script[^>]*googlesyndication[^>]*>.*?<\/script>/gis,
            /<ins[^>]*adsbygoogle[^>]*>.*?<\/ins>/gis,
            
            // Общие рекламные блоки
            /<div[^>]*class="[^"]*(?:ad|ads|banner|reklama)[^"]*"[^>]*>.*?<\/div>/gis
        ];
        
        // Расширенные паттерны для aggressive режима
        const aggressivePatterns = [
            // Больше Яндекс блоков
            /<div[^>]*yap-adunit[^>]*>.*?<\/div>/gis,
            /<script[^>]*(?:ya|yandex).*?metrika[^>]*>.*?<\/script>/gis,
            
            // Adfox
            /<script[^>]*adfox[^>]*>.*?<\/script>/gis,
            /<div[^>]*adfox[^>]*>.*?<\/div>/gis,
            
            // RTB контейнеры
            /<div[^>]*(?:id|class)="[^"]*(?:rtb|ssp|dsp)[^"]*"[^>]*>.*?<\/div>/gis,
            
            // Трекинг пиксели
            /<img[^>]*(?:pixel|beacon|counter)[^>]*>/gi,
            /<noscript[^>]*>.*?<img[^>]*(?:counter|metric)[^>]*>.*?<\/noscript>/gis
        ];
        
        // Максимальные паттерны для maximum режима
        const maximumPatterns = [
            // Дзен рекламные блоки
            /<div[^>]*(?:id|class)="[^"]*(?:zen-lib|dzeninfra)[^"]*"[^>]*>.*?<\/div>/gis,
            /<script[^>]*dzeninfra[^>]*>.*?<\/script>/gis,
            
            // Расширенные рекламные секции
            /<section[^>]*(?:id|class)="[^"]*(?:ad|ads|banner|advertising)[^"]*"[^>]*>.*?<\/section>/gis,
            /<aside[^>]*(?:id|class)="[^"]*(?:ad|ads|sidebar-ad)[^"]*"[^>]*>.*?<\/aside>/gis,
            
            // Видеореклама
            /<div[^>]*(?:videoads|ima-|vast-)[^>]*>.*?<\/div>/gis,
            
            // Партнерские программы
            /<div[^>]*(?:affiliate|partner|referral)[^>]*>.*?<\/div>/gis,
            
            // Inline стили для рекламы
            /style="[^"]*(?:display:\s*none|visibility:\s*hidden)[^"]*ad[^"]*"/gi,
            
            // Комментарии с рекламой
            /<!--[\s\S]*?(?:ad|advertisement|banner|reklama)[\s\S]*?-->/gi
        ];
        
        // Комбинируем паттерны в зависимости от режима
        let patterns = [...basicPatterns];
        
        if (mode === 'aggressive' || mode === 'maximum') {
            patterns.push(...aggressivePatterns);
        }
        
        if (mode === 'maximum') {
            patterns.push(...maximumPatterns);
        }
        
        return patterns;
    }
    
    static cleanHTML(html) {
        const settings = ModeManager.getSettings();
        
        if (!settings.cleanHTML) {
            return html;
        }
        
        const originalLength = html.length;
        let cleanedHTML = html;
        const patterns = this.getCleanupPatterns();
        
        // Применяем паттерны очистки
        for (const pattern of patterns) {
            cleanedHTML = cleanedHTML.replace(pattern, '');
        }
        
        // Дополнительная глубокая очистка для maximum режима
        if (settings.deepClean) {
            cleanedHTML = this.deepClean(cleanedHTML);
        }
        
        // Очищаем пустые контейнеры
        cleanedHTML = this.removeEmptyContainers(cleanedHTML);
        
        const bytesRemoved = originalLength - cleanedHTML.length;
        if (bytesRemoved > 0) {
            Logger.info(`HTML cleaned: ${bytesRemoved} bytes removed`);
        }
        
        return cleanedHTML;
    }
    
    static deepClean(html) {
        // Удаляем скрипты с подозрительными функциями
        const suspiciousScripts = [
            /<script[^>]*>[\s\S]*?(?:adblock|detector|adblocker|anti-adblock)[\s\S]*?<\/script>/gis,
            /<script[^>]*>[\s\S]*?(?:setTimeout|setInterval)[\s\S]*?(?:ad|banner|popup)[\s\S]*?<\/script>/gis
        ];
        
        let cleaned = html;
        for (const pattern of suspiciousScripts) {
            cleaned = cleaned.replace(pattern, '');
        }
        
        return cleaned;
    }
    
    static removeEmptyContainers(html) {
        const emptyPatterns = [
            /<div[^>]*>\s*<\/div>/gi,
            /<section[^>]*>\s*<\/section>/gi,
            /<aside[^>]*>\s*<\/aside>/gi,
            /<span[^>]*>\s*<\/span>/gi
        ];
        
        let cleaned = html;
        let previousLength;
        
        // Повторяем пока есть что удалять
        do {
            previousLength = cleaned.length;
            for (const pattern of emptyPatterns) {
                cleaned = cleaned.replace(pattern, '');
            }
        } while (cleaned.length < previousLength);
        
        return cleaned;
    }
    
    static injectCSS(html) {
        const settings = ModeManager.getSettings();
        const mode = ModeManager.getCurrentMode();
        
        if (!settings.cleanHTML) return html;
        
        // CSS для скрытия рекламных элементов
        let hideRules = [];
        
        // Базовые правила
        hideRules.push(
            '[class*="ad-"], [class*="ads-"], [class*="banner"]',
            '[id*="ad-"], [id*="ads-"], [id*="banner"]',
            '.ya-partner, .yap-adunit, .adsbygoogle'
        );
        
        // Расширенные правила для aggressive
        if (mode === 'aggressive' || mode === 'maximum') {
            hideRules.push(
                '[class*="reklama"], [class*="promo"], [class*="commercial"]',
                '[class*="rtb-"], [class*="ssp-"], [class*="dsp-"]',
                'iframe[src*="doubleclick"], iframe[src*="googlesyndication"]'
            );
        }
        
        // Максимальные правила
        if (mode === 'maximum') {
            hideRules.push(
                '[class*="affiliate"], [class*="partner"], [class*="sponsor"]',
                '[class*="dzen-lib"], [class*="dzeninfra"]',
                'div[style*="position: fixed"][style*="z-index: 9"]'
            );
        }
        
        const css = `
            <style id="ru-adblock-injected">
                ${hideRules.join(', ')} {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    width: 0 !important;
                    opacity: 0 !important;
                }
            </style>
        `;
        
        // Вставляем CSS в head или в начало body
        if (html.includes('</head>')) {
            return html.replace('</head>', css + '</head>');
        } else if (html.includes('<body')) {
            return html.replace(/<body[^>]*>/, '$&' + css);
        }
        
        return html;
    }
}

// Экспортируем
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ContentCleaner };
}
