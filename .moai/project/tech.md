# 기술 문서 — snake-game-2026

---

## 기술 스택 요약

| 항목 | 선택 |
|------|------|
| 언어 | TypeScript 5.x (strict 모드) |
| 런타임 | 브라우저 (Node는 개발 도구용으로만 사용) |
| 렌더링 | HTML5 Canvas 2D API |
| 빌드 도구 | Vite 5.x |
| 테스트 | Vitest 2.x |
| 커버리지 | @vitest/coverage-v8 |
| 타깃 브라우저 | Chrome, Edge, Firefox, Safari 최신 2버전 |
| 배포 형태 | 정적 파일 (HTML + JS 번들) |

---

## 선택 이유

### 외부 게임 엔진 미사용

Phaser, PixiJS 같은 게임 엔진은 강력하지만 이 프로젝트에서 불필요한 복잡도를 도입한다.

- **학습 목적**: Canvas 2D API, requestAnimationFrame, 게임 루프 패턴을 직접 구현함으로써 웹 게임 개발의 핵심 원리를 포트폴리오로 증명한다.
- **경량 배포**: 번들 크기를 최소화해 URL 접속 즉시 게임이 로드된다. 엔진 없이도 MVP 기능(보간 이동, 파티클, 네온 테마) 구현이 가능하다.

### Canvas 2D API 충분성

- `fillRect`, `arc`, `createLinearGradient`, `shadowBlur` 등 기본 API로 네온 그라데이션과 글로우 이펙트를 구현할 수 있다.
- WebGL보다 학습 비용이 낮고 모든 타깃 브라우저에서 안정적으로 지원된다.

### TypeScript + Vite 조합

- TypeScript의 타입 안전성이 도메인 모델(뱀, 파워업 상태 등)의 오류를 컴파일 단계에서 잡아준다.
- Vite의 빠른 HMR이 개발 피드백 루프를 단축한다. `vite build`로 생성된 정적 파일은 어떤 정적 호스팅 서비스에도 바로 배포 가능하다.

---

## 핵심 의존성

### devDependencies (개발 도구)

| 패키지 | 버전 기준 | 역할 |
|--------|-----------|------|
| `typescript` | 5.x | TypeScript 컴파일러 |
| `vite` | 5.x | 개발 서버 및 프로덕션 번들러 |
| `vitest` | 2.x | 단위/통합 테스트 러너 |
| `@vitest/coverage-v8` | 2.x | V8 기반 코드 커버리지 리포터 |
| `@types/node` | 20.x (Node 20 LTS 기준) | Node 타입 정의 (vite.config.ts 작성 시 필요) |
| `eslint` | 9.x | TypeScript 코드 린팅 |
| `prettier` | 3.x | 코드 포매팅 |
| `jsdom` | ^24.x | Vitest의 `jsdom` 테스트 환경 제공 (LocalStorageAdapter, DOM 의존 테스트용) |

### dependencies (런타임)

없음. 브라우저 표준 API만 사용한다. 번들에 외부 라이브러리가 포함되지 않는다.

---

## 빌드 / 실행 / 테스트 명령

```bash
# 개발 서버 시작 (Hot Module Replacement 포함)
npm run dev

# 프로덕션 빌드 (dist/ 디렉토리에 정적 파일 생성)
npm run build

# 빌드 결과물 로컬 미리보기
npm run preview

# 단위 테스트 실행 (watch 모드)
npm run test

# 단일 실행 + 커버리지 리포트 생성
npm run test:coverage

# 린트 검사
npm run lint

# 코드 포매팅
npm run format
```

`package.json` 스크립트 예시:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src tests",
    "format": "prettier --write src tests"
  }
}
```

---

## 개발 환경 요구 사항

| 항목 | 최소 요구 사항 |
|------|---------------|
| Node.js | 20 LTS (v20.x) |
| 패키지 매니저 | npm 10.x (Node 20 LTS 기본 탑재) |
| 브라우저 (개발 확인용) | Chrome / Edge / Firefox / Safari 최신 2버전 |
| 필수 브라우저 기능 | Canvas 2D API, `requestAnimationFrame`, `localStorage` |

브라우저가 Canvas 2D 또는 `requestAnimationFrame`을 지원하지 않으면 게임이 동작하지 않는다. 해당 환경에서는 안내 메시지를 표시한다.

---

## 성능 고려 사항

### 목표

- **60 FPS 유지**: `requestAnimationFrame` 콜백 내에서 프레임당 연산 시간이 16ms를 초과하지 않도록 한다.

### 렌더 루프 설계

- `requestAnimationFrame` 기반 루프가 매 프레임 `timestamp`를 받는다.
- 고정 tick 스케줄러(`TickScheduler`)가 게임 로직 업데이트를 일정 주기(기본 150ms)로 제한한다. 프레임 속도와 게임 속도가 분리되므로 화면 갱신률에 무관하게 게임 속도가 일정하다.
- 렌더러는 `alpha = elapsed / tickInterval`로 보간 비율을 계산해 뱀의 픽셀 위치를 tick 사이에서 부드럽게 보간한다. 결과적으로 60Hz 이상 모니터에서도 부드러운 움직임이 보장된다.

### 파티클 최적화

- 파티클 인스턴스 풀을 사전 할당해 GC 부하를 줄인다.
- 활성 파티클 수에 상한(예: 최대 200개)을 두어 과부하를 방지한다.

### Canvas 상태 관리

- `save` / `restore` 쌍을 최소화한다. 레이어별로 필요할 때만 상태를 저장한다.
- 매 프레임 전체 캔버스를 `clearRect`로 지운 후 배경 → 장애물 → 뱀 → 파티클 → UI 순으로 그린다.

---

## 접근성 / 키보드 인터랙션

| 키 | 동작 |
|----|------|
| `ArrowUp` / `W` | 위로 이동 |
| `ArrowDown` / `S` | 아래로 이동 |
| `ArrowLeft` / `A` | 왼쪽으로 이동 |
| `ArrowRight` / `D` | 오른쪽으로 이동 |
| `Space` | 게임 일시정지 / 재개 (idle → running 시작도 포함) |
| `R` | 게임 재시작 (gameover 상태에서만 유효) |

- 반대 방향 입력(예: 우측 이동 중 좌측 키)은 `KeyboardHandler`에서 무시한다.
- 스크린 리더 접근성은 MVP 범위 외. 캔버스 게임의 특성상 키보드 조작이 유일한 인터랙션 채널이다.

---

## 배포

빌드 결과물(`dist/`)은 순수 정적 파일(HTML, JS, CSS)이므로 별도 서버 설정 없이 배포된다.

| 호스팅 서비스 | 배포 방법 |
|---------------|-----------|
| GitHub Pages | `dist/` 디렉토리를 `gh-pages` 브랜치로 push 또는 GitHub Actions 워크플로 사용 |
| Vercel | 저장소 연결 후 `vite build` 자동 감지. 별도 설정 불필요. |
| Netlify | 저장소 연결 후 Build command `npm run build`, Publish directory `dist` 설정. |

**권장**: Vercel — 저장소 연결만으로 PR 단위 미리보기 URL이 자동 생성된다.

---

## 개발 방법론

- **TDD (Test-Driven Development)**: 모든 도메인 로직(`src/domain/`)과 엔진 로직(`src/engine/`)은 구현 전에 테스트를 먼저 작성한다.
- **커버리지 목표**: 커밋당 도메인·엔진 레이어 라인 커버리지 **80% 이상** 유지.
- **린트/포매팅**: `eslint` + `prettier`를 사전 커밋 체크로 실행해 코드 스타일을 일관되게 유지한다.

---

## 보안 / 저장소

- 외부 서버 통신 없음. 네트워크 요청이 발생하지 않으므로 XSS·CSRF 벡터가 존재하지 않는다.
- `localStorage`는 최고점수 단일 정수값만 저장한다. 사용자 개인정보를 수집하지 않는다.
- 키보드 입력은 `ArrowUp/Down/Left/Right`, `W/A/S/D`, `Space`, `R` 총 10개 키만 처리한다. 임의 문자열 입력을 평가하거나 DOM에 삽입하는 경로가 없으므로 별도 입력 검증 로직이 불필요하다.
- `localStorage` 쓰기 실패(쿼터 초과, 프라이빗 모드)는 try/catch로 조용히 처리하고 게임 진행에 영향을 주지 않는다.
