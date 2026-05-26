# Architecture Overview — snake-game-2026

상태: **구현 완료 v1.0.0** (SPEC-GAME-CORE-001)

## 1. 시스템 한 줄 정의

설치 없이 URL 하나로 즉시 플레이하는 모던 스네이크 게임 (웹 브라우저 전용)

## 2. 아키텍처 패턴

- **계층형 모놀리식 클라이언트 SPA**: 백엔드 없음, 정적 호스팅으로 배포.
- **단방향 의존**: `config → domain → engine → render`, `engine → score`, `input → engine`. 역방향 호출 금지.
- **StateMachine 중심**: 모든 게임 진행은 `StateMachine.update()`에서 도메인 변환 발생. 상태는 idle / running / paused / gameover 4가지.
- **Snapshot 패턴**: Renderer는 `StateMachine.getRenderSnapshot()`만 호출하며 도메인을 직접 변경하지 않는다 (AC-16 read-only).

## 3. 모듈 맵

### `src/config/` (2개 파일)
- `constants.ts` — BOARD_WIDTH(20), BOARD_HEIGHT(20), TICK_MS(150), OBSTACLE_SEED, OBSTACLE_COUNT 등 전역 상수
- `difficulty.ts` — 난이도 플레이스홀더 (후속 LEVEL-001에서 확장)

### `src/domain/` (7개 파일)
- `Board.ts` — 20×20 셀 그리드, `isOccupied(cell)` SSOT (@MX:ANCHOR REQ-DOMAIN-001)
- `SnakeSegment.ts` — 단일 셀 위치 타입
- `Snake.ts` — 세그먼트 배열, `move(direction, ate)` 진입점 (@MX:ANCHOR REQ-DOMAIN-002/003), 1-slot 방향 버퍼, 반대 방향 차단, 벽/자기충돌 판정
- `Food.ts` — 먹이 셀 위치
- `Obstacle.ts` — 장애물 셀 배열, `contains(cell)` 판정
- `FoodSpawner.ts` — Mulberry32 PRNG 인라인, 결정적 시드 기반 스폰, 보드 가득 찼을 때 null 반환
- `ObstacleLayout.ts` — 결정적 시드(OBSTACLE_SEED) 기반 고정+랜덤 배치, generate() 호출마다 동일 결과

### `src/engine/` (3개 파일)
- `TickScheduler.ts` — FPS 독립 누산기 (accumulate deltaMs, emit tick when ≥ TICK_MS)
- `StateMachine.ts` — 4-상태 전이, `transition()` 공용 진입점 (@MX:ANCHOR), `onTransition(cb)` 리스너 API, `getRenderSnapshot()` read-only 뷰
- `GameLoop.ts` — rAF 루프 + cancelAnimationFrame 정리 (@MX:WARN rAF 누수 위험), alpha 계산 후 Renderer.render(alpha) 호출

### `src/score/` (2개 파일)
- `ScoreCalculator.ts` — currentScore / highScore read-only getter, `applyFoodScore(multiplier)` (@MX:ANCHOR 후속 POWERUP-001 훅)
- `LocalStorageAdapter.ts` — localStorage 3개 접근(읽기/쓰기/접근 자체) 모두 try/catch (@MX:WARN × 3), inMemoryFallback

### `src/input/` (1개 파일)
- `KeyboardHandler.ts` — 10개 키 매핑 + preventDefault, `attach()` / `detach()` (@MX:WARN addEventListener 누수)

### `src/render/` (4개 파일)
- `Interpolator.ts` — clamp(alpha, 0, 1) 유틸
- `ThemeRegistry.ts` — 테마 등록 및 조회
- `neonTheme.ts` — 네온 색상 팔레트, Canvas 2D 스타일 정의
- `Renderer.ts` — Canvas 2D fillRect 기반, lerp 보간, ParticleSystem | null 생성자 인자 (본 SPEC에서는 null)

### `src/main.ts`
8단계 부트스트랩: canvas 조회 → Board 생성 → ObstacleLayout.generate() → Snake 초기화 → FoodSpawner 생성 → ScoreCalculator + LocalStorageAdapter 생성 → KeyboardHandler.attach() → GameLoop.start()

## 4. 데이터 흐름

```
KeyboardHandler (keydown)
  → 방향/액션 버퍼
  → StateMachine.dispatch()

TickScheduler (150ms 주기)
  → StateMachine.update()
    → Snake.move(direction, ate)
    → 충돌 판정 (벽/자기/장애물)
    → FoodSpawner.spawn() (먹이 섭취 시)
    → ScoreCalculator.applyFoodScore()
    → StateMachine.transition(nextState)

GameLoop (60Hz rAF)
  → alpha = clamp((now - lastTickAt) / TICK_MS, 0, 1)
  → snapshot = StateMachine.getRenderSnapshot()
  → Renderer.render(alpha)
    → Canvas 2D fillRect (lerp 보간 좌표)
```

## 5. MX 태그 invariant 계약

| 태그 | 위치 | 이유 |
|---|---|---|
| @MX:ANCHOR | `Board.isOccupied` | REQ-DOMAIN-001 SSOT 시그니처. FoodSpawner / ObstacleLayout / 충돌 판정 모두 이 함수 참조 |
| @MX:ANCHOR | `Snake.move` | REQ-DOMAIN-002/003 핵심 진입점. 세그먼트 이동 + 길이 성장 + 충돌 판정 모두 여기서 발생 |
| @MX:ANCHOR | `StateMachine.transition` | KeyboardHandler + Collision 두 경로의 공용 상태 전이 진입점 |
| @MX:ANCHOR | `ScoreCalculator.applyFoodScore` | 본 SPEC + 후속 POWERUP-001 공용 점수 적용 진입점. multiplier 인자 위치 고정 |

## 6. 위험 지점 (WARN)

| @MX:WARN 위치 | 위험 내용 |
|---|---|
| `GameLoop.start` | rAF 핸들 누수: stop() 없이 재시작 시 두 루프가 병렬 실행됨 |
| `LocalStorageAdapter.loadHighScore` | localStorage 접근 자체가 throw 가능 (SecurityError 등) |
| `LocalStorageAdapter.saveHighScore (setItem)` | QuotaExceededError 등 write 실패 가능 |
| `LocalStorageAdapter.loadHighScore (getItem)` | 손상된 JSON 파싱 실패 가능 |
| `KeyboardHandler.attach` | detach() 미호출 시 addEventListener 누수 |

## 7. 테스트 매트릭스

| 레이어 | 테스트 파일 수 | 포함 테스트 |
|---|---|---|
| 도메인 | 6 | Board, Snake, Food, Obstacle, FoodSpawner, ObstacleLayout |
| 엔진 | 3 | TickScheduler, StateMachine, GameLoop |
| 입력 | 1 | KeyboardHandler |
| 점수 | 2 | ScoreCalculator, LocalStorageAdapter |
| 렌더 | 3 | Interpolator, ThemeRegistry, Renderer |
| **합계** | **15** | **100 테스트, 라인 커버리지 95.64%** |

## 8. 후속 SPEC 통합 지점

| SPEC | 통합 위치 |
|---|---|
| POWERUP-001 | `ScoreCalculator.applyFoodScore(multiplier)` 활용; FoodSpawner 패턴 복제하여 PowerUpSpawner 추가 |
| LEVEL-001 | `StateMachine.onTransition` 리스너에서 score threshold 감지; `TickScheduler` 동적 주기 변경 hook 활용 |
| LEADERBOARD-001 | `LocalStorageAdapter` 확장 또는 신규 `LeaderboardStore` 추가 |
| VFX-001 | `Renderer` 생성자의 `particles: null` 자리에 ParticleSystem 구현체 주입 |

---

생성/갱신일: 2026-05-26 (sync)
상태: implemented v1.0.0 (SPEC-GAME-CORE-001)
