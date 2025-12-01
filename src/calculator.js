import { create, all } from 'mathjs';
import * as chrono from 'chrono-node';
import { currencyService } from './currencyService.js';

const math = create(all);

// Initialize currency service and configure units
let currenciesConfigured = false;

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

// Initialize basic currencies immediately
initBasicCurrencies();

async function configureCurrencies() {
    if (currenciesConfigured) return;
    
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
        
        // Custom units
        if (!math.Unit.isValuelessUnit('tsp')) {
            math.createUnit('tsp', { definition: '4.92892 ml', aliases: ['teaspoon', 'teaspoons'] }, { override: true });
        }
        
        currenciesConfigured = true;
        console.log('Currencies configured with live rates');
    } catch (e) {
        console.error('Failed to configure live currencies:', e);
        currenciesConfigured = true; // Mark as configured even with fallback
    }
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

            // Try Date Math first
            const dateResult = this._evaluateDate(trimmed);
            if (dateResult !== null) {
                results.push(this._formatResult(dateResult));
                return;
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
        // Remove "Label: " prefix (e.g. "Price: $10")
        // Be careful not to match "10:30" (time) or "10 / 2" (if colon used for division? No)
        // Heuristic: Start of line, text, colon, space.
        text = text.replace(/^[a-zA-Z\s]+:\s*/, '');

        // Handle $VARIABLE_NAME style variables (Numi-style)
        // Convert $VAR_NAME to _VAR_NAME for mathjs compatibility
        // Must be done BEFORE currency symbol handling
        text = text.replace(/\$([A-Z_][A-Z0-9_]*)/gi, '_$1');

        // Handle Currency Symbols
        // "$10" -> "10 USD" (only when $ is followed by a number)
        text = text.replace(/\$(\d+(?:[.,]\d+)?)/g, '$1 USD');
        // "€10" -> "10 EUR"
        text = text.replace(/€(\d+(?:[.,]\d+)?)/g, '$1 EUR');
        // "£10" -> "10 GBP"
        text = text.replace(/£(\d+(?:[.,]\d+)?)/g, '$1 GBP');

        // Handle "tea spoons" -> "teaspoons"
        text = text.replace(/tea\s+spoons/gi, 'teaspoons');

        // Handle "in CURRENCY" operations
        // If left side is a number (not a unit), treat it as already being in that currency
        // "(5600 + 4%) in EUR" -> "(5600 + 4%) EUR" (attach currency unit)
        // "10 USD in EUR" -> "(10 USD to EUR)" (convert between currencies)
        // We'll do this transformation after evaluation, not here
        // For now, just uppercase the currency code
        text = text.replace(/\s+in\s+([a-zA-Z_$]+)/gi, (match, unit) => {
            return ` in ${unit.toUpperCase()}`;
        });

        // "X% of what is Y" -> "Y / X%"
        // Regex: (Percentage) of what is (Value)
        // MUST BE BEFORE "X% of Y" to avoid conflict
        text = text.replace(/(\d+(?:\.\d+)?%)\s+of\s+what\s+is\s+(.+)/i, '($2) / $1');

        // "X% of Y" -> "X% * Y"
        text = text.replace(/(\d+(?:\.\d+)?%)\s+of\s+(.+)/i, '$1 * ($2)');
        
        return text;
    }

    _evaluateDate(text) {
        // Check for date math: "Date + Duration" or "Date - Duration" or just "Date"
        // We use chrono to parse the date part.
        
        // First, try to see if the whole string is a date (e.g. "next friday")
        const parsedDate = chrono.parseDate(text);
        if (parsedDate && text.trim().length < 50) { // Sanity check length
             // If it's just a date, return formatted date
             // But wait, "next friday + 2 weeks" might parse "next friday" as date and ignore "+ 2 weeks"
             // We need to check if there is a math operation.
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
        if (typeof result === 'number') {
            if (!isFinite(result)) {
                return result === Infinity ? '∞' : result === -Infinity ? '-∞' : '';
            }
            formatted = new Intl.NumberFormat('it-IT', { 
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
                useGrouping: true 
            }).format(result);
        } else if (result && result.isUnit) {
            // Check if it's a currency unit
            const unitName = result.units[0]?.unit?.name;
            const value = result.toNumber(unitName);
            
            const currencySymbols = {
                'EUR': '€',
                'USD': '$',
                'GBP': '£',
                'JPY': '¥',
                'CHF': 'CHF',
                'CAD': 'CA$',
                'AUD': 'A$'
            };
            
            if (currencySymbols[unitName]) {
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
            }
        } else if (result instanceof Date) {
            formatted = this._formatDate(result);
        } else {
            formatted = result.toString();
        }

        // Apply purple color
        return `<span class="text-purple-400 font-medium">${formatted}</span>`;
    }

    _formatDate(date) {
        // 8/14/15 format from screenshot
        return new Intl.DateTimeFormat('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: '2-digit'
        }).format(date);
    }
}
