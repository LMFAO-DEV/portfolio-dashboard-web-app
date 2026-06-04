---
name: trading-signals
description: Use this skill when the user asks to analyze a stock's entry or exit point, check technical signals, evaluate whether to buy/add/sell/hold a position, or assess current market conditions. Triggers include questions like "should I buy now", "is this a good entry", "when to sell", "what does the chart say", "is RSI overbought", "check the signals for X stock", or any request involving technical analysis of a specific ticker. Works with any portfolio — extract the user's holdings, position type, and risk tolerance from their input rather than assuming specific tickers or amounts.
---

# Trading Signals Framework
Professional entry/exit signals used by world-class traders (Minervini, O'Neil, Tudor Jones, Druckenmiller).

## HOW TO USE THIS SKILL

When asked to analyze any stock:
1. Check market condition first (Part 9)
2. Confirm trend direction (Part 1)
3. Check momentum signals (Part 2)
4. Confirm with volume (Part 3)
5. Identify pattern/timing (Part 4)
6. Select formula A, B, or C (Part 6)
7. Define stop loss and profit targets (Parts 7 + 10)
8. State signal confidence: HIGH (4+ signals) / MEDIUM (2-3) / LOW (1-2, wait)

Always output: Entry zone | Stop loss | Profit ladder | Signal confidence level

---

## PART 1: TREND INDICATORS

### Moving Averages
```
8 EMA   = Short-term momentum
21 EMA  = Primary trend filter (Minervini core)
50 SMA  = Institutional support/resistance
200 SMA = Long-term trend wall (most important)
```

**Entry:** Price above ALL MAs in sequence (8>21>50>200) = Stage 2 Uptrend — only buy here
**Pullback entry:** Price pulls back to 21 EMA in uptrend then bounces = high win-rate
**Golden Cross:** 50 SMA crosses above 200 SMA = major trend change, institutional signal
**Death Cross:** 50 SMA crosses below 200 SMA = exit signal, avoid longs

**Exit:**
- Close below 50 SMA on HIGH volume → reduce 25-50%
- Close below 200 SMA → full exit

### ADX — Trend Strength
```
< 20   = Choppy, no trend → avoid new positions
20-25  = Trend forming → watch
25-40  = Strong trend → trade with trend
> 40   = Very strong → hold, don't fight
> 60   = Exhaustion → consider partial exit
```
Rule: Only use RSI/MACD signals when ADX > 25. Below 25 = signals unreliable.

---

## PART 2: MOMENTUM INDICATORS

### RSI(14) Zones
```
< 30   = Oversold → buy if at support in uptrend
30-40  = Approaching → prepare entry
40-60  = Neutral → wait
60-70  = Approaching OB → hold
> 70   = Overbought → partial sell, no new buys
> 80   = Extreme OB → sell 50%+
```

**In strong uptrend (Cardwell):** RSI ranges 40-80. Buy at 40-50, not 30.
**In downtrend:** Do NOT buy RSI at 30. Wait for trend reversal first.

**RSI Divergence — Most Powerful Signal:**
```
BULLISH (best buy signal):
  Price = Lower Low | RSI = Higher Low
  → Selling pressure weakening, reversal imminent

BEARISH (best sell signal):
  Price = Higher High | RSI = Lower High
  → Buying pressure fading, top forming → exit 50-75%
```

### MACD (12,26,9)

**Entry:**
```
Bullish Crossover: MACD line crosses above Signal line
  + Histogram green and GROWING + price above 200 SMA = high conviction buy

Zero Line Cross (stronger): MACD crosses above zero = trend change confirmed
```

**Exit:**
```
Bearish Crossover: MACD below Signal + histogram red = trim 25-50%
Bearish Divergence: Price higher highs, MACD lower highs = partial exit now
```

**Histogram reading:**
```
Green + Growing   = Momentum up, accelerating → hold/add
Green + Shrinking = Momentum fading → tighten stop
Red + Growing     = Momentum down, accelerating → stay out
Red + Shrinking   = Momentum fading down → prepare to buy
```

### Stochastic RSI (14,3,3)
```
< 20 = Oversold → buy when crosses back above 20
> 80 = Overbought → sell when crosses back below 80
Most powerful: Stoch RSI oversold + RSI Bullish Divergence = very high probability reversal
```

---

## PART 3: VOLUME ANALYSIS

### Core Rules
```
Price UP + Volume UP     = Real move — trust it (institutional buying)
Price UP + Volume DOWN   = Fake move — caution (no conviction)
Price DOWN + Volume UP   = Real selling — exit or stay out
Price DOWN + Volume DOWN = Weak pullback — hold or add
```

### Key Volume Signals
```
Climax Volume (buy signal):
  Sharp price drop on MASSIVE volume (3-5x average)
  Price recovers same or next day
  → Selling exhaustion = major reversal likely

Volume Dry-Up (VDU) before breakout:
  Price consolidates in tight range
  Volume drops 50-70% below average
  Then price breaks out on HIGH volume
  → Classic O'Neil/CANSLIM breakout setup

Accumulation: Multiple days price holds/rises on HIGH volume
Distribution: Multiple days price falls on HIGH volume
Track 10-day pattern to determine which side dominates
```

---

## PART 4: PRICE PATTERNS

### Bullish Candles (Buy Signals)
```
Hammer:           Long lower wick (2-3x body), small body at top, at support
Bullish Engulfing: Large green covers prior red, on above-avg volume
Morning Star:     Large red → small doji → large green (3-candle reversal)
Pin Bar:          Very long wick rejecting level, small opposite body
```

### Bearish Candles (Sell/Exit Signals)
```
Shooting Star:    Long upper wick at resistance, small body at bottom
Bearish Engulfing: Large red covers prior green, at resistance on high volume
Evening Star:     Large green → small doji → large red
Doji at highs:    Open = Close after long uptrend = indecision = possible reversal
```

### Chart Patterns

**VCP — Volatility Contraction Pattern (Minervini)**
```
High → Correction 1 → Rally → Correction 2 (shallower) → Rally → Correction 3 (shallowest)
Each correction: smaller % decline + lower volume
Final tight consolidation with minimal price movement

Entry: Break above pivot on HIGH volume
Stop:  Below last pivot low (3-7%)
Key:   Each contraction MUST be shallower and on LOWER volume
```

**Cup with Handle (O'Neil)**
```
High → U-shaped decline → Return near high → Small pullback (handle)
Volume dries up in handle

Entry: Break above handle high on HIGH volume
Stop:  Below handle low
```

**Flat Base**
```
Tight 10-15% range for 5+ weeks on low volume, after prior 20%+ uptrend
Entry: Break above resistance on high volume
Most reliable pattern of all
```

**Double Bottom**
```
Support → Bounce → Retest support (slightly lower ok) → Bounce
Confirm with RSI Bullish Divergence on second bottom
Entry: Break above neckline (middle peak)
```

---

## PART 5: FIBONACCI & SUPPORT/RESISTANCE

### Fibonacci Retracement (Draw Low → High)
```
23.6% = Shallow — only in very strong trends
38.2% = Common — buy here in strong uptrend
50.0% = Institutional level ★★★ (most reliable)
61.8% = Golden Ratio — deepest before trend breaks
78.6% = Last defense — if broken, new low likely

Best entry: Bounce at 50% or 61.8%
  + RSI Bullish Divergence
  + Bullish candle confirmation
  + Volume declining on down move
= Maximum probability entry
```

### S/R Rules
```
Old resistance → becomes support after breakout
Old support → becomes resistance after breakdown
Round numbers ($100, $200, $500, $1000) = psychological resistance
More times level tested = stronger (until it finally breaks)
ATH = no prior supply overhead, only psychology as resistance
```

---

## PART 6: ENTRY FORMULAS

### Formula A — Pullback Entry (Low Risk)
Best for: DCA adds, long-term positions, Core Growth stocks
```
1. Stock in Stage 2 Uptrend (above 200 SMA)
2. RSI < 40 + price at 50 SMA or Fib 50-61.8%
3. Bullish candle + volume below average
4. Enter 30-40% → add when support proves (2-3 days hold)
5. Stop: 5-8% below support level
```

### Formula B — Breakout Entry (Momentum)
Best for: New positions, growth-bucket additions, strong trending stocks
```
1. Tight base formed (VCP or Flat Base, 3-8 weeks)
2. Price breaks above resistance/pivot
3. Volume ≥ 1.5x 20-day average on breakout day
4. MACD Histogram green and expanding
5. Enter 40-50% immediately → add on successful retest
6. Stop: 3-5% below breakout point
```

### Formula C — Reversal Entry (High Precision)
Best for: Major bottoms, larger position sizing, highest confidence setups
```
1. Selling climax volume (3-5x average) with recovery
2. RSI Bullish Divergence at Fib 50-61.8%
3. Bullish reversal candle (Hammer or Engulfing)
4. MACD Histogram red but shrinking
5. Enter 50% immediately → add 50% when price closes above 8 EMA
6. Stop: Below lowest recent wick
```

---

## PART 7: EXIT FRAMEWORK

### Profit Taking Ladder
```
+15-20% → Sell 15%
+25-30% → Sell 20% more (total out: 35%)
+40-50% → Sell 25% more (total out: 60%)
+80-100% → Sell 15% more (total out: 75%)
>100%   → Free ride 25%, use trailing stop
```

### Partial Exit Signals (sell 25-50%)
```
RSI > 75 after extended run
Bearish RSI Divergence confirmed
Price at Fib Extension 127.2% or 161.8%
MACD Bearish Crossover after 30%+ gain
Volume drying up after 3-5 up days (exhaustion)
Shooting Star or Bearish Engulfing at resistance
```

### Full Exit Signals
```
Price closes below 50 SMA on above-average volume
Death Cross forming (50 below 200 SMA)
Fundamental thesis broken
Stop loss triggered — NO EXCEPTIONS
ADX falling sharply from above 40
```

### Stop Loss Table
```
Position Type     Hard Stop    Trailing (after +20%)
Mega Cap          -12 to -15%  -12% from high
Mid Cap           -15 to -18%  -13% from high
Small Cap         -20 to -25%  -18% from high
```

### Trailing Stop Setup
```
After +20% gain: trail 12% below highest close
After +50% gain: trail 15% below highest close
After +100% gain: trail 20% below highest close
→ Never move stop WIDER once set
→ Only move stop UP (never down)
```

---

## PART 8: MULTI-TIMEFRAME ANALYSIS

```
Step 1 — Weekly Chart: Determine TREND DIRECTION
  Price above 40-week MA? (= 200-day daily)
  Higher Highs + Higher Lows?
  → This overrides all daily signals

Step 2 — Daily Chart: Find SETUP
  Pattern forming? (VCP/Cup/Flat Base)
  RSI + MACD confluence?
  Exact entry trigger?

Step 3 — 4-Hour Chart: Time ENTRY
  Bullish candle close?
  Volume confirming?
  Pull trigger here

Rule: NEVER trade against the weekly trend
      Weekly = direction | Daily = setup | 4H = execution
```

---

## PART 9: MARKET CONDITION FILTER

Check this BEFORE any trade:

```
VIX Level → Position Sizing
  < 15   = Low fear → full size
  15-25  = Normal  → standard size
  25-35  = Elevated → 50% size
  > 35   = High fear → 25% size or wait
  > 40   = Extreme → buying climaxes only

S&P 500 vs 200 SMA:
  Above = Bull market → play offense
  Below = Bear market → play defense (smaller size, no new longs)
  At level = Wait for direction

Market Breadth (% stocks above 200 SMA):
  > 60% = Healthy bull → buy breakouts
  40-60% = Mixed → selective
  < 40%  = Distribution → reduce exposure
```

---

## PART 10: POSITION SIZING

### Rule: Never risk more than 1-2% of total portfolio on one trade
```
Define from user's own numbers:
  P = total portfolio value (any currency)
  Max risk per trade = 1% × P  (use 2% only for highest conviction)

Calculation:
  Risk per share = Entry price − Stop price
  Position size (shares) = (Max risk per trade) ÷ (Risk per share)
  Convert currency if portfolio and stock are in different currencies.

Example:
  Entry = $100, Stop = $90 → risk per share = $10 (10%)
  If max risk per trade = 1% of P, then
    shares = (0.01 × P) ÷ ($10, converted to portfolio currency)

Tier sizing:
  Mega Cap (high conviction) = up to 2% portfolio risk
  Mid Cap (medium)           = up to 1.5% portfolio risk
  Small Cap (speculative)    = up to 1% portfolio risk
```

### Pyramiding — Add Only to Winners
```
Initial position: 40% of planned total
Add 1: 30% when up 5-10% and holding
Add 2: 20% on next breakout/continuation
Reserve: 10% opportunistic

NEVER average down on losers (except planned DCA into a core long-term position)
```

---

## NEVER IGNORE — RED LINES

```
EXIT IMMEDIATELY IF:
  Price breaks 200 SMA on 3x average volume
  Revenue declines 2+ consecutive quarters
  RSI Bearish Divergence at ATH with falling volume
  Hard stop loss triggered
  MACD Death Cross + price below 50 SMA together

NEVER DO:
  Move stop loss wider to "give it room"
  Average down on losing speculative position
  Buy breakout on low volume
  Buy in Stage 4 downtrend
  Hold through earnings without plan if up >30%
  Let a +20% gain become a loss (use trailing stop)
```

---

## DECISION TREE (Run This Every Time)

```
1. MARKET: S&P above 200 SMA? → YES = proceed / NO = reduce size
2. TREND:  Stock above 200 SMA + ADX > 25? → YES = tradeable
3. SETUP:  Pattern formed? VCP/Cup/Flat = Grade A | Pullback to MA = Grade B
4. SIGNALS (need 2-3):
   [ ] RSI in correct zone
   [ ] MACD confirming
   [ ] Volume confirms direction
   [ ] Bullish candle at entry level
   [ ] Fibonacci level holding
5. RISK:
   [ ] Stop loss set BEFORE entry
   [ ] Loss ≤ 1-2% of portfolio
   [ ] Profit ladder defined
6. FORMULA: A (pullback) | B (breakout) | C (reversal)
7. EXECUTE: 40-50% initial, add on confirmation
```

> DISCLAIMER: Educational purposes only. Not financial advice.
> All signals have failure rates. Risk management overrides all signals.
