import { create, all } from "mathjs";

const math = create(all);

// Configure currency rates (mock)
math.createUnit("USD", { aliases: ["dollar", "dollars"] });
math.createUnit("EUR", { aliases: ["euro", "euros"] });
math.createUnit("GBP", { aliases: ["pound", "pounds"] });

// Mock exchange rates (approximate)
// mathjs requires a base unit for currencies if we want to convert between them.
// Usually we pick one, e.g., USD.
// However, mathjs units are strict. We need to define relations.
// Let's try to define them relative to a base, say USD.
// Note: mathjs might throw if we redefine existing units or if we don't do it right.
// Actually, mathjs has built-in units. Let's see what exists.

const tests = [
  "4 GBP to EUR",
  "10 USD - 4%",
  "20 ml to tsp",
  "20% of 150 cm", // This is direct calculation
  // "20% of what is 30 cm" // This is algebra/solving, mathjs evaluate might not handle this directly without parsing
];

console.log("--- Testing Mathjs Capabilities ---");

tests.forEach((test) => {
  try {
    const result = math.evaluate(test);
    console.log(`"${test}" => ${result.toString()}`);
  } catch (e) {
    console.log(`"${test}" => Error: ${e.message}`);
  }
});

// Test Date math if possible (mathjs usually doesn't do "next friday")
try {
  console.log(`"today" => ${math.evaluate("today")}`); // Unlikely to work
} catch (e) {
  console.log(`"today" => Error: ${e.message}`);
}
