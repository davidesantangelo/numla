import { create, all } from 'mathjs';
import * as chrono from 'chrono-node';
import { currencyService } from './currencyService.js';

const math = create(all);

// Initialize currency service and configure units
let currenciesConfigured = false;
let configurePromise = null;
let currencyRetryTimeout = null;
const CURRENCY_RETRY_DELAY = 5 * 60 * 1000; // Retry every 5 minutes on failure

// Timezone mappings for natural language
const TIMEZONE_MAP = {
    // US timezones
    'pst': 'America/Los_Angeles',
    'pacific': 'America/Los_Angeles',
    'pdt': 'America/Los_Angeles',
    'mst': 'America/Denver',
    'mountain': 'America/Denver',
    'mdt': 'America/Denver',
    'cst': 'America/Chicago',
    'central': 'America/Chicago',
    'cdt': 'America/Chicago',
    'est': 'America/New_York',
    'eastern': 'America/New_York',
    'edt': 'America/New_York',
    'hst': 'Pacific/Honolulu',
    'akst': 'America/Anchorage',
    'akdt': 'America/Anchorage',
    
    // Cities
    'new york': 'America/New_York',
    'los angeles': 'America/Los_Angeles',
    'chicago': 'America/Chicago',
    'denver': 'America/Denver',
    'london': 'Europe/London',
    'paris': 'Europe/Paris',
    'berlin': 'Europe/Berlin',
    'madrid': 'Europe/Madrid',
    'rome': 'Europe/Rome',
    'milan': 'Europe/Rome',
    'amsterdam': 'Europe/Amsterdam',
    'brussels': 'Europe/Brussels',
    'zurich': 'Europe/Zurich',
    'vienna': 'Europe/Vienna',
    'stockholm': 'Europe/Stockholm',
    'oslo': 'Europe/Oslo',
    'copenhagen': 'Europe/Copenhagen',
    'helsinki': 'Europe/Helsinki',
    'moscow': 'Europe/Moscow',
    'dubai': 'Asia/Dubai',
    'mumbai': 'Asia/Kolkata',
    'delhi': 'Asia/Kolkata',
    'bangalore': 'Asia/Kolkata',
    'singapore': 'Asia/Singapore',
    'hong kong': 'Asia/Hong_Kong',
    'hkt': 'Asia/Hong_Kong',
    'tokyo': 'Asia/Tokyo',
    'jst': 'Asia/Tokyo',
    'seoul': 'Asia/Seoul',
    'kst': 'Asia/Seoul',
    'shanghai': 'Asia/Shanghai',
    'beijing': 'Asia/Shanghai',
    'cst china': 'Asia/Shanghai',
    'sydney': 'Australia/Sydney',
    'aest': 'Australia/Sydney',
    'aedt': 'Australia/Sydney',
    'melbourne': 'Australia/Melbourne',
    'auckland': 'Pacific/Auckland',
    'nzst': 'Pacific/Auckland',
    'nzdt': 'Pacific/Auckland',
    
    // Other timezone codes
    'gmt': 'Etc/GMT',
    'utc': 'Etc/UTC',
    'bst': 'Europe/London',
    'cet': 'Europe/Paris',
    'cest': 'Europe/Paris',
    'ist': 'Asia/Kolkata',
    'sgt': 'Asia/Singapore',
};

// Initialize basic currencies synchronously
function initBasicCurrencies() {
    try {
        // Base currency
        if (!math.Unit.isValuelessUnit('USD')) {
            math.createUnit('USD', { aliases: ['dollar', 'dollars', 'usd'] });
        }
        // Common currencies with approximate rates
        if (!math.Unit.isValuelessUnit('EUR')) {
            math.createUnit('EUR', { definition: '0.92 USD', aliases: ['euro', 'euros', 'eur'] });
        }
        if (!math.Unit.isValuelessUnit('GBP')) {
            math.createUnit('GBP', { definition: '0.79 USD', aliases: ['pound', 'pounds', 'gbp'] });
        }
        if (!math.Unit.isValuelessUnit('JPY')) {
            math.createUnit('JPY', { definition: '0.0067 USD', aliases: ['yen', 'jpy'] });
        }
    } catch (e) {
        console.warn('Failed to init basic currencies:', e);
    }
}

// Initialize CSS units
function initCSSUnits() {
    try {
        // px is base unit for CSS
        if (!math.Unit.isValuelessUnit('px')) {
            math.createUnit('px', { aliases: ['pixel', 'pixels'] });
        }
        // pt = 1/72 inch, and at 96 PPI, 1 inch = 96px, so 1pt = 96/72 px = 1.333px
        if (!math.Unit.isValuelessUnit('pt')) {
            math.createUnit('pt', { definition: '1.333333333 px', aliases: ['point', 'points'] });
        }
        // em defaults to 16px
        if (!math.Unit.isValuelessUnit('em')) {
            math.createUnit('em', { definition: '16 px', aliases: ['ems'] });
        }
        // rem same as em by default
        if (!math.Unit.isValuelessUnit('rem')) {
            math.createUnit('rem', { definition: '16 px', aliases: ['rems'] });
        }
    } catch (e) {
        console.warn('Failed to init CSS units:', e);
    }
}

// Initialize Temperature units
function initTemperatureUnits() {
    try {
        // Fahrenheit
        if (!math.Unit.isValuelessUnit('fahrenheit')) {
            math.createUnit('fahrenheit', { definition: '1 degF', aliases: ['Fahrenheit', 'degF', 'F'] });
        }
        // Celsius
        if (!math.Unit.isValuelessUnit('celsius')) {
            math.createUnit('celsius', { definition: '1 degC', aliases: ['Celsius', 'degC', 'C', 'centigrade'] });
        }
    } catch (e) {
        console.warn('Failed to init temperature units:', e);
    }
}

// Initialize basic currencies immediately
initBasicCurrencies();
initCSSUnits();
initTemperatureUnits();

async function configureCurrencies() {
    if (currenciesConfigured) return;
    if (configurePromise) return configurePromise;
    
    configurePromise = (async () => {
        try {
            // Ensure USD base unit exists first
            try {
                if (!math.Unit.isValuelessUnit('USD')) {
                    math.createUnit('USD', { aliases: ['dollar', 'dollars', 'usd'] });
                }
            } catch (e) {
                // USD already exists, that's fine
            }
            
            // Fetch live rates
            await currencyService.fetchRates();
            const rates = currencyService.getRates();
            
            // Update all available currencies with live rates (except USD which is base)
            for (const [currency, rate] of Object.entries(rates)) {
                if (currency === 'USD') continue; // Skip base currency
                
                try {
                    const aliases = [
                        currency.toLowerCase(),
                        currency.toLowerCase() + 's',
                        currency,
                        currency + 's'
                    ];
                    
                    // Create or override unit based on USD rate
                    // API returns 1 USD = rate * Currency
                    // So 1 Currency = (1 / rate) USD
                    math.createUnit(currency, { 
                        definition: `${1 / rate} USD`, 
                        aliases 
                    }, { override: true });
                } catch (e) {
                    console.warn(`Failed to configure ${currency}:`, e.message);
                }
            }
            
            currenciesConfigured = true;
            console.log('Currencies configured with live rates');
        } catch (e) {
            currenciesConfigured = false;
            console.error('Failed to configure live currencies:', e);
            scheduleCurrencyRetry();
            throw e;
        } finally {
            configurePromise = null;
        }
    })();
    
    return configurePromise;
}

function scheduleCurrencyRetry() {
    if (currencyRetryTimeout) return;
    currencyRetryTimeout = setTimeout(() => {
        currencyRetryTimeout = null;
        configureCurrencies().catch(() => {});
    }, CURRENCY_RETRY_DELAY);
}

export class Calculator {
    constructor() {
        this.scope = {};
        this.ready = configureCurrencies();
    }

    async waitForReady() {
        await this.ready;
    }

    evaluate(text) {
        // Input validation
        if (typeof text !== 'string') {
            return [];
        }

        if (!currenciesConfigured) {
            configureCurrencies().catch(() => {});
        }
        
        // Limit input size to prevent performance issues
        const MAX_INPUT_LENGTH = 100000;
        if (text.length > MAX_INPUT_LENGTH) {
            text = text.substring(0, MAX_INPUT_LENGTH);
        }
        
        const lines = text.split('\n');
        
        // Limit number of lines to prevent performance issues
        const MAX_LINES = 1000;
        if (lines.length > MAX_LINES) {
            lines.length = MAX_LINES;
        }
        const results = [];
        this.scope = {}; // Reset scope
        
        let runningSum = 0;
        let runningCount = 0;
        let previousResult = 0;
        let hasPreviousResult = false;

        lines.forEach((line, index) => {
            let trimmed = line.trim();
            
            if (!trimmed) {
                runningSum = 0;
                runningCount = 0;
                results.push('');
                return;
            }

            // Skip comments (lines starting with #)
            if (trimmed.startsWith('#')) {
                results.push('');
                return;
            }

            // Skip lines starting with //
            if (trimmed.startsWith('//')) {
                results.push('');
                return;
            }

            // Check for timezone query first (e.g., "PST time", "time in Berlin", "New York time")
            const timezoneResult = this._evaluateTimezone(trimmed);
            if (timezoneResult !== null) {
                results.push(this._formatResult(timezoneResult));
                return;
            }

            // Inject dynamic tokens
            this.scope['sum'] = runningSum;
            this.scope['total'] = runningSum;
            // avg/mean might fail if runningSum is Unit and we divide by number?
            // math.divide(10 USD, 2) = 5 USD. It works.
            try {
                this.scope['avg'] = runningCount > 0 ? math.divide(runningSum, runningCount) : 0;
                this.scope['mean'] = runningCount > 0 ? math.divide(runningSum, runningCount) : 0;
            } catch (e) {
                this.scope['avg'] = 0;
                this.scope['mean'] = 0;
            }
            this.scope['prev'] = hasPreviousResult ? previousResult : 0;

            // Clean up trailing result " = ..."
            trimmed = this._removeTrailingResult(trimmed);

            // Check for format modifiers BEFORE date parsing (in hex, in bin, in oct, in sci)
            // This prevents "64 in oct" being interpreted as a date (64 in October)
            let outputFormat = null;
            const formatMatch = trimmed.match(/\s+in\s+(hex|bin|oct|sci|scientific|binary|octal|hexadecimal)\s*$/i);
            if (formatMatch) {
                outputFormat = formatMatch[1].toLowerCase();
                trimmed = trimmed.replace(/\s+in\s+(hex|bin|oct|sci|scientific|binary|octal|hexadecimal)\s*$/i, '');
            }

            // Try Date Math only if not a format conversion
            if (!outputFormat) {
                const dateResult = this._evaluateDate(trimmed);
                if (dateResult !== null) {
                    results.push(this._formatResult(dateResult));
                    return;
                }
            }

            // Preprocess for Natural Language Math
            let processed = this._preprocess(trimmed);

            try {
                // Replace unicode math symbols with standard operators
                processed = processed.replace(/×/g, '*');  // Multiplication sign
                processed = processed.replace(/÷/g, '/');  // Division sign
                processed = processed.replace(/−/g, '-');  // Minus sign (unicode)
                
                // Formatting for mathjs - handle European number format
                // First, handle thousands separator (1.000.000 -> 1000000)
                processed = processed.replace(/(\d)\.(\d{3})(?=[.\s\D]|$)/g, '$1$2');
                // Then, replace decimal comma with dot (0,75 -> 0.75)
                processed = processed.replace(/(\d),(\d)/g, '$1.$2');

                // Check if this line has "in CURRENCY" pattern
                const inCurrencyMatch = trimmed.match(/\s+in\s+([A-Z]{3})\s*$/i);
                let result;
                
                if (inCurrencyMatch) {
                    // Expression like "(5600 + 4%) in EUR"
                    // Remove the "in CURRENCY" part and evaluate the expression first
                    const withoutInClause = processed.replace(/\s+in\s+[A-Z]{3}\s*$/i, '');
                    const currency = inCurrencyMatch[1].toUpperCase();
                    
                    try {
                        const numResult = math.evaluate(withoutInClause, this.scope);
                        
                        // If result is a plain number, attach the currency unit
                        if (typeof numResult === 'number' && !isNaN(numResult)) {
                            result = math.unit(numResult, currency);
                        } else if (numResult && numResult.isUnit) {
                            // If it's already a unit, try to convert it
                            result = numResult.to(currency);
                        } else {
                            // Fallback: just use the number result without unit
                            result = numResult;
                        }
                    } catch (e) {
                        // Log error and try without the in clause
                        console.warn(`Currency conversion failed for "${trimmed}":`, e.message);
                        try {
                            result = math.evaluate(withoutInClause, this.scope);
                        } catch (e2) {
                            throw e; // Re-throw original error
                        }
                    }
                } else {
                    result = math.evaluate(processed, this.scope);
                }
                
                const isInformational = /\b(sum|total|avg|mean)\b/i.test(trimmed);

                if (!isInformational) {
                    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
                        if (runningSum === 0 || typeof runningSum === 'number') {
                            runningSum += result;
                        } else if (runningSum && runningSum.isUnit) {
                            // If runningSum is Unit and result is number, reset sum to number
                            runningSum = result;
                        }
                        runningCount++;
                        previousResult = result;
                        hasPreviousResult = true;
                    } else if (result && result.isUnit) {
                        if (runningSum === 0) {
                            runningSum = result;
                        } else if (runningSum && runningSum.isUnit) {
                            try {
                                runningSum = math.add(runningSum, result);
                            } catch (e) {
                                // Incompatible units (e.g. USD + kg) - start new sum
                                runningSum = result;
                            }
                        } else {
                            // runningSum is number, result is Unit - start new sum
                            runningSum = result;
                        }
                        runningCount++;
                        previousResult = result;
                        hasPreviousResult = true;
                    }
                }
                
                // Apply output format if specified
                if (outputFormat && typeof result === 'number') {
                    result = this._formatWithBase(result, outputFormat);
                }
                
                results.push(this._formatResult(result));
            } catch (e) {
                console.warn(`Evaluation failed for line "${trimmed}":`, e.message);
                results.push('');
            }
        });

        return results;
    }

    _removeTrailingResult(text) {
        // Only remove auto-generated results at the end of a line
        // Auto-generated results look like: "expression = result" where expression contains math
        // We should NOT remove: "$VAR = 2000" (this is an assignment)
        // We SHOULD remove: "5 + 3 = 8" (result appended to expression)
        
        // Check if this is a simple assignment (variable = value with no operators in the value)
        const simpleAssignmentRegex = /^[\$_a-zA-Z][\$_a-zA-Z0-9]*\s*=\s*[\d.,\s]+$/;
        if (simpleAssignmentRegex.test(text)) {
            // This is a simple assignment like "$VAR = 2000", don't strip
            return text;
        }
        
        // Only strip trailing " = number" if there's already math in the expression
        const trailingResultRegex = /\s*=\s*[\d.,\s]+[a-zA-Z%€$£¥]*$/;
        const match = text.match(trailingResultRegex);
        if (match) {
            const partBefore = text.substring(0, match.index);
            // Only strip if the part before contains actual math operators
            // and is not just a variable assignment
            if (partBefore.includes('+') || partBefore.includes('-') || 
                partBefore.includes('*') || partBefore.includes('/') ||
                partBefore.includes('(') || partBefore.includes('%')) {
                return partBefore;
            }
        }
        return text;
    }

    _preprocess(text) {
        // Remove "Label: " prefix (e.g. "Price: $10", "Line 1: $10")
        // Match: word characters, numbers, spaces followed by colon and space
        // Be careful not to match time like "10:30"
        text = text.replace(/^[a-zA-Z][a-zA-Z0-9\s]*:\s*/, '');

        // Handle $VARIABLE_NAME style variables (Numi-style)
        // Convert $VAR_NAME to _VAR_NAME for mathjs compatibility
        // Must be done BEFORE currency symbol handling
        text = text.replace(/\$([A-Z_][A-Z0-9_]*)/gi, '_$1');

        // Handle Currency + Scale combinations FIRST (e.g., "$2k" -> "2000 USD")
        text = text.replace(/\$(\d+(?:\.\d+)?)\s*k\b/gi, (_, num) => String(parseFloat(num) * 1000) + ' USD');
        text = text.replace(/\$(\d+(?:\.\d+)?)\s*M\b/g, (_, num) => String(parseFloat(num) * 1000000) + ' USD');
        text = text.replace(/\$(\d+(?:\.\d+)?)\s*(?:B|billion)\b/gi, (_, num) => String(parseFloat(num) * 1000000000) + ' USD');
        text = text.replace(/€(\d+(?:\.\d+)?)\s*k\b/gi, (_, num) => String(parseFloat(num) * 1000) + ' EUR');
        text = text.replace(/€(\d+(?:\.\d+)?)\s*M\b/g, (_, num) => String(parseFloat(num) * 1000000) + ' EUR');
        text = text.replace(/£(\d+(?:\.\d+)?)\s*k\b/gi, (_, num) => String(parseFloat(num) * 1000) + ' GBP');
        text = text.replace(/£(\d+(?:\.\d+)?)\s*M\b/g, (_, num) => String(parseFloat(num) * 1000000) + ' GBP');

        // Handle scales: k (thousands), M (millions), B (billions)
        text = text.replace(/(\d+(?:\.\d+)?)\s*k\b/gi, (_, num) => String(parseFloat(num) * 1000));
        text = text.replace(/(\d+(?:\.\d+)?)\s*M\b/g, (_, num) => String(parseFloat(num) * 1000000));
        text = text.replace(/(\d+(?:\.\d+)?)\s*(?:B|billion|billions)\b/gi, (_, num) => String(parseFloat(num) * 1000000000));
        text = text.replace(/(\d+(?:\.\d+)?)\s*(?:thousand|thousands)\b/gi, (_, num) => String(parseFloat(num) * 1000));
        text = text.replace(/(\d+(?:\.\d+)?)\s*(?:million|millions)\b/gi, (_, num) => String(parseFloat(num) * 1000000));

        // Handle Currency Symbols (after scales)
        // "$10" -> "10 USD" (only when $ is followed by a number)
        text = text.replace(/\$(\d+(?:[.,]\d+)?)/g, '$1 USD');
        // "€10" -> "10 EUR"
        text = text.replace(/€(\d+(?:[.,]\d+)?)/g, '$1 EUR');
        // "£10" -> "10 GBP"
        text = text.replace(/£(\d+(?:[.,]\d+)?)/g, '$1 GBP');

        // Handle "tea spoons" -> "teaspoons"
        text = text.replace(/tea\s+spoons/gi, 'teaspoons');
        text = text.replace(/table\s+spoons/gi, 'tablespoons');

        // Handle cubic/square units: "cu cm" -> "cm^3", "cubic inches" -> "inch^3", "sq m" -> "m^2"
        // Volume: cu, cubic, cb
        text = text.replace(/\b(?:cu|cb)\s*(m|cm|mm|km|ft|feet|foot|in|inch|inches|yd|yard|yards|mi|mile|miles)\b/gi, (_, unit) => {
            // Normalize unit names
            let normalizedUnit = unit.toLowerCase();
            if (normalizedUnit === 'feet' || normalizedUnit === 'foot') normalizedUnit = 'ft';
            if (normalizedUnit === 'inches') normalizedUnit = 'inch';
            if (normalizedUnit === 'yards') normalizedUnit = 'yard';
            if (normalizedUnit === 'miles') normalizedUnit = 'mile';
            return normalizedUnit + '^3';
        });
        text = text.replace(/\bcubic\s+(meter|meters|metre|metres|centimeter|centimeters|millimeter|millimeters|kilometer|kilometers|foot|feet|inch|inches|yard|yards|mile|miles|m|cm|mm|km|ft|in|yd|mi)\b/gi, (_, unit) => {
            let normalizedUnit = unit.toLowerCase();
            if (normalizedUnit === 'meters' || normalizedUnit === 'metre' || normalizedUnit === 'metres') normalizedUnit = 'm';
            if (normalizedUnit === 'centimeters' || normalizedUnit === 'centimeter') normalizedUnit = 'cm';
            if (normalizedUnit === 'millimeters' || normalizedUnit === 'millimeter') normalizedUnit = 'mm';
            if (normalizedUnit === 'kilometers' || normalizedUnit === 'kilometer') normalizedUnit = 'km';
            if (normalizedUnit === 'feet' || normalizedUnit === 'foot') normalizedUnit = 'ft';
            if (normalizedUnit === 'inches') normalizedUnit = 'inch';
            if (normalizedUnit === 'yards') normalizedUnit = 'yard';
            if (normalizedUnit === 'miles') normalizedUnit = 'mile';
            return normalizedUnit + '^3';
        });
        // cbm = cubic meters
        text = text.replace(/\bcbm\b/gi, 'm^3');

        // Area: sq, square
        text = text.replace(/\b(?:sq)\s*(m|cm|mm|km|ft|feet|foot|in|inch|inches|yd|yard|yards|mi|mile|miles)\b/gi, (_, unit) => {
            let normalizedUnit = unit.toLowerCase();
            if (normalizedUnit === 'feet' || normalizedUnit === 'foot') normalizedUnit = 'ft';
            if (normalizedUnit === 'inches') normalizedUnit = 'inch';
            if (normalizedUnit === 'yards') normalizedUnit = 'yard';
            if (normalizedUnit === 'miles') normalizedUnit = 'mile';
            return normalizedUnit + '^2';
        });
        text = text.replace(/\bsquare\s+(meter|meters|metre|metres|centimeter|centimeters|millimeter|millimeters|kilometer|kilometers|foot|feet|inch|inches|yard|yards|mile|miles|m|cm|mm|km|ft|in|yd|mi)\b/gi, (_, unit) => {
            let normalizedUnit = unit.toLowerCase();
            if (normalizedUnit === 'meters' || normalizedUnit === 'metre' || normalizedUnit === 'metres') normalizedUnit = 'm';
            if (normalizedUnit === 'centimeters' || normalizedUnit === 'centimeter') normalizedUnit = 'cm';
            if (normalizedUnit === 'millimeters' || normalizedUnit === 'millimeter') normalizedUnit = 'mm';
            if (normalizedUnit === 'kilometers' || normalizedUnit === 'kilometer') normalizedUnit = 'km';
            if (normalizedUnit === 'feet' || normalizedUnit === 'foot') normalizedUnit = 'ft';
            if (normalizedUnit === 'inches') normalizedUnit = 'inch';
            if (normalizedUnit === 'yards') normalizedUnit = 'yard';
            if (normalizedUnit === 'miles') normalizedUnit = 'mile';
            return normalizedUnit + '^2';
        });
        // sqm = square meters
        text = text.replace(/\bsqm\b/gi, 'm^2');

        // Handle "in CURRENCY" operations
        // If left side is a number (not a unit), treat it as already being in that currency
        // "(5600 + 4%) in EUR" -> "(5600 + 4%) EUR" (attach currency unit)
        // "10 USD in EUR" -> "(10 USD to EUR)" (convert between currencies)
        // We used to uppercase here, but now we define currency aliases in lowercase too,
        // so we can leave the unit as is to support case-sensitive units like 'celsius'.
        // text = text.replace(/\s+in\s+([a-zA-Z_$]+)/gi, (match, unit) => {
        //    return ` in ${unit.toUpperCase()}`;
        // });

        // Natural language operators (order matters - longer phrases first)
        text = text.replace(/\s+multiplied\s+by\s+/gi, ' * ');
        text = text.replace(/\s+divided\s+by\s+/gi, ' / ');
        text = text.replace(/\s+divide\s+by\s+/gi, ' / ');
        text = text.replace(/\s+divide\s+/gi, ' / ');
        text = text.replace(/\s+times\s+/gi, ' * ');
        text = text.replace(/\s+mul\s+/gi, ' * ');
        text = text.replace(/\s+plus\s+/gi, ' + ');
        text = text.replace(/\s+and\s+/gi, ' + ');
        text = text.replace(/\s+with\s+/gi, ' + ');
        text = text.replace(/\s+minus\s+/gi, ' - ');
        text = text.replace(/\s+subtract\s+/gi, ' - ');
        text = text.replace(/\s+without\s+/gi, ' - ');

        // "X% of what is Y" -> "Y / X%"
        // Regex: (Percentage) of what is (Value)
        // MUST BE BEFORE "X% of Y" to avoid conflict
        text = text.replace(/(\d+(?:\.\d+)?%)\s+of\s+what\s+is\s+(.+)/i, '($2) / $1');

        // "X% on what is Y" -> solve for base where base + X% = Y
        // If 5% on what is 105, then base = 105 / 1.05 = 100
        text = text.replace(/(\d+(?:\.\d+)?)%\s+on\s+what\s+is\s+(.+)/i, (_, pct, value) => {
            return `(${value}) / (1 + ${pct}/100)`;
        });

        // "X% off what is Y" -> solve for base where base - X% = Y
        // If 5% off what is 95, then base = 95 / 0.95 = 100
        text = text.replace(/(\d+(?:\.\d+)?)%\s+off\s+what\s+is\s+(.+)/i, (_, pct, value) => {
            return `(${value}) / (1 - ${pct}/100)`;
        });

        // "X% on Y" -> Y + X% of Y = Y * (1 + X/100)
        text = text.replace(/(\d+(?:\.\d+)?)%\s+on\s+(.+)/i, (_, pct, value) => {
            return `(${value}) * (1 + ${pct}/100)`;
        });

        // "X% off Y" -> Y - X% of Y = Y * (1 - X/100)
        text = text.replace(/(\d+(?:\.\d+)?)%\s+off\s+(.+)/i, (_, pct, value) => {
            return `(${value}) * (1 - ${pct}/100)`;
        });

        // "X as a % of Y" -> (X / Y) * 100
        text = text.replace(/(.+?)\s+as\s+a?\s*%\s+of\s+(.+)/i, (_, x, y) => {
            return `((${x}) / (${y})) * 100`;
        });

        // "X as a % on Y" -> ((X - Y) / Y) * 100 (percentage increase)
        text = text.replace(/(.+?)\s+as\s+a?\s*%\s+on\s+(.+)/i, (_, x, y) => {
            return `(((${x}) - (${y})) / (${y})) * 100`;
        });

        // "X as a % off Y" -> ((Y - X) / Y) * 100 (percentage decrease)
        text = text.replace(/(.+?)\s+as\s+a?\s*%\s+off\s+(.+)/i, (_, x, y) => {
            return `(((${y}) - (${x})) / (${y})) * 100`;
        });

        // "X% of Y" -> "X% * Y"
        text = text.replace(/(\d+(?:\.\d+)?%)\s+of\s+(.+)/i, '$1 * ($2)');
        
        // Remove trailing descriptive words AFTER percentage operations are handled
        // (e.g., "5% discount" -> "5%", "prev - 5% discount" -> "prev - 5%")
        // Don't remove "off" as it's used in percentage operations
        text = text.replace(/(\d+%)\s+(?:discount|fee|tax|tip|markup|margin|bonus|interest|rate|increase|decrease|reduction|savings)\b/gi, '$1');
        
        return text;
    }


    _preprocessHolidayKeywords(text) {
        // Replace common holiday keywords with actual dates
        const currentYear = new Date().getFullYear();
        const lowerText = text.toLowerCase();
        
        const holidays = {
            'christmas': `December 25, ${currentYear}`,
            'xmas': `December 25, ${currentYear}`,
            'new year': `January 1, ${currentYear + 1}`,
            'new years': `January 1, ${currentYear + 1}`,
            'halloween': `October 31, ${currentYear}`,
            'thanksgiving': `November 28, ${currentYear}`, // Approximate, 4th Thursday of Nov
            'easter': `April 20, ${currentYear}`, // Approximate
        };
        
        for (const [keyword, replacement] of Object.entries(holidays)) {
            // Use word boundary to avoid partial matches
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            if (regex.test(lowerText)) {
                // Replace the keyword while preserving the rest of the expression
                text = text.replace(regex, replacement);
                break; // Only replace one keyword per call
            }
        }
        
        return text;
    }

    _evaluateDate(text) {
        // Check for date math: "Date + Duration" or "Date - Duration" or just "Date"
        // We use chrono to parse the date part.
        
        // Preprocess holiday keywords first
        text = this._preprocessHolidayKeywords(text);
        
        // Check for "UNIT until DATE" pattern (e.g., "days until christmas", "weeks until new year")
        const untilMatch = text.match(/^(days?|weeks?|months?|hours?|minutes?)\s+(?:until|to|till|before)\s+(.+)$/i);
        if (untilMatch) {
            const unit = untilMatch[1].toLowerCase();
            const dateText = untilMatch[2];
            const targetDate = chrono.parseDate(dateText);
            if (targetDate) {
                const now = new Date();
                const diffMs = targetDate.getTime() - now.getTime();
                
                // Convert to appropriate unit
                let divisor;
                switch (unit) {
                    case 'day':
                    case 'days':
                        divisor = 1000 * 60 * 60 * 24;
                        break;
                    case 'week':
                    case 'weeks':
                        divisor = 1000 * 60 * 60 * 24 * 7;
                        break;
                    case 'month':
                    case 'months':
                        divisor = 1000 * 60 * 60 * 24 * 30; // Approximate
                        break;
                    case 'hour':
                    case 'hours':
                        divisor = 1000 * 60 * 60;
                        break;
                    case 'minute':
                    case 'minutes':
                        divisor = 1000 * 60;
                        break;
                    default:
                        divisor = 1000 * 60 * 60 * 24; // Default to days
                }
                
                const result = Math.ceil(diffMs / divisor);
                return result; // Return as number (will be formatted nicely)
            }
        }
        
        // First, try to see if the whole string is a date (e.g. "next friday")
        const parsedDate = chrono.parseDate(text);
        if (parsedDate && text.trim().length < 50) { // Sanity check length
             // If it's just a date, return formatted date
             // But wait, "next friday + 2 weeks" might parse "next friday" as date and ignore "+ 2 weeks"
             // We need to check if there is a math operation.
             // If no math operation is detected later, we should return this.
             // But let's check for math operators first to be safe.
             if (!/[+-]/.test(text)) {
                 return parsedDate;
             }
        }

        // Regex for Date +/- Duration
        // We look for a split by + or -
        const mathMatch = text.match(/^(.*?)\s*([+-])\s*(.*?)$/);
        if (mathMatch) {
            const [_, left, op, right] = mathMatch;
            const date = chrono.parseDate(left);
            if (date) {
                // Try to parse right side as duration using mathjs
                try {
                    // "2 weeks" -> unit
                    const durationUnit = math.unit(right);
                    const durationMs = durationUnit.to('milliseconds').toNumber();
                    
                    let newTime = date.getTime();
                    if (op === '+') newTime += durationMs;
                    if (op === '-') newTime -= durationMs;
                    
                    return new Date(newTime);
                } catch (e) {
                    // Not a valid duration, maybe just normal math?
                }
            }
        }

        // Just a date?
        // Only if it parses fully or we want to show the date
        // "next friday"
        const results = chrono.parse(text);
        if (results.length > 0) {
            const result = results[0];
            // If the match covers most of the text
            if (result.text.length > text.length * 0.8) {
                return result.start.date();
            }
        }

        return null;
    }


    _formatResult(result) {
        if (result === undefined || result === null || typeof result === 'function') {
            return '';
        }
        
        let formatted = '';
        
        // Handle timezone results
        if (result && result.type === 'time') {
            const options = {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            };
            if (result.timezone) {
                options.timeZone = result.timezone;
                options.timeZoneName = 'short';
            }
            formatted = new Intl.DateTimeFormat('en-US', options).format(result.date);
        } else if (result && result.type === 'timeConversion') {
            // Format time in target timezone
            const options = {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: result.toTimezone,
                timeZoneName: 'short'
            };
            formatted = new Intl.DateTimeFormat('en-US', options).format(result.date);
        } else if (typeof result === 'number') {
            if (!isFinite(result)) {
                return result === Infinity ? '∞' : result === -Infinity ? '-∞' : '';
            }
            // Format the number with separators first
            const fullFormatted = new Intl.NumberFormat('it-IT', { 
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
                useGrouping: true 
            }).format(result);
            
            // If too long (more than ~15 chars), use scientific notation
            if (fullFormatted.length > 15) {
                formatted = result.toExponential(2);
            } else {
                formatted = fullFormatted;
            }
        } else if (result && result.isUnit) {
            // Check if it's a currency unit
            const unitName = result.units[0]?.unit?.name;
            
            const currencySymbols = {
                'EUR': '€',
                'USD': '$',
                'GBP': '£',
                'JPY': '¥',
                'CHF': 'CHF',
                'CAD': 'CA$',
                'AUD': 'A$'
            };
            
            if (unitName && currencySymbols[unitName]) {
                const value = result.toNumber(unitName);
                // Format as currency with Italian number formatting
                const formattedNumber = new Intl.NumberFormat('it-IT', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                    useGrouping: true
                }).format(value);
                
                formatted = `${currencySymbols[unitName]} ${formattedNumber}`;
            } else {
                // Format other units nicely
                formatted = result.format({ precision: 4 });
                
                // Prettify units
                formatted = formatted.replace(/\^2/g, '²');
                formatted = formatted.replace(/\^3/g, '³');
                formatted = formatted.replace(/\binch\b/g, '″');
                formatted = formatted.replace(/\bdeg\b/g, '°');
            }
        } else if (result instanceof Date) {
            formatted = this._formatDate(result);
        } else if (typeof result === 'string' && result.startsWith('sci:')) {
            // Scientific notation result
            formatted = result.substring(4);
        } else {
            formatted = result.toString();
        }

        // Apply purple color
        return `<span class="text-blue-600 dark:text-blue-400 font-medium">${formatted}</span>`;
    }

    _formatDate(date) {
        // 8/14/15 format from screenshot
        return new Intl.DateTimeFormat('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: '2-digit'
        }).format(date);
    }

    _evaluateTimezone(text) {
        const lowerText = text.toLowerCase().trim();
        
        // Pattern: "LOCATION time" or "time in LOCATION" or just "time" or "now"
        // Also: "2:30 pm HKT in Berlin" (time conversion)
        
        // Check for simple "time" or "now"
        if (lowerText === 'time' || lowerText === 'now') {
            return { type: 'time', date: new Date(), timezone: null };
        }
        
        // Pattern: "LOCATION time" (e.g., "PST time", "New York time", "Berlin time")
        const locationTimeMatch = lowerText.match(/^(.+?)\s+time$/);
        if (locationTimeMatch) {
            const location = locationTimeMatch[1].trim();
            const tz = TIMEZONE_MAP[location];
            if (tz) {
                return { type: 'time', date: new Date(), timezone: tz };
            }
        }
        
        // Pattern: "time in LOCATION" (e.g., "time in Madrid", "time in Tokyo")
        const timeInMatch = lowerText.match(/^(?:time|now)\s+in\s+(.+)$/);
        if (timeInMatch) {
            const location = timeInMatch[1].trim();
            const tz = TIMEZONE_MAP[location];
            if (tz) {
                return { type: 'time', date: new Date(), timezone: tz };
            }
        }
        
        // Pattern: "TIME TIMEZONE in LOCATION" (e.g., "2:30 pm HKT in Berlin")
        const timeConversionMatch = text.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+(\w+)\s+in\s+(.+)$/i);
        if (timeConversionMatch) {
            const timeStr = timeConversionMatch[1];
            const fromTz = timeConversionMatch[2].toLowerCase();
            const toLocation = timeConversionMatch[3].toLowerCase().trim();
            
            const fromTimezone = TIMEZONE_MAP[fromTz];
            const toTimezone = TIMEZONE_MAP[toLocation];
            
            if (fromTimezone && toTimezone) {
                // Parse the time
                const parsedTime = this._parseTime(timeStr);
                if (parsedTime) {
                    const utcDate = this._convertLocalTimeToUtc(parsedTime, fromTimezone);
                    if (utcDate) {
                        return { 
                            type: 'timeConversion', 
                            date: utcDate, 
                            fromTimezone, 
                            toTimezone 
                        };
                    }
                }
            }
        }
        
        return null;
    }

    _parseTime(timeStr) {
        // Parse time like "2:30 pm", "14:30", "2pm"
        const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
        if (!match) return null;
        
        let hours = parseInt(match[1], 10);
        const minutes = match[2] ? parseInt(match[2], 10) : 0;
        const period = match[3]?.toLowerCase();
        
        if (period === 'pm' && hours !== 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;
        
        return { hours, minutes };
    }

    _convertLocalTimeToUtc(parsedTime, fromTimezone) {
        if (!parsedTime || !fromTimezone) {
            return null;
        }

        try {
            const reference = new Date();
            const approxUtc = Date.UTC(
                reference.getFullYear(),
                reference.getMonth(),
                reference.getDate(),
                parsedTime.hours,
                parsedTime.minutes,
                0,
                0
            );
            const guessDate = new Date(approxUtc);
            const offsetMinutes = getTimezoneOffsetMinutes(guessDate, fromTimezone);
            return new Date(guessDate.getTime() - offsetMinutes * 60000);
        } catch (e) {
            console.warn('Failed timezone conversion:', e.message);
            return null;
        }
    }

    _formatWithBase(num, format) {
        const intNum = Math.round(num);
        switch (format) {
            case 'hex':
            case 'hexadecimal':
                return `0x${intNum.toString(16).toUpperCase()}`;
            case 'bin':
            case 'binary':
                return `0b${intNum.toString(2)}`;
            case 'oct':
            case 'octal':
                return `0o${intNum.toString(8)}`;
            case 'sci':
            case 'scientific':
                return num.toExponential(2);
            default:
                return num;
        }
    }
}

function getTimezoneOffsetMinutes(date, timeZone) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const filled = {};
    for (const { type, value } of parts) {
        if (type !== 'literal') {
            filled[type] = value;
        }
    }
    const asUTC = Date.UTC(
        Number(filled.year),
        Number(filled.month) - 1,
        Number(filled.day),
        Number(filled.hour),
        Number(filled.minute),
        Number(filled.second ?? '0')
    );
    return (asUTC - date.getTime()) / 60000;
}
