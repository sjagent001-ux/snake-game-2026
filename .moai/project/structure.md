# 프로젝트 구조 — snake-game-2026

> 이 문서는 소스 코드가 아직 존재하지 않는 시점에 작성된 **권장 설계안**이다.
> `/moai run` 단계에서 실제 구현 시 이 구조를 기준으로 스캐폴딩한다.

---

## 최상위 디렉토리 트리 (계획)

```
snake-game-2026/
├── public/
│   └── index.html
├── src/
│   ├── main.ts
│   ├── config/
│   │   ├── constants.ts
│   │   └── difficulty.ts
│   ├── engine/
│   │   ├── GameLoop.ts
│   │   ├── StateMachine.ts
│   │   └── TickScheduler.ts
│   ├── domain/
│   │   ├── snake/
│   │   │   ├── Snake.ts
│   │   │   └── SnakeSegment.ts
│   │   ├── food/
│   │   │   └── Food.ts
│   │   ├── powerup/
│   │   │   ├── PowerUp.ts
│   │   │   └── PowerUpEffect.ts
│   │   ├── obstacle/
│   │   │   └── Obstacle.ts
│   │   ├── board/
│   │   │   └── Board.ts
│   │   ├── FoodSpawner.ts
│   │   ├── PowerUpSpawner.ts
│   │   └── ObstacleLayout.ts
│   ├── render/
│   │   ├── Renderer.ts
│   │   ├── Interpolator.ts
│   │   ├── ParticleSystem.ts
│   │   └── theme/
│   │       ├── neon.ts
│   │       └── ThemeRegistry.ts
│   ├── input/
│   │   └── KeyboardHandler.ts
│   └── score/
│       ├── ScoreCalculator.ts
│       └── LocalStorageAdapter.ts
├── tests/
│   ├── domain/
│   │   ├── snake.test.ts
│   │   ├── food.test.ts
│   │   ├── powerup.test.ts
│   │   ├── obstacle.test.ts
│   │   ├── FoodSpawner.test.ts
│   │   ├── PowerUpSpawner.test.ts
│   │   └── ObstacleLayout.test.ts
│   ├── engine/
│   │   ├── StateMachine.test.ts
│   │   └── TickScheduler.test.ts
│   └── score/
│       ├── ScoreCalculator.test.ts
│       └── LocalStorageAdapter.test.ts
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── package.json
└── package-lock.json
```

---

## 디렉토리 및 주요 파일 역할

### `public/`

브라우저가 직접 서빙하는 정적 자산 디렉토리.

- `index.html`: 단일 HTML 파일. `<canvas id="game">` 요소와 `<script type="module" src="/src/main.ts">` 태그를 포함한다. Vite가 빌드 시 번들 스크립트 경로를 자동으로 치환한다.

### `src/main.ts`

애플리케이션 진입점. 다음 순서로 모든 모듈을 연결하고 게임 루프를 시작한다.

1. `ThemeRegistry` 로드 (neon 기본 테마 등록)
2. `LocalStorageAdapter` 인스턴스 생성, 최고점수 복원
3. `ScoreCalculator` 초기화 (복원된 최고점수 주입)
4. `Board`, `Snake`, `FoodSpawner`, `PowerUpSpawner`, `ObstacleLayout` 생성
5. `ParticleSystem` 생성
6. `Renderer` 생성 (Canvas 컨텍스트, `ThemeRegistry`, `ParticleSystem` 주입)
7. `StateMachine` 생성 (`idle` 초기 상태)
8. `KeyboardHandler` 부착 (`window` 키 이벤트 → `StateMachine` 디스패치)
9. `GameLoop` 생성 (tick 콜백 = `StateMachine.update`, render 콜백 = `Renderer.render`), `start()`

### `src/config/`

런타임에 변하지 않는 상수와 난이도 곡선 정의.

- `constants.ts`: 캔버스 크기, 격자 크기(셀 픽셀 수), tick 기본 주기(ms), 파워업 지속 시간 등 하드코딩된 값
- `difficulty.ts`: 점수 구간별 tick 주기 감소 함수, 파워업 등장 확률 테이블

### `src/engine/`

게임의 시간·흐름을 제어하는 핵심 레이어. 도메인 모델이나 렌더러에 직접 의존하지 않는다.

- `GameLoop.ts`: `requestAnimationFrame` 기반 루프. 매 프레임 delta time을 계산하고 `TickScheduler`에 전달한다. 렌더 호출도 이곳에서 발생한다.
- `TickScheduler.ts`: 고정 주기(예: 150ms) 단위로 게임 로직 tick을 발행한다. 프레임 속도와 게임 속도를 분리해 보간의 기준 시점을 일정하게 유지한다.
- `StateMachine.ts`: `idle` / `running` / `paused` / `gameover` 상태와 전이 규칙을 관리한다. 상태별로 tick 활성화 여부와 렌더 모드를 결정한다.

### `src/domain/`

순수 게임 로직 레이어. **렌더링·저장소·입력**에 의존하지 않는다. 이 레이어의 모든 클래스는 TDD로 먼저 테스트를 작성하고 구현한다.

- `snake/Snake.ts`: 뱀 세그먼트 목록, 이동 방향, 성장 로직, 자기 충돌 판정
- `snake/SnakeSegment.ts`: 격자 좌표 `(col, row)` 단순 값 객체
- `food/Food.ts`: 일반 먹이 위치 및 점수 가중치
- `powerup/PowerUp.ts`: 파워업 먹이 위치와 효과 종류(`speed` / `doubleScore` / `invincible`)
- `powerup/PowerUpEffect.ts`: 효과 활성 여부, 남은 지속 시간, tick마다 감소 로직
- `obstacle/Obstacle.ts`: 고정 및 랜덤 벽 타일 목록, 충돌 판정
- `board/Board.ts`: 격자 크기, 유효 좌표 범위, 빈 셀 목록 (먹이·장애물 배치에 활용)
- `FoodSpawner.ts`: 빈 셀 중 무작위 위치를 선택해 일반 먹이 인스턴스를 생성. 뱀·장애물·파워업과 위치 충돌하지 않도록 보드 상태를 조회한다.
- `PowerUpSpawner.ts`: 일정 확률(예: tick당 ε)로 파워업 종류(`speed` / `doubleScore` / `invincible`)를 무작위 선택해 보드에 배치. 파워업의 라이프타임도 관리한다.
- `ObstacleLayout.ts`: 게임 시작 시 보드의 내부 벽 배치 패턴(고정 시드 + 난이도 파라미터)을 결정해 `Obstacle` 셀 목록을 반환. 게임 중 추가/제거 없음(MVP 범위).

### `src/render/`

Canvas 2D API를 사용하는 시각화 레이어. 도메인 객체를 읽기 전용으로 소비한다. 도메인 상태를 변경하지 않는다.

- `Renderer.ts`: 매 프레임 캔버스를 지우고, 보간된 뱀 위치·먹이·파워업·장애물·UI 오버레이를 순서대로 그린다. 생성자 시그니처: `new Renderer(ctx: CanvasRenderingContext2D, themeRegistry: ThemeRegistry, particles: ParticleSystem)`
- `Interpolator.ts`: tick 사이의 경과 시간 비율 `alpha = elapsed / tickInterval`을 계산하고, 이전 격자 좌표와 다음 격자 좌표 사이를 선형 보간해 픽셀 좌표를 반환한다.
- `ParticleSystem.ts`: 파티클 인스턴스 풀을 유지한다. 먹이 섭취 이벤트를 받으면 버스트 파티클을 발생시키고, 매 프레임 위치·투명도를 업데이트하며 만료된 파티클을 제거한다.
- `theme/neon.ts`: 네온 다크 테마의 색상 팔레트, 그라데이션 정의, 글로우 반경 상수. 테마 교체 시 이 파일만 교체한다.
- `theme/ThemeRegistry.ts`: 사용 가능한 테마(neon 기본, 추후 추가 테마)를 등록하고 활성 테마 토큰을 조회/전환한다. `Renderer`에 주입되어 렌더 시 색상·글로우 값을 공급한다.

### `src/input/`

키보드 이벤트를 게임 액션으로 변환하는 레이어.

- `KeyboardHandler.ts`: `keydown` 이벤트를 구독하고 방향키/WASD → 방향 벡터, Space → 일시정지/재개, R → 재시작 액션을 `StateMachine`에 전달한다. 반대 방향 입력은 이곳에서 무시한다.

### `src/score/`

점수 계산과 영속성 처리.

- `ScoreCalculator.ts`: 먹이 종류별 점수 계산, 파워업 배율 적용, 현재 점수 집계
- `LocalStorageAdapter.ts`: `localStorage`에서 최고점수를 읽고 쓴다. 실패 시(스토리지 가득 참, 프라이빗 모드 등) 조용히 폴백 처리한다.

### `tests/`

Vitest 기반 단위 테스트 모음. TDD 원칙에 따라 구현 전 테스트를 먼저 작성한다.

- `domain/`: 도메인 순수 로직 테스트. Canvas·DOM 의존성 없음.
  - `FoodSpawner.test.ts`: 충돌 회피 위치 선택 검증, 보드가 가득 찼을 때 `null` 반환 검증.
  - `PowerUpSpawner.test.ts`: 파워업 종류 분포 검증, 라이프타임 만료 시 제거 검증.
  - `ObstacleLayout.test.ts`: 시드 기반 결정성(동일 시드 → 동일 배치), 뱀 초기 위치와 비충돌 검증.
- `engine/`: 상태 머신 전이 규칙, tick 스케줄러 동작 검증.
- `score/`: 점수 계산 규칙 및 localStorage 어댑터(jsdom 환경). `LocalStorageAdapter.test.ts`는 최고점수 저장/복원, JSON 파싱 실패 시 0점 폴백, storage quota 초과 시 silent ignore 검증을 포함한다.

### 빌드 구성 파일

| 파일 | 역할 |
|------|------|
| `vite.config.ts` | path alias, 빌드 출력 디렉토리(`dist/`), dev 서버 포트 등의 옵션 설정. Vite는 esbuild 기반 TypeScript 트랜스파일을 내장하므로 별도 TypeScript 플러그인은 불필요하다. |
| `vitest.config.ts` | 테스트 환경(`jsdom`), 커버리지 리포터(`v8`), 포함 경로 패턴 |
| `tsconfig.json` | `strict: true`, `target: ES2022`, `moduleResolution: bundler` |
| `package.json` | 스크립트 정의, devDependency 목록 |

---

## 모듈 간 의존 방향 규칙

의존 방향은 단방향으로만 흐른다. 역방향 참조는 허용하지 않는다.

```
config  ◄────────────── 모든 레이어 (읽기 전용)

engine ──► domain
engine ──► render    (렌더 호출)
engine ──► score     (점수 집계 신호)

input  ──► engine    (상태 머신 액션 전달)

render ──► domain    (도메인 객체를 읽기만 함)
render ──► config

score  ──► config

domain ──► (외부 의존 없음)
```

**핵심 원칙**: `domain/` 은 `render/`, `score/`, `engine/` 을 직접 import하지 않는다. 도메인 모델은 순수 데이터와 로직만 담는다.

---

## 명시적으로 사용하지 않을 패턴

| 패턴 | 이유 |
|------|------|
| Phaser, PixiJS 등 외부 게임 엔진 | 경량 배포 및 학습 목적. Canvas 2D API로 충분. |
| React, Vue 등 UI 프레임워크 | 게임 캔버스에 컴포넌트 모델 불필요. HTML 최소 마크업으로 구성. |
| Redux, Zustand 등 상태 관리 라이브러리 | StateMachine 클래스로 직접 관리. 외부 의존성 추가 불필요. |
| CSS 애니메이션 / WebGL | Canvas 2D API가 목표 비주얼에 충분하며 브라우저 호환성이 넓음. |
| 백엔드 서버 / 데이터베이스 | localStorage만으로 MVP 영속성 요구사항 충족. |
| 모노레포 / 워크스페이스 분리 | 단일 패키지로 유지해 설정 복잡도 최소화. |
