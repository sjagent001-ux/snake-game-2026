/**
 * SPEC-GAME-CORE-001 REQ-LOOP-001/002/005 — TickScheduler 단위 테스트.
 *
 * deltaMs 누적 → TICK_MS 도달 시 onTick 1회 호출 → 누적 차감 패턴 검증.
 * AC-10a (FPS 독립성): 동일 wall time 입력은 동일한 tick 횟수를 발행해야 함.
 */

import { describe, it, expect, vi } from "vitest";
import { TickScheduler } from "../../src/engine/TickScheduler";

describe("TickScheduler", () => {
  it("emits tick when accumulated ms reaches TICK_MS", () => {
    const onTick = vi.fn();
    const scheduler = new TickScheduler({ tickMs: 150, onTick });

    scheduler.tick(100);
    expect(onTick).not.toHaveBeenCalled();

    scheduler.tick(50);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("emits multiple ticks when deltaMs exceeds TICK_MS by multiples", () => {
    const onTick = vi.fn();
    const scheduler = new TickScheduler({ tickMs: 150, onTick });

    // 300ms 단일 프레임 → 2회 발행 (150 + 150)
    scheduler.tick(300);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it("carries over remainder accumulator across ticks", () => {
    const onTick = vi.fn();
    const scheduler = new TickScheduler({ tickMs: 150, onTick });

    // 200ms 입력 → 1회 발행, 50ms 잔여
    scheduler.tick(200);
    expect(onTick).toHaveBeenCalledTimes(1);

    // 100ms 추가 → 누적 150ms → 1회 추가 발행
    scheduler.tick(100);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it("AC-10a: FPS independence — 60 FPS and 7 FPS emit same tick count over 1000ms", () => {
    const onTick60 = vi.fn();
    const sched60 = new TickScheduler({ tickMs: 150, onTick: onTick60 });
    // 60 FPS × 16.67ms × 60 frames ≈ 1000ms
    for (let i = 0; i < 60; i += 1) sched60.tick(1000 / 60);

    const onTick7 = vi.fn();
    const sched7 = new TickScheduler({ tickMs: 150, onTick: onTick7 });
    // 7 FPS × ~142.857ms × 7 frames ≈ 1000ms
    for (let i = 0; i < 7; i += 1) sched7.tick(1000 / 7);

    // 1000 / 150 = 6.67 → 양쪽 모두 6회 발행
    expect(onTick60).toHaveBeenCalledTimes(6);
    expect(onTick7).toHaveBeenCalledTimes(6);
    expect(onTick60.mock.calls.length).toBe(onTick7.mock.calls.length);
  });

  it("reset() clears the accumulator", () => {
    const onTick = vi.fn();
    const scheduler = new TickScheduler({ tickMs: 150, onTick });

    scheduler.tick(100);
    scheduler.reset();
    scheduler.tick(100);
    expect(onTick).not.toHaveBeenCalled();
  });

  it("returns number of ticks emitted per tick() call", () => {
    const scheduler = new TickScheduler({ tickMs: 150, onTick: () => {} });
    expect(scheduler.tick(100)).toBe(0);
    expect(scheduler.tick(50)).toBe(1);
    expect(scheduler.tick(300)).toBe(2);
  });
});
