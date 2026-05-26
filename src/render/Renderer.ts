/**
 * SPEC-GAME-CORE-001 REQ-SCORE-008/009 — Renderer (Canvas 2D).
 *
 * 책임:
 *  - render(alpha) 1회 호출 시 캔버스를 한 번 클리어하고 (배경 fillRect) 장애물 → 먹이 →
 *    뱀 몸 → 뱀 머리 순서로 그린다 (뒤에 그릴수록 위에 보이는 회화 알고리즘).
 *  - 머리/몸 위치는 previousSegments → segments 사이를 alpha 로 lerp 한다.
 *  - 도메인 스냅샷을 절대 변형하지 않는다 (AC-16, REQ-SCORE-008).
 *  - active 테마의 색 토큰만 사용한다 (REQ-SCORE-009).
 *
 * @MX:NOTE: [AUTO] REQ-SCORE-008 SSOT — Renderer 는 도메인의 read-only 소비자이다.
 *           snapshot 은 getSnapshot() 콜백을 통해 매 frame 갱신되며, Renderer 내부에서는
 *           읽기만 한다. 변형을 시도하면 AC-16 호출 측의 Object.freeze 에 의해 TypeError.
 *
 * particles 인자: 본 SPEC 범위에서는 항상 null (spec.md §5.4 step 5).
 * 후속 SPEC-VFX-001 에서 ParticleSystem 이 도입되면 본 인자 타입이 ParticleSystem | null 로 확장된다.
 */

import { ThemeRegistry } from "./theme/ThemeRegistry";
import { lerp } from "./Interpolator";
import { SnakeSegment } from "../domain/snake/SnakeSegment";
import { Direction } from "../domain/snake/Snake";

export interface RenderSnapshot {
  readonly snake: {
    readonly segments: readonly SnakeSegment[];
    readonly previousSegments: readonly SnakeSegment[];
    readonly direction: Direction;
  };
  readonly food: { readonly cell: { readonly col: number; readonly row: number } } | null;
  readonly obstacles: readonly { readonly col: number; readonly row: number }[];
}

export interface RendererOptions {
  readonly ctx: CanvasRenderingContext2D;
  readonly themeRegistry: ThemeRegistry;
  /** SPEC-VFX-001 도입 전까지는 항상 null. */
  readonly particles: null;
  readonly boardWidth: number;
  readonly boardHeight: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly getSnapshot: () => RenderSnapshot;
}

export class Renderer {
  private readonly _ctx: CanvasRenderingContext2D;
  private readonly _themeRegistry: ThemeRegistry;
  private readonly _particles: null;
  private readonly _cellWidth: number;
  private readonly _cellHeight: number;
  private readonly _canvasWidth: number;
  private readonly _canvasHeight: number;
  private readonly _getSnapshot: () => RenderSnapshot;

  constructor(opts: RendererOptions) {
    this._ctx = opts.ctx;
    this._themeRegistry = opts.themeRegistry;
    this._particles = opts.particles;
    this._canvasWidth = opts.canvasWidth;
    this._canvasHeight = opts.canvasHeight;
    // cell size = canvas / board. 정수 분할이 아니어도 fillRect 가 소수점을 허용한다.
    this._cellWidth = opts.canvasWidth / opts.boardWidth;
    this._cellHeight = opts.canvasHeight / opts.boardHeight;
    this._getSnapshot = opts.getSnapshot;
  }

  /**
   * 매 frame 호출. alpha 는 [0, 1] 범위의 보간 비율 (Interpolator.computeAlpha 산출).
   */
  public render(alpha: number): void {
    const theme = this._themeRegistry.getActive();
    const snapshot = this._getSnapshot();
    const ctx = this._ctx;

    // 1. 배경 채우기 (캔버스 전체 클리어 효과).
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, this._canvasWidth, this._canvasHeight);

    // 2. 장애물 (정적, alpha 무관).
    ctx.fillStyle = theme.obstacle;
    for (const obs of snapshot.obstacles) {
      ctx.fillRect(
        obs.col * this._cellWidth,
        obs.row * this._cellHeight,
        this._cellWidth,
        this._cellHeight,
      );
    }

    // 3. 먹이 (정적, alpha 무관).
    if (snapshot.food !== null) {
      ctx.fillStyle = theme.food;
      ctx.fillRect(
        snapshot.food.cell.col * this._cellWidth,
        snapshot.food.cell.row * this._cellHeight,
        this._cellWidth,
        this._cellHeight,
      );
    }

    // 4. 뱀 몸 (segment[1..]) — previous → current lerp.
    //    먼저 몸을 그린 뒤 머리를 덮어 그려 머리가 항상 가장 위에 보이게 한다.
    ctx.fillStyle = theme.snakeBody;
    for (let i = 1; i < snapshot.snake.segments.length; i += 1) {
      const curr = snapshot.snake.segments[i]!;
      const prev = snapshot.snake.previousSegments[i] ?? curr;
      const x = lerp(prev.col, curr.col, alpha) * this._cellWidth;
      const y = lerp(prev.row, curr.row, alpha) * this._cellHeight;
      ctx.fillRect(x, y, this._cellWidth, this._cellHeight);
    }

    // 5. 뱀 머리 — previous[0] → segments[0] lerp.
    if (snapshot.snake.segments.length > 0) {
      const head = snapshot.snake.segments[0]!;
      const prevHead = snapshot.snake.previousSegments[0] ?? head;
      ctx.fillStyle = theme.snakeHead;
      const x = lerp(prevHead.col, head.col, alpha) * this._cellWidth;
      const y = lerp(prevHead.row, head.row, alpha) * this._cellHeight;
      ctx.fillRect(x, y, this._cellWidth, this._cellHeight);
    }

    // 6. particles 는 본 SPEC 에서 항상 null — 그리기 단계 없음.
    if (this._particles !== null) {
      // 미래 SPEC-VFX-001 진입점 (현재 unreachable).
      void this._particles;
    }
  }
}
