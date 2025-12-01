import { Calculator } from '../src/calculator.js';

const calc = new Calculator();

const tests = [
    {
        input: `
Price: $10
Fee: 4 GBP in Euro
sum in USD - 4%
`,
        desc: "Currency and Percentage"
    },
    {
        input: `
next friday + 2 weeks
`,
        desc: "Date Math"
    },
    {
        input: `
20 ml in tea spoons
`,
        desc: "Unit Conversion"
    },
    {
        input: `
20% of what is 30 cm
`,
        desc: "Algebra"
    }
];

console.log("--- Verifying Advanced Features ---");

tests.forEach(test => {
    console.log(`\n[${test.desc}]`);
    console.log("Input:");
    console.log(test.input.trim());
    const results = calc.evaluate(test.input.trim());
    console.log("Output:");
    results.forEach((res, i) => {
        console.log(`Line ${i+1}: ${res}`);
    });
});
