/**
 * Currency Service Test Suite
 * Tests for exchange rate fetching and caching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// We need to re-import the module for each test to reset state
describe('CurrencyService', () => {
    let currencyService;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();
        
        // Default successful response
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                rates: {
                    EUR: 0.92,
                    GBP: 0.79,
                    JPY: 150.0,
                    CAD: 1.35
                }
            })
        });
        
        // Re-import to get fresh instance
        const module = await import('../src/currencyService.js');
        currencyService = module.currencyService;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('fetchRates', () => {
        it('should fetch rates from API', async () => {
            await currencyService.fetchRates();
            
            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('exchangerate-api.com'),
                expect.any(Object)
            );
        });

        it('should return rates object', async () => {
            const rates = await currencyService.fetchRates();
            
            expect(rates).toHaveProperty('USD', 1);
            expect(rates).toHaveProperty('EUR');
            expect(rates).toHaveProperty('GBP');
        });

        it('should cache rates and not refetch immediately', async () => {
            await currencyService.fetchRates();
            await currencyService.fetchRates();
            
            // Should only fetch once due to caching
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('should use fallback rates on fetch failure', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));
            
            const rates = await currencyService.fetchRates();
            
            expect(rates).toHaveProperty('USD', 1);
            expect(rates).toHaveProperty('EUR');
        });

        it('should handle HTTP errors', async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                status: 500
            });
            
            const rates = await currencyService.fetchRates();
            
            // Should fall back to default rates
            expect(rates).toHaveProperty('USD', 1);
        });

        it('should validate rate values', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    rates: {
                        EUR: 0.92,
                        INVALID: -1, // Invalid negative rate
                        ALSO_INVALID: 'string', // Invalid type
                        INFINITY: Infinity // Invalid Infinity
                    }
                })
            });
            
            const rates = await currencyService.fetchRates();
            
            expect(rates).toHaveProperty('EUR', 0.92);
            expect(rates).not.toHaveProperty('INVALID');
            expect(rates).not.toHaveProperty('ALSO_INVALID');
            expect(rates).not.toHaveProperty('INFINITY');
        });

        it('should handle invalid API response format', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    // Missing 'rates' property
                    data: {}
                })
            });
            
            const rates = await currencyService.fetchRates();
            
            // Should use fallback
            expect(rates).toHaveProperty('USD', 1);
        });
    });

    describe('getRates', () => {
        it('should return current rates', () => {
            const rates = currencyService.getRates();
            
            expect(rates).toBeDefined();
            expect(typeof rates).toBe('object');
        });
    });

    describe('getRate', () => {
        it('should return specific currency rate', async () => {
            await currencyService.fetchRates();
            
            const eurRate = currencyService.getRate('EUR');
            expect(eurRate).toBe(0.92);
        });

        it('should be case-insensitive', async () => {
            await currencyService.fetchRates();
            
            const rate1 = currencyService.getRate('EUR');
            const rate2 = currencyService.getRate('eur');
            
            expect(rate1).toBe(rate2);
        });

        it('should return null for unknown currency', () => {
            const rate = currencyService.getRate('UNKNOWN');
            expect(rate).toBeNull();
        });
    });

    describe('Retry Logic', () => {
        it('should retry on failure', async () => {
            let attempts = 0;
            global.fetch.mockImplementation(() => {
                attempts++;
                if (attempts < 3) {
                    return Promise.reject(new Error('Network error'));
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        rates: { EUR: 0.92 }
                    })
                });
            });
            
            const rates = await currencyService.fetchRates();
            
            expect(attempts).toBe(3);
            expect(rates).toHaveProperty('EUR', 0.92);
        });

        it('should use fallback after all retries fail', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));
            
            const rates = await currencyService.fetchRates();
            
            // After 3 retries, should use fallback
            expect(global.fetch).toHaveBeenCalledTimes(3);
            expect(rates).toHaveProperty('USD', 1);
        });
    });
});
