---
spec_id: SPEC-GAME-CORE-001
version: 1.0.0
created: 2026-05-26
updated: 2026-05-26
---

# 구현 계획 (Implementation Plan) — SPEC-GAME-CORE-001

본 문서는 SPEC-GAME-CORE-001의 TDD 기반 구현 계획을 정의한다. 모든 도메인·엔진·점수 모듈은 RED → GREEN → REFACTOR 사이클로 작성하며, 렌더링·입력·부트스트랩 모듈은 통합 검증 위주로 진행한다.

---

## 1. 작업 분해 (Task Decomposition)

작업은 의존성을 고려해 4단계로 그룹화한다. 각 작업은 `T-{N}` 식별자로 참조한다.

### Stage A — 기반 (Foundation, 의존 없음)

| ID | 작업 | 대상 파일 | 예상 테스트 수 | 의존 |
|---|---|---|---|---|
| T-1 | 프로젝트 스캐폴드 (package.json, tsconfig.json, vite.config.ts, vitest.config.ts, .eslintrc.cjs, .prettierrc, public/index.html) | 빌드 구성 파일 6종 + HTML | 0 | — |
| T-2 | `src/config/constants.ts` (BOARD_WIDTH=20, BOARD_HEIGHT=20, TICK_MS=150, OBSTACLE_SEED, OBSTACLE_COUNT, LOCAL_STORAGE_KEY) | `src/config/constants.ts` | 0 (상수만) | T-1 |
| T-3 | `src/config/difficulty.ts` 자리표시자 (단일 기본 난이도; 후속 LEVEL SPEC 확장 지점) | `src/config/difficulty.ts` | 0 | T-2 |
| T-4 | `SnakeSegment` 값 객체 (`{col: number, row: number}` + `equals(other)` 헬퍼) | `src/domain/snake/SnakeSegment.ts` | 2 | T-1 |
| T-5 | `Board` 도메인 (격자 크기, `isOccupied(cell: { x: number; y: number }, occupants: { snake: Snake; obstacles: readonly Obstacle[]; food: Food | null }): boolean`, `cellsInBounds(cell)`) | `src/domain/board/Board.ts` + `tests/domain/board.test.ts` | 6 | T-2, T-4 |

### Stage B — 도메인 코어 (Domain Core, 단방향 의존)

| ID | 작업 | 대상 파일 | 예상 테스트 수 | 의존 |
|---|---|---|---|---|
| T-6 | `Snake` (세그먼트 리스트, `move(direction)`, `grow()`, `collidesWithSelf()`) — REQ-DOMAIN-002/003/004/010 | `src/domain/snake/Snake.ts` + `tests/domain/snake.test.ts` | 10 | T-4 |
| T-7 | `Food` (단일 위치, `consume()`) — REQ-DOMAIN-004 | `src/domain/food/Food.ts` + `tests/domain/food.test.ts` | 3 | T-4 |
| T-8 | `Obstacle` (장애물 셀 목록, `contains(cell)`) — REQ-DOMAIN-011 | `src/domain/obstacle/Obstacle.ts` + `tests/domain/obstacle.test.ts` | 4 | T-4 |
| T-9 | `FoodSpawner.spawn(board, snake, obstacles)` (빈 셀 무작위, 가득 차면 `null`) — REQ-DOMAIN-005/006 | `src/domain/FoodSpawner.ts` + `tests/domain/FoodSpawner.test.ts` | 6 | T-5, T-6, T-7, T-8 |
| T-10 | `ObstacleLayout.generate(seed, count, board)` (시드 결정적 — Mulberry32 PRNG 사용) — REQ-DOMAIN-007/008 | `src/domain/ObstacleLayout.ts` + `tests/domain/ObstacleLayout.test.ts` | 5 | T-5, T-8 |

### Stage C — 엔진·점수·입력 (Engine, Score, Input)

| ID | 작업 | 대상 파일 | 예상 테스트 수 | 의존 |
|---|---|---|---|---|
| T-11 | `TickScheduler` (deltaMs 누적, TICK_MS 도달 시 콜백 1회 호출, 누적 차감) — REQ-LOOP-001/002 | `src/engine/TickScheduler.ts` + `tests/engine/TickScheduler.test.ts` | 5 | T-2 |
| T-12 | `StateMachine` (4-state, `transition(action)`, `onTransition(callback)` 리스너) — REQ-STATE-001~009 | `src/engine/StateMachine.ts` + `tests/engine/StateMachine.test.ts` | 12 | T-2 |
| T-13 | `GameLoop` (`start()` / `stop()`, rAF 핸들 보관, `Renderer.render(alpha)` 호출, `TickScheduler` 위임) — REQ-LOOP-003/004/005/006 | `src/engine/GameLoop.ts` + `tests/engine/GameLoop.test.ts` | 4 | T-11, T-12 |
| T-14 | `ScoreCalculator` (`applyFoodScore(multiplier=1.0)`, `currentScore`, `highScore`, `reset()`) — REQ-SCORE-001/002/010 | `src/score/ScoreCalculator.ts` + `tests/score/ScoreCalculator.test.ts` | 6 | T-2 |
| T-15 | `LocalStorageAdapter` (`saveHighScore`, `loadHighScore`, try/catch 폴백 + 인메모리 백업) — REQ-SCORE-003/004/005/006 | `src/score/LocalStorageAdapter.ts` + `tests/score/LocalStorageAdapter.test.ts` | 7 | T-2, T-14 |
| T-16 | `KeyboardHandler` (키 매핑, 방향 버퍼, preventDefault, 반대 방향 차단) — REQ-INPUT-001~007 | `src/input/KeyboardHandler.ts` + `tests/input/KeyboardHandler.test.ts` | 9 | T-12 |

### Stage D — 렌더링·부트스트랩 (Render, Bootstrap)

| ID | 작업 | 대상 파일 | 예상 테스트 수 | 의존 |
|---|---|---|---|---|
| T-17 | `Interpolator.computeAlpha(now, lastTickAt, tickInterval)` + `lerp(a, b, t)` — REQ-SCORE-007 | `src/render/Interpolator.ts` + `tests/render/Interpolator.test.ts` | 5 | T-2 |
| T-18 | `theme/neon.ts` 토큰 (배경, 뱀, 먹이, 장애물 색) + `ThemeRegistry.register` / `getActive` — REQ-SCORE-009. **테스트 4개**: (1) register adds a theme retrievable by name, (2) getActive returns default `neon` initially, (3) setActive switches and getActive reflects the change, (4) getActive('unknown') falls back to `neon`. | `src/render/theme/neon.ts`, `src/render/theme/ThemeRegistry.ts` + `tests/render/theme/ThemeRegistry.test.ts` | 4 | T-2 |
| T-19 | `Renderer` (Canvas 2D, `render(alpha)`, 단색 `fillRect`, ParticleSystem 인자는 `null` 허용) — REQ-SCORE-008/009. **테스트 5개** (jsdom canvas mock: `HTMLCanvasElement.prototype.getContext = vi.fn()` returns mock ctx): (1) `render(alpha)` calls `clearRect` then `fillRect` for snake/food/obstacle, (2) `render(alpha=0)` lerps to previous position (head equals previous cell), (3) `render(alpha=1)` lerps to current position (head equals current cell), (4) `render` with `particles=null` skips particle drawing without throwing, (5) domain snapshot is not mutated (re-snapshot after render equals before). | `src/render/Renderer.ts` + `tests/render/Renderer.test.ts` | 5 | T-6, T-7, T-8, T-17, T-18 |
| T-20 | `src/main.ts` 진입점에 **spec.md §5.4의 8단계 부트스트랩**을 정확히 구현한다. PowerUpSpawner는 import/instantiate하지 않는다. `Renderer` 생성자의 `particles` 인자에 `null`을 명시적으로 전달한다. | `src/main.ts` | 0 (E2E 수동 검증) | T-1 ~ T-19 |

### 실행 순서 요약

- **선행**: T-1, T-2, T-3 (구성 파일 + 상수)
- **병렬 가능**: Stage A T-4/T-5 → Stage B 내부 T-6 / T-7 / T-8 병렬, T-9 / T-10은 T-5~T-8 완료 후
- **병렬 가능**: Stage C T-11 / T-12 / T-14 / T-15 / T-17 (서로 독립) — 여러 도메인 모듈이 완성된 후 시작
- **순차**: T-13 (GameLoop) → T-16 (KeyboardHandler) → T-19 (Renderer) → T-20 (main.ts)

---

## 2. 기술 스택 및 버전 (Technology Stack)

`.moai/project/tech.md` 의 핵심 의존성을 그대로 채택한다.

### devDependencies

| 패키지 | 버전 | 용도 |
|---|---|---|
| `typescript` | 5.x | TS 컴파일러 |
| `vite` | 5.x | 개발 서버 + 프로덕션 번들러 |
| `vitest` | 2.x | 단위 테스트 러너 |
| `@vitest/coverage-v8` | 2.x | V8 커버리지 |
| `jsdom` | ^24.x | DOM 테스트 환경 (LocalStorageAdapter, KeyboardHandler 테스트용) |
| `@types/node` | 20.x | Node 타입 (`vite.config.ts` 작성용) |
| `eslint` | 9.x | 린트 |
| `prettier` | 3.x | 포매팅 |

### dependencies

없음. 브라우저 표준 API(`Canvas 2D`, `requestAnimationFrame`, `localStorage`, `window.addEventListener`)만 사용한다.

### tsconfig.json 핵심 옵션

- `strict: true`
- `target: "ES2022"`
- `moduleResolution: "bundler"`
- `noUncheckedIndexedAccess: true` (배열 접근 안전성 강화)
- `noImplicitOverride: true`

### vitest.config.ts 핵심 옵션

- `environment: "jsdom"`
- `coverage.provider: "v8"`
- `coverage.thresholds.lines: 80` (도메인·엔진·점수 레이어 기준)
- `include: ["tests/**/*.test.ts"]`

---

## 3. 리스크 분석 및 완화 (Risk Analysis & Mitigation)

### 리스크 R-1: tick / 렌더 디커플링 정확도

- **위험**: `TickScheduler` 누적 로직에서 `deltaMs` 잔여분(`accumulatedMs % TICK_MS`)이 잘못 처리되면 게임 속도가 FPS에 종속된다. 30 FPS에서는 빠르고 144 FPS에서는 느려지는 현상 발생.
- **완화**: T-11에서 `TickScheduler.test.ts`에 다음 시나리오를 명시적으로 작성한다 — (a) 16ms × 30프레임 입력 후 tick 발행 횟수 검증, (b) 1프레임에 300ms 누적 시 2회 tick 발행 검증, (c) 누적 잔여분이 다음 프레임에 이월 검증. REQ-LOOP-005에 대응.
- **대응 우선순위**: High

### 리스크 R-2: sub-grid 보간 시각적 아티팩트 (저 FPS에서)

- **위험**: 30 FPS 환경에서 alpha가 큰 보폭으로 점프하면 뱀이 끊겨 보일 수 있다. 또한 alpha가 1.0을 초과하면 머리가 다음 셀을 넘어가는 시각적 글리치 발생.
- **완화**: T-17에서 `Interpolator.computeAlpha`는 `clamp(value, 0, 1)`을 반드시 적용한다 (REQ-SCORE-007). 30 FPS 환경에서 시각 검증을 수동으로 수행한다. 자동화 가능한 부분만 단위 테스트로 다룬다 (alpha 0/0.5/1.0 경계, 1.5 입력 시 1.0 반환, -0.2 입력 시 0.0 반환).
- **대응 우선순위**: Medium

### 리스크 R-3: localStorage 쿼터 초과 / 프라이빗 모드 / 비활성화

- **위험**: Safari 프라이빗 모드에서 `localStorage.setItem`이 `QuotaExceededError`를 던질 수 있고, 브라우저 설정에서 localStorage가 비활성화된 환경에서는 `localStorage` 접근 자체가 `SecurityError`를 발생시킨다. 미처리 시 게임 부트가 중단된다.
- **완화**: T-15에서 `LocalStorageAdapter` 의 모든 `localStorage` 접근(get/set/접근 자체)을 `try/catch`로 감싸고, 실패 시 `inMemoryFallback: number = 0` 필드로 폴백한다 (REQ-SCORE-006). 테스트는 jsdom의 `Object.defineProperty(window, 'localStorage', {...})` 모킹으로 (a) setItem이 throw하는 시나리오, (b) getItem이 잘못된 JSON 반환, (c) localStorage 자체가 `undefined` 인 시나리오를 검증한다.
- **대응 우선순위**: High

### 리스크 R-4: 방향 버퍼 경쟁 조건 (Direction Buffer Race)

- **위험**: 빠른 키 연타(같은 tick 내 → ↓ → ← 순)로 인해 머리가 같은 tick 내에 180° 반전되어 자기 충돌이 즉시 발생하는 시각적 글리치. 또는 키 이벤트가 tick 중간에 발생해 일관성이 깨짐.
- **완화**: T-16에서 `KeyboardHandler`는 **한 슬롯 버퍼**만 유지한다 (REQ-INPUT-002). 반대 방향 입력은 **입력 시점**에 폐기되어 버퍼가 보존된다 (REQ-INPUT-002 본문). `StateMachine.applyTick()` 시작 시 버퍼를 소비하고 비운다 (REQ-INPUT-003). REQ-INPUT-004 는 입력↔적용 사이 방향 변경 시 동작하는 방어 가드이다. 테스트 시나리오: (a) 현재 right → ← 입력 → 입력 시점 폐기, 버퍼 비어있음 검증, (b) 현재 right → ↑ 입력 → 버퍼 ↑, (c) 현재 right → ↑ 입력 → ← 입력 → ← 폐기되고 버퍼는 ↑ 유지 검증, (d) tick 적용 후 버퍼 비움 검증.
- **대응 우선순위**: High

### 리스크 R-5: 시드 결정성 (Obstacle Layout Determinism)

- **위험**: `Math.random()`을 그대로 사용하면 시드 기반 재현이 불가능해 테스트가 불안정해진다.
- **완화**: T-10에서 `ObstacleLayout`은 **Mulberry32** (또는 동등한 32-bit PRNG)를 직접 구현해 시드를 받는다. 동일 시드 + 동일 보드 + 동일 카운트 → 동일한 셀 목록 반환을 단위 테스트로 검증한다 (REQ-DOMAIN-007). `FoodSpawner` 도 테스트 가능하도록 의존성 주입 방식으로 `random: () => number` 함수를 받는다 (프로덕션에서는 `Math.random`, 테스트에서는 시드 PRNG 주입).
- **대응 우선순위**: Medium

### 리스크 R-6: rAF 핸들 누수 (페이지 언로드 시)

- **위험**: `GameLoop.stop()` 미호출 또는 잘못된 핸들 ID 저장으로 인해 페이지가 사라진 후에도 콜백이 큐에 남아 누적된다.
- **완화**: T-13에서 `GameLoop.stop()` 은 저장된 `requestAnimationFrame` ID 에 대해 `cancelAnimationFrame()` 을 호출하고 ID를 `null` 로 리셋한다 (REQ-LOOP-006). 단위 테스트는 jsdom의 `requestAnimationFrame` mocking으로 `cancelAnimationFrame` 호출 여부를 검증한다.
- **대응 우선순위**: Medium

---

## 4. 참조 구현 (Reference Implementations)

본 저장소는 그린필드이므로 사전 코드 참조가 없다. 다음 문서가 사실상의 참조 자산이다.

- **모듈 트리**: `.moai/project/structure.md` (최상위 디렉토리, 모듈 책임, 의존 방향 규칙)
- **부트스트랩 순서**: `.moai/project/structure.md` 의 `src/main.ts` 9단계 절차
- **테스트 배치**: `.moai/project/structure.md` 의 `tests/` 디렉토리 구조 (domain / engine / score)
- **기술 명세**: `.moai/project/tech.md` (버전, 명령, 성능 목표)

외부 참조 (구현 시 필요할 경우 사용):

- MDN `requestAnimationFrame` 명세 — rAF 콜백 타임스탬프 의미
- MDN `Canvas 2D Context` API — `fillRect`, `clearRect`, `getContext('2d')`
- MDN `localStorage` API + `QuotaExceededError` 처리 패턴
- Mulberry32 PRNG 알고리즘 (퍼블릭 도메인, 시드 PRNG 표준 패턴)

---

## 5. MX 태그 계획 (mx_plan)

`.claude/rules/moai/workflow/mx-tag-protocol.md` 컨벤션에 따라 본 SPEC 구현 시 다음 위치에 MX 태그를 적용한다.

### @MX:ANCHOR — 고 fan-in (불변 계약) 후보

다음 함수들은 여러 모듈에서 호출되므로 시그니처와 동작이 불변 계약에 해당한다.

- `GameLoop.tick()` — TickScheduler 콜백 + 외부 진입점. 시그니처 변경 시 전체 엔진 영향.
- `StateMachine.transition(action: Action)` — KeyboardHandler / Collision 모두 호출. action 타입 변경 시 전체 영향.
- `Snake.move(direction: Direction)` — StateMachine / 충돌 판정에서 호출. 반환 값 의미 변경 시 광범위 영향.
- `Board.isOccupied(cell: { x: number; y: number }, occupants: { snake: Snake; obstacles: readonly Obstacle[]; food: Food | null }): boolean` — FoodSpawner / ObstacleLayout / 충돌 판정 모두 의존. 시그니처 변경 금지 (REQ-DOMAIN-001 SSOT).
- `ScoreCalculator.applyFoodScore(multiplier?: number)` — 본 SPEC + 후속 POWERUP SPEC 핵심 진입점. `multiplier` 파라미터 위치 변경 시 후속 SPEC 깨짐.

### @MX:NOTE — 비즈니스 규칙 후보

- `KeyboardHandler` 의 방향 버퍼 슬롯 (1슬롯, 입력 시점 반대 방향 폐기 + 버퍼 보존, 유효 입력만 덮어쓰기 — REQ-INPUT-002 입력 시점 규칙, REQ-INPUT-004 tick 적용 시점 방어 가드)
- `Interpolator.computeAlpha` 의 `clamp(value, 0, 1)` 규칙 — REQ-SCORE-007 (저 FPS 글리치 방지)
- `LocalStorageAdapter` 의 try/catch 폴백 규칙 — REQ-SCORE-006 (실패 시 인메모리, 예외 미전파)
- `ObstacleLayout` 의 시드 결정성 약속 — REQ-DOMAIN-007 (재현 가능 테스트 보장)

### @MX:WARN — 위험 지점 (반드시 `@MX:REASON` 동반)

- `GameLoop.start()` 내부의 `requestAnimationFrame` 호출 → `cancelAnimationFrame` 으로 정리되지 않으면 핸들 누수 발생. `@MX:REASON: rAF handle leak on teardown if stop() is not called`.
- `LocalStorageAdapter` 의 모든 storage 접근 → `QuotaExceededError` / `SecurityError` / `undefined storage` 가능성. `@MX:REASON: localStorage may throw in private mode or be disabled; silent fallback required`.
- `KeyboardHandler` 의 `window.addEventListener('keydown', ...)` → `removeEventListener` 누락 시 메모리 누수. `@MX:REASON: keydown listener must be detached on teardown to prevent leak`.

### @MX:TODO — RED phase 첫 실패 테스트

각 테스트 파일의 첫 RED 테스트를 `@MX:TODO` 로 표시하고 구현(GREEN) 완료 시 제거한다. 예시:

- `tests/domain/snake.test.ts` 의 `it("moves head one cell in current direction on move()", ...)`
- `tests/engine/TickScheduler.test.ts` 의 `it("emits tick when accumulated ms exceeds TICK_MS", ...)`
- `tests/score/LocalStorageAdapter.test.ts` 의 `it("falls back to in-memory when setItem throws QuotaExceededError", ...)`

---

## 6. 후속 SPEC 로드맵 — see spec.md §6 (single source of truth)

플랜은 구현 범위에만 집중한다. 후속 SPEC(POWERUP / LEVEL / LEADERBOARD / VFX) 로드맵은 spec.md §6 에서 단일하게 관리한다.
