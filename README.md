[![Netlify Status](https://api.netlify.com/api/v1/badges/e0f9d5bd-a1b4-4b8e-89cb-b45c7d6c87a5/deploy-status)](https://app.netlify.com/projects/numla/deploys)

# Numla

**The notepad that thinks in numbers.**

A minimal calculator notepad for quick math, currency conversions, percentages, unit conversions, and everyday calculations. Type naturally — Numla figures out the rest.

🔒 **100% Private** — Everything stays in your browser. No accounts, no tracking, works offline.

---

## Quick Examples

```
Rent: $1.200
Utilities: $150
Groceries: $400
sum                    → $1.750

$500 in EUR            → € 460
20% of 150             → 30
15% off $80            → $ 68

time in Tokyo          → 11:30 PM JST
5 km to miles          → 3.1 miles

$RATE = 75
8 hours * $RATE        → $ 600
```

---

## Features

| Feature        | How                                          |
| -------------- | -------------------------------------------- |
| **Tabs**       | Open multiple notes, click `+` to create new |
| **Search**     | `⌘K` to find any note instantly              |
| **Focus Mode** | Click expand icon, `Esc` to exit             |
| **Theme**      | Each note remembers light/dark preference    |
| **Export**     | Download notes as `.txt`                     |

---

## Syntax Reference

### Operators

`plus` `minus` `times` `divided by` — or use `+ - * /`

### Percentages

- `20% of 50` → 10
- `10% on $100` → $110 (add)
- `25% off $80` → $60 (subtract)
- `25 as a % of 100` → 25

### Scales

`k` = thousands, `M` = millions, `billion`

### Special Keywords

`sum` `total` `avg` `mean` `prev`

### Comments

```
# Header (yellow)
// Ignored line
Price: $10    ← Labels stripped
```

---

## Math Functions

Powered by [math.js](https://mathjs.org):

| Category          | Functions                                                 |
| ----------------- | --------------------------------------------------------- |
| **Stats**         | `mean` `median` `std` `variance` `min` `max` `mode` `sum` |
| **Math**          | `sqrt` `cbrt` `pow` `exp` `log` `log10` `log2`            |
| **Trig**          | `sin` `cos` `tan` `asin` `acos` `atan`                    |
| **Round**         | `round` `floor` `ceil` `abs`                              |
| **Combinatorics** | `factorial` `combinations` `permutations` `gcd` `lcm`     |
| **Random**        | `random()` `randomInt(min, max)`                          |
| **Constants**     | `pi` `e` `phi` `tau`                                      |

---

## Shortcuts

| Key   | Action             |
| ----- | ------------------ |
| `⌘J`  | New note           |
| `⌘K`  | Search             |
| `Esc` | Close / Exit focus |

---

## Currencies & Timezones

**50+ currencies** with live rates: USD, EUR, GBP, JPY, CHF, and many more.

**Major cities**: New York, London, Tokyo, Sydney, and timezone codes (EST, PST, GMT, etc.)

---

## Development

```bash
npm install && npm run dev
```

---

MIT — Made with ♥ for people who think in numbers.
