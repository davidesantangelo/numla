import { create, all } from 'mathjs';
import { currencyService } from './src/currencyService.js';

const math = create(all);

// Esegui le stesse operazioni di init del modulo
function initBasicCurrencies() {
    try {
        if (!math.Unit.isValuelessUnit('USD')) {
            math.createUnit('USD', { aliases: ['dollar', 'dollars', 'usd'] });
        }
        if (!math.Unit.isValuelessUnit('EUR')) {
            math.createUnit('EUR', { definition: '0.92 USD', aliases: ['euro', 'euros', 'eur'] });
        }
        if (!math.Unit.isValuelessUnit('GBP')) {
            math.createUnit('GBP', { definition: '0.79 USD', aliases: ['pound', 'pounds', 'gbp'] });
        }
        if (!math.Unit.isValuelessUnit('JPY')) {
            math.createUnit('JPY', { definition: '0.0067 USD', aliases: ['yen', 'jpy'] });
        }
    } catch (e) {
        console.warn('Failed to init basic currencies:', e);
    }
}

function initCSSUnits() {
    try {
        if (!math.Unit.isValuelessUnit('px')) {
            math.createUnit('px', { aliases: ['pixel', 'pixels'] });
        }
        if (!math.Unit.isValuelessUnit('pt')) {
            math.createUnit('pt', { definition: '1.333333333 px', aliases: ['point', 'points'] });
        }
        if (!math.Unit.isValuelessUnit('em')) {
            math.createUnit('em', { definition: '16 px', aliases: ['ems'] });
        }
        if (!math.Unit.isValuelessUnit('rem')) {
            math.createUnit('rem', { definition: '16 px', aliases: ['rems'] });
        }
    } catch (e) {
        console.warn('Failed to init CSS units:', e);
    }
}

initBasicCurrencies();
initCSSUnits();

console.log('After init - test 20 cm^3:');
try {
  const result = math.evaluate('20 cm^3');
  console.log('Success:', result.toString());
} catch(e) {
  console.log('Error:', e.message);
}

// Ora configureCurrencies
await currencyService.fetchRates();
const rates = currencyService.getRates();

for (const [currency, rate] of Object.entries(rates)) {
  if (currency === 'USD') continue;
  try {
    const aliases = [
      currency.toLowerCase(),
      currency.toLowerCase() + 's',
      currency,
      currency + 's'
    ];
    math.createUnit(currency, { 
      definition: `${1 / rate} USD`, 
      aliases 
    }, { override: true });
  } catch (e) {
    // Skip silently
  }
}

console.log('After configureCurrencies - test 20 cm^3:');
try {
  const result = math.evaluate('20 cm^3');
  console.log('Success:', result.toString());
} catch(e) {
  console.log('Error:', e.message);
}

// Verifica unità m
console.log('\nChecking if m was overridden:');
try {
  const mResult = math.evaluate('1 m');
  console.log('1 m =>', mResult.toString());
} catch(e) {
  console.log('1 m => Error:', e.message);
}
