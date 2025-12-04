[![Netlify Status](https://api.netlify.com/api/v1/badges/e0f9d5bd-a1b4-4b8e-89cb-b45c7d6c87a5/deploy-status)](https://app.netlify.com/projects/numla/deploys)

# Numla

**The notepad that thinks in numbers.**

A minimal, beautiful calculator notepad for quick math, currency conversions, and everyday calculations. Just type naturally — Numla figures out the rest.

---

## 🔒 Privacy First

**Your data never leaves your device.**

Numla stores everything locally in your browser using [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage):

- ✅ **No server** — All notes are saved directly in your browser
- ✅ **No account required** — No sign-up, no login, no password
- ✅ **No tracking** — Zero analytics, no cookies, no telemetry
- ✅ **No cloud sync** — Your calculations stay on your machine
- ✅ **Fully offline** — Works without an internet connection (except for live currency rates)

> **Note:** Since data is stored in localStorage, clearing your browser data will delete your notes. Consider exporting important notes using the download feature.

---

## Features

### Write naturally, get instant results

```
Rent: $1.200
Utilities: $150
Groceries: $400
sum                           → $1.750
```

### Currency conversions with live rates

```
$500 in EUR                   → € 460
£200 + $100                   → £ 278.50
$2k + 15%                     → $ 2.300
```

### Percentages made simple

```
20% of 150                    → 30
15% off $80                   → $ 68
$50 as a % of $200            → 25
tip: 18% on $45               → $ 53,10
```

### Time & timezone queries

```
time                          → 2:30 PM
New York time                 → 9:30 AM EST
time in Tokyo                 → 11:30 PM JST
```

### Date math

```
next friday                   → 12/5/25
today + 2 weeks               → 12/16/25
christmas - 30 days           → 11/25/25
```

### Unit conversions

```
5 km to miles                 → 3.1069 miles
100 fahrenheit in celsius     → 37.78 celsius
2 hours + 45 minutes          → 2.75 hours
20 cu cm                      → 20 cm³
30 cubic inches               → 30 ″³
11 cbm                        → 11 m³
```

### Variables & running totals

```
$RATE = 75
8 hours * $RATE               → $ 600
prev + 20%                    → $ 720
```

### Organization & Interface

- **Tab System**: Open multiple notes as tabs for easy switching. Click the `+` button to create a new note.
- **Spotlight Search**: Press `⌘K` to instantly search and jump to any note.
- **Focus Mode**: Hide all controls for distraction-free writing. Press `Esc` to exit.
- **Per-Note Theme**: Each note remembers its own light/dark mode preference.
- **Export**: Download any note as a `.txt` file.
- **Mobile Ready**: Fully responsive design for on-the-go calculations.

---

## Full Reference

### Operators

| Natural                  | Symbol | Example                 |
| ------------------------ | ------ | ----------------------- |
| `plus`, `and`, `with`    | `+`    | `5 plus 3` → 8          |
| `minus`, `without`       | `-`    | `10 minus 4` → 6        |
| `times`, `multiplied by` | `*`    | `6 times 7` → 42        |
| `divided by`             | `/`    | `100 divided by 4` → 25 |

### Percentages

| Pattern           | Meaning             | Example                   |
| ----------------- | ------------------- | ------------------------- |
| `X% of Y`         | percentage of       | `20% of 50` → 10          |
| `X% on Y`         | add percentage      | `10% on $100` → $110      |
| `X% off Y`        | subtract percentage | `25% off $80` → $60       |
| `X as a % of Y`   | ratio as percent    | `25 as a % of 100` → 25   |
| `X% of what is Y` | reverse percentage  | `20% of what is 30` → 150 |

### Scales

| Scale           | Example                     |
| --------------- | --------------------------- |
| `k` (thousands) | `$2.5k` → $2,500            |
| `M` (millions)  | `1.5M` → 1,500,000          |
| `billion`       | `2 billion` → 2,000,000,000 |

### Number Formats

| Format   | Example                    |
| -------- | -------------------------- |
| `in hex` | `255 in hex` → 0xFF        |
| `in bin` | `10 in bin` → 0b1010       |
| `in oct` | `64 in oct` → 0o100        |
| `in sci` | `1500000 in sci` → 1.50e+6 |

### Special Keywords

| Keyword         | Description                               |
| --------------- | ----------------------------------------- |
| `sum` / `total` | Sum of lines above (resets on empty line) |
| `avg` / `mean`  | Average of lines above                    |
| `prev`          | Result from previous line                 |

### Math Functions (powered by [math.js](https://mathjs.org))

#### Statistics
| Function | Example | Result |
| -------- | ------- | ------ |
| `mean(a, b, c)` | `mean(2, 4, 6)` | 4 |
| `median(a, b, c)` | `median(1, 3, 5, 7)` | 4 |
| `std(a, b, c)` | `std(2, 4, 4, 4, 5, 5, 7, 9)` | 2 |
| `variance(a, b, c)` | `variance(2, 4, 6)` | 4 |
| `min(a, b, c)` | `min(3, 1, 4)` | 1 |
| `max(a, b, c)` | `max(3, 1, 4)` | 4 |
| `mode(a, b, c)` | `mode(1, 2, 2, 3)` | 2 |
| `sum(a, b, c)` | `sum(1, 2, 3, 4)` | 10 |

#### Combinatorics & Number Theory
| Function | Example | Result |
| -------- | ------- | ------ |
| `factorial(n)` or `n!` | `5!` | 120 |
| `combinations(n, k)` | `combinations(5, 2)` | 10 |
| `permutations(n, k)` | `permutations(5, 2)` | 20 |
| `gcd(a, b)` | `gcd(12, 18)` | 6 |
| `lcm(a, b)` | `lcm(4, 6)` | 12 |
| `isPrime(n)` | `isPrime(17)` | true |

#### Roots & Powers
| Function | Example | Result |
| -------- | ------- | ------ |
| `sqrt(x)` | `sqrt(16)` | 4 |
| `cbrt(x)` | `cbrt(27)` | 3 |
| `nthRoot(x, n)` | `nthRoot(16, 4)` | 2 |
| `pow(x, y)` or `x^y` | `2^10` | 1024 |
| `exp(x)` | `exp(1)` | 2.718... |

#### Logarithms
| Function | Example | Result |
| -------- | ------- | ------ |
| `log(x)` | `log(e)` | 1 |
| `log10(x)` | `log10(100)` | 2 |
| `log2(x)` | `log2(8)` | 3 |
| `log(x, base)` | `log(8, 2)` | 3 |

#### Trigonometry
| Function | Example | Result |
| -------- | ------- | ------ |
| `sin(x)` | `sin(pi/2)` | 1 |
| `cos(x)` | `cos(0)` | 1 |
| `tan(x)` | `tan(pi/4)` | 1 |
| `asin(x)` | `asin(1)` | 1.57... |
| `acos(x)` | `acos(0)` | 1.57... |
| `atan(x)` | `atan(1)` | 0.785... |

#### Rounding
| Function | Example | Result |
| -------- | ------- | ------ |
| `round(x)` | `round(3.7)` | 4 |
| `floor(x)` | `floor(3.7)` | 3 |
| `ceil(x)` | `ceil(3.2)` | 4 |
| `abs(x)` | `abs(-5)` | 5 |
| `sign(x)` | `sign(-5)` | -1 |

#### Random
| Function | Example | Description |
| -------- | ------- | ----------- |
| `random()` | `random()` | Random between 0-1 |
| `random(min, max)` | `random(1, 10)` | Random between min-max |
| `randomInt(min, max)` | `randomInt(1, 100)` | Random integer |

#### Constants
| Constant | Value | Description |
| -------- | ----- | ----------- |
| `pi` | 3.14159... | π (ratio of circumference to diameter) |
| `e` | 2.71828... | Euler's number |
| `phi` | 1.61803... | Golden ratio |
| `tau` | 6.28318... | τ = 2π |

### Comments

```
# This is a header (highlighted in yellow)
// This line is ignored
Price: $10    ← Labels are stripped automatically
```

---

## Keyboard Shortcuts

| Shortcut | Action                                 |
| -------- | -------------------------------------- |
| `⌘ J`    | Create new note                        |
| `⌘ K`    | Search notes                           |
| `↑` `↓`  | Navigate search results                |
| `Enter`  | Open selected note                     |
| `Esc`    | Close search / modal / Exit focus mode |

---

## Focus Mode

Enter distraction-free mode by clicking the expand icon in the controls bar:

- **Hides all controls**: Tab bar, buttons, and panels disappear
- **Results visible**: Calculation results remain visible
- **Exit anytime**: Press `Esc` to return to normal view

---

## Tab System

Work with multiple notes simultaneously using the tab bar:

- **Open tabs**: Click on any note in search results to open it as a tab
- **Switch tabs**: Click on a tab to switch to that note
- **Close tabs**: Click the `×` on a tab to close it
- **New tab**: Click the `+` button at the end of the tab bar (or press `⌘J`)
- **Tab Manager**: Click the grid icon (left of tabs) to open a sidebar with all notes, search, and bulk delete options

---

## Supported Currencies

50+ currencies with live exchange rates updated multiple times daily:

**Major:** USD, EUR, GBP, JPY, CHF, CAD, AUD, CNY  
**European:** SEK, NOK, DKK, PLN, CZK, HUF, RON  
**Asian:** KRW, SGD, HKD, TWD, THB, MYR, INR, IDR, PHP  
**Americas:** MXN, BRL, CLP, COP, ARS  
**Others:** AED, SAR, ZAR, TRY, ILS, NZD

---

## Timezones

Query time in major cities and timezone codes:

**Americas:** New York, Los Angeles, Chicago, Denver  
**Europe:** London, Paris, Berlin, Madrid, Rome, Amsterdam, Stockholm  
**Asia:** Tokyo, Singapore, Hong Kong, Shanghai, Mumbai, Dubai  
**Pacific:** Sydney, Melbourne, Auckland

**Codes:** EST, PST, CST, GMT, UTC, CET, JST, HKT, SGT, IST, AEST

---

## Design Philosophy

- **Minimal** — No buttons cluttering your view. Just you and your calculations.
- **Fast** — Results appear instantly as you type.
- **Beautiful** — Dark mode by default. Light mode available. Per-note theme memory.
- **Private** — All data is stored locally in your browser using localStorage. No servers, no accounts, no tracking. Your notes never leave your device.

---

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## License

MIT

---

<p align="center">
  <sub>Made with ♥ for people who think in numbers.</sub>
</p>
