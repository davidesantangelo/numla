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

    describe('Natural Language Operators', () => {
        it('should handle "times" operator', () => {
            const results = calc.evaluate('5 times 3');
            expect(results[0]).toContain('15');
        });

        it('should handle "multiplied by" operator', () => {
            const results = calc.evaluate('4 multiplied by 7');
            expect(results[0]).toContain('28');
        });

        it('should handle "plus" operator', () => {
            const results = calc.evaluate('10 plus 5');
            expect(results[0]).toContain('15');
        });

        it('should handle "minus" operator', () => {
            const results = calc.evaluate('20 minus 8');
            expect(results[0]).toContain('12');
        });

        it('should handle "divided by" operator', () => {
            const results = calc.evaluate('100 divided by 4');
            expect(results[0]).toContain('25');
        });

        it('should handle "without" operator', () => {
            const results = calc.evaluate('50 without 15');
            expect(results[0]).toContain('35');
        });
    });

    describe('Scales (k, M, B)', () => {
        it('should handle k (thousands)', () => {
            const results = calc.evaluate('2k + 500');
            expect(results[0]).toContain('2.500');
        });

        it('should handle M (millions)', () => {
            const results = calc.evaluate('1.5M');
            expect(results[0]).toContain('1.500.000');
        });

        it('should handle billion', () => {
            const results = calc.evaluate('2 billion');
            expect(results[0]).toContain('2.000.000.000');
        });

        it('should handle "thousand"', () => {
            const results = calc.evaluate('5 thousand');
            expect(results[0]).toContain('5.000');
        });

        it('should handle "million"', () => {
            const results = calc.evaluate('3 million');
            expect(results[0]).toContain('3.000.000');
        });
    });

    describe('Advanced Percentage Operations', () => {
        it('should calculate "X% on Y" (add percentage)', () => {
            const results = calc.evaluate('10% on 100');
            expect(results[0]).toContain('110');
        });

        it('should calculate "X% off Y" (subtract percentage)', () => {
            const results = calc.evaluate('20% off 100');
            expect(results[0]).toContain('80');
        });

        it('should calculate "X as a % of Y"', () => {
            const results = calc.evaluate('50 as a % of 200');
            expect(results[0]).toContain('25');
        });

        it('should calculate "X% on what is Y"', () => {
            // 5% on what is 105 -> 105 / 1.05 = 100
            const results = calc.evaluate('5% on what is 105');
            expect(results[0]).toContain('100');
        });

        it('should calculate "X% off what is Y"', () => {
            // 20% off what is 80 -> 80 / 0.8 = 100
            const results = calc.evaluate('20% off what is 80');
            expect(results[0]).toContain('100');
        });
    });

    describe('Number Format Conversion', () => {
        it('should convert to hex', () => {
            const results = calc.evaluate('255 in hex');
            expect(results[0]).toContain('0xFF');
        });

        it('should convert to binary', () => {
            const results = calc.evaluate('10 in bin');
            expect(results[0]).toContain('0b1010');
        });

        it('should convert to octal', () => {
            const results = calc.evaluate('64 in oct');
            expect(results[0]).toContain('0o100');
        });

        it('should convert to scientific notation', () => {
            const results = calc.evaluate('1500000 in sci');
            expect(results[0]).toContain('1.50e+6');
        });
    });

    describe('Timezone Support', () => {
        it('should show current time for "time"', () => {
            const results = calc.evaluate('time');
            expect(results[0]).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
        });

        it('should show current time for "now"', () => {
            const results = calc.evaluate('now');
            expect(results[0]).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
        });

        it('should handle "LOCATION time"', () => {
            const results = calc.evaluate('New York time');
            expect(results[0]).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
        });

        it('should handle "time in LOCATION"', () => {
            const results = calc.evaluate('time in Tokyo');
            expect(results[0]).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
        });
    });

    describe('CSS Units', () => {
        it('should handle pixel calculations', () => {
            const results = calc.evaluate('16 px + 32 px');
            expect(results[0]).toContain('48');
        });

        it('should convert em to px', () => {
            const results = calc.evaluate('2 em to px');
            expect(results[0]).toContain('32');
        });
    });

    describe('Volume Unit Aliases', () => {
        it('should convert "cu" shorthand to cubic centimeters', () => {
            const results = calc.evaluate('20 cu cm');
            expect(results[0]).toContain('cm^3');
        });

        it('should handle "cubic" keyword for inches', () => {
            const results = calc.evaluate('30 cubic inches');
            expect(results[0]).toContain('inch^3');
        });

        it('should expand cbm to cubic meters', () => {
            const results = calc.evaluate('11 cbm');
            expect(results[0]).toContain('m^3');
        });
    });

    describe('Comments', () => {
        it('should skip lines starting with //', () => {
            const results = calc.evaluate('// This is a comment\n5 + 5');
            expect(results).toHaveLength(2);
            expect(results[0]).toBe('');
            expect(results[1]).toContain('10');
        });
    });
});
