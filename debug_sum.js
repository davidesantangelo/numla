import { create, all } from 'mathjs';
const math = create(all);
math.createUnit('USD');
math.createUnit('EUR', '1.05 USD');

const scope = {};
const explicitSum = math.unit(15.25, 'USD');
scope['sum'] = explicitSum;

try {
    const res = math.evaluate('sum in USD - 4%', scope);
    console.log('Result (sum in USD - 4%):', res.toString());
} catch (e) {
    console.log('Error (sum in USD - 4%):', e.message);
}

try {
    const res = math.evaluate('(sum in USD) - 4%', scope);
    console.log('Result ((sum in USD) - 4%):', res.toString());
} catch (e) {
    console.log('Error ((sum in USD) - 4%):', e.message);
}
