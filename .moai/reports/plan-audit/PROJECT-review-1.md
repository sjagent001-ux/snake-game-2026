# Project Documentation Audit Report — snake-game-2026

Verdict: FAIL
Iteration: 1/3
Document type: project
Audit date: 2026-05-25

Reasoning context ignored per M1 Context Isolation. This audit judges product.md, structure.md, and tech.md on their own merit. No interview or reasoning artifacts were consulted.

---

## Summary

Three Korean-language project documents cover the snake-game-2026 MVP scope, structure, and tech stack with generally good craftsmanship. However, multiple concrete defects exist: a missing toolchain dependency (jsdom), a non-existent UI input path for the "restart button" referenced in product.md, an internal contradiction between product.md and tech.md on which keys start the game from idle, an ambiguous sound scope, and a numerical inconsistency about the count of power-up types. These defects prevent a PASS verdict.

---

## Defects Found

### D1 — Critical: Toolchain dependency missing (jsdom not listed)
- File: tech.md:43-53 (devDependencies table)
- Cross-ref: structure.md:139 ("score/`: ... jsdom 환경"); structure.md:146 ("테스트 환경(`jsdom`)")
- Severity: critical
- Description: structure.md explicitly states the Vitest test environment is `jsdom`, and the LocalStorageAdapter tests require a DOM-like environment. Vitest does NOT bundle jsdom; it requires the user to install `jsdom` (or `happy-dom`) as a devDependency. The devDependencies table in tech.md omits jsdom entirely. Following tech.md verbatim, `npm run test` would fail with "Cannot find module 'jsdom'" the first time tests in a jsdom environment run.
- Fix: Add `jsdom` (or `happy-dom`) to the tech.md devDependencies table with version `^24.x` (or equivalent) and a role description such as "Vitest의 `jsdom` 테스트 환경 제공".

### D2 — Major: Contradictory input mapping between product.md and tech.md (idle → running trigger)
- File: product.md:81 vs tech.md:149
- Severity: major
- Description: product.md line 81 says the idle → running transition is triggered by "스페이스 또는 방향키" (Space OR a direction key). tech.md line 149 maps Space alone to "idle → running 시작" and tech.md lines 145-148 describe direction keys only as in-game movement, not as a state-start trigger. A reader implementing KeyboardHandler from tech.md would not start the game on a direction key, contradicting product.md's stated behavior.
- Fix: Pick one rule. Either (a) update tech.md line 149 to "Space 또는 방향키" with the same idle→running semantics, or (b) update product.md line 81 to "스페이스 → running" only. Reflect the chosen rule consistently in structure.md's `KeyboardHandler` description (line 124).

### D3 — Major: "재시작 버튼" referenced but no input module supports mouse/click
- File: product.md:84 (state machine table — gameover transition)
- Cross-ref: structure.md:42-43 (`input/KeyboardHandler.ts` is the only input module); tech.md:143-153 (keyboard-only interaction table)
- Severity: major
- Description: product.md line 84 says gameover → idle is triggered by "R 또는 재시작 버튼". The term "버튼" (button) implies a clickable UI element, but: (a) structure.md `src/input/` contains only `KeyboardHandler.ts` — no mouse/pointer/click handler module is planned; (b) tech.md "접근성 / 키보드 인터랙션" section explicitly says "캔버스 게임의 특성상 키보드 조작이 유일한 인터랙션 채널이다" (keyboard is the SOLE interaction channel); (c) no module owns DOM button mount/event-binding. A developer following the structure verbatim cannot implement the restart button.
- Fix: Either (a) remove "재시작 버튼" from product.md:84 and leave R as the only trigger, or (b) add a `src/input/PointerHandler.ts` (or equivalent UI input module) to structure.md, document the canvas overlay/HTML button in render/, and remove the "유일한 인터랙션 채널" claim from tech.md:153.

### D4 — Major: "사운드/음악" scope is ambiguous — both excluded and partially in-scope
- File: product.md:111
- Severity: major
- Description: The Non-goals header (line 106) declares the listed features are "이번 버전에서 의도적으로 제외한다" (intentionally excluded from this version). Yet line 111 says "**사운드/음악**: 기본 음소거. UI 버튼으로 선택적 활성화는 향후 과제." (Sound/music: default muted. UI button for opt-in is a future task.) "기본 음소거" implies sound IS implemented (just muted by default), which contradicts the "intentionally excluded" framing of Non-goals. A reader cannot determine whether to scaffold an audio module or omit it entirely.
- Fix: Choose one position. If sound is fully out-of-scope, change line 111 to read "사운드/음악: 본 버전에서는 완전히 제외. 추후 추가 예정." If sound assets are loaded but muted, move it out of Non-goals into a separate "구현되었으나 비활성화된 기능" section. Reflect the decision in structure.md (add/remove `src/audio/` module).

### D5 — Major: Power-up count inconsistency in success criteria
- File: product.md:134
- Cross-ref: product.md:22-28 (3 power-up effects: speed, doubleScore, invincible)
- Severity: major
- Description: Success criterion #3 says "파워업 4종(일반 포함), 장애물 배치, sub-grid 보간 이동, 파티클 이펙트가 실제 게임 플레이에서 모두 정상 동작한다." Counting "일반 먹이" as a power-up type is incorrect — product.md lines 22-28 clearly enumerate exactly 3 power-up effects (속도 변화, 점수 2배, 무적), and line 59 explicitly separates "일반 먹이" from "파워업 먹이". structure.md `PowerUp.ts` (line 106) lists only the 3 effects (`speed` / `doubleScore` / `invincible`). The success criterion either undercounts effects (should be 3 distinct power-up effects) or wrongly bundles normal food.
- Fix: Change product.md:134 to "파워업 3종(속도 변화, 점수 2배, 무적), 일반 먹이, 장애물 배치, sub-grid 보간 이동, 파티클 이펙트가 ..." or equivalent precise wording.

### D6 — Minor: `tsc && vite build` emits .js next to .ts source
- File: tech.md:92 (package.json build script)
- Severity: minor
- Description: The build script `"build": "tsc && vite build"` runs `tsc` without `--noEmit`. Given structure.md tsconfig.json does NOT specify `noEmit: true` (line 147 only mentions strict/target/moduleResolution), running `tsc` will emit compiled `.js` files into `src/` alongside sources before `vite build` runs. The conventional Vite+TS pattern is `tsc --noEmit && vite build` (type-check only) or `tsc -b && vite build` with a `tsconfig.node.json` setup.
- Fix: Change tech.md:92 to `"build": "tsc --noEmit && vite build"`, OR add `"noEmit": true` to the tsconfig.json description in structure.md:147.

### D7 — Minor: Vite "TypeScript 플러그인" description is inaccurate
- File: structure.md:145
- Severity: minor
- Description: structure.md describes `vite.config.ts` as containing "TypeScript 플러그인" configuration. Vite has native TypeScript transpilation (via esbuild) and does NOT require or use a "TypeScript plugin". A reader configuring vite.config.ts per this description may waste effort searching for a non-existent plugin.
- Fix: Replace "TypeScript 플러그인" with accurate Vite plugin examples such as "필요 시 path alias 또는 빌드 옵션 설정" or remove the plugin reference.

### D8 — Minor: "벽 모드" is ambiguous — toggleable or always-on?
- File: product.md:30-35
- Severity: minor
- Description: The feature title "장애물 / 벽 모드 (Obstacle & Wall Mode)" suggests a "mode" that can be toggled. However, product.md never specifies whether obstacles are always present or selectable per game session. If toggleable, where is the toggle (no mode-select UI is mentioned in structure.md or tech.md key bindings)? If always-on, "모드" terminology is misleading.
- Fix: Either (a) clarify in product.md:30 "모든 게임에서 항상 활성화" and rename to "장애물 / 벽", or (b) describe the toggle mechanism (key, menu, or config) and add the supporting input/UI element to structure.md.

### D9 — Minor: Double-score × power-up scoring edge case undefined
- File: product.md:90-96 (scoring table)
- Severity: minor
- Description: The scoring table specifies "점수 2배 효과 중 일반 먹이 섭취 | +20점" (normal food during doubleScore = +20). It does NOT specify the score for "점수 2배 효과 중 파워업 먹이 섭취" — should it be 15×2 = 30, or 15 flat? A developer implementing ScoreCalculator (structure.md:130) has no rule to follow.
- Fix: Add an explicit row, e.g. "점수 2배 효과 중 파워업 먹이 섭취 | +30점 (15 × 2)" — or state the general rule "점수 2배 효과 중에는 모든 점수 가산값에 2배 배율 적용".

### D10 — Minor: Render-layer success criterion lacks any automated verification path
- File: product.md:134 (criterion #3 "파티클 이펙트가 ... 정상 동작") vs tech.md:173-174 (TDD scoped to domain/engine only)
- Severity: minor
- Description: Success criterion #3 requires particles to work, but tech.md restricts TDD coverage to domain/engine layers (80% target). structure.md tests/ directory contains no `render/` subdirectory. As written, "particles work" cannot be verified by the planned CI; only manual visual inspection can confirm it. This is acceptable but should be acknowledged.
- Fix: Either (a) add a one-line note in product.md success criteria that render-layer verification is manual, or (b) add a minimal `tests/render/ParticleSystem.test.ts` to structure.md to cover lifecycle/pool logic.

### D11 — Minor: LocalStorageAdapter has no planned test file despite being a success criterion
- File: structure.md:47-57 (tests directory)
- Cross-ref: product.md:135 (success criterion #4 — localStorage persistence)
- Severity: minor
- Description: product.md success criterion #4 makes localStorage persistence a must-pass criterion. structure.md tests/score/ contains only `ScoreCalculator.test.ts` and no `LocalStorageAdapter.test.ts`. Since vitest already runs in jsdom (which exposes window.localStorage), the adapter is testable. Its absence is a coverage gap on a stated success criterion.
- Fix: Add `tests/score/LocalStorageAdapter.test.ts` to structure.md:55-57 with a one-line description "최고점수 저장/복원 + 예외 폴백 검증".

### D12 — Minor: Non-goals and 향후 확장 후보 lists are fully overlapping
- File: product.md:104-124
- Severity: minor
- Description: Every item in Non-goals (modular, online ranking, mobile touch, sound, i18n) is also listed in 향후 확장 후보. This redundancy creates ambiguity: is something "intentionally excluded" or "deprioritized for now"? The two lists should serve different purposes.
- Fix: Either merge the two lists into a single "비범위 (향후 후보)" section, or differentiate semantics — Non-goals = "정책적으로 영구 제외", 향후 후보 = "이번 MVP에서는 제외, 추후 검토 대상".

---

## Strengths

- All three documents are in Korean, consistent with `.moai/config/sections/language.yaml` (conversation_language=ko, documentation=ko).
- The four Modern MVP features (power-ups, obstacles, sub-grid interpolation, neon/particles) are each addressed in product.md and each has at least one corresponding module/file in structure.md (`powerup/`, `obstacle/`, `render/Interpolator.ts`, `render/ParticleSystem.ts` + `theme/neon.ts`).
- Multiplayer, online leaderboard, mobile touch, mandatory sound are correctly absent from structure.md and tech.md as planned modules.
- The stack (TypeScript + Canvas 2D + Vite + Vitest, no game engine) is internally consistent: structure.md "명시적으로 사용하지 않을 패턴" table explicitly forbids Phaser/PixiJS, and tech.md "선택 이유" justifies the no-engine decision. No contradictory engine references found.
- The dependency-direction rule in structure.md (domain has no external dependencies, render reads domain read-only) is well stated.
- Success criteria are measurable (3-second load, 60 FPS, 80% coverage, persistence verification).
- tick interval (150ms) is consistent between tech.md:126 and structure.md:96.

---

## Chain-of-Verification Pass

Second-look findings:
- Re-read all three files in full. Identified additional ambiguity in "벽 모드" naming (D8) and the missing scoring edge case for double-score × power-up (D9) on the second pass.
- Verified test file enumeration in structure.md tests/ tree against success criteria — caught missing LocalStorageAdapter test (D11) and missing render tests (D10).
- Re-checked Non-goals vs 향후 확장 후보 — confirmed full overlap (D12).
- Re-checked main.ts init order vs all referenced modules — main.ts (structure.md:79-82) initializes Board, KeyboardHandler, StateMachine, GameLoop but never mentions Renderer, Snake, ScoreCalculator, LocalStorageAdapter initialization. This is loose phrasing but not a hard contradiction; left out of defects to avoid noise.
- Re-checked tech.md devDependencies for completeness against test/build needs — confirmed jsdom omission (D1) is real.
- Re-read state machine diagrams (product.md:68-77 + table 80-84) — matches itself; the contradiction is with tech.md, not internal (D2, D3).

No additional defects found beyond D1–D12.

---

## Final Verdict Justification

FAIL. The documents are well-structured and 80% complete, but contain:
- 1 critical defect (D1) that breaks the toolchain as written.
- 4 major defects (D2, D3, D4, D5) involving internal contradictions and ambiguous scope that would force the implementer to guess or block on clarification.
- 7 minor defects representing accumulated rough edges.

A PASS would require the implementer to silently resolve at least 5 spec-level questions before writing code, which violates the "Surface Assumptions" and "Manage Confusion Actively" HARD rules. Per the auditor mandate, when in doubt, FAIL.

---

## Recommendation to manager-spec

Address defects in priority order: D1 (add jsdom) → D2/D3/D4/D5 (resolve contradictions) → D6–D12 (polish). After fixes, re-submit for iteration 2.
