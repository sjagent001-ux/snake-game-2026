/**
 * SPEC-GAME-CORE-001 T-19 — Renderer 단위 테스트.
 *
 * REQ-SCORE-008: render(alpha) 가 도메인 스냅샷을 읽기만 하며 변형하지 않는다 (AC-16).
 * REQ-SCORE-009: active 테마의 색 토큰을 사용해 그린다.
 * plan.md T-19 테스트 5개를 모두 커버한다.
 *
 * 캔버스 컨텍스트는 vi.fn() 으로 모킹한다 (jsdom 환경에서는 실제 2D 컨텍스트가 일부 미구현).
 */

import { describe, it, expect, vi } from "vitest";
import { Renderer } from "../../src/render/Renderer";
import type { RenderSnapshot } from "../../src/render/Renderer";
import { ThemeRegistry } from "../../src/render/theme/ThemeRegistry";
import { NEON_THEME } from "../../src/render/theme/neon";
import { SnakeSegment } from "../../src/domain/snake/SnakeSegment";

interface FillRectCall {
  readonly fillStyle: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * fillStyle setter 와 fillRect 호출을 동시에 캡처하는 mock ctx 헬퍼.
 * fillStyle 은 read/write 가능한 property 로 시뮬레이션.
 */
function createMockCtx(): {
  ctx: CanvasRenderingContext2D;
  calls: FillRectCall[];
  fillRectFn: ReturnType<typeof vi.fn>;
} {
  const calls: FillRectCall[] = [];
  let currentFillStyle = "";
  const fillRectFn = vi.fn((x: number, y: number, w: number, h: number) => {
    calls.push({ fillStyle: currentFillStyle, x, y, w, h });
  });
  const ctx = {
    get fillStyle(): string {
      return currentFillStyle;
    },
    set fillStyle(v: string) {
      currentFillStyle = v;
    },
    fillRect: fillRectFn,
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls, fillRectFn };
}

/**
 * 표준 테스트 시나리오용 RenderSnapshot 생성기.
 * - 보드 20×20, 캔버스 600×600 → cell = 30px.
 * - 뱀: head (10, 10) ← (9, 10) ← (8, 10), direction = right.
 * - previousSegments: head (9, 10) ← (8, 10) ← (7, 10) (한 칸 뒤).
 * - food: (5, 5).
 * - obstacles: [(15, 15), (16, 16)].
 */
function buildSnapshot(): RenderSnapshot {
  return {
    snake: {
      segments: [
        new SnakeSegment(10, 10),
        new SnakeSegment(9, 10),
        new SnakeSegment(8, 10),
      ],
      previousSegments: [
        new SnakeSegment(9, 10),
        new SnakeSegment(8, 10),
        new SnakeSegment(7, 10),
      ],
      direction: "right",
    },
    food: { cell: { col: 5, row: 5 } },
    obstacles: [
      { col: 15, row: 15 },
      { col: 16, row: 16 },
    ],
  };
}

const BOARD_WIDTH = 20;
const BOARD_HEIGHT = 20;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const CELL_W = CANVAS_WIDTH / BOARD_WIDTH; // 30
const CELL_H = CANVAS_HEIGHT / BOARD_HEIGHT; // 30

describe("Renderer — REQ-SCORE-008/009 + AC-16", () => {
  it("(1) render(alpha) 는 배경, 장애물, 먹이, 뱀 모두에 대해 fillRect 를 호출한다", () => {
    const { ctx, calls, fillRectFn } = createMockCtx();
    const themeRegistry = new ThemeRegistry();
    const snapshot = buildSnapshot();
    const renderer = new Renderer({
      ctx,
      themeRegistry,
      particles: null,
      boardWidth: BOARD_WIDTH,
      boardHeight: BOARD_HEIGHT,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      getSnapshot: () => snapshot,
    });

    renderer.render(0.5);

    // 배경 1회 + 장애물 2개 + 먹이 1개 + 뱀 3 세그먼트 = 7회 최소.
    expect(fillRectFn).toHaveBeenCalled();
    expect(calls.length).toBe(1 + 2 + 1 + 3);

    // 배경 fillRect 가 캔버스 전체를 덮어야 한다 (첫 호출).
    const bg = calls[0]!;
    expect(bg.fillStyle).toBe(NEON_THEME.background);
    expect(bg.x).toBe(0);
    expect(bg.y).toBe(0);
    expect(bg.w).toBe(CANVAS_WIDTH);
    expect(bg.h).toBe(CANVAS_HEIGHT);
  });

  it("(2) render(alpha=0) 는 머리를 previousSegments[0] 위치에 그린다 (보간 시작)", () => {
    const { ctx, calls } = createMockCtx();
    const themeRegistry = new ThemeRegistry();
    const snapshot = buildSnapshot();
    const renderer = new Renderer({
      ctx,
      themeRegistry,
      particles: null,
      boardWidth: BOARD_WIDTH,
      boardHeight: BOARD_HEIGHT,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      getSnapshot: () => snapshot,
    });

    renderer.render(0);

    // 머리 (head, snakeHead 색) 호출을 찾는다.
    const headCall = calls.find((c) => c.fillStyle === NEON_THEME.snakeHead);
    expect(headCall).toBeDefined();
    // alpha=0 → previousSegments[0] = (9, 10) 위치.
    expect(headCall!.x).toBeCloseTo(9 * CELL_W, 6);
    expect(headCall!.y).toBeCloseTo(10 * CELL_H, 6);
  });

  it("(3) render(alpha=1) 는 머리를 segments[0] 위치에 그린다 (보간 종료)", () => {
    const { ctx, calls } = createMockCtx();
    const themeRegistry = new ThemeRegistry();
    const snapshot = buildSnapshot();
    const renderer = new Renderer({
      ctx,
      themeRegistry,
      particles: null,
      boardWidth: BOARD_WIDTH,
      boardHeight: BOARD_HEIGHT,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      getSnapshot: () => snapshot,
    });

    renderer.render(1);

    const headCall = calls.find((c) => c.fillStyle === NEON_THEME.snakeHead);
    expect(headCall).toBeDefined();
    // alpha=1 → segments[0] = (10, 10) 위치.
    expect(headCall!.x).toBeCloseTo(10 * CELL_W, 6);
    expect(headCall!.y).toBeCloseTo(10 * CELL_H, 6);
  });

  it("(4) particles=null 을 명시적으로 전달해도 throw 하지 않는다 (SPEC §5.4 step 5)", () => {
    const { ctx } = createMockCtx();
    const themeRegistry = new ThemeRegistry();
    const snapshot = buildSnapshot();
    const renderer = new Renderer({
      ctx,
      themeRegistry,
      particles: null,
      boardWidth: BOARD_WIDTH,
      boardHeight: BOARD_HEIGHT,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      getSnapshot: () => snapshot,
    });
    expect(() => renderer.render(0.5)).not.toThrow();
  });

  it("(5) AC-16: render(0.5) 가 도메인 스냅샷을 변형하지 않는다 — Object.freeze 로 강제 검증", () => {
    const { ctx } = createMockCtx();
    const themeRegistry = new ThemeRegistry();
    // 모든 inner 객체와 배열을 동결한다 — 변형 시도 시 strict mode 에서 throw.
    const snapshot: RenderSnapshot = Object.freeze({
      snake: Object.freeze({
        segments: Object.freeze([
          new SnakeSegment(10, 10),
          new SnakeSegment(9, 10),
          new SnakeSegment(8, 10),
        ]),
        previousSegments: Object.freeze([
          new SnakeSegment(9, 10),
          new SnakeSegment(8, 10),
          new SnakeSegment(7, 10),
        ]),
        direction: "right" as const,
      }),
      food: Object.freeze({ cell: Object.freeze({ col: 5, row: 5 }) }),
      obstacles: Object.freeze([
        Object.freeze({ col: 15, row: 15 }),
        Object.freeze({ col: 16, row: 16 }),
      ]),
    });

    const renderer = new Renderer({
      ctx,
      themeRegistry,
      particles: null,
      boardWidth: BOARD_WIDTH,
      boardHeight: BOARD_HEIGHT,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      getSnapshot: () => snapshot,
    });

    // 동결된 객체에 setter / push / splice 가 호출되면 TypeError. throw 없으면 read-only 통과.
    expect(() => renderer.render(0.5)).not.toThrow();
  });
});
