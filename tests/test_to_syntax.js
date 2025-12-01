import { create, all } from 'mathjs';

const math = create(all);

// Create units
math.createUnit('USD');
math.createUnit('EUR', { definition: '0.92 USD' });

// Test different syntaxes
console.log('Test 1: 5824 USD to EUR');
try {
    const result1 = math.evaluate('5824 USD to EUR');
    console.log('Result:', result1.toString());
} catch (e) {
    console.error('Error:', e.message);
}

console.log('\nTest 2: 5824 USD in EUR');
try {
    const result2 = math.evaluate('5824 USD in EUR');
    console.log('Result:', result2.toString());
} catch (e) {
    console.error('Error:', e.message);
}

console.log('\nTest 3: (5600 + 4%) to EUR');
try {
    const result3 = math.evaluate('(5600 + 4%) to EUR');
    console.log('Result:', result3.toString());
} catch (e) {
    console.error('Error:', e.message);
}
