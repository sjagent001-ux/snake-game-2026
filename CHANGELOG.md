# Changelog

모든 주목할 만한 변경 사항은 이 파일에 기록됩니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
이 프로젝트는 [Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

---

## [1.0.0] - 2026-05-26 - 첫 플레이 가능 릴리즈

### Added

- **SPEC-GAME-CORE-001 전체 구현**: 외부 게임 엔진 없이 TypeScript + HTML5 Canvas 2D로 구성된 모던 스네이크 게임 코어
- **게임 루프**: rAF 기반 GameLoop + FPS 독립 누산기(TickScheduler, 150ms 고정 tick) + sub-grid 선형 보간 렌더링 (alpha = clamp(elapsed/TICK_MS, 0, 1))
- **4-상태 머신**: idle / running / paused / gameover. StateMachine.onTransition 리스너 API 포함 (후속 LEVEL-001 훅)
- **도메인 모델**: Board (20×20), SnakeSegment, Snake (1-slot 방향 버퍼 + 반대 방향 차단), Food, Obstacle
- **FoodSpawner**: Mulberry32 PRNG 인라인 구현, 결정적 시드 기반 먹이 스폰, 보드 가득 찼을 때 null 반환
- **ObstacleLayout**: 결정적 시드(OBSTACLE_SEED) 기반 고정+랜덤 장애물 배치, 게임 진행 중 불변
- **KeyboardHandler**: ArrowKeys + WASD + Space + R 총 10개 키, keydown addEventListener + preventDefault
- **ScoreCalculator**: currentScore / highScore read-only getter, applyFoodScore(multiplier) 메서드 (기본값 1.0, 후속 POWERUP-001 훅)
- **LocalStorageAdapter**: localStorage 모든 접근에 try/catch, 접근 불가 시 inMemoryFallback으로 전환
- **Renderer**: Canvas 2D fillRect 기반, Interpolator(clamp), ThemeRegistry, neon 테마, getRenderSnapshot() read-only 패턴 (AC-16)
- **main.ts**: spec.md §5.4 8단계 부트스트랩, ParticleSystem 자리에 null 명시적 주입

### Build

- TypeScript 5.x strict + noUncheckedIndexedAccess 모드
- Vite 5.x 정적 번들 빌드 (`npm run build` → `dist/`)
- Vitest 2.x + jsdom + @vitest/coverage-v8 테스트 환경
- coverage.thresholds: lines/functions/statements 80, branches 70

### Tests

- 100 단위 테스트, 15개 테스트 파일
- 라인 커버리지 95.64% (목표 80% 초과)
- AC-1 ~ AC-9c, AC-10a, AC-E1 ~ AC-E5, AC-11 ~ AC-16 자동 검증 (AC-10b는 수동 시각 검증)

### Quality

- TRUST 5 충족: `npx tsc --noEmit` / `npx eslint` / `npx vite build` 모두 0 errors
- MX 태그 22개: ANCHOR 4개 (Board.isOccupied, Snake.move, StateMachine.transition, ScoreCalculator.applyFoodScore), WARN 5개 (GameLoop.start rAF 누수, LocalStorageAdapter 3개, KeyboardHandler.attach 1개), NOTE 13개
- TODO 0개 (GREEN 단계에서 전부 해제)

---

## [0.1.0] - 2026-05-26 - 초기 SPEC 작성

### Added

- `.moai/project/product.md`: 제품 개요, 타겟 사용자, 핵심 기능, 상태 머신, 성공 기준 SSOT 작성
- `.moai/project/structure.md`: 디렉토리 구조, 의존 방향 규칙, 모듈 책임 SSOT 작성
- `.moai/project/tech.md`: 기술 스택, 빌드 설정, 테스트 전략, TDD 커버리지 목표 SSOT 작성
- `SPEC-GAME-CORE-001`: spec.md / plan.md / acceptance.md / spec-compact.md 초안 (EARS 형식 요구사항, TDD 구현 계획, Given/When/Then 수용 기준)
- `.moai/project/codemaps/overview.md`: 계획 단계 자리표시자
