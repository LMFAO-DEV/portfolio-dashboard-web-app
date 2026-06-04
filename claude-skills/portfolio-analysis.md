---
name: portfolio-analysis
description: Use this skill when the user wants to review or analyze their overall portfolio health, check if rebalancing is needed, evaluate individual positions for hold/trim/sell, assess Core vs Satellite balance, or plan DCA allocation. Triggers include "analyze my portfolio", "should I rebalance", "how is my port doing", "which stocks should I sell", "is my allocation correct", or when user shares a portfolio screenshot. Always extract portfolio details from user input — never assume tickers, values, or allocation targets.
---

# Portfolio Analysis Framework

## STEP 0 — Extract User Context First

Before any analysis, confirm the following from user input (ask if missing):
```
1. Portfolio structure: Does the user have Core + Satellite, or single portfolio?
2. Target allocation: What % does the user want in each bucket?
3. Bucket definitions: What groups does the user use? (e.g. Core Growth / Small Cap / Defensive)
4. Total portfolio value (any currency)
5. Monthly DCA budget (if applicable)
```

If the user shares a screenshot or table, extract all positions directly from it.

---

## STEP 1 — Build Snapshot Table

Always start by extracting this from user input:
```
| Ticker | Value | Weight% | P&L% | Cost/Share | Current Price | Group |
```

Group column = whichever bucket system the user defines (e.g. Core Growth, Small Cap, Defensive).

---

## STEP 2 — Five Health Checks

| Check | Threshold | Flag |
|-------|-----------|------|
| Concentration | Single stock > 25% of total port | Trim |
| Correlation | All positions same sector/theme | Add diversifier |
| Cash ratio | Cash < 10% of Satellite | Stop new buys |
| Profit lock | Any position > 30% gain | Consider partial sell |
| Stop loss | Any position > 20% loss | Review thesis |

Thresholds above are defaults. Adjust if user specifies different risk tolerance.

---

## STEP 3 — Per-Position Rating

| Condition | Hold | Trim | Sell |
|-----------|------|------|------|
| Gain | < 30% | 30–50% | > 50% (partial) |
| Loss | < 10% | 10–20% | > 20% + broken thesis |
| Fundamental | Strong | Changing | Broken |
| Catalyst | Active | Unclear | Gone |

---

## STEP 4 — Core vs Satellite Check

Use the user's own target allocation. Generic reference structure if user has none:

```
CORE (passive, long-term base)
  Broad market ETF     ~50% of Core
  Dividend ETF         ~30% of Core
  International ETF    ~10% of Core
  Commodity/Gold       ~10% of Core

SATELLITE (active, growth-oriented)
  Core Growth stocks   ~60% of Satellite
  Small Cap / High-beta ~20% of Satellite
  Cash Reserve         ~20% of Satellite (never deploy below 10%)
```

If user defines different groups (e.g. Core Growth / Small Cap AI / Defensive), map their actual holdings into those groups and calculate real vs target weight for each.

Rebalance triggers (universal):
- Core vs Satellite drifts beyond ±10% from target → flag for rebalance
- Any single bucket drifts > 15% above its target → trim and redistribute
- Annual hard rebalance: recommend Q4 each year

---

## STEP 5 — DCA Recommendation

Calculate from user's stated monthly budget, not a fixed number.

```
Apply user's target allocation % to their monthly DCA amount.
Example: if user DCA = X/month and Core target = 50%
  → Suggest X × 50% into Core bucket, split by sub-weights
```

Universal DCA rules:
- Increase DCA when: broad market pulls back > 10% from high
- Pause DCA when: personal emergency fund < 6 months expenses
- Never DCA into a position with a broken fundamental thesis

---

## Warning Flags

```
Single stock > 25% of total portfolio        → trim immediately
Satellite cash < 10%                         → stop all new buys
Cumulative portfolio loss > 15% with no plan → full reassessment
Zero international/defensive exposure        → concentration risk
All positions in same sector/theme           → correlation risk
Any position held > 2 years with no thesis   → dead weight, review
```

---

## Output Format

Always output:
1. Snapshot table (all positions with group label)
2. Health check results (pass / flag per check)
3. Per-position recommendation (hold / trim / sell + one-line reason)
4. Bucket balance: actual % vs user's target % per group
5. Suggested next action (specific and actionable)

> Educational use only. Not financial advice.
