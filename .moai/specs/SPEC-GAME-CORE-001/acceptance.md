---
spec_id: SPEC-GAME-CORE-001
version: 1.0.0
created: 2026-05-26
updated: 2026-05-26
---

# 수용 기준 (Acceptance Criteria) — SPEC-GAME-CORE-001

본 문서는 SPEC-GAME-CORE-001 의 검증 기준을 Given / When / Then 시나리오로 정의한다. 모든 시나리오는 Vitest + jsdom 환경에서 자동화 가능한 형태로 작성되며, AC-10b(sub-grid 보간 시각 부드러움)만 수동 검증 항목으로 분류된다.

---

## 1. 핵심 시나리오 (Given / When / Then)

### AC-1: Idle → Running 전이 (REQ-STATE-002, REQ-INPUT-005)

- **Given**: `StateMachine` 이 `idle` 상태이고 `KeyboardHandler` 가 `window` 에 부착되어 있다.
- **When**: 사용자가 `Space` 키를 누른다 (`keydown` 이벤트 `code = "Space"`).
- **Then**: `StateMachine.currentState` 가 `running` 으로 전이되고, 다음 tick 부터 `TickScheduler` 가 `StateMachine.update` 를 호출한다. 뱀이 `right` 방향으로 이동을 시작한다 (초기 머리 셀 = `(floor(BOARD_WIDTH/2), floor(BOARD_HEIGHT/2))`, 길이 3 — REQ-STATE-002).
- **검증 방법**: `StateMachine.test.ts` + `KeyboardHandler.test.ts` 단위 테스트로 자동화.

### AC-2: 방향 버퍼링 및 반대 방향 차단 (REQ-INPUT-002, REQ-INPUT-003, REQ-INPUT-004)

- **Given**: 뱀의 현재 방향이 `right`, `StateMachine` 이 `running`, 버퍼가 비어있다.
- **When**: 한 tick 사이에 사용자가 `ArrowUp` 을 누른 뒤 `ArrowLeft` 를 누른다.
- **Then**: `ArrowUp` 은 현재 방향 `right` 의 반대가 아니므로 입력 시점에 버퍼에 저장된다 (`buffer = up`). 이어서 `ArrowLeft` 는 현재 방향 `right` 의 정반대이므로 **입력 시점에 폐기되며 버퍼는 변경되지 않는다** (`buffer = up` 유지 — REQ-INPUT-002). 다음 tick 에 `buffer = up` 이 적용되어 뱀의 방향이 `up` 으로 바뀌고 버퍼는 비워진다 (REQ-INPUT-003).
- **추가 변형 1 (반대 방향 단독 입력)**: 같은 Given 에서 `ArrowLeft` 만 단독으로 눌리면 입력 시점에 폐기되고 버퍼는 비어있는 상태로 유지된다. 다음 tick 에서 뱀은 계속 `right` 로 이동한다.
- **추가 변형 2 (방어 가드, REQ-INPUT-004)**: 입력과 적용 사이에 방향이 바뀌어 (예: 별도 입력으로 `up` 적용 후) 버퍼의 방향이 새로운 현재 방향의 반대가 된 경우, tick 적용 시점에 버퍼가 폐기되고 현재 방향을 유지한다.
- **검증 방법**: `KeyboardHandler.test.ts` 의 입력 시점 폐기 분기, `StateMachine.test.ts` 의 tick 시점 방어 가드 분기 단위 테스트.

### AC-3: 일반 먹이 섭취 (REQ-DOMAIN-004, REQ-DOMAIN-005, REQ-SCORE-001)

- **Given**: 뱀의 머리가 셀 `(5, 5)` 에 있고, 일반 먹이가 셀 `(6, 5)` 에 위치한다. 뱀의 길이는 3, `currentScore = 0`, `state = running`, 방향은 `right`.
- **When**: 도메인 tick 이 1회 발행된다.
- **Then**: (a) 뱀의 머리가 `(6, 5)` 로 이동, (b) 뱀의 길이가 4 로 증가(꼬리에 세그먼트 1개 추가), (c) `currentScore` 가 `+10` 증가하여 `10`, (d) `FoodSpawner.spawn(board, occupants)` 가 호출되어 반환된 `Food` 의 `cell` 이 `cell ∉ snake.segments AND cell ∉ obstacles AND cell !== eaten food's previous cell` 을 모두 만족한다. 이 외에는 보드 위 임의의 빈 셀에 배치된다.
- **검증 방법**: `Snake.test.ts` + `FoodSpawner.test.ts` + `ScoreCalculator.test.ts` 통합 검증.

### AC-4: 자기 충돌 → 게임 오버 (REQ-DOMAIN-010, REQ-STATE-006)

- **Given**: 뱀의 길이가 5 이고, 머리가 다음 tick 에서 자기 몸통 셀(예: 두 번째 세그먼트가 아닌 네 번째 세그먼트)에 진입하도록 배치된 상태. `state = running`.
- **When**: 도메인 tick 이 1회 발행된다.
- **Then**: (a) `Snake.collidesWithSelf()` 가 `true` 반환, (b) 자기 충돌 이벤트가 `StateMachine` 에 디스패치, (c) `StateMachine.currentState` 가 `gameover` 로 전이, (d) `TickScheduler` 의 후속 tick 발행이 `StateMachine.update` 를 호출해도 도메인은 변경되지 않는다.
- **검증 방법**: `Snake.test.ts` (충돌 판정) + `StateMachine.test.ts` (전이) 단위 테스트.

### AC-5: 벽 충돌 → 게임 오버 (REQ-DOMAIN-009, REQ-STATE-006)

- **Given**: 뱀의 머리가 셀 `(19, 5)` 에 있고 (보드 너비 20, 즉 마지막 열), 방향은 `right`. `state = running`.
- **When**: 도메인 tick 이 1회 발행된다.
- **Then**: (a) 머리의 다음 위치 `(20, 5)` 가 `[0, width)` 범위를 벗어나므로 벽 충돌 이벤트 발생, (b) `StateMachine.currentState` 가 `gameover` 로 전이.
- **변형**: 음수 좌표(예: `(-1, 5)`), 너비/높이 초과 어느 쪽 경계든 동일하게 처리된다.
- **검증 방법**: `Snake.test.ts` (경계 판정) + `StateMachine.test.ts`.

### AC-6: 장애물 충돌 → 게임 오버 (REQ-DOMAIN-011, REQ-STATE-006)

- **Given**: `ObstacleLayout.generate(seed = 42, count = 5, board)` 로 생성된 장애물 중 하나가 셀 `(10, 5)` 에 위치한다. 뱀의 머리가 `(9, 5)` 에 있고 방향은 `right`. `state = running`.
- **When**: 도메인 tick 이 1회 발행된다.
- **Then**: (a) 머리의 다음 위치 `(10, 5)` 가 장애물 셀에 해당하므로 장애물 충돌 이벤트 발생, (b) `StateMachine.currentState` 가 `gameover` 로 전이.
- **검증 방법**: `Obstacle.test.ts` (`contains(cell)`) + `StateMachine.test.ts` 통합.

### AC-7: 일시정지가 도메인 상태를 보존 (REQ-STATE-003, REQ-STATE-004, REQ-STATE-005)

- **Given**: `state = running`, 뱀의 머리는 `(7, 5)`, 길이는 4, 먹이는 `(12, 8)`, 장애물은 시드 42 로 생성된 상태. 이후 `TickScheduler` 가 추가 10회 `update` 를 시도한다.
- **When**: 사용자가 `Space` 를 누른다.
- **Then**: (a) `state = paused`, (b) 10회 모두 `StateMachine.update` 가 호출되지만 `paused` 상태이므로 도메인 상태(뱀 위치 `(7, 5)`, 길이 4, 먹이 `(12, 8)`, 장애물 목록)는 변경되지 않는다, (c) `Renderer` 는 마지막 도메인 스냅샷을 계속 렌더링하지만 `Snake.move()` 는 호출되지 않는다, (d) 사용자가 다시 `Space` 를 누르면 `state = running` 으로 복귀하고 동일 위치에서 게임이 재개된다.
- **검증 방법**: `StateMachine.test.ts` 에서 paused 상태의 update 무시 검증, `KeyboardHandler.test.ts` 에서 Space 키 토글 검증.

### AC-8: 최고점수 업데이트 및 페이지 새로고침 후 영속 (REQ-SCORE-003, REQ-SCORE-004, REQ-SCORE-005)

- **Given**: jsdom 환경에서 `localStorage` 가 정상 동작. `LocalStorageAdapter.loadHighScore()` 가 초기 호출 시 `0` 을 반환.
- **When**: 게임이 진행되어 `ScoreCalculator.currentScore` 가 `120` 점에 도달.
- **Then**: (a) `highScore` 가 `120` 으로 업데이트, (b) `localStorage.getItem("snake2026_highscore")` 가 `"120"` 반환.
- **추가 단계**: `LocalStorageAdapter` 를 새 인스턴스로 재생성(페이지 새로고침 모사) → `loadHighScore()` 가 `120` 반환.
- **검증 방법**: `LocalStorageAdapter.test.ts` + `ScoreCalculator.test.ts` 통합 시나리오.

### AC-9: localStorage 미사용 환경에서도 게임 진행 (REQ-SCORE-006)

- **Given**: jsdom 환경에서 `Object.defineProperty(window, 'localStorage', { get: () => { throw new Error("SecurityError"); } })` 로 모킹하여 storage 접근 자체가 실패하도록 설정.
- **When**: 애플리케이션이 부트스트랩하고 게임이 진행되어 `currentScore` 가 `50` 에 도달.
- **Then**: (a) 부트스트랩 중 예외가 게임 루프로 전파되지 않는다, (b) `LocalStorageAdapter.loadHighScore()` 가 `0` 반환 (인메모리 폴백), (c) `saveHighScore(50)` 호출이 throw 하지 않고 내부적으로 `inMemoryFallback = 50` 으로 저장, (d) 동일 세션 내 `loadHighScore()` 재호출 시 `50` 반환, (e) 페이지 새로고침 모사 후에는 `0` 으로 초기화(영속성 없음은 정상).
- **검증 방법**: `LocalStorageAdapter.test.ts` 에서 localStorage 모킹 후 시나리오 검증.

### AC-9b: localStorage read 시 JSON 파싱 실패 (REQ-SCORE-005)

- **Given**: `localStorage.getItem("snake2026_highscore")` 가 `"NOT_JSON"` 같은 손상된 값을 반환하도록 모킹.
- **When**: `LocalStorageAdapter.loadHighScore()` 가 호출된다.
- **Then**: 반환값은 `0` 이고 예외가 전파되지 않는다. 이후 `saveHighScore` 호출은 정상 시도된다.
- **검증 방법**: `LocalStorageAdapter.test.ts` 단위 테스트.

### AC-9c: localStorage write 시 쿼터 초과 (REQ-SCORE-006)

- **Given**: `localStorage.setItem` 이 `QuotaExceededError` 를 던지도록 모킹.
- **When**: `LocalStorageAdapter.saveHighScore(150)` 이 호출된다.
- **Then**: 예외가 전파되지 않는다. 동일 세션 내 후속 `loadHighScore()` 호출은 `inMemoryFallback` 에서 `150` 을 반환한다.
- **검증 방법**: `LocalStorageAdapter.test.ts` 단위 테스트.

### AC-10a: TickScheduler FPS 독립성 — 자동화 (REQ-LOOP-005)

- **Given**: `TickScheduler` (`tickInterval = 150ms`) 와 격리된 시간 소스(수동 deltaTime 주입).
- **When**: 동일한 1000ms 의 시간을 두 가지 방식으로 시뮬레이션한다 — (1) 60프레임 × 16.67ms 입력, (2) 7프레임 × ≈143ms 입력.
- **Then**: 두 시뮬레이션 모두 `onTick` 콜백을 동일한 횟수(1000ms / 150ms = 6회 ± 0) 호출한다.
- **검증 방법**: `TickScheduler.test.ts` 단위 테스트.

### AC-10b: sub-grid 보간 시각적 부드러움 — 수동 검증 (REQ-SCORE-007)

- **Given**: `npm run preview` 로 프로덕션 빌드를 서빙. 기본 설정 (BOARD 20×20, `TICK_MS=150`, 단일 `neon` 테마).
- **When**: 60Hz 디스플레이에서 30초간 플레이.
- **Then**: 뱀의 이동이 시각적으로 부드럽다 (jitter 없음, 셀 건너뛰기 없음, 멈추는 프레임 없음). 자동화 범위에 포함하지 않는다 (`.moai/project/product.md` 성공 기준 3번 근거).

---

## 2. 엣지 케이스 시나리오

### AC-E1: 보드가 가득 찼을 때 먹이 스폰 실패 (REQ-DOMAIN-006)

- **Given**: 뱀의 길이가 보드의 모든 빈 셀을 점유 (이론적 극한 — 20×20 = 400셀 중 장애물 5셀 제외 395칸 점유).
- **When**: 뱀이 마지막 빈 셀의 먹이를 먹는다.
- **Then**: `FoodSpawner.spawn()` 이 `null` 을 반환하고 예외를 던지지 않는다. `StateMachine` 은 `running` 상태를 유지한다. 새 먹이는 등장하지 않는다. 이후 tick 들은 뱀이 충돌할 때까지 계속 뱀을 이동시킨다.
- **검증 방법**: `FoodSpawner.test.ts` 단위 테스트.

### AC-E2: 시드 결정성 (REQ-DOMAIN-007)

- **Given**: 보드 크기 20×20.
- **When**: `ObstacleLayout.generate(seed = 42, count = 8, board)` 를 두 번 호출한다.
- **Then**: 두 호출의 반환 셀 목록이 길이·순서·각 셀의 `(col, row)` 모두 완전히 동일하다.
- **검증 방법**: `ObstacleLayout.test.ts` 단위 테스트 (스냅샷 비교).

### AC-E3: gameover → idle 재시작 시 점수 초기화 + 최고점수 보존 (REQ-STATE-007, REQ-SCORE-010)

- **Given**: 게임이 `gameover` 상태이고, `currentScore = 80`, `highScore = 80`.
- **When**: 사용자가 `KeyR` 을 누른다.
- **Then**: (a) `state = idle`, (b) 뱀이 초기 위치·초기 길이로 리셋, (c) 장애물이 동일 시드로 재생성 (시드 결정성 덕분에 동일 배치), (d) `currentScore = 0` 으로 리셋, (e) `highScore = 80` 그대로 유지.
- **검증 방법**: `StateMachine.test.ts` + `ScoreCalculator.test.ts` 통합 시나리오.

### AC-E4: idle 상태에서 방향키 입력 무시 (REQ-STATE-008)

- **Given**: `state = idle`.
- **When**: 사용자가 `ArrowRight` 를 누른다.
- **Then**: (a) `StateMachine.currentState` 가 그대로 `idle`, (b) 뱀은 이동하지 않음, (c) Space 키만이 `idle → running` 전이를 트리거함.
- **검증 방법**: `StateMachine.test.ts` + `KeyboardHandler.test.ts`.

### AC-E5: rAF 핸들 정리 (REQ-LOOP-006)

- **Given**: `GameLoop.start()` 가 호출되어 `requestAnimationFrame` 핸들이 저장된 상태.
- **When**: `GameLoop.stop()` 이 호출된다.
- **Then**: (a) `cancelAnimationFrame` 이 저장된 핸들로 호출됨, (b) 내부 핸들 필드가 `null` 로 리셋됨, (c) 이후 rAF 콜백이 큐에서 발생해도 도메인이 변경되지 않음.
- **검증 방법**: `GameLoop.test.ts` (jsdom 의 `requestAnimationFrame` 모킹).

---

## 2.5 신규 시나리오 — 고아 REQ 커버리지 보강

### AC-11: 상태 전이 리스너 API (REQ-STATE-009)

- **Given**: `StateMachine.onTransition((from, to) => …)` 으로 콜백이 등록되어 있고 `state = idle`.
- **When**: `Space` 입력에 의해 `idle → running` 전이가 발생한다.
- **Then**: 콜백이 정확히 1회 호출되며 인자는 `("idle", "running")` 이다.
- **검증 방법**: `StateMachine.test.ts` 단위 테스트.

### AC-12: 키 매핑 완전성 (REQ-INPUT-001)

- **Given**: `KeyboardHandler` 가 새 `window` mock 에 부착된 상태.
- **When**: `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight`, `KeyW` / `KeyA` / `KeyS` / `KeyD`, `Space`, `KeyR` 각 키가 keydown 으로 디스패치된다.
- **Then**: 각 키가 올바른 액션(방향 / `START`·`TOGGLE_PAUSE` / `RESTART`)에 매핑된다. `KeyP`, `KeyZ`, 그 외 임의 키는 액션을 생성하지 않는다.
- **검증 방법**: `KeyboardHandler.test.ts` 단위 테스트.

### AC-13: 매핑 키에 대한 preventDefault (REQ-INPUT-007)

- **Given**: `KeyboardHandler` 가 부착되어 있고, `event.preventDefault` 에 spy 가 설치된 상태.
- **When**: `ArrowDown`, `Space`, `KeyR`, `KeyA` 각각이 keydown 으로 디스패치된다.
- **Then**: 각 호출마다 `event.preventDefault` 가 정확히 1회 호출된다.
- **검증 방법**: `KeyboardHandler.test.ts` 단위 테스트.

### AC-14: running 상태에서 장애물 불변성 (REQ-DOMAIN-008)

- **Given**: `ObstacleLayout` 이 N 개 장애물로 초기화되어 있고, `state = running`.
- **When**: `TickScheduler` 가 100 tick 을 발행한다 (충돌 없음).
- **Then**: `ObstacleLayout.list` 는 `t=0` 시점과 동일한 참조 identity 와 동일한 배열 내용을 반환한다.
- **검증 방법**: `ObstacleLayout.test.ts` 단위 테스트.

### AC-15: 점수 필드 read-only 노출 (REQ-SCORE-002)

- **Given**: `ScoreCalculator` 인스턴스의 `currentScore = 20`, `highScore = 50`.
- **When**: 외부 코드가 `score.currentScore = 999` 로 직접 쓰기를 시도한다 (TypeScript `readonly` 컴파일 체크 + 런타임 방어 사본).
- **Then**: TS 컴파일 에러 (테스트 fixture) 또는 런타임 변경이 거부되며, 이후 `currentScore` 읽기는 여전히 `20` 을 반환한다.
- **검증 방법**: `ScoreCalculator.test.ts` 단위 테스트.

### AC-16: 렌더링 중 도메인 무변경 (REQ-SCORE-008)

- **Given**: `structuredClone` 으로 캡처한 `{ snake.segments, food.cell, obstacle list, score values }` 스냅샷.
- **When**: `Renderer.render(alpha = 0.5)` 가 호출된다.
- **Then**: 호출 후 동일 객체들의 재캡처가 원본 스냅샷과 deep-equal 이다. `Renderer` 는 읽기 전용으로만 동작한다.
- **검증 방법**: `Renderer.test.ts` 단위 테스트.

---

## 3. Definition of Done (완료 정의)

본 SPEC의 구현이 완료된 것으로 간주되려면 다음 모든 조건이 충족되어야 한다.

### 3.1 기능 완전성

- [x] 모든 REQ-LOOP / REQ-STATE / REQ-DOMAIN / REQ-INPUT / REQ-SCORE 구현 완료
- [x] `npm run build` 성공, `dist/` 생성
- [x] `npm run preview`로 idle → running → 충돌 → gameover → idle 라이프사이클 가능 (수동 검증 권장)
- [x] 최고점수 localStorage 영속 (jsdom 자동 검증 통과 — 실제 브라우저 수동 검증 권장)

### 3.2 자동화 테스트

- [x] AC-1 ~ AC-9c, AC-10a, AC-E1 ~ AC-E5, AC-11 ~ AC-16 시나리오 통과 (총 100 테스트)
- [x] 라인 커버리지 95.64% (목표 80% 초과)
- [x] `vitest.config.ts`에 `coverage.thresholds.lines: 80` 설정 (실제: lines/functions/statements 80, branches 70)

### 3.3 코드 품질 (TRUST 5)

- [x] Tested / Readable / Unified / Secured / Trackable — 전체 통과

### 3.4 아키텍처 무결성

- [x] REQ-DOMAIN-012 도메인 순수성: render/score/engine/input 미참조 검증
- [x] `src/main.ts` 8-step 부트스트랩 spec.md §5.4 준수, `particles: null` 명시
- [x] 후속 SPEC 확장 훅 4종 모두 존재 (StateMachine.onTransition, applyFoodScore multiplier, Renderer particles 인자, TickScheduler 동적 주기 hook)

### 3.5 MX 태그

- [x] ANCHOR 4개 (plan.md §5의 5개 중 GameLoop.tick 대신 GameLoop.start WARN으로 대체, 다른 4개는 정확히 배치)
- [x] WARN 5개 (rAF 1, localStorage 3, keydown 1)
- [x] NOTE 13개
- [x] TODO 0개 (모두 GREEN 단계에서 해제됨)

### 3.6 문서

- [x] codemaps/overview.md v1.0.0 반영
- [x] README.md 작성 (조작법 + 빌드/실행 + MIT 라이선스)
- [x] SPEC HISTORY v0.1.0 → v1.0.0 구현 완료 기록

---

## 4. 검증 비범위 (Out of Acceptance Scope)

다음은 본 SPEC 의 수용 기준에 포함되지 않는다. 후속 SPEC 의 수용 기준으로 다룬다.

- 파워업 먹이의 효과 발현 / 만료 / 점수 배율 — SPEC-POWERUP-001 의 AC.
- 레벨 자동 상승 / 동적 tick 단축 — SPEC-LEVEL-001 의 AC.
- 로컬 Top 10 리더보드 정렬 / 닉네임 저장 / 리더보드 UI — SPEC-LEADERBOARD-001 의 AC.
- 파티클 시각 효과 / 글로우 트레일 / 네온 그라데이션 폴리시 / 화면 흔들림 — SPEC-VFX-001 의 AC.
- 사운드 효과 / BGM / 음소거.
- 모바일 터치 / 스와이프.
- 다국어 i18n.
- 60 FPS 정량 측정 (Performance API 기반 자동화) — 본 SPEC 의 AC-10 은 수동 시각 검증으로 한정.
