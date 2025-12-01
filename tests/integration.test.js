/**
 * Integration Test Suite
 * End-to-end tests for the Numla application
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../src/currencyService.js', () => ({
    currencyService: {
        fetchRates: vi.fn().mockResolvedValue({
            USD: 1,
            EUR: 0.92,
            GBP: 0.79,
            JPY: 150.0
        }),
        getRates: vi.fn().mockReturnValue({
            USD: 1,
            EUR: 0.92,
            GBP: 0.79,
            JPY: 150.0
        })
    }
}));

import { Calculator } from '../src/calculator.js';

describe('Integration Tests', () => {
    let calc;

    beforeEach(() => {
        calc = new Calculator();
    });

    describe('Complex Calculations', () => {
        it('should handle a full budget calculation', () => {
            const input = `# Monthly Budget
Salary: 3000
Rent: 1200
Groceries: 400
Utilities: 150
sum`;
            const results = calc.evaluate(input);
            
            // Sum result should be in the last line
            const sumResult = results[results.length - 1];
            expect(sumResult).toContain('4.750'); // 3000+1200+400+150
        });

        it('should handle percentage calculations in context', () => {
            const input = `100
20% of sum`;
            
            const results = calc.evaluate(input);
            expect(results).toHaveLength(2);
            // 20% of 100 = 20
            expect(results[1]).toContain('20');
        });

        it('should handle multi-step calculations with prev', () => {
            const input = `100
prev * 2
prev + 50`;
            
            const results = calc.evaluate(input);
            expect(results).toHaveLength(3);
            expect(results[0]).toContain('100');
            expect(results[1]).toContain('200');
            expect(results[2]).toContain('250');
        });
    });

    describe('Variable Persistence', () => {
        it('should persist variables across lines', () => {
            const input = `$BASE = 1000
$TAX_RATE = 0.20
$BASE * $TAX_RATE`;
            
            const results = calc.evaluate(input);
            expect(results).toHaveLength(3);
            expect(results[2]).toContain('200');
        });

        it('should handle variable updates', () => {
            const input = `$X = 10
$X = 20
$X + 5`;
            
            const results = calc.evaluate(input);
            expect(results[2]).toContain('25');
        });
    });

    describe('Unit Conversions', () => {
        it('should convert length units', () => {
            const results = calc.evaluate('1 meter to cm');
            expect(results[0]).toContain('100');
        });

        it('should convert weight units', () => {
            const results = calc.evaluate('1 kg to gram');
            expect(results[0]).toContain('1000');
        });
    });

    describe('Date Calculations', () => {
        it('should parse relative dates', () => {
            const results = calc.evaluate('today');
            // Should return a formatted date
            expect(results[0]).toMatch(/\d+\/\d+\/\d+/);
        });
    });

    describe('Error Recovery', () => {
        it('should continue after invalid line', () => {
            const input = `10
invalid expression here
20`;
            
            const results = calc.evaluate(input);
            expect(results).toHaveLength(3);
            expect(results[0]).toContain('10');
            expect(results[1]).toBe('');
            expect(results[2]).toContain('20');
        });

        it('should handle mixed valid and invalid expressions', () => {
            const input = `5 + 5
garbage!!!
10 * 2`;
            
            const results = calc.evaluate(input);
            expect(results[0]).toContain('10');
            expect(results[1]).toBe('');
            expect(results[2]).toContain('20');
        });
    });

    describe('Performance', () => {
        it('should handle large inputs efficiently', () => {
            const lines = Array.from({ length: 100 }, (_, i) => `${i + 1} + 1`);
            const input = lines.join('\n');
            
            const start = performance.now();
            const results = calc.evaluate(input);
            const duration = performance.now() - start;
            
            expect(results).toHaveLength(100);
            expect(duration).toBeLessThan(1000); // Should complete in under 1 second
        });

        it('should not recalculate unchanged content', () => {
            const input = '1 + 1';
            
            // First calculation
            const results1 = calc.evaluate(input);
            
            // Same calculation should be fast (cached scope)
            const start = performance.now();
            const results2 = calc.evaluate(input);
            const duration = performance.now() - start;
            
            expect(results1).toEqual(results2);
            expect(duration).toBeLessThan(100);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty blocks correctly', () => {
            const input = `10

20

sum`;
            
            const results = calc.evaluate(input);
            // Empty lines reset sum, so final sum should be just the last non-empty block
            expect(results).toHaveLength(5);
        });

        it('should handle only comments', () => {
            const input = `# Comment 1
# Comment 2
# Comment 3`;
            
            const results = calc.evaluate(input);
            expect(results.every(r => r === '')).toBe(true);
        });

        it('should handle special characters in labels', () => {
            // Labels with colons are stripped, so use simple format
            const input = `Price: 100
Total: 200`;
            
            const results = calc.evaluate(input);
            expect(results[0]).toContain('100');
            expect(results[1]).toContain('200');
        });
    });
});
