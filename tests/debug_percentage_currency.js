import { Calculator } from '../src/calculator.js';

const calc = new Calculator();

// Mock currency rates for testing
calc.currencyRates = {
    EUR: 1,
    USD: 1.1
};

const expressions = [
    "(5600 + 4%) in eur",
    "5600 + 4%",
    "(5600 + 4%)"
];

expressions.forEach(expr => {
    try {
        const result = calc.evaluate(expr);
        console.log(`Expression: "${expr}"`);
        console.log(`Result: ${JSON.stringify(result)}`);
    } catch (e) {
        console.error(`Error evaluating "${expr}":`, e);
    }
    console.log('---');
});
