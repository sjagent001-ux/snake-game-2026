# SPEC Review Report: SPEC-GAME-CORE-001
Iteration: 1/3
Verdict: FAIL
Overall Score: 0.62

Adversarial audit per plan-auditor contract. Reasoning context (author's intent) ignored per M1 Context Isolation. Findings are based solely on spec.md, plan.md, acceptance.md, spec-compact.md, and cross-references against .moai/project/product.md and .moai/project/structure.md.

---

## Must-Pass Results

- [PASS] MP-1 REQ number consistency
  - REQ-LOOP-001..006 (spec.md:L61–66) — 6 sequential, no gaps.
  - REQ-STATE-001..009 (spec.md:L70–78) — 9 sequential, no gaps.
  - REQ-DOMAIN-001..012 (spec.md:L82–93) — 12 sequential, no gaps.
  - REQ-INPUT-001..007 (spec.md:L97–103) — 7 sequential, no gaps.
  - REQ-SCORE-001..010 (spec.md:L107–116) — 10 sequential, no gaps.
  - Total 44 REQs, zero-padding consistent (3 digits within module), no duplicates.

- [PASS] MP-2 EARS format compliance
  - All 44 REQs use one of: `shall` (Ubiquitous), `When ... shall` (Event-driven), `While ... shall` (State-driven), `If ... then ... shall` (Unwanted). Examples verified at spec.md:L61, L64, L70, L74, L77, L82, L87. No vague "should"/"may" wording in normative REQ text.

- [PASS] MP-3 YAML frontmatter validity
  - spec.md:L1–10 contains: `id`, `version`, `status`, `created`, `updated`, `author`, `priority`, `issue_number`. All 8 required fields present with correct types. `issue_number: 0` is acceptable per audit instructions (no git remote).

- [N/A] MP-4 Section 22 language neutrality
  - N/A: SPEC is scoped to a single-language project (TypeScript only — confirmed in spec.md:L22, plan.md:L75–82). The 16-language enumeration rule does not apply.

---

## Category Scores (0.0-1.0, rubric-anchored)

| Dimension | Score | Rubric Band | Evidence |
|-----------|-------|-------------|----------|
| Clarity | 0.65 | 0.50–0.75 | Most REQs are clear, but AC-2 (acceptance.md:L26–28) describes buffer behavior contradicting REQ-INPUT-002. Board.isOccupied signature ambiguous (REQ-DOMAIN-001 spec.md:L82 single-arg vs plan.md:L26 / spec.md:L174 four-arg). |
| Completeness | 0.70 | 0.50–0.75 | Required sections all present. 10-entry Exclusions concrete. But explicit Bootstrap 9-step list is absent from spec.md and plan.md — only referenced by external structure.md whose enumeration includes the excluded PowerUpSpawner/ParticleSystem steps. |
| Testability | 0.70 | 0.50–0.75 | Most ACs are binary-testable. Edge cases (AC-E1..E5) well-formed. AC-10 explicitly manual which is correct. But REQ-INPUT-006/007, REQ-DOMAIN-008/012, REQ-SCORE-002 have no Given/When/Then AC. localStorage edge cases (a)/(b)/(c) collapsed into AC-9 alone, missing dedicated JSON-parse and quota-exceeded scenarios. |
| Traceability | 0.60 | 0.50–0.75 | Many REQs map to ACs, but the following are orphaned (no Given/When/Then AC in acceptance.md): REQ-LOOP-002, REQ-DOMAIN-008, REQ-DOMAIN-012, REQ-INPUT-001 (key table), REQ-INPUT-006, REQ-INPUT-007, REQ-SCORE-002, REQ-SCORE-008 (mutation-free render), REQ-STATE-009 (onTransition listener API). |

---

## Defects Found

### D1. Bootstrap-order divergence between SPEC and structure.md — Severity: critical
- **Location**: spec.md:L33–38, plan.md:L56 (T-20 "structure.md 9단계 순서"), acceptance.md:L158, vs structure.md:L83–95.
- **Issue**: structure.md hardcodes a 9-step bootstrap order whose **step 4** explicitly lists `PowerUpSpawner` and **step 5** explicitly lists `ParticleSystem`. SPEC-GAME-CORE-001 explicitly EXCLUDES the power-up system (spec.md:L124, Exclusion #1) and the Particle/VFX system (spec.md:L127, Exclusion #4). The SPEC handwaves this with "ParticleSystem 자리에는 null 주입" (spec.md:L38, acceptance.md:L158) but does NOT redefine the 9 steps locally, does NOT explicitly remove `PowerUpSpawner` from the order, and plan.md T-20 (plan.md:L56) defers entirely to structure.md. The audit instruction (item 6) requires bootstrap order to be **identical** across spec.md / plan.md / structure.md — it is not.
- **Fix**: Add a verbatim 9-step (or revised N-step) bootstrap list to spec.md §5 or §6, removing the `PowerUpSpawner` step and replacing `ParticleSystem` with `null` injection. Mirror the same list in plan.md T-20 (do not rely on the stale external doc). Either update structure.md or annotate spec.md that structure.md is stale w.r.t. this SPEC's exclusions and must be reconciled in a sync phase.

### D2. AC-2 buffer semantics contradict REQ-INPUT-002 — Severity: critical
- **Location**: acceptance.md:L26–28 vs spec.md:L98–100.
- **Issue**: REQ-INPUT-002 (spec.md:L98) states "Successive direction key presses within the same tick **shall** **overwrite** the previously buffered direction." AC-2 (acceptance.md:L27) states: "마지막 입력인 ArrowLeft 는 ... 폐기된다. 직전 입력 ArrowUp 은 슬롯 1개 버퍼에 의해 덮어쓰기 대상이었지만 **마지막 입력 폐기 후에는 슬롯이 유지된다**." This implies the reverse-direction check happens at **input time** before overwrite, contradicting REQ-INPUT-003's "subject to REQ-INPUT-004" semantic which positions the discard at tick-apply time. Two contradictory mechanics: (a) at-input-discard preserves prior valid input, (b) at-tick-discard discards along with already-overwritten prior. Implementation cannot satisfy both readings — RED tests will fork.
- **Fix**: Decide one mechanic and rewrite both REQ and AC consistently. Recommend at-input-time validation (i.e., REQ-INPUT-002 becomes: "Direction keys whose mapped direction is opposite of the current direction are not buffered; otherwise the buffer is overwritten by the latest valid direction"). Then AC-2's "ArrowUp preserved" outcome follows naturally. Alternatively, change AC-2's "Then" to: "Buffer holds ArrowLeft, then at next tick REQ-INPUT-004 discards it and snake continues right" — both REQ-INPUT-002/004 then apply at tick time only.

### D3. Pause key contradicts product.md state machine — Severity: critical
- **Location**: spec.md:L72–73 (REQ-STATE-003/004), spec.md:L102 (REQ-INPUT-006), spec.md:L101 (REQ-INPUT-005) vs product.md:L69–84.
- **Issue**: product.md defines the state machine with **Space** as the pause toggle (product.md:L69–77 diagram shows `running ──(Space)──► paused`, `paused ──(Space)──► running`; product.md:L83 row "running" lists trigger "Space → paused"). SPEC-GAME-CORE-001 redefines the toggle key to **P** (REQ-STATE-003/004) and explicitly prohibits Space in running/paused (REQ-INPUT-006 spec.md:L102). product.md is the source of truth for product UX; SPEC silently overrides it without HISTORY entry or justification. This is a product-level contract break, not a SPEC-internal refinement.
- **Fix**: Either (a) revert SPEC to use Space for pause toggle and remove P-key mapping, or (b) explicitly amend product.md and add a HISTORY entry in spec.md documenting the rationale ("Space reserved for idle→running only to avoid accidental pause; P chosen as conventional pause key"). Audit item 4 (Non-goal alignment) demands product.md alignment. Either path must be applied; silent contradiction is a defect.

### D4. Board.isOccupied signature inconsistency — Severity: major
- **Location**: spec.md:L82 (REQ-DOMAIN-001) vs plan.md:L26 (T-5) vs plan.md:L174 (MX:ANCHOR list).
- **Issue**: REQ-DOMAIN-001 declares the predicate as `isOccupied(cell)` (single arg, no occupant injection). plan.md T-5 implements `isOccupied(cell, snake, obstacles, food)` (4 args). MX-ANCHOR row at plan.md:L174 lists `Board.isOccupied(cell, ...occupants)` (variadic). Three different signatures for the same anchor function — implementation will pick one and the SPEC tests will fail or be vacuous.
- **Fix**: Choose a single signature. Recommend `isOccupied(cell: SnakeSegment, occupants: { snake: Snake; obstacles: Obstacle[]; food: Food | null }): boolean` for testability and explicit dependency injection (avoids Board reaching into other domain classes — keeps REQ-DOMAIN-012 single-direction rule intact). Update REQ-DOMAIN-001, T-5, and MX-ANCHOR table to match exactly.

### D5. localStorage key inconsistency with product.md — Severity: major
- **Location**: spec.md:L110 (REQ-SCORE-004) vs product.md:L101.
- **Issue**: product.md:L101 specifies the localStorage key as `snake2026_highscore`. spec.md REQ-SCORE-004 specifies `snake-game-2026.highscore`. Two distinct keys. Any user upgrading from a prior MVP/prototype using product.md's key will lose their high score; tests written against one key will not validate the other.
- **Fix**: Pick one key string and ensure spec.md, acceptance.md (AC-8 currently uses the SPEC's key at acceptance.md:L71), plan.md, and product.md all agree. Add a HISTORY entry if the key was deliberately changed.

### D6. localStorage edge-case AC coverage incomplete — Severity: major
- **Location**: acceptance.md:L76–80 (AC-9) and absence of dedicated ACs for JSON-parse failure and quota-exceeded write.
- **Issue**: Audit item 11 requires explicit AC coverage of (a) localStorage unavailable / private mode, (b) JSON parse failure on read, (c) quota exceeded on write — each with a silent-fallback verification. AC-9 covers only (a) (Object.defineProperty throwing on access). REQ-SCORE-005 (spec.md:L111) mentions parse failure returns 0 but has no Given/When/Then. plan.md R-3 (plan.md:L122) describes test scenarios for (a)/(b)/(c) but those are test scenarios, not acceptance criteria — they cannot substitute for AC traceability.
- **Fix**: Add two new acceptance criteria:
  - **AC-9b (JSON parse failure on read)**: Given `localStorage.getItem("snake-game-2026.highscore")` returns `"NOT_JSON"`. When `LocalStorageAdapter.loadHighScore()` is called. Then it returns `0` and does not throw.
  - **AC-9c (Quota exceeded on write)**: Given `localStorage.setItem` throws `QuotaExceededError`. When `LocalStorageAdapter.saveHighScore(150)` is called. Then no exception propagates; subsequent `loadHighScore()` within the same session returns `150` from `inMemoryFallback`.

### D7. Orphan REQs without acceptance traceability — Severity: major
- **Location**: acceptance.md (entire file) vs spec.md:L61–116.
- **Issue**: The following REQs have no corresponding Given/When/Then scenario (neither core AC-1..10 nor edge AC-E1..E5):
  - **REQ-LOOP-002** (TickScheduler accumulator decrement) — only referenced by plan.md R-1 as a test scenario, no AC entry.
  - **REQ-DOMAIN-008** (obstacle list immutable while running) — no AC.
  - **REQ-DOMAIN-012** (domain layer single-direction import rule) — only in DoD §3.4 (acceptance.md:L157) as a checkbox, not as a Given/When/Then.
  - **REQ-INPUT-001** (full key-mapping table for arrows/WASD/Space/P/R + ignore others) — implicit only.
  - **REQ-INPUT-006** (Space ignored in running/paused) — no AC.
  - **REQ-INPUT-007** (`event.preventDefault()` on mapped keys) — no AC.
  - **REQ-SCORE-002** (read-only `currentScore`/`highScore` fields) — no AC.
  - **REQ-SCORE-008** (Renderer reads snapshot without mutation) — only AC-10 manual.
  - **REQ-STATE-009** (`onTransition(callback)` listener API) — no AC.
- **Fix**: Add minimal Given/When/Then ACs (or merge into existing ACs explicitly listing the REQ-ID) for each orphan. At minimum, add: (a) AC for REQ-INPUT-006 (Space pressed while running → state unchanged), (b) AC for REQ-INPUT-007 (mapped keydown → `event.preventDefault` is called — verifiable via spy), (c) AC for REQ-STATE-009 (registered callback fires on transition with `(from, to)` payload), (d) AC for REQ-DOMAIN-008 (in running state, obstacle list reference identity preserved across N ticks).

### D8. Renderer task T-19 has 0 tests for production code — Severity: major
- **Location**: plan.md:L55 (T-19) and plan.md:L54 (T-18).
- **Issue**: T-19 Renderer ("Canvas 2D, render(alpha), 단색 fillRect, ParticleSystem 인자는 null 허용") is production code with 0 tests, justified as "수동 시각 검증". T-18 ThemeRegistry similarly 0 tests. Renderer's `null`-safe ParticleSystem branching, snapshot-read-without-mutation contract (REQ-SCORE-008), and color-token lookup (REQ-SCORE-009) are unit-testable using jsdom Canvas mocks (`getContext('2d')` returns a mock with `fillRect`/`clearRect` spies). ThemeRegistry.register/getActive are pure functions trivially testable. Zero tests for these is a TDD discipline violation per the SPEC's own §3.3 Tested DoD (acceptance.md:L149).
- **Fix**: Update T-18 to include a `tests/render/ThemeRegistry.test.ts` with at minimum: registers a theme, retrieves active by name, default theme is `neon`, unknown theme name throws or returns default. Update T-19 to include `tests/render/Renderer.test.ts` with at minimum: (a) `render(alpha)` calls `ctx.clearRect` then `ctx.fillRect` for snake/food/obstacles, (b) `render(alpha)` with `particles: null` does not throw and skips particle drawing, (c) domain snapshot is read but not mutated (assert shallow-equal before/after), (d) color values from active theme are passed to `ctx.fillStyle`. Suggest 4–6 tests for Renderer, 3–4 for ThemeRegistry.

### D9. AC-10 automation boundary unclear; REQ-LOOP-005 mixes auto + manual — Severity: minor
- **Location**: acceptance.md:L82–87 (AC-10), spec.md:L65 (REQ-LOOP-005).
- **Issue**: REQ-LOOP-005 ("loop remains stable across 30–144 FPS without altering visible movement speed") is partially automatable (TickScheduler test: feed 16ms × N frames vs 7ms × N frames, assert identical tick count per real-time second). plan.md R-1 (plan.md:L110–111) actually plans this automation. But AC-10 (acceptance.md:L87) blankets all of REQ-LOOP-003/005 and REQ-SCORE-007 as "수동 시각 검증" with no automation. The automated portion of REQ-LOOP-005 is invisible in acceptance.md.
- **Fix**: Split AC-10 into AC-10a (automated TickScheduler determinism — verify equal tick count at 30 FPS vs 144 FPS frame inputs over the same simulated wall time) and AC-10b (manual visual verification of sub-grid smoothness in `npm run preview`). Move AC-10a into core scenarios; keep AC-10b explicitly manual.

### D10. Direction "initial direction" undefined in REQ/AC — Severity: minor
- **Location**: spec.md:L70 (REQ-STATE-001 "Initial state ... idle"), acceptance.md:L20 (AC-1 "뱀이 초기 방향(예: 오른쪽)으로 이동을 시작한다").
- **Issue**: AC-1 mentions "초기 방향(예: 오른쪽)" with `예:` (e.g.) — leaving the initial direction unspecified ("for example" is weasel framing in normative content). REQ-DOMAIN-002 (spec.md:L83) defines segment ordering but no initial direction. RED test for AC-1 will need an arbitrary choice; implementation may pick differently than tester.
- **Fix**: Add to REQ-DOMAIN-002 or REQ-STATE-002 a sentence such as: "On `idle → running` transition (REQ-STATE-002), the snake's initial direction shall be `right`, and its initial head position shall be cell `(floor(BOARD_WIDTH/2), floor(BOARD_HEIGHT/2))` with length 3 extending leftward." Then AC-1's "예: 오른쪽" becomes deterministic.

### D11. AC-E1 outcome ambiguous (win vs continue) — Severity: minor
- **Location**: acceptance.md:L94–97.
- **Issue**: AC-E1 Then says: "FoodSpawner.spawn(...) 가 null 을 반환하고 예외를 던지지 않는다. **게임은 승리 상태로 처리 가능(향후 SPEC 결정)**하거나 running 상태를 유지하며 더 이상 먹이가 없는 상태가 된다." Two alternative outcomes presented; "향후 SPEC 결정" defers behavior to a non-existent SPEC. This is TBD-language in normative content (audit item 10).
- **Fix**: Decide one MVP behavior now. Recommend: "Game remains in running state; no new food is spawned. Subsequent ticks continue snake movement until a collision occurs." This matches "FoodSpawner returns null and game stays playable" semantics. Remove the "향후 SPEC 결정" deferral.

### D12. AC-7 uses real-time "5초 동안" weasel-style timing — Severity: minor
- **Location**: acceptance.md:L63.
- **Issue**: AC-7 Given says "이후 5초 동안 추가 입력이 없다." For a deterministic unit test, real wall-clock seconds are inappropriate — should be tick count or scheduler-injected time. Acceptable for a manual-test acceptance, but AC-7's 검증 방법 is "StateMachine.test.ts 에서 paused 상태의 update 무시 검증" — i.e., unit test, where "5 seconds" is unverifiable.
- **Fix**: Rephrase to "이후 N tick에 해당하는 시간이 경과한다" with an explicit small N (e.g., 10) or "TickScheduler가 추가 10회 update를 시도한다". Confirms paused state ignores all 10 attempted updates.

### D13. AC-3 implicit food respawn count not bounded — Severity: minor
- **Location**: acceptance.md:L35.
- **Issue**: AC-3 Then (d): "FoodSpawner.spawn(...) 이 호출되어 새 먹이가 빈 셀(뱀·장애물 비충돌) 중 하나에 배치된다." But REQ-DOMAIN-005 (spec.md:L86) says "uniformly random empty cell" — the AC doesn't bound the new food's cell to `≠` the cell vacated by consumption or `≠` snake's new head. Trivial concerns but the AC could fail nondeterministically if a tester wrote `expect(newFood.cell).not.toEqual(oldFood.cell)`.
- **Fix**: Tighten AC-3 (d): "FoodSpawner.spawn(...) returns a Food whose cell ∉ snake.segments ∪ obstacles. The cell may be any other empty cell on the board."

---

## Chain-of-Verification Pass

Re-read each section to find missed defects:

- **Re-checked REQ numbering end-to-end**: Confirmed no gaps in any of the 5 modules. spec-compact.md mirrors spec.md numbering — consistent.
- **Re-checked all 44 REQs for EARS keywords**: Found one borderline case at REQ-SCORE-008 (spec.md:L114) "shall lerp the head and tail pixel positions" — interpretable as Ubiquitous "shall"; passes.
- **Re-verified traceability for every REQ, not just sample**: Cross-checked all 44 REQs against AC-1..10 and AC-E1..E5. The 9 orphans listed in D7 are the comprehensive set.
- **Re-checked Exclusions for specificity**: Exclusions 1–4 explicitly enumerate filenames (PowerUp.ts, ParticleSystem.ts) and SPEC IDs (SPEC-POWERUP-001 etc.) — good specificity. Exclusion 5–10 use natural-language scope — acceptable. No vague "TBD" entries in Exclusions.
- **Re-scanned for contradictions across requirements**:
  - Found D2 (REQ-INPUT-002 vs AC-2).
  - Found D3 (REQ-STATE-003/004 vs product.md state diagram).
  - Found D4 (REQ-DOMAIN-001 vs T-5 vs MX-ANCHOR signature mismatch).
  - Found D5 (REQ-SCORE-004 key vs product.md key).
- **Re-checked Exclusions vs REQ/AC for leakage**: Confirmed POWER-UP, LEVEL, LEADERBOARD, VFX are firmly excluded — no leak into REQ/AC/plan tasks. The `multiplier=1.0` parameter on `applyFoodScore` (REQ-SCORE-001) and `ParticleSystem | null` Renderer arg (spec.md:L38) are structural placeholders only, with no logic in this SPEC. PASS on audit item 3 and 5.
- **Verified mx_plan does not surface excluded scope**: plan.md §5 lists `applyFoodScore(multiplier?: number)` as ANCHOR — acceptable (the parameter is the structural hook). PowerUp-specific logic is absent from mx_plan.
- **Re-checked Non-goal alignment vs product.md**: product.md Non-goals (backend, online ranking, payments, native app, multiplayer) — SPEC does NOT assume any of these. Confirmed at spec.md:L131 (Exclusion #8 references product.md Non-goals). PASS on audit item 4.
- **Re-checked Bootstrap consistency**: Found D1 — structure.md 9-step list includes excluded modules. spec.md does not enumerate locally. plan.md T-20 defers to structure.md without amendment. Confirmed defect.
- **Re-checked task graph soundness (audit item 7)**: T-1..T-3 (foundation) → T-4 (SnakeSegment) → T-5 (Board) → T-6/T-7/T-8 (Snake/Food/Obstacle) → T-9/T-10 (Spawner/Layout) → T-11/T-12/T-14/T-15/T-17 → T-13 (GameLoop after Scheduler+StateMachine) → T-16 (Keyboard after StateMachine) → T-18/T-19 (Theme/Renderer after Snake/Board/Food/Obstacle/Interpolator) → T-20 (main.ts last). Order is sound. PASS on audit item 7.
- **Re-checked test count realism (audit item 8)**: T-1=0, T-2=0, T-3=0, T-18=0, T-19=0, T-20=0 — config/scaffold tasks at 0 are acceptable. **Renderer T-19 and ThemeRegistry T-18 at 0 tests is a defect** (see D8). T-6 Snake=10, T-12 StateMachine=12, T-16 KeyboardHandler=9, T-15 LocalStorageAdapter=7 — realistic.
- **Re-checked direction buffer (audit item 13)**: REQ-INPUT-002 (one-slot, overwrite) + REQ-INPUT-004 (discard opposite direction, "preventing same-tick 180° reversal") both explicit at spec.md:L98 and L100. Mechanic is stated, but D2 (semantic ambiguity at input vs tick time) remains a defect.
- **Re-checked seed determinism (audit item 12)**: REQ-DOMAIN-007 (spec.md:L88) is explicit. AC-E2 (acceptance.md:L102–105) verifies. PASS.
- **Re-checked TBD/placeholder content (audit item 10)**: Found one TBD instance — AC-E1's "향후 SPEC 결정" (D11). Otherwise clean.
- **New finding during chain-of-verification**: D14 below.

### D14. plan.md §6 roadmap and spec.md §6 roadmap duplicated — Severity: minor
- **Location**: spec.md:L191–200 vs plan.md:L200–211.
- **Issue**: Same roadmap table appears in two files with near-identical content but plan.md adds an extra detail per row ("TickScheduler.setInterval(ms) 메서드 신설"). Duplication risks drift; the "after-SPEC roadmap" is information-only and should live in one place.
- **Fix**: Keep the roadmap in spec.md only (it is forward-looking context). Replace plan.md §6 with a one-line pointer: "See spec.md §6 for the post-SPEC roadmap. plan.md is implementation-scoped only."

---

## Regression Check (Iteration 2+ only)

N/A — first iteration. No prior report to regress against.

---

## Strengths

For balance, the following SPEC properties were verified as well-executed:

- **EARS discipline**: 44/44 REQs use formal EARS keywords. No "should"/"may" leakage.
- **Exclusions specificity**: 10 entries with concrete module names and forward-SPEC pointers. POWER-UP/LEVEL/LEADERBOARD/VFX firmly out-of-scope.
- **Architecture hooks**: `StateMachine.onTransition` (REQ-STATE-009), `ScoreCalculator.applyFoodScore(multiplier=1.0)` (REQ-SCORE-001), `Renderer(... ParticleSystem | null)` (spec.md:L38), `FoodSpawner` interface separation, `LocalStorageAdapter` try/catch (REQ-SCORE-006) — all present as structural placeholders without leaking excluded logic. Audit item 5 satisfied.
- **Task graph soundness**: 4-stage decomposition (Foundation → Domain Core → Engine/Score/Input → Render/Bootstrap) with correct dependency ordering. Bootstrap last. (Audit item 7 PASS.)
- **Risk register**: plan.md §3 enumerates 6 concrete risks (R-1..R-6) each with priority and mitigation plan referencing specific REQs. Above average for SPEC quality.
- **MX tag plan**: 5 ANCHOR functions, 4 NOTE rules, 3 WARN sites with `@MX:REASON`, TODO markers — comprehensive.
- **Seed determinism**: REQ-DOMAIN-007 + AC-E2 + plan.md R-5 (Mulberry32) gives a complete, testable determinism contract. (Audit item 12 PASS.)
- **DoD breakdown**: acceptance.md §3 splits Definition of Done across functional / automation / TRUST5 / architecture / MX / docs — concrete checkboxes.

---

## Recommendation

**Verdict: FAIL.** Three critical defects (D1 bootstrap divergence, D2 AC-2 contradicting REQ-INPUT-002, D3 pause-key contradicting product.md) and four major defects (D4 signature mismatch, D5 storage-key mismatch, D6 missing edge ACs, D7 orphan REQs, D8 zero-test Renderer/ThemeRegistry) make this SPEC unsafe to enter Run phase. RED tests cannot be written deterministically against contradictory REQs/ACs; product UX silently diverges from product.md.

Required fixes for iteration 2 (in order of priority):

1. **D3 (pause key)**: Decide Space vs P for pause toggle. Either revert REQ-STATE-003/004 to Space (and remove REQ-INPUT-006) or amend product.md with HISTORY entry justifying the P-key change.
2. **D2 (AC-2 buffer semantics)**: Choose at-input-time validation OR at-tick-time validation for the reverse-direction discard. Rewrite REQ-INPUT-002/003/004 and AC-2 consistently.
3. **D1 (bootstrap order)**: Add an explicit, locally-defined N-step bootstrap list to spec.md §5 (or new §5.4) that removes `PowerUpSpawner` and replaces `ParticleSystem` with `null`. Mirror in plan.md T-20. Either update structure.md or note its staleness.
4. **D4 (isOccupied signature)**: Pick one signature. Update REQ-DOMAIN-001, plan.md T-5, and MX-ANCHOR table.
5. **D5 (storage key)**: Align spec.md REQ-SCORE-004 with product.md:L101 (or update product.md).
6. **D6 (missing edge ACs)**: Add AC-9b (JSON parse failure) and AC-9c (quota exceeded).
7. **D7 (orphan REQs)**: Add at least 4 missing ACs (REQ-INPUT-006, REQ-INPUT-007, REQ-STATE-009, REQ-DOMAIN-008).
8. **D8 (Renderer/ThemeRegistry tests)**: Add test files with 4–6 and 3–4 tests respectively.
9. **D9 (AC-10 automation boundary)**: Split into AC-10a (automated FPS-independence) + AC-10b (manual visual).
10. **D10 (initial direction)**: Pin initial direction and head cell explicitly.
11. **D11 (AC-E1 outcome)**: Remove "향후 SPEC 결정" deferral; pin to "remain in running, no new food".
12. **D12 (AC-7 5-second timing)**: Replace with N-tick count.
13. **D13 (AC-3 food respawn bound)**: Tighten to `cell ∉ snake.segments ∪ obstacles`.
14. **D14 (roadmap duplication)**: Move roadmap to spec.md only; plan.md links to it.

After these fixes, iteration 2 should re-verify: bootstrap parity across docs; AC-2 internal consistency; pause-key alignment with product.md; signature parity across REQ/plan/MX-ANCHOR; full REQ→AC traceability map; non-zero test counts for all production-code tasks.
