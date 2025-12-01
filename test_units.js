import { create, all } from 'mathjs';

const math = create(all);

function preprocess(text) {
    // Copying relevant parts from calculator.js _preprocess

    // Handle cubic/square units: "cu cm" -> "cm^3", "cubic inches" -> "inch^3", "sq m" -> "m^2"
    // Volume: cu, cubic, cb
    text = text.replace(/\b(?:cu|cb)\s*(m|cm|mm|km|ft|feet|foot|in|inch|inches|yd|yard|yards|mi|mile|miles)\b/gi, (_, unit) => {
        // Normalize unit names
        let normalizedUnit = unit.toLowerCase();
        if (normalizedUnit === 'feet' || normalizedUnit === 'foot') normalizedUnit = 'ft';
        if (normalizedUnit === 'inches') normalizedUnit = 'inch';
        if (normalizedUnit === 'yards') normalizedUnit = 'yard';
        if (normalizedUnit === 'miles') normalizedUnit = 'mile';
        return normalizedUnit + '^3';
    });
    text = text.replace(/\bcubic\s+(meter|meters|metre|metres|centimeter|centimeters|millimeter|millimeters|kilometer|kilometers|foot|feet|inch|inches|yard|yards|mile|miles|m|cm|mm|km|ft|in|yd|mi)\b/gi, (_, unit) => {
        let normalizedUnit = unit.toLowerCase();
        if (normalizedUnit === 'meters' || normalizedUnit === 'metre' || normalizedUnit === 'metres') normalizedUnit = 'm';
        if (normalizedUnit === 'centimeters' || normalizedUnit === 'centimeter') normalizedUnit = 'cm';
        if (normalizedUnit === 'millimeters' || normalizedUnit === 'millimeter') normalizedUnit = 'mm';
        if (normalizedUnit === 'kilometers' || normalizedUnit === 'kilometer') normalizedUnit = 'km';
        if (normalizedUnit === 'feet' || normalizedUnit === 'foot') normalizedUnit = 'ft';
        if (normalizedUnit === 'inches') normalizedUnit = 'inch';
        if (normalizedUnit === 'yards') normalizedUnit = 'yard';
        if (normalizedUnit === 'miles') normalizedUnit = 'mile';
        return normalizedUnit + '^3';
    });
    // cbm = cubic meters
    text = text.replace(/\bcbm\b/gi, 'm^3');

    return text;
}

const tests = [
    "20 cu cm",
    "30 cubic inches",
    "11 cbm"
];

tests.forEach(test => {
    const processed = preprocess(test);
    console.log(`Original: "${test}"`);
    console.log(`Processed: "${processed}"`);
    try {
        const result = math.evaluate(processed);
        console.log(`Result: ${result.toString()}`);
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
    console.log('---');
});
