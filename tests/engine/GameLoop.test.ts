/**
 * SPEC-GAME-CORE-001 REQ-LOOP-003/004/005/006 — GameLoop 단위 테스트.
 *
 * start() / stop() 라이프사이클, rAF 핸들 관리 (AC-E5), render(alpha) 호출,
 * tick 발행 시 lastTickAt 갱신 검증.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameLoop } from "../../src/engine/GameLoop";
import { TickScheduler } from "../../src/engine/TickScheduler";

/**
 * rAF mock — 콜백을 큐에 저장하고, advance() 로 수동으로 진행한다.
 */
interface RafController {
  rafSpy: ReturnType<typeof vi.fn>;
  cafSpy: ReturnType<typeof vi.fn>;
  advance: (timestamp: number) => void;
  install: () => void;
  restore: () => void;
}

function buildRafController(): RafController {
  let nextHandle = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const rafSpy = vi.fn((cb: FrameRequestCallback): number => {
    const h = nextHandle++;
    callbacks.set(h, cb);
    return h;
  });
  const cafSpy = vi.fn((handle: number) => {
    callbacks.delete(handle);
  });
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCaf = globalThis.cancelAnimationFrame;
  return {
    rafSpy,
    cafSpy,
    advance: (timestamp: number) => {
      const snapshot = Array.from(callbacks.entries());
      callbacks.clear();
      for (const [, cb] of snapshot) cb(timestamp);
    },
    install: () => {
      (globalThis as unknown as { requestAnimationFrame: typeof requestAnimationFrame }).requestAnimationFrame = rafSpy as unknown as typeof requestAnimationFrame;
      (globalThis as unknown as { cancelAnimationFrame: typeof cancelAnimationFrame }).cancelAnimationFrame = cafSpy as unknown as typeof cancelAnimationFrame;
    },
    restore: () => {
      (globalThis as unknown as { requestAnimationFrame: typeof requestAnimationFrame }).requestAnimationFrame = originalRaf;
      (globalThis as unknown as { cancelAnimationFrame: typeof cancelAnimationFrame }).cancelAnimationFrame = originalCaf;
    },
  };
}

describe("GameLoop", () => {
  let raf: RafController;
  beforeEach(() => {
    raf = buildRafController();
    raf.install();
  });
  afterEach(() => {
    raf.restore();
  });

  it("start() schedules an rAF; first frame triggers onRender(alpha)", () => {
    const tickScheduler = new TickScheduler({ tickMs: 150, onTick: () => {} });
    const onRender = vi.fn();
    const loop = new GameLoop({ tickScheduler, onRender, now: () => 0 });

    loop.start();
    expect(raf.rafSpy).toHaveBeenCalledTimes(1);

    // 첫 프레임 진행 — onRender 가 호출되어야 한다.
    raf.advance(16.67);
    expect(onRender).toHaveBeenCalled();
    // alpha 는 [0, 1] 범위.
    const alpha = onRender.mock.calls[0]![0] as number;
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThanOrEqual(1);

    loop.stop();
  });

  it("AC-E5 / REQ-LOOP-006: stop() calls cancelAnimationFrame on stored handle; subsequent frames do not render", () => {
    const tickScheduler = new TickScheduler({ tickMs: 150, onTick: () => {} });
    const onRender = vi.fn();
    const loop = new GameLoop({ tickScheduler, onRender, now: () => 0 });

    loop.start();
    expect(raf.rafSpy).toHaveBeenCalledTimes(1);
    const handle = raf.rafSpy.mock.results[0]!.value as number;

    loop.stop();
    expect(raf.cafSpy).toHaveBeenCalledWith(handle);

    // 큐가 비어있어야 한다 — advance 호출 시 onRender 가 더 호출되지 않음.
    onRender.mockClear();
    raf.advance(100);
    expect(onRender).not.toHaveBeenCalled();
  });

  it("REQ-LOOP-004: tick emission updates lastTickAt; alpha resets after tick", () => {
    let onTickCount = 0;
    const tickScheduler = new TickScheduler({
      tickMs: 150,
      onTick: () => {
        onTickCount += 1;
      },
    });
    const renderAlphas: number[] = [];
    const onRender = vi.fn((alpha: number) => {
      renderAlphas.push(alpha);
    });

    // now 를 외부에서 제어. 첫 호출은 0, 그 후 advance 시점에 맞춰 증가.
    let currentNow = 0;
    const loop = new GameLoop({
      tickScheduler,
      onRender,
      now: () => currentNow,
    });

    loop.start();
    // frame 1: now=50 → deltaMs=50, no tick, alpha ≈ 50/150 ≈ 0.333
    currentNow = 50;
    raf.advance(50);
    expect(onTickCount).toBe(0);

    // frame 2: now=200 → deltaMs=150, 1 tick 발행, lastTickAt=200, alpha = (200-200)/150 = 0
    currentNow = 200;
    raf.advance(200);
    expect(onTickCount).toBe(1);
    const lastAlpha = renderAlphas[renderAlphas.length - 1]!;
    expect(lastAlpha).toBeLessThan(0.01); // 0 근처

    loop.stop();
  });

  it("REQ-LOOP-003: onRender called every frame with alpha in [0, 1]", () => {
    const tickScheduler = new TickScheduler({ tickMs: 150, onTick: () => {} });
    const onRender = vi.fn();
    let currentNow = 0;
    const loop = new GameLoop({
      tickScheduler,
      onRender,
      now: () => currentNow,
    });
    loop.start();
    // 5 frames 진행 — 매 frame 마다 onRender 호출.
    const frames = [16, 33, 50, 67, 83];
    let prevCalls = 0;
    for (const t of frames) {
      currentNow = t;
      raf.advance(t);
      expect(onRender.mock.calls.length).toBeGreaterThan(prevCalls);
      const lastCall = onRender.mock.calls[onRender.mock.calls.length - 1]!;
      const alpha = lastCall[0] as number;
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(1);
      prevCalls = onRender.mock.calls.length;
    }
    loop.stop();
  });
});
