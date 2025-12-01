/**
 * Calculator Test Suite
 * Tests for the Numla calculator functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Calculator } from '../src/calculator.js';

// Mock currencyService
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

describe('Calculator', () => {
    let calc;

    beforeEach(() => {
        calc = new Calculator();
    });

    describe('Basic Arithmetic', () => {
        it('should evaluate simple addition', () => {
            const results = calc.evaluate('2 + 3');
            expect(results).toHaveLength(1);
            expect(results[0]).toContain('5');
        });

        it('should evaluate subtraction', () => {
            const results = calc.evaluate('100 - 40');
            expect(results[0]).toContain('60');
        });

        it('should evaluate multiplication', () => {
            const results = calc.evaluate('6 * 7');
            expect(results[0]).toContain('42');
        });

        it('should evaluate division', () => {
            const results = calc.evaluate('20 / 4');
            expect(results[0]).toContain('5');
        });

        it('should handle multiple lines', () => {
            const results = calc.evaluate('5 + 5\n10 * 2');
            expect(results).toHaveLength(2);
            expect(results[0]).toContain('10');
            expect(results[1]).toContain('20');
        });

        it('should handle parentheses', () => {
            const results = calc.evaluate('(2 + 3) * 4');
            expect(results[0]).toContain('20');
        });
    });

    describe('Input Validation', () => {
        it('should return empty array for non-string input', () => {
            expect(calc.evaluate(null)).toEqual([]);
            expect(calc.evaluate(undefined)).toEqual([]);
            expect(calc.evaluate(123)).toEqual([]);
            expect(calc.evaluate({})).toEqual([]);
        });

        it('should handle empty input', () => {
            const results = calc.evaluate('');
            expect(results).toHaveLength(1);
            expect(results[0]).toBe('');
        });

        it('should handle whitespace-only input', () => {
            const results = calc.evaluate('   ');
            expect(results).toHaveLength(1);
            expect(results[0]).toBe('');
        });

        it('should skip comment lines', () => {
            const results = calc.evaluate('# This is a comment\n5 + 5');
            expect(results).toHaveLength(2);
            expect(results[0]).toBe('');
            expect(results[1]).toContain('10');
        });
    });

    describe('Percentage Calculations', () => {
        it('should calculate percentage of a number', () => {
            const results = calc.evaluate('20% of 100');
            expect(results[0]).toContain('20');
        });

        it('should calculate "X% of what is Y"', () => {
            const results = calc.evaluate('20% of what is 30');
            expect(results[0]).toContain('150');
        });
    });

    describe('Currency Handling', () => {
        it('should parse dollar amounts', () => {
            const results = calc.evaluate('$10');
            expect(results[0]).toContain('10');
        });

        it('should parse euro amounts', () => {
            const results = calc.evaluate('€10');
            expect(results[0]).toContain('10');
        });

        it('should parse pound amounts', () => {
            const results = calc.evaluate('£10');
            expect(results[0]).toContain('10');
        });
    });

    describe('Variable Assignment', () => {
        it('should handle variable assignment with $ prefix', () => {
            const results = calc.evaluate('$VAR = 100\n$VAR * 2');
            expect(results).toHaveLength(2);
            expect(results[1]).toContain('200');
        });

        it('should not strip assignment expressions', () => {
            const results = calc.evaluate('$PRICE = 2000');
            expect(results).toHaveLength(1);
            expect(results[0]).toContain('2.000'); // Italian number format
        });
    });

    describe('Running Sum and Average', () => {
        it('should calculate running sum', () => {
            const results = calc.evaluate('10\n20\nsum');
            expect(results).toHaveLength(3);
            expect(results[2]).toContain('30');
        });

        it('should calculate running average', () => {
            const results = calc.evaluate('10\n20\navg');
            expect(results).toHaveLength(3);
            expect(results[2]).toContain('15');
        });

        it('should reset sum on empty line', () => {
            const results = calc.evaluate('10\n20\n\n5\nsum');
            expect(results).toHaveLength(5);
            expect(results[4]).toContain('5');
        });
    });

    describe('Label Handling', () => {
        it('should strip labels from lines', () => {
            const results = calc.evaluate('Price: 100 + 50');
            expect(results[0]).toContain('150');
        });
    });

    describe('Unicode Math Symbols', () => {
        it('should handle multiplication sign ×', () => {
            const results = calc.evaluate('5 × 3');
            expect(results[0]).toContain('15');
        });

        it('should handle division sign ÷', () => {
            const results = calc.evaluate('15 ÷ 3');
            expect(results[0]).toContain('5');
        });

        it('should handle minus sign −', () => {
            const results = calc.evaluate('10 − 3');
            expect(results[0]).toContain('7');
        });
    });

    describe('Number Formatting', () => {
        it('should format large numbers with grouping', () => {
            const results = calc.evaluate('1000000');
            expect(results[0]).toContain('1.000.000');
        });

        it('should handle European number format input', () => {
            // Note: The calculator uses a regex to detect thousand separators
            // 1.000.000 gets parsed as 1000000, then + 1 = 1000001
            const results = calc.evaluate('1000000 + 1');
            expect(results[0]).toContain('1.000.001');
        });
    });

    describe('Edge Cases', () => {
        it('should handle Infinity gracefully', () => {
            const results = calc.evaluate('1 / 0');
            expect(results[0]).toContain('∞');
        });

        it('should handle negative Infinity', () => {
            const results = calc.evaluate('-1 / 0');
            expect(results[0]).toContain('-∞');
        });

        it('should handle invalid expressions gracefully', () => {
            const results = calc.evaluate('hello world');
            expect(results[0]).toBe('');
        });

        it('should handle prev keyword', () => {
            const results = calc.evaluate('100\nprev * 2');
            expect(results[1]).toContain('200');
        });
    });

    describe('Trailing Result Removal', () => {
        it('should remove trailing calculation results', () => {
            // Test internal method
            const cleaned = calc._removeTrailingResult('5 + 3 = 8');
            expect(cleaned).toBe('5 + 3');
        });

        it('should NOT remove assignment expressions', () => {
            const cleaned = calc._removeTrailingResult('$VAR = 2000');
            expect(cleaned).toBe('$VAR = 2000');
        });
    });
});
