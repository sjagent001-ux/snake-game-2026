# Snake 2026

설치 없이 URL 하나로 즉시 플레이하는 모던 스네이크 게임 (웹 브라우저 전용)

**Status: v1.0.0 (SPEC-GAME-CORE-001 구현 완료) — 100 tests passing, 95.64% line coverage**

---

## 게임 소개

Snake 2026은 클래식 스네이크 게임의 친숙한 조작감 위에 네온 비주얼과 부드러운 sub-grid 보간 이동을 더한 경량 웹 게임입니다. 별도 설치나 로그인 없이 브라우저에서 URL을 열면 즉시 플레이할 수 있습니다.

캐주얼 플레이어는 물론, TypeScript와 HTML5 Canvas 2D로 구현된 게임 아키텍처를 직접 살펴보려는 개발자나 포트폴리오 관람자를 위한 프로젝트이기도 합니다. 외부 게임 엔진 없이 순수 TypeScript와 Canvas API만으로 60Hz 렌더링과 FPS 독립적 게임 로직을 구현한 구조를 코드에서 직접 확인할 수 있습니다.

먹이를 먹어 뱀을 키우고 최고점수를 갱신하세요. 고정 및 랜덤 장애물이 추가적인 도전을 제공하며, 최고점수는 localStorage에 저장되어 브라우저를 닫아도 유지됩니다.

---

## 게임 조작법

| 키 | 동작 |
|---|---|
| ArrowUp / ArrowDown / ArrowLeft / ArrowRight | 이동 방향 전환 |
| W / A / S / D | 이동 방향 전환 (WASD) |
| Space | 게임 시작 (idle) / 일시정지 (running) / 재개 (paused) |
| R | 재시작 (게임오버 상태에서만 동작) |

---

## 빠른 시작

```bash
npm install
npm run dev          # 개발 서버 (http://localhost:5173)
npm run build        # dist/ 정적 번들 생성
npm run preview      # dist/ 로컬 미리보기
npm test             # 테스트 실행 (watch 모드)
npm run test:coverage  # 커버리지 리포트
npm run lint
```

---

## 기술 스택

- TypeScript 5.x strict + noUncheckedIndexedAccess
- Vite 5.x (빌드 및 개발 서버)
- Vitest 2.x + jsdom + @vitest/coverage-v8 (테스트)
- HTML5 Canvas 2D (외부 게임 엔진 없음)

---

## 프로젝트 구조

```
src/
  config/      # 상수, 난이도 플레이스홀더
  domain/      # Board, Snake, Food, Obstacle, FoodSpawner, ObstacleLayout
  engine/      # TickScheduler, StateMachine, GameLoop
  score/       # ScoreCalculator, LocalStorageAdapter
  input/       # KeyboardHandler
  render/      # Interpolator, ThemeRegistry, neon theme, Renderer
  main.ts      # 8단계 부트스트랩
tests/         # 15개 테스트 파일 (100 테스트)
public/
```

---

## 아키텍처 핵심 원칙

1. **도메인 -> 엔진 -> 렌더 단방향 의존**: 도메인 레이어는 브라우저 API에 직접 의존하지 않으며, 렌더 레이어는 도메인을 읽기 전용으로만 소비합니다.

2. **FPS 독립 tick(150ms) + 60Hz rAF + sub-grid 보간**: 게임 로직은 150ms 고정 주기로 실행되고, 렌더링은 60Hz requestAnimationFrame에서 alpha 값 기반 선형 보간으로 부드러운 이동을 표현합니다.

3. **MX 태그 기반 invariant 계약**: 핵심 진입점(Board.isOccupied, Snake.move, StateMachine.transition, ScoreCalculator.applyFoodScore)에 @MX:ANCHOR 태그가 부착되어 후속 SPEC 구현 시 변경 위험을 명시합니다.

---

## 후속 SPEC 로드맵

| SPEC ID | 내용 |
|---|---|
| POWERUP-001 | 파워업 먹이 (점수 배율, 일시적 속도 변화 등) 구현 |
| LEVEL-001 | 레벨 시스템 및 tick 주기 동적 단축으로 난이도 자동 상승 |
| LEADERBOARD-001 | 로컬 Top 10 리더보드, 닉네임 입력, 리더보드 UI |
| VFX-001 | 파티클 시각 효과, 글로우 트레일, 네온 그라데이션 폴리시 |

---

## 라이선스

MIT License. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.
