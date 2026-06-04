---
name: stock-screener
description: Use this skill when the user wants to evaluate a new stock for potential purchase, compare two stocks, check if a stock fits their portfolio, or find new investment ideas. Triggers include "is X a good buy", "compare A vs B", "should I add X to my portfolio", "find me a stock in X sector", "does X pass the screener", or any request to evaluate stock quality and fit. Always cross-reference with the trading-signals skill for entry timing after screening. Extract the user's own portfolio and holdings from their input — never assume specific tickers.
---

# Stock Screener Framework

## TIER SYSTEM — Classify First

### Tier 1 — Core Growth (Mega Cap)
Portfolio anchor positions. Suggested cap: max ~25% of growth allocation each.

**Fundamental criteria:**
```
Market Cap     > $100B
Revenue Growth > 15% YoY
Op. Margin     > 20%
Free Cash Flow positive
Debt/Equity    < 1.5
Clear durable moat (AI / Cloud / Network / Brand)
```

**Technical criteria:**
```
Price above 200 SMA
RSI between 40-65 (not overbought at entry)
Avg daily volume > 5M shares
Uptrend 6-12 months
```

---

### Tier 2 — Small/Mid Cap High Growth
Growth engine. Suggested cap: max ~20% of growth allocation total.

**Fundamental criteria:**
```
Market Cap     $1B - $100B
Revenue Growth > 30% YoY
Large TAM with expansion room
Path to profitability visible
Unique moat or network effect
Insider buying > selling
```

**Technical criteria:**
```
RSI < 70 at entry
Volume rising with price
Not down > 50% from ATH without fundamental reason
```

---

### Tier 3 — Speculative / Moonshot
Suggested cap: max ~10-15% of growth allocation. Accept total loss possible.

```
Clear theme (Quantum, Voice AI, Energy Storage, etc.)
Revenue exists — not just concept
Institutional backing (VC or Big Tech invested)
Management has execution track record
Cash runway ≥ 18-24 months
```

> Position-size caps above are defaults. Use the user's own stated risk
> tolerance and allocation targets when available.

---

## SCREENING PROCESS

### Step 1 — Theme First
Ask: What trend reshapes the world in 5-10 years? Examples:
- AI Infrastructure
- Quantum Computing
- Digital Payments (Emerging Markets)
- Energy Storage
- (or any theme the user is interested in)

### Step 2 — Find Theme Winner
- Who has largest market share?
- Who has highest switching costs?
- Who has data advantage?
- Who has Big Tech partnerships?

### Step 3 — Fundamental Check
Apply tier criteria above. Flag any misses.

### Step 4 — Technical Check
```
52W range position?
Current RSI?
Upcoming catalyst (earnings, product launch)?
Insider activity: buying or selling?
Short interest %?
```

### Step 5 — Portfolio Fit
First, ask the user for their current holdings if not already provided.
```
Duplicates an existing theme already held? → Weigh carefully
Pushes a position over weight limit? → Size down
Cash available to buy? → Check cash reserve
Correlation with existing holdings? → Check
```

---

## COMPARISON TEMPLATE (A vs B)

| Factor | Stock A | Stock B |
|--------|---------|---------|
| Market Cap | | |
| Revenue Growth YoY | | |
| Operating Margin | | |
| Cash Runway | | |
| RSI current | | |
| vs 52W High | | |
| Tier classification | | |
| Red flags | | |
| Portfolio fit | | |
| **Verdict** | | |

---

## RED FLAGS — Automatic Disqualify
```
Revenue declining 2+ consecutive quarters
CEO changes frequently or CFO sudden resignation
Auditor change or financial restatement
Short interest > 20%
Interest coverage ratio < 2x
Price up > 200% in one year without fundamental support
Active SEC or DOJ investigation
Founder/insider sold unusually large stake in past 12 months
```

---

## OUTPUT FORMAT
1. Tier classification (1/2/3)
2. Fundamental scorecard (pass/fail each criterion)
3. Red flag check
4. Portfolio fit assessment (against user's actual holdings)
5. Verdict: Add / Watch / Avoid + reason
6. If Add: refer to the trading-signals skill for entry timing

> Educational use only. Not financial advice.
