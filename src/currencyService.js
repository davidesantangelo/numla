// Currency Service - Fetch and cache exchange rates
// Note: HexaRate requires ?target parameter, but we can also just get all available rates
const HEXARATE_API = 'https://api.exchangerate-api.com/v4/latest/USD'; // Free alternative with no API key needed
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Default fallback rates (approximate)
const FALLBACK_RATES = {
    USD: 1,
    EUR: 0.95,
    GBP: 0.79,
};

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
            try {
                const response = await fetch(HEXARATE_API);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                // ExchangeRate-API returns: { rates: { EUR: 0.95, ... } }
                if (data && data.rates) {
                    this.rates = { USD: 1, ...data.rates };
                    this.lastFetch = Date.now();
                    console.log('Currency rates updated from ExchangeRate-API');
                } else {
                    throw new Error('Invalid API response format');
                }
            } catch (error) {
                console.warn('Failed to fetch currency rates, using fallback:', error.message);
                this.rates = { ...FALLBACK_RATES };
            } finally {
                this.fetchPromise = null;
            }
            return this.rates;
        })();

        return this.fetchPromise;
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
