import { create, all } from 'mathjs';
import * as chrono from 'chrono-node';
import { currencyService } from './currencyService.js';

const math = create(all);

// Initialize currency service and configure units
let currenciesConfigured = false;

async function configureCurrencies() {
    if (currenciesConfigured) return;
    
    try {
        // Fetch live rates
        await currencyService.fetchRates();
        const rates = currencyService.getRates();
        
        // Base currency
        math.createUnit('USD', { aliases: ['dollar', 'dollars', 'usd'] });
        
        // Configure all available currencies with live rates
        for (const [currency, rate] of Object.entries(rates)) {
            if (currency === 'USD') continue; // Skip base currency
            
            try {
                const aliases = [
                    currency.toLowerCase(),
                    currency.toLowerCase() + 's',
                    currency,
                    currency + 's'
                ];
                
                // Create unit based on USD rate
                // API returns 1 USD = rate * Currency
                // So 1 Currency = (1 / rate) USD
                math.createUnit(currency, { 
                    definition: `${1 / rate} USD`, 
                    aliases 
                });
            } catch (e) {
                // Unit might already exist, ignore
            }
        }
        
        // Custom units
        if (!math.Unit.isValuelessUnit('tsp')) {
            math.createUnit('tsp', { definition: '4.92892 ml', aliases: ['teaspoon', 'teaspoons'] }, { override: true });
        }
        
        currenciesConfigured = true;
        console.log('Currencies configured with live rates');
    } catch (e) {
        console.error('Failed to configure currencies:', e);
        // Fallback to basic configuration
        math.createUnit('USD', { aliases: ['dollar', 'dollars', 'usd'] });
        math.createUnit('EUR', { definition: '1.05 USD', aliases: ['euro', 'euros', 'Euro', 'Euros', 'eur'] }); // Approx
        math.createUnit('GBP', { definition: '1.26 USD', aliases: ['pound', 'pounds', 'Pound', 'Pounds', 'gbp'] }); // Approx
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
        const lines = text.split('\n');
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
                // Formatting for mathjs
                processed = processed.replace(/(\d)\.(\d{3})/g, '$1$2'); // Remove thousands separator
                processed = processed.replace(/(\d),(\d)/g, '$1.$2');   // Replace decimal separator

                const result = math.evaluate(processed, this.scope);
                
                const isInformational = /\b(sum|total|avg|mean)\b/i.test(trimmed);

                if (!isInformational) {
                    if (typeof result === 'number' && !isNaN(result)) {
                        if (runningSum === 0 || typeof runningSum === 'number') {
                            runningSum += result;
                        } else {
                            // If runningSum is Unit and result is number, we can't add easily.
                            // For now, ignore or reset? 
                            // Numi behavior: usually keeps running sum if possible.
                            // If we add number to unit, mathjs fails.
                            // Let's just ignore this number for the sum?
                        }
                        runningCount++;
                        previousResult = result;
                        hasPreviousResult = true;
                    } else if (result && result.isUnit) {
                        if (runningSum === 0) {
                            runningSum = result;
                        } else {
                            try {
                                runningSum = math.add(runningSum, result);
                            } catch (e) {
                                // Incompatible units (e.g. USD + kg)
                                // Start new sum? Or ignore?
                                // Let's ignore to be safe.
                            }
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
        const trailingResultRegex = /\s*=\s*[\d.,\s]+[a-zA-Z%]*$/; // Expanded to catch units/dates potentially
        const match = text.match(trailingResultRegex);
        if (match) {
            const partBefore = text.substring(0, match.index);
            if (!partBefore.includes('=')) {
                 // Avoid stripping if it's an equation assignment like "x = 10"
                 // But "x = 10" is assignment, " = 10" is result.
                 // If the line is just "x = 10", match.index might be after x.
                 // We want to strip only if it looks like an auto-generated result.
                 // Simple heuristic: if the part before is valid code, keep it.
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

        // Handle Currency Symbols
        // "$10" -> "10 USD"
        text = text.replace(/\$(\d+(?:\.\d+)?)/g, '$1 USD');
        // "€10" -> "10 EUR"
        text = text.replace(/€(\d+(?:\.\d+)?)/g, '$1 EUR');
        // "£10" -> "10 GBP"
        text = text.replace(/£(\d+(?:\.\d+)?)/g, '$1 GBP');

        // Handle "tea spoons" -> "teaspoons"
        text = text.replace(/tea\s+spoons/gi, 'teaspoons');

        // Wrap "in" operations in parentheses to enforce precedence
        // "sum in USD - 4%" -> "(sum in USD) - 4%"
        // "4 GBP in Euro" -> "(4 GBP in Euro)"
        // Regex: (Content) in (Unit)
        // We assume Unit is a single word (after tea spoons replacement)
        text = text.replace(/(.+?)\s+in\s+([a-zA-Z_$]+)/gi, '($1 in $2)');

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
            formatted = new Intl.NumberFormat('it-IT', { 
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
                useGrouping: true 
            }).format(result);
        } else if (result && result.isUnit) {
            // Format unit nicely
            formatted = result.format({ precision: 4 }); // Use mathjs formatting
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
