/**
 * SPEC-GAME-CORE-001 T-17 — Interpolator 단위 테스트.
 *
 * REQ-SCORE-007: computeAlpha(now, lastTickAt, tickInterval) =
 *   clamp((now - lastTickAt) / tickInterval, 0, 1).
 *
 * plan.md R-2 완화: 30 FPS 등 저 FPS 환경에서도 alpha 범위가 [0,1] 로 강제되어야 시각 글리치가 없다.
 */

import { describe, it, expect } from "vitest";
import { computeAlpha, lerp } from "../../src/render/Interpolator";

describe("Interpolator.computeAlpha — REQ-SCORE-007", () => {
  it("now === lastTickAt 이면 0 을 반환한다 (방금 tick 발행 직후)", () => {
    expect(computeAlpha(1000, 1000, 150)).toBe(0);
  });

  it("now - lastTickAt 이 tickInterval 의 절반이면 0.5 를 반환한다", () => {
    expect(computeAlpha(1075, 1000, 150)).toBeCloseTo(0.5, 10);
  });

  it("now - lastTickAt 이 tickInterval 과 동일하면 1.0 을 반환한다 (경계)", () => {
    expect(computeAlpha(1150, 1000, 150)).toBe(1);
  });

  it("now - lastTickAt 이 tickInterval 을 초과하면 1.0 으로 clamp 된다 (저 FPS 보호, R-2)", () => {
    // 30 FPS 환경에서 한 frame 이 150ms 초과해도 alpha 가 1.0 을 넘지 않아야 한다.
    expect(computeAlpha(1300, 1000, 150)).toBe(1);
  });

  it("now < lastTickAt (시계 역행 / 시드 직후) 이면 0 으로 clamp 된다", () => {
    expect(computeAlpha(950, 1000, 150)).toBe(0);
  });

  it("tickInterval = 0 이면 0 을 반환한다 (divide-by-zero 방어)", () => {
    expect(computeAlpha(1000, 900, 0)).toBe(0);
  });
});

describe("Interpolator.lerp", () => {
  it("lerp(0, 10, 0.5) === 5 — 정확한 선형 보간", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it("lerp(a, b, 0) === a", () => {
    expect(lerp(3, 7, 0)).toBe(3);
  });

  it("lerp(a, b, 1) === b", () => {
    expect(lerp(3, 7, 1)).toBe(7);
  });
});
