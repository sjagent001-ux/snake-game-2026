---
spec_id: SPEC-GAME-CORE-001
version: 1.0.0
created: 2026-05-26
---

# SPEC-GAME-CORE-001 (Compact)

본 문서는 SPEC-GAME-CORE-001 의 요약 추출본이다. EARS 요구사항, 수용 기준, 수정 대상 파일, 제외 사항만 포함한다. 개요·기술 접근·리스크 등 산문은 `spec.md` 와 `plan.md` 를 참조한다.

---

## REQ Modules

### REQ-LOOP

- **REQ-LOOP-001**: The system **shall** drive its frame loop via `window.requestAnimationFrame`, computing per-frame `deltaMs` and forwarding it to `TickScheduler`.
- **REQ-LOOP-002**: The `TickScheduler` **shall** emit a domain tick when `accumulatedMs ≥ TICK_MS`, decrementing accumulator by `TICK_MS`.
- **REQ-LOOP-003**: The `GameLoop` **shall** invoke `Renderer.render(alpha)` on every animation frame with `alpha = clamp((now − lastTickAt) / TICK_MS, 0, 1)`.
- **REQ-LOOP-004**: When a domain tick is emitted, the `StateMachine` **shall** call its `update()` exactly once.
- **REQ-LOOP-005**: The game loop **shall** remain stable from 30 FPS to 144 FPS without altering visible snake speed.
- **REQ-LOOP-006**: When `GameLoop.stop()` is called, the system **shall** cancel rAF and release references.

### REQ-STATE

- **REQ-STATE-001**: `StateMachine` **shall** maintain exactly one of `idle`, `running`, `paused`, `gameover`. Initial: `idle`.
- **REQ-STATE-002**: When user presses Space and state is `idle`, transition to `running`. Initial direction = `right`, head = `(floor(BOARD_WIDTH/2), floor(BOARD_HEIGHT/2))`, length 3 extending leftward.
- **REQ-STATE-003**: When user presses Space and state is `running`, transition to `paused`, preserving snapshot. (product.md SSOT)
- **REQ-STATE-004**: When user presses Space and state is `paused`, transition back to `running`. (product.md SSOT)
- **REQ-STATE-005**: While state is `paused`, render last snapshot but apply no ticks.
- **REQ-STATE-006**: When collision event reported, transition to `gameover`.
- **REQ-STATE-007**: When user presses R and state is `gameover`, transition to `idle` and reset entities (re-seed obstacles).
- **REQ-STATE-008**: If a direction key is pressed while state is `idle`, **shall not** transition to `running`.
- **REQ-STATE-009**: `StateMachine` **shall** expose `onTransition(callback)` for future SPEC subscriptions.

### REQ-DOMAIN

- **REQ-DOMAIN-001**: `Board` **shall** expose `width`, `height`, `isOccupied(cell: { x: number; y: number }, occupants: { snake: Snake; obstacles: readonly Obstacle[]; food: Food | null }): boolean`.
- **REQ-DOMAIN-002**: `Snake` **shall** be an ordered list of `SnakeSegment` with `head = segments[0]`.
- **REQ-DOMAIN-003**: When tick applied, head moves one cell; each non-head segment shifts to predecessor's previous position.
- **REQ-DOMAIN-004**: When food consumed, length increases by one; food marked consumed.
- **REQ-DOMAIN-005**: `FoodSpawner.spawn(board, snake, obstacles)` **shall** select uniformly random empty cell.
- **REQ-DOMAIN-006**: If no empty cell exists, `FoodSpawner.spawn(...)` **shall** return `null` (no throw).
- **REQ-DOMAIN-007**: `ObstacleLayout.generate(seed, count)` **shall** produce deterministic output for identical inputs.
- **REQ-DOMAIN-008**: While `running`, obstacle list **shall** remain immutable.
- **REQ-DOMAIN-009**: When head enters cell outside `[0, width) × [0, height)`, emit wall-collision.
- **REQ-DOMAIN-010**: When head enters cell of own non-head segment, emit self-collision.
- **REQ-DOMAIN-011**: When head enters cell of obstacle, emit obstacle-collision.
- **REQ-DOMAIN-012**: Domain layer **shall not** import from `render/`, `score/`, `engine/`, `input/`.

### REQ-INPUT

- **REQ-INPUT-001**: `KeyboardHandler` **shall** translate `ArrowUp`/`W`→up, `ArrowDown`/`S`→down, `ArrowLeft`/`A`→left, `ArrowRight`/`D`→right, `Space`→space, `KeyR`→restart. Other keys ignored.
- **REQ-INPUT-002**: One-slot direction buffer. When a direction key is pressed, if opposite of current → discard at input time (buffer unchanged); otherwise overwrite buffer with pressed direction.
- **REQ-INPUT-003**: When next tick begins, if buffer holds a direction, it becomes the snake's current direction; buffer cleared.
- **REQ-INPUT-004**: Defensive guard — if at tick-apply time buffered direction is opposite of current (e.g., direction changed between input and apply), discard buffer entry and continue.
- **REQ-INPUT-005**: Space in `idle` → `START`. Space in `running`/`paused` → `TOGGLE_PAUSE`. R in `gameover` → `RESTART`.
- **REQ-INPUT-006**: If Space pressed in `gameover`, ignore. If R pressed in `running`/`paused`/`idle`, ignore.
- **REQ-INPUT-007**: Keydown handler **shall** call `event.preventDefault()` for mapped keys (arrows, WASD, Space, R).

### REQ-SCORE

- **REQ-SCORE-001**: `ScoreCalculator.applyFoodScore(multiplier = 1.0)` **shall** add `10 × multiplier` (integer).
- **REQ-SCORE-002**: Track both `currentScore` and `highScore` (read-only).
- **REQ-SCORE-003**: When `currentScore > highScore`, update `highScore` and trigger persistence save.
- **REQ-SCORE-004**: `LocalStorageAdapter` **shall** persist under key `snake2026_highscore` (product.md L101 SSOT) as JSON integer.
- **REQ-SCORE-005**: On bootstrap, `loadHighScore()` returns persisted value or `0` on parse failure/missing.
- **REQ-SCORE-006**: If `localStorage` unavailable, **shall** silently fall back to in-memory; game remains playable.
- **REQ-SCORE-007**: `Interpolator.computeAlpha(now, lastTickAt, tickInterval)` **shall** return `clamp(...)` in `[0, 1]`.
- **REQ-SCORE-008**: `Renderer.render(alpha)` **shall** read domain snapshot without mutation; lerp head/tail pixel positions.
- **REQ-SCORE-009**: `Renderer` **shall** load color tokens from `ThemeRegistry.getActive()`. Default theme: `neon`.
- **REQ-SCORE-010**: When restart via REQ-STATE-007, `currentScore = 0`; `highScore` preserved.

---

## Acceptance Criteria

### Core Scenarios

- **AC-1**: Idle → running on Space; snake starts at center with direction=right, length 3. (REQ-STATE-002, REQ-INPUT-005)
- **AC-2**: Direction buffering at input time; reverse direction discarded preserving buffer; defensive guard at tick-apply. (REQ-INPUT-002/003/004)
- **AC-3**: Food consumption → snake length +1, score +10, food respawns at cell ∉ snake.segments ∪ obstacles ∪ {previous cell}. (REQ-DOMAIN-004/005, REQ-SCORE-001)
- **AC-4**: Self-collision → gameover. (REQ-DOMAIN-010, REQ-STATE-006)
- **AC-5**: Wall collision → gameover. (REQ-DOMAIN-009, REQ-STATE-006)
- **AC-6**: Obstacle collision → gameover. (REQ-DOMAIN-011, REQ-STATE-006)
- **AC-7**: Space pause toggle preserves domain state across 10 ticks. (REQ-STATE-003/004/005)
- **AC-8**: High score updates and persists across reload under key `snake2026_highscore`. (REQ-SCORE-003/004/005)
- **AC-9**: localStorage unavailable → game still playable; in-memory fallback. (REQ-SCORE-006)
- **AC-9b**: JSON parse failure on read → `loadHighScore()` returns 0, no throw. (REQ-SCORE-005)
- **AC-9c**: Quota exceeded on write → no throw, in-memory fallback retains value. (REQ-SCORE-006)
- **AC-10a**: TickScheduler FPS-independence — equal tick count at 60 FPS vs 7 FPS over same wall time. (REQ-LOOP-005) — automated
- **AC-10b**: Sub-grid interpolation visually smooth in `npm run preview`. (REQ-SCORE-007) — manual visual

### Edge Cases

- **AC-E1**: Board full → `FoodSpawner.spawn()` returns `null`, no throw, state remains `running`. (REQ-DOMAIN-006)
- **AC-E2**: Seed determinism — identical inputs produce identical obstacle layout. (REQ-DOMAIN-007)
- **AC-E3**: Gameover → idle on R; score resets, highScore preserved, obstacles re-seeded. (REQ-STATE-007, REQ-SCORE-010)
- **AC-E4**: Direction keys ignored in idle. (REQ-STATE-008)
- **AC-E5**: rAF handle cancelled on `GameLoop.stop()`. (REQ-LOOP-006)

### Orphan REQ Coverage (added in iteration 2)

- **AC-11**: `StateMachine.onTransition` callback fires with `(from, to)` on transition. (REQ-STATE-009)
- **AC-12**: All 10 mapped keys produce actions; `KeyP` and other keys ignored. (REQ-INPUT-001)
- **AC-13**: `event.preventDefault()` called once per mapped key dispatch. (REQ-INPUT-007)
- **AC-14**: While `running`, `ObstacleLayout.list` reference identity preserved across 100 ticks. (REQ-DOMAIN-008)
- **AC-15**: `currentScore` / `highScore` read-only — external writes rejected, value unchanged. (REQ-SCORE-002)
- **AC-16**: `Renderer.render(0.5)` does not mutate domain snapshot (deep-equal preserved). (REQ-SCORE-008)

---

## Files to Create

### Source Files

- `src/main.ts`
- `src/config/constants.ts`
- `src/config/difficulty.ts` (placeholder)
- `src/engine/GameLoop.ts`
- `src/engine/TickScheduler.ts`
- `src/engine/StateMachine.ts`
- `src/domain/snake/Snake.ts`
- `src/domain/snake/SnakeSegment.ts`
- `src/domain/board/Board.ts`
- `src/domain/food/Food.ts`
- `src/domain/obstacle/Obstacle.ts`
- `src/domain/FoodSpawner.ts`
- `src/domain/ObstacleLayout.ts`
- `src/input/KeyboardHandler.ts`
- `src/score/ScoreCalculator.ts`
- `src/score/LocalStorageAdapter.ts`
- `src/render/Renderer.ts`
- `src/render/Interpolator.ts`
- `src/render/theme/neon.ts`
- `src/render/theme/ThemeRegistry.ts`
- `public/index.html`

### Test Files

- `tests/domain/snake.test.ts`
- `tests/domain/food.test.ts`
- `tests/domain/obstacle.test.ts`
- `tests/domain/board.test.ts`
- `tests/domain/FoodSpawner.test.ts`
- `tests/domain/ObstacleLayout.test.ts`
- `tests/engine/StateMachine.test.ts`
- `tests/engine/TickScheduler.test.ts`
- `tests/engine/GameLoop.test.ts`
- `tests/input/KeyboardHandler.test.ts`
- `tests/score/ScoreCalculator.test.ts`
- `tests/score/LocalStorageAdapter.test.ts`
- `tests/render/Interpolator.test.ts`
- `tests/render/theme/ThemeRegistry.test.ts`
- `tests/render/Renderer.test.ts`

### Build Configuration

- `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.eslintrc.cjs`, `.prettierrc`

---

## Exclusions

1. **Power-up system** — speed/doubleScore/invincible 3종 파워업 먹이, `PowerUp*` 모듈, FoodSpawner의 power-up 분기. → SPEC-POWERUP-001.
2. **Level system** — 점수 임계값 자동 레벨업, 동적 tick 단축, `difficulty.ts` 본격화. → SPEC-LEVEL-001.
3. **Local Top 10 leaderboard** — 닉네임 + 점수 + 레벨 + 날짜 저장, 닉네임 입력 UI, 리더보드 뷰. → SPEC-LEADERBOARD-001.
4. **Visual effects (VFX)** — 파티클 버스트, 글로우 트레일, 네온 그라데이션 폴리시, screen shake, `ParticleSystem.ts`. → SPEC-VFX-001.
5. **사운드 / 음악** — 효과음, BGM, 음소거 토글.
6. **모바일 터치 컨트롤** — 스와이프, 가상 D-패드.
7. **다국어 (i18n)** — UI 텍스트 현지화.
8. **온라인 랭킹 / 멀티플레이어 / 데일리 챌린지** — product.md Non-goals.
9. **테마 전환 UI** — ThemeRegistry는 단일 neon 테마 등록만 수행.
10. **추가 시각 폴리시** — shadowBlur / createLinearGradient / glow halo 등은 본 SPEC 외; 셀당 단색 `fillRect` 만 사용.
