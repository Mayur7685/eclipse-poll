// Eclipse Poll — attestation validity & display helpers.
//
// Eclipse Poll does NOT use FHEpoll's block-number decay model.
// Attestations are either valid or expired — the attestation API issues them
// and the ZK circuit verifies the Schnorr signature on-chain.
//
// This file retains the EV/VP%/CV UI model from FHEpoll's display layer
// but re-bases it on Unix time (seconds) instead of Ethereum block numbers.
// The decay periods are now measured in days, not blocks.
//
// | Periods completed | Days         | Voting Power |
// |-------------------|--------------|--------------|
// | 0                 | 0 – 29       | 100%         |
// | 1                 | 30 – 59      |  50%         |
// | 2                 | 60 – 89      |  25%         |
// | 3                 | 90 – 119     |  12.5%       |
// | 4                 | 120 – 149    |   6.25%      |
// | 5+                | 150+         |   0% (dead)  |
//
// In practice: for Eclipse Poll, most credential types (FREE, ALLOWLIST)
// don't expire. The decay UI is informational only.

const SECONDS_PER_DAY  = 86_400
const PERIOD_DAYS      = 30        // 30 days per decay period (vs 400 days in FHEpoll)
const PERIOD_SECONDS   = PERIOD_DAYS * SECONDS_PER_DAY
const MAX_PERIODS      = 5

// ─── Core calculations (all inputs are Unix timestamps in seconds) ─────────────

/** Number of completed 30-day periods since issuedAtSeconds. */
export function completedPeriods(issuedAtSeconds: number, nowSeconds: number): number {
  if (nowSeconds <= issuedAtSeconds) return 0
  return Math.min(
    Math.floor((nowSeconds - issuedAtSeconds) / PERIOD_SECONDS),
    MAX_PERIODS,
  )
}

/** Voting Power % (0–100). Step-function: halves every 30 days. */
export function votingPowerPct(issuedAtSeconds: number, nowSeconds: number): number {
  const p = completedPeriods(issuedAtSeconds, nowSeconds)
  if (p >= MAX_PERIODS) return 0
  return 100 / Math.pow(2, p)
}

/** Counted Votes = floor(EV × VP% / 100). */
export function countedVotes(ev: number, issuedAtSeconds: number, nowSeconds: number): number {
  return Math.floor(ev * votingPowerPct(issuedAtSeconds, nowSeconds) / 100)
}

/** Days elapsed since credential was issued. */
export function daysElapsed(issuedAtSeconds: number, nowSeconds: number): number {
  if (nowSeconds <= issuedAtSeconds) return 0
  return Math.floor((nowSeconds - issuedAtSeconds) / SECONDS_PER_DAY)
}

/** Days until the next decay period kicks in. */
export function daysUntilNextDecay(issuedAtSeconds: number, nowSeconds: number): number {
  const p = completedPeriods(issuedAtSeconds, nowSeconds)
  if (p >= MAX_PERIODS) return 0
  const nextBoundary = issuedAtSeconds + (p + 1) * PERIOD_SECONDS
  return Math.max(0, Math.ceil((nextBoundary - nowSeconds) / SECONDS_PER_DAY))
}

/** Progress 0–1 through the current 30-day period (for progress bar). */
export function periodProgress(issuedAtSeconds: number, nowSeconds: number): number {
  const p = completedPeriods(issuedAtSeconds, nowSeconds)
  if (p >= MAX_PERIODS) return 1
  const periodStart = issuedAtSeconds + p * PERIOD_SECONDS
  const elapsed = Math.max(0, nowSeconds - periodStart)
  return Math.min(1, elapsed / PERIOD_SECONDS)
}

// ─── UI colour helpers ────────────────────────────────────────────────────────

export function vpTextColour(vpPct: number): string {
  if (vpPct >= 100) return 'text-emerald-600'
  if (vpPct >= 50)  return 'text-blue-600'
  if (vpPct >= 25)  return 'text-amber-600'
  if (vpPct > 0)    return 'text-orange-600'
  return 'text-red-500'
}

export function vpBarColour(vpPct: number): string {
  if (vpPct >= 100) return 'bg-emerald-400'
  if (vpPct >= 50)  return 'bg-blue-400'
  if (vpPct >= 25)  return 'bg-amber-400'
  if (vpPct > 0)    return 'bg-orange-400'
  return 'bg-red-400'
}
