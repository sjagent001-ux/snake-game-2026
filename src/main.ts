/**
 * SPEC-GAME-CORE-001 §5.4 — 진입점 (main.ts).
 *
 * 8단계 부트스트랩 (spec.md §5.4 SSOT — 본 SPEC 범위 한정):
 *   1. ThemeRegistry 로드 (neon 기본 테마 등록)
 *   2. LocalStorageAdapter 인스턴스 생성, 최고점수 복원
 *   3. ScoreCalculator 초기화 (복원된 최고점수 + persistence 주입)
 *   4. Board + ObstacleLayout 생성 (Snake / Food 는 StateMachine 이 START 시점에 시드)
 *   5. Renderer 생성 — particles 인자에 null 명시 (SPEC-VFX-001 도입 전)
 *   6. StateMachine 생성 (idle 초기 상태)
 *   7. KeyboardHandler 부착 (window keydown → StateMachine 디스패치)
 *   8. GameLoop 생성 (tick 콜백 = StateMachine.update, render 콜백 = Renderer.render), start()
 *
 * 본 진입점은 통합 글루(integration glue) 이므로 자동화된 단위 테스트가 없고,
 * AC-1 ~ AC-E5 의 E2E 수동 검증으로 동작이 확인된다.
 *
 * @MX:NOTE: [AUTO] REQ-SCORE-009 — 기본 active 테마는 'neon' (ThemeRegistry 자동 등록).
 *           spec.md §5.4 의 8단계 순서를 그대로 유지하며, PowerUpSpawner / ParticleSystem 은
 *           본 SPEC Exclusions 에 해당하므로 도입하지 않는다 (Renderer 의 particles 는 null).
 *
 * @MX:NOTE: [AUTO] AC-16 — Renderer 는 stateMachine.getRenderSnapshot() 만 호출하며
 *           반환된 view 를 변형하지 않는다. score HUD 갱신도 read-only getter (currentScore / highScore) 만 사용.
 */

import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  TICK_MS,
  OBSTACLE_SEED,
  OBSTACLE_COUNT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "./config/constants";

import { Board } from "./domain/board/Board";
import { StateMachine } from "./engine/StateMachine";
import { TickScheduler } from "./engine/TickScheduler";
import { GameLoop } from "./engine/GameLoop";
import { KeyboardHandler } from "./input/KeyboardHandler";
import { LocalStorageAdapter } from "./score/LocalStorageAdapter";
import { ScoreCalculator } from "./score/ScoreCalculator";
import { Renderer } from "./render/Renderer";
import { ThemeRegistry } from "./render/theme/ThemeRegistry";

function bootstrap(): void {
  // 1. ThemeRegistry — 생성자에서 neon 이 자동 등록 + 기본 active 설정.
  const themeRegistry = new ThemeRegistry();
  themeRegistry.setActive("neon");

  // 2. LocalStorageAdapter — localStorage 미가용 환경(SecurityError 등) 에서도 silent fallback.
  const storage = new LocalStorageAdapter();
  const initialHighScore = storage.loadHighScore();

  // 3. ScoreCalculator — 복원된 highScore 와 persistence 콜백 주입.
  const scoreCalculator = new ScoreCalculator({
    initialHighScore,
    persistence: {
      saveHighScore: (value: number) => storage.saveHighScore(value),
    },
  });

  // 4. Board (Snake / Food / ObstacleLayout 은 StateMachine 이 START 시점에 시드).
  const board = new Board(BOARD_WIDTH, BOARD_HEIGHT);

  // 6. StateMachine (idle 초기 상태) — Renderer 의 getSnapshot 콜백이 참조하므로 먼저 생성.
  const stateMachine = new StateMachine({
    board,
    scoreCalculator,
    obstacleSeed: OBSTACLE_SEED,
    obstacleCount: OBSTACLE_COUNT,
  });

  // 5. Renderer — canvas 2D 컨텍스트 + ThemeRegistry + particles=null (SPEC-VFX-001 도입 전).
  const canvas = document.getElementById("game");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('public/index.html 의 canvas#game 요소를 찾을 수 없다.');
  }
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("Canvas 2D 컨텍스트를 획득할 수 없다 (브라우저 호환성 문제).");
  }
  const renderer = new Renderer({
    ctx,
    themeRegistry,
    particles: null,
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    getSnapshot: () => stateMachine.getRenderSnapshot(),
  });

  // 7. KeyboardHandler — window keydown → StateMachine 디스패치 (input-time 반대 차단 포함).
  const keyboardHandler = new KeyboardHandler({
    window,
    stateMachine,
  });
  keyboardHandler.attach();

  // 8. GameLoop — TickScheduler 가 150ms 마다 stateMachine.update 호출, rAF 가 매 frame 렌더.
  const tickScheduler = new TickScheduler({
    tickMs: TICK_MS,
    onTick: () => stateMachine.update(),
  });
  const gameLoop = new GameLoop({
    tickScheduler,
    tickMs: TICK_MS,
    onRender: (alpha: number) => {
      renderer.render(alpha);
      updateScoreHud(scoreCalculator);
    },
  });
  gameLoop.start();
}

/**
 * #score-current / #score-high span 텍스트를 매 frame 동기화한다 (DOM read-only HUD).
 */
function updateScoreHud(scoreCalculator: ScoreCalculator): void {
  const current = document.getElementById("score-current");
  const high = document.getElementById("score-high");
  if (current !== null) {
    current.textContent = String(scoreCalculator.currentScore);
  }
  if (high !== null) {
    high.textContent = String(scoreCalculator.highScore);
  }
}

// DOM 준비 시점에 부트스트랩 — index.html 의 <script type="module"> 이 defer 동작이지만
// readyState 가 'loading' 이면 안전하게 대기, 아니면 즉시 실행.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
