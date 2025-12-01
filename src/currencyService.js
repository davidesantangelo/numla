// Currency Service - Fetch and cache exchange rates
// Note: HexaRate requires ?target parameter, but we can also just get all available rates
const HEXARATE_API = 'https://api.exchangerate-api.com/v4/latest/USD'; // Free alternative with no API key needed
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const FETCH_TIMEOUT = 10000; // 10 seconds timeout
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second between retries

// Default fallback rates (approximate)
const FALLBACK_RATES = {
    USD: 1,
    EUR: 0.95,
    GBP: 0.79,
    JPY: 150.0,
    CAD: 1.35,
    AUD: 1.52,
    CHF: 0.88,
};

// Helper function for fetch with timeout
async function fetchWithTimeout(url, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class CurrencyService {
    constructor() {
        this.rates = { ...FALLBACK_RATES };
        this.lastFetch = null;
        this.fetchPromise = null;
    }

    async fetchRates() {
        // Check if we have a fetch in progress
        if (this.fetchPromise) {
            return this.fetchPromise;
        }

        // Check if cache is still valid
        if (this.lastFetch && Date.now() - this.lastFetch < CACHE_DURATION) {
            return this.rates;
        }

        this.fetchPromise = (async () => {
            let lastError = null;
            
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                    const response = await fetchWithTimeout(HEXARATE_API, FETCH_TIMEOUT);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    
                    // ExchangeRate-API returns: { rates: { EUR: 0.95, ... } }
                    if (data && data.rates && typeof data.rates === 'object') {
                        // Validate rates data
                        const validRates = { USD: 1 };
                        for (const [currency, rate] of Object.entries(data.rates)) {
                            if (typeof rate === 'number' && rate > 0 && isFinite(rate)) {
                                validRates[currency] = rate;
                            }
                        }
                        this.rates = validRates;
                        this.lastFetch = Date.now();
                        console.log('Currency rates updated from ExchangeRate-API');
                        return this.rates;
                    } else {
                        throw new Error('Invalid API response format');
                    }
                } catch (error) {
                    lastError = error;
                    console.warn(`Fetch attempt ${attempt + 1} failed:`, error.message);
                    
                    // Don't delay on last attempt
                    if (attempt < MAX_RETRIES - 1) {
                        await delay(RETRY_DELAY * (attempt + 1)); // Exponential backoff
                    }
                }
            }
            
            console.warn('All fetch attempts failed, using fallback rates:', lastError?.message);
            this.rates = { ...FALLBACK_RATES };
            return this.rates;
        })();
        
        try {
            return await this.fetchPromise;
        } finally {
            this.fetchPromise = null;
        }
    }

    getRates() {
        return this.rates;
    }

    getRate(currency) {
        return this.rates[currency.toUpperCase()] || null;
    }
}

// Singleton instance
export const currencyService = new CurrencyService();
