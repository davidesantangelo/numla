# Numla

**The notepad that thinks in numbers.**

A minimal, beautiful calculator notepad for quick math, currency conversions, and everyday calculations. Just type naturally — Numla figures out the rest.

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
- **Private** — Everything stays in your browser. No accounts. No tracking.

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
