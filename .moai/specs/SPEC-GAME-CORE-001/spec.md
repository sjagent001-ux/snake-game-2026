---
id: SPEC-GAME-CORE-001
version: 1.0.0
status: implemented
created: 2026-05-26
updated: 2026-05-26
author: Sungjae Lee
priority: critical
issue_number: 0
---

# SPEC-GAME-CORE-001 — 코어 게임 루프 및 도메인 모델

## HISTORY

- **2026-05-26 (v1.0.0)**: 구현 완료. SPEC-GAME-CORE-001 첫 플레이 가능 릴리즈. 18개 소스 + 15개 테스트 파일, 100/100 테스트 통과, 라인 커버리지 95.64%, `npx tsc --noEmit` / `npx eslint` / `npx vite build` 모두 통과. MX 태그 22개 (ANCHOR 4, WARN 5, NOTE 13). DoD §3.1~§3.5 모두 충족.
- **2026-05-26 (v0.1.0)**: 초기 SPEC 작성. `snake-game-2026` 프로젝트의 첫 번째 SPEC으로, 모던 스네이크 게임의 핵심 게임 루프 및 도메인(보드, 뱀, 일반 먹이, 장애물, 충돌, 상태 머신, 점수, 입력, sub-grid 보간 렌더)을 정의한다. 파워업·레벨·리더보드·시각효과(VFX)는 본 SPEC에서 제외되며 후속 SPEC으로 분리된다.
- **2026-05-26 (v0.1.1)** — D3 fix: pause toggle key reverted to Space per product.md state machine table. REQ-INPUT-001/005/006/007 및 REQ-STATE-003/004 의 `KeyP` 매핑 제거; Space 가 idle→running 시작과 running↔paused 토글을 모두 담당. R 키는 gameover 에서만 RESTART. 본 변경은 product.md L69–84(상태 머신 다이어그램·전이 표)의 SSOT 정렬 목적.
- **2026-05-26 (v0.1.1)** — D5 fix: storage key aligned to product.md `snake2026_highscore`. REQ-SCORE-004 의 localStorage 키를 `snake-game-2026.highscore` → `snake2026_highscore` (product.md L101 SSOT)로 변경.

---

## 1. 개요 (Overview)

본 SPEC은 `snake-game-2026` 프로젝트의 **그린필드 첫 번째 모듈 묶음**으로, 외부 게임 엔진 없이 TypeScript + HTML5 Canvas 2D + Vite 스택으로 작성되는 모던 스네이크 게임의 **재생 가능한 최소 코어**를 정의한다. 본 SPEC을 통과하면 다음 조건이 충족된 게임이 만들어진다.

- 사용자가 URL을 열어 즉시 플레이 가능한 정적 페이지
- 키보드 방향키/WASD로 뱀을 조작
- 일반 먹이 1개가 보드에 항상 존재하며 섭취 시 뱀이 1칸 자라고 점수가 +10 증가
- 고정 + 랜덤 벽이 게임 시작 시 결정적으로 배치되며 게임 진행 중 변하지 않음
- 벽(보드 경계) / 자기 몸 / 장애물과의 충돌 시 게임 오버
- `idle / running / paused / gameover` 상태 머신
- 60 FPS 렌더 + 150ms 도메인 tick + sub-grid 선형 보간으로 부드러운 이동
- 최고점수가 localStorage에 저장되며 페이지 새로고침 후에도 복원

본 SPEC은 후속 SPEC(POWERUP / LEVEL / LEADERBOARD / VFX)이 안전하게 확장할 수 있도록 다음 아키텍처 훅(hook)을 갖춰야 한다.

- `StateMachine` 은 상태 전이 리스너를 외부에서 등록 가능 (레벨 시스템의 score-threshold 감지 훅)
- `ScoreCalculator` 는 점수 배율(`multiplier`)을 받아 적용하는 메서드를 보유 (기본값 1.0; 후속 POWERUP의 doubleScore 활용)
- `FoodSpawner` 인터페이스는 향후 `PowerUpSpawner` 가 동일 패턴으로 추가될 수 있는 형태로 분리
- `Renderer` 는 `ParticleSystem | null` 을 생성자 인자로 수용 (본 SPEC에서는 `null` 주입)

---

## 2. 환경 및 가정 (Environment & Assumptions)

- 런타임: 브라우저 (Chrome / Edge / Firefox / Safari 최신 2버전)
- 빌드: Vite 5.x, TypeScript 5.x strict 모드
- 테스트: Vitest 2.x + jsdom ^24.x + @vitest/coverage-v8 2.x
- DOM 의존성: `window.requestAnimationFrame`, `HTMLCanvasElement.getContext('2d')`, `window.localStorage`, `window.addEventListener('keydown', ...)`
- 도메인 레이어는 DOM/Canvas/localStorage에 직접 의존하지 않는다 (`.moai/project/structure.md` 의존 방향 규칙 준수)
- 보드 기본 크기: 20×20 셀 (`BOARD_WIDTH=20`, `BOARD_HEIGHT=20`)
- 기본 tick 주기: 150ms (`TICK_MS=150`)
- 장애물 배치 시드: 기본 상수 (`OBSTACLE_SEED`)와 개수 범위 (`OBSTACLE_COUNT`)는 `src/config/constants.ts`에 정의

---

## 3. 요구사항 (EARS Requirements)

본 SPEC은 5개의 REQ 모듈로 구성된다. 각 요구사항은 EARS 패턴 키워드(Ubiquitous "shall" / Event-driven "When … shall" / State-driven "While … shall" / Unwanted "If … then shall")를 영문 그대로 사용한다.

### REQ-LOOP — 게임 루프 및 타이밍

- **REQ-LOOP-001 (Ubiquitous)** — The system **shall** drive its frame loop via `window.requestAnimationFrame`, computing per-frame `deltaMs = currentTimestamp − previousTimestamp` and forwarding it to `TickScheduler`.
- **REQ-LOOP-002 (Ubiquitous)** — The `TickScheduler` **shall** accumulate `deltaMs` and emit a domain tick exactly when `accumulatedMs ≥ TICK_MS`, after which it **shall** decrement `accumulatedMs` by `TICK_MS` so that emission cadence remains independent of FPS.
- **REQ-LOOP-003 (Ubiquitous)** — The `GameLoop` **shall** invoke `Renderer.render(alpha)` on every animation frame, where `alpha = clamp((now − lastTickAt) / TICK_MS, 0, 1)`.
- **REQ-LOOP-004 (Event-driven)** — **When** a domain tick is emitted, the `StateMachine` **shall** call its `update()` hook exactly once per emission.
- **REQ-LOOP-005 (Ubiquitous)** — The game loop **shall** remain stable across frame rates from 30 FPS to 144 FPS without altering the visible movement speed of the snake.
- **REQ-LOOP-006 (Event-driven)** — **When** the page is closed or the `GameLoop.stop()` method is called, the system **shall** cancel its pending `requestAnimationFrame` handle and release all references to prevent the loop from continuing.

### REQ-STATE — 상태 머신 (idle / running / paused / gameover)

- **REQ-STATE-001 (Ubiquitous)** — The `StateMachine` **shall** maintain exactly one of four states at any time: `idle`, `running`, `paused`, `gameover`. Initial state on bootstrap **shall** be `idle`.
- **REQ-STATE-002 (Event-driven)** — **When** the user presses Space and the current state is `idle`, the `StateMachine` **shall** transition to `running` and start tick consumption. On this transition the snake's initial direction **shall** be `right`, its initial head cell **shall** be `(floor(BOARD_WIDTH/2), floor(BOARD_HEIGHT/2))`, and its body of length 3 **shall** extend leftward from the head (segments at `head`, `head − (1, 0)`, `head − (2, 0)`).
- **REQ-STATE-003 (Event-driven)** — **When** the user presses Space and the current state is `running`, the `StateMachine` **shall** transition to `paused`, freezing all domain mutations while preserving snake position, food position, and obstacle layout. (Per product.md state machine table: `running ──(Space)──► paused`.)
- **REQ-STATE-004 (Event-driven)** — **When** the user presses Space and the current state is `paused`, the `StateMachine` **shall** transition back to `running` and resume tick consumption from the preserved snapshot. (Per product.md state machine table: `paused ──(Space)──► running`.)
- **REQ-STATE-005 (State-driven)** — **While** the state is `paused`, the system **shall** continue to render the last domain snapshot but **shall not** apply any tick to domain entities.
- **REQ-STATE-006 (Event-driven)** — **When** a collision event is reported (wall / self / obstacle), the `StateMachine` **shall** transition to `gameover` regardless of the previous state being `running` or `paused`.
- **REQ-STATE-007 (Event-driven)** — **When** the user presses R and the current state is `gameover`, the `StateMachine` **shall** transition to `idle` and reset all domain entities (snake length, food position, obstacle layout re-seeded with `OBSTACLE_SEED`).
- **REQ-STATE-008 (Unwanted behavior)** — **If** a direction key is pressed while the state is `idle`, **then** the `StateMachine` **shall** ignore it and **shall not** transition to `running`. Only Space triggers the `idle → running` transition.
- **REQ-STATE-009 (Ubiquitous)** — The `StateMachine` **shall** expose a listener registration API (`onTransition(callback)`) so that future SPECs (e.g., LEVEL) can subscribe to transitions without modifying state-machine internals.

### REQ-DOMAIN — 도메인 모델 (Snake / Board / Food / Obstacle / Collision)

- **REQ-DOMAIN-001 (Ubiquitous)** — `Board` **shall** expose grid dimensions (`width`, `height`) and an `isOccupied(cell, occupants)` predicate with the signature `Board.isOccupied(cell: { x: number; y: number }, occupants: { snake: Snake; obstacles: readonly Obstacle[]; food: Food | null }): boolean` that returns true if the cell is occupied by any segment of `snake`, any cell in `obstacles`, or by `food` (when non-null). Occupants are injected to preserve REQ-DOMAIN-012 single-direction dependency rule.
- **REQ-DOMAIN-002 (Ubiquitous)** — `Snake` **shall** be represented as an ordered list of `SnakeSegment` (grid cells), with `head = segments[0]` and `tail = segments[length−1]`.
- **REQ-DOMAIN-003 (Event-driven)** — **When** a tick is applied, the snake **shall** move its head one cell in the current direction and **shall** shift each non-head segment to the previous segment's previous position.
- **REQ-DOMAIN-004 (Event-driven)** — **When** the snake consumes food, its length **shall** increase by exactly one segment appended at the tail's previous position, and the food **shall** be marked as consumed.
- **REQ-DOMAIN-005 (Ubiquitous)** — `FoodSpawner.spawn(board, snake, obstacles)` **shall** select a uniformly random empty cell (no snake segment, no obstacle, no existing food) and return a `Food` instance positioned at that cell.
- **REQ-DOMAIN-006 (Unwanted behavior)** — **If** the board has no empty cell available, **then** `FoodSpawner.spawn(...)` **shall** return `null` and **shall not** throw.
- **REQ-DOMAIN-007 (Ubiquitous)** — `ObstacleLayout.generate(seed, count)` **shall** produce a deterministic obstacle list given the same `seed` and `count`. Re-invocation with identical arguments **shall** return cells in identical positions.
- **REQ-DOMAIN-008 (State-driven)** — **While** a game is in `running` state, the obstacle list **shall** remain immutable (no addition, removal, or relocation).
- **REQ-DOMAIN-009 (Event-driven)** — **When** the snake head enters a cell that is outside `[0, width) × [0, height)`, the system **shall** emit a wall-collision event.
- **REQ-DOMAIN-010 (Event-driven)** — **When** the snake head enters a cell occupied by any other segment of itself, the system **shall** emit a self-collision event.
- **REQ-DOMAIN-011 (Event-driven)** — **When** the snake head enters a cell occupied by any obstacle, the system **shall** emit an obstacle-collision event.
- **REQ-DOMAIN-012 (Ubiquitous)** — The domain layer **shall not** import from `render/`, `score/`, `engine/`, or `input/` modules (single-direction dependency rule per `.moai/project/structure.md`).

### REQ-INPUT — 키보드 입력 매핑 및 방향 버퍼링

- **REQ-INPUT-001 (Ubiquitous)** — `KeyboardHandler` **shall** subscribe to `window.addEventListener('keydown', ...)` and translate the following keys: `ArrowUp` / `KeyW` → up direction, `ArrowDown` / `KeyS` → down, `ArrowLeft` / `KeyA` → left, `ArrowRight` / `KeyD` → right, `Space` → space action, `KeyR` → restart action. All other keys **shall** be ignored.
- **REQ-INPUT-002 (Ubiquitous)** — `KeyboardHandler` **shall** maintain a one-slot direction buffer. **When** a direction key is pressed, **if** the pressed direction is opposite of the snake's current direction, the input **shall** be discarded and the buffer **shall not** change; **otherwise** the buffer **shall** be overwritten with the pressed direction.
- **REQ-INPUT-003 (Event-driven)** — **When** the next domain tick begins, **if** the buffer holds a direction, that direction **shall** become the snake's current direction and the buffer **shall** be cleared.
- **REQ-INPUT-004 (Unwanted behavior)** — **If** at tick-apply time the buffered direction is opposite of the snake's current direction (e.g., due to a direction change between input time and apply time), **then** the system **shall** discard the buffer entry and continue with the current direction. This is a defensive guard; the primary discard happens at input time per REQ-INPUT-002.
- **REQ-INPUT-005 (Event-driven)** — **When** Space is pressed and the state is `idle`, the action **shall** be dispatched as `START`. **When** Space is pressed and the state is `running` or `paused`, the action **shall** be dispatched as `TOGGLE_PAUSE`. **When** R is pressed and the state is `gameover`, the action **shall** be dispatched as `RESTART`.
- **REQ-INPUT-006 (Unwanted behavior)** — **If** Space is pressed while the state is `gameover`, **then** the system **shall** ignore the key (R is the only restart trigger from gameover). **If** R is pressed while the state is `running`, `paused`, or `idle`, **then** the system **shall** ignore the key.
- **REQ-INPUT-007 (Ubiquitous)** — The keydown handler **shall** call `event.preventDefault()` for the mapped keys (arrow keys, WASD, Space, R) to suppress page scrolling and form-related side effects.

### REQ-SCORE — 점수 계산, 영속성, sub-grid 렌더 보간

- **REQ-SCORE-001 (Ubiquitous)** — `ScoreCalculator.applyFoodScore(multiplier = 1.0)` **shall** add `10 × multiplier` to the current score, returning an integer score (rounded if necessary).
- **REQ-SCORE-002 (Ubiquitous)** — `ScoreCalculator` **shall** track both `currentScore` (current game) and `highScore` (best across all sessions), exposing both as read-only fields.
- **REQ-SCORE-003 (Event-driven)** — **When** `currentScore` exceeds `highScore`, `ScoreCalculator` **shall** update `highScore` immediately and trigger `LocalStorageAdapter.saveHighScore(highScore)`.
- **REQ-SCORE-004 (Ubiquitous)** — `LocalStorageAdapter` **shall** persist the high score under the key `snake2026_highscore` (per product.md L101) as a JSON-encoded integer.
- **REQ-SCORE-005 (Event-driven)** — **When** the application bootstraps, `LocalStorageAdapter.loadHighScore()` **shall** read the persisted value; on parse failure or missing key, it **shall** return `0`.
- **REQ-SCORE-006 (Unwanted behavior)** — **If** `localStorage` is unavailable (private mode, disabled storage, quota exceeded, `SecurityError`), **then** `LocalStorageAdapter` **shall** silently fall back to in-memory storage and the game **shall** remain fully playable. No exception **shall** propagate to the game loop.
- **REQ-SCORE-007 (Ubiquitous)** — `Interpolator.computeAlpha(now, lastTickAt, tickInterval)` **shall** return a value in `[0, 1]`, computed as `clamp((now − lastTickAt) / tickInterval, 0, 1)`.
- **REQ-SCORE-008 (Ubiquitous)** — `Renderer.render(alpha)` **shall** read the latest domain snapshot (snake / food / obstacles) without mutation, and **shall** lerp the head and tail pixel positions between previous-tick and current-tick cells using `alpha`.
- **REQ-SCORE-009 (Ubiquitous)** — `Renderer` **shall** load color tokens (background, snake fill, food fill, obstacle fill) from the active theme via `ThemeRegistry.getActive()`. Default active theme **shall** be `neon`.
- **REQ-SCORE-010 (Event-driven)** — **When** the state transitions to `idle` via REQ-STATE-007 (restart), `ScoreCalculator.currentScore` **shall** be reset to `0`, while `highScore` **shall** be preserved.

---

## 4. 제외 사항 (Exclusions — What NOT to Build)

본 SPEC은 다음 항목을 명시적으로 **제외**한다. 각 항목은 별도의 후속 SPEC으로 다룬다.

1. **파워업 시스템 (Power-up System)** — 속도 변화 / 점수 2배 / 무적 3종 파워업 먹이, `PowerUp.ts`, `PowerUpEffect.ts`, `PowerUpSpawner.ts` 모듈은 본 SPEC에서 구현하지 않는다. `FoodSpawner`는 일반 먹이만 스폰하며 파워업 종류 분기를 포함하지 않는다. → 후속 **SPEC-POWERUP-001**.
2. **레벨 시스템 / 점수 임계값 자동 레벨업 / 동적 난이도 (Level System)** — 점수 20점 → L2, 50점 → L3 등 점수 임계값 기반 레벨 자동 상승, tick 주기 단축 곡선, `difficulty.ts`의 난이도 함수는 본 SPEC에서 구현하지 않는다. 본 SPEC의 `difficulty.ts`는 기본 상수만 노출하는 빈 자리표시자(placeholder)다. → 후속 **SPEC-LEVEL-001**.
3. **로컬 Top 10 리더보드 (Leaderboard)** — 닉네임 + 점수 + 레벨 + 날짜를 함께 저장하는 Top 10 리더보드, 닉네임 입력 UI, 리더보드 뷰 UI는 본 SPEC에서 구현하지 않는다. 본 SPEC의 `LocalStorageAdapter`는 최고점수 단일 정수만 다룬다. → 후속 **SPEC-LEADERBOARD-001**.
4. **시각 효과 (Visual Effects / VFX)** — 먹이 섭취 파티클 버스트, 뱀 꼬리 글로우 트레일, 네온 그라데이션 폴리시, 화면 흔들림(screen shake), `ParticleSystem.ts` 모듈은 본 SPEC에서 구현하지 않는다. 본 SPEC의 렌더링은 셀당 단색 사각형(`fillRect`) 기능 수준에 머무른다. → 후속 **SPEC-VFX-001**.
5. **사운드 / 음악** — 효과음, 배경 BGM, 음소거 토글은 본 SPEC에서 구현하지 않는다. (`.moai/project/product.md` 향후 확장 항목)
6. **모바일 터치 컨트롤** — 스와이프 제스처, 가상 D-패드 오버레이는 본 SPEC에서 구현하지 않는다.
7. **다국어 (i18n)** — UI 텍스트 현지화는 본 SPEC에서 구현하지 않는다.
8. **온라인 랭킹 / 멀티플레이어 / 데일리 챌린지** — `.moai/project/product.md` Non-goals 또는 향후 확장 항목으로, 본 SPEC 범위 외이며 일부는 프로젝트 정체성과 영구 충돌하여 추후에도 다루지 않는다.
9. **테마 전환 UI** — `ThemeRegistry`는 본 SPEC에서 단일 테마(`neon`) 등록만 수행하며, 사용자가 테마를 전환하는 UI는 구현하지 않는다.
10. **추가 시각 폴리시** — 셀당 단색 `fillRect` 외의 시각 처리(`shadowBlur`, `createLinearGradient`, glow halo 등)는 본 SPEC에서 구현하지 않는다. 기능적 렌더에 한정한다.

---

## 5. 수정 대상 파일 (Files to Create)

본 SPEC은 그린필드 작업이므로 모든 파일이 **신규 생성**된다.

### 5.1 소스 파일

- `src/main.ts` — 부트스트랩 진입점
- `src/config/constants.ts` — `BOARD_WIDTH`, `BOARD_HEIGHT`, `TICK_MS`, `OBSTACLE_SEED`, `OBSTACLE_COUNT`, localStorage 키
- `src/config/difficulty.ts` — 빈 자리표시자 (단일 기본 난이도; 후속 SPEC-LEVEL-001 확장 지점)
- `src/engine/GameLoop.ts` — `requestAnimationFrame` 루프, `start()` / `stop()`
- `src/engine/TickScheduler.ts` — 150ms 고정 주기 누적 스케줄러
- `src/engine/StateMachine.ts` — 4-state machine + `onTransition` 리스너
- `src/domain/snake/Snake.ts` — 세그먼트 리스트, 이동, 성장, 자기 충돌 판정
- `src/domain/snake/SnakeSegment.ts` — `(col, row)` 값 객체
- `src/domain/board/Board.ts` — 격자, `isOccupied`, `empty cells`
- `src/domain/food/Food.ts` — 일반 먹이 위치
- `src/domain/obstacle/Obstacle.ts` — 장애물 셀 및 충돌 판정
- `src/domain/FoodSpawner.ts` — 빈 셀 무작위 선택
- `src/domain/ObstacleLayout.ts` — 시드 결정적 장애물 배치
- `src/input/KeyboardHandler.ts` — 키 매핑 + 방향 버퍼
- `src/score/ScoreCalculator.ts` — 점수 + 최고점수 + multiplier 훅
- `src/score/LocalStorageAdapter.ts` — 영속성 + 폴백
- `src/render/Renderer.ts` — Canvas 2D 렌더, alpha 보간 소비
- `src/render/Interpolator.ts` — alpha 계산 및 lerp 헬퍼
- `src/render/theme/neon.ts` — 네온 테마 토큰
- `src/render/theme/ThemeRegistry.ts` — 테마 등록 및 활성 테마 조회
- `public/index.html` — 단일 HTML, `<canvas id="game">` + ES 모듈 스크립트

### 5.4 Bootstrap Sequence (this SPEC scope)

이 SPEC 범위 내에서 `src/main.ts` 진입점은 다음 8단계 부트스트랩을 수행한다. (structure.md의 9단계 리스트는 MVP 전체 기준이며, 본 SPEC에서는 PowerUpSpawner와 ParticleSystem이 Exclusions에 해당하므로 다음과 같이 축약된다.)

1. ThemeRegistry 로드 (neon 기본 테마 등록)
2. LocalStorageAdapter 인스턴스 생성, 최고점수 복원
3. ScoreCalculator 초기화 (복원된 최고점수 주입)
4. Board, Snake, FoodSpawner, ObstacleLayout 생성 (PowerUpSpawner는 본 SPEC 범위 외)
5. Renderer 생성 — `new Renderer(ctx: CanvasRenderingContext2D, themeRegistry: ThemeRegistry, particles: ParticleSystem | null = null)` 호출 시 particles 인자에 null 주입 (ParticleSystem은 SPEC-VFX-001 도입 예정)
6. StateMachine 생성 (idle 초기 상태)
7. KeyboardHandler 부착 (window 키 이벤트 → StateMachine 디스패치)
8. GameLoop 생성 (tick 콜백 = StateMachine.update, render 콜백 = Renderer.render), start()

structure.md와의 정합성: structure.md는 sync 단계에서 본 SPEC 완료 후 8단계로 갱신될 예정이거나, 후속 SPEC-POWERUP-001과 SPEC-VFX-001 완료 시 원래 9단계가 모두 활성화된다.

### 5.2 테스트 파일 (Vitest + jsdom)

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

### 5.3 빌드 구성 파일

- `package.json` — `dev` / `build` / `preview` / `test` / `test:coverage` / `lint` / `format` 스크립트, devDependencies
- `tsconfig.json` — `strict: true`, `target: ES2022`, `moduleResolution: bundler`
- `vite.config.ts` — dev 서버 / 빌드 옵션
- `vitest.config.ts` — `environment: 'jsdom'`, `coverage.provider: 'v8'`
- `.eslintrc.cjs` / `.prettierrc` — 코드 스타일

---

## 6. 후속 SPEC 로드맵 (정보용 — 본 SPEC 범위 확장 아님)

본 SPEC이 완료된 후 다음 SPEC들이 본 SPEC의 아키텍처 훅을 활용해 기능을 확장한다.

| SPEC ID 후보 | 확장 영역 | 주요 신규/수정 모듈 |
|---|---|---|
| SPEC-POWERUP-001 | 파워업 시스템 (속도/2배/무적 3종) | `src/domain/powerup/*`, `src/domain/PowerUpSpawner.ts`, `ScoreCalculator.applyFoodScore(multiplier)` 활용 |
| SPEC-LEVEL-001 | 점수 임계값 자동 레벨업 + tick 단축 곡선 | `src/config/difficulty.ts` 본격화, `StateMachine.onTransition` 리스너 활용, `TickScheduler.setInterval(ms)` 추가 가능 |
| SPEC-LEADERBOARD-001 | 로컬 Top 10 리더보드 | `src/score/LeaderboardStore.ts` (신규), 닉네임 입력 모달, gameover UI 확장 |
| SPEC-VFX-001 | 파티클 / 글로우 트레일 / 네온 폴리시 | `src/render/ParticleSystem.ts` (신규), `Renderer` 생성자에 ParticleSystem 주입(현재 `null` 자리), `neon.ts` 그라데이션·`shadowBlur` 추가 |

---

## 7. 참고 문서

- `.moai/project/product.md` — 제품 비전, 게임 규칙, 비범위, 성공 기준
- `.moai/project/structure.md` — 모듈 트리, 의존 방향, 부트스트랩 9단계 순서
- `.moai/project/tech.md` — 기술 스택, 빌드/테스트 명령, 성능 목표
- `.moai/project/interview.md` — 의사결정 히스토리 (modern snake game, 4가지 MVP 합의)
- `.moai/project/codemaps/overview.md` — 아키텍처 한 줄 요약 (계획 단계)
