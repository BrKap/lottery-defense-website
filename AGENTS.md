# Calculator numeric precision

The user requires all future game/calculator calculation work to account for
SC2's 12 fractional bits: **1/4096 = 0.000244140625**. Follow
[the precision policy](Documentation/implementationprogress/calculation-evidence-and-precision.md)
and [the Required DPS plan](Documentation/game-code-analysis/required-dps-plan.md).

- Quantize modeled engine fixed values and intermediate fixed operations, retain
  integer counts and explicit integer conversions, and preserve source order.
- Add a searchable `SC2_FIXED_4096` comment to each new or migrated calculation
  block. State the helper/policy used and any intentional exception for empirical
  coefficients, expected-value statistics, wide aggregates or display formatting.
- Do not claim a formula uses fixed precision merely by adding a comment. Use a
  tested precision helper, document conversion boundaries and rounding, and mark
  any unresolved engine behavior as an assumption.
- The extractor currently assumes truncation toward zero; engine rounding and
  timer scheduling are not verified. Keep policy configurable and record it in
  generated evidence. A 1/4096 numeric step is not a simulation time step.
- Existing calculator formulas remain legacy until individually migrated and
  tested. Preserve their empirical references for comparison; do not silently
  double-correct fitted constants or globally rewrite prior calculations.
