/**
 * SPEC-GAME-CORE-001 T-18 — ThemeRegistry 단위 테스트.
 *
 * REQ-SCORE-009: 기본 active 테마는 'neon'. setActive('unknown') 시 fallback.
 * plan.md T-18 테스트 4개를 모두 커버한다.
 */

import { describe, it, expect } from "vitest";
import { ThemeRegistry } from "../../../src/render/theme/ThemeRegistry";
import { NEON_THEME } from "../../../src/render/theme/neon";
import type { ThemeTokens } from "../../../src/render/theme/neon";

describe("ThemeRegistry — REQ-SCORE-009", () => {
  it("(1) register 로 추가한 테마를 이름으로 조회할 수 있다 (has)", () => {
    const registry = new ThemeRegistry();
    const custom: ThemeTokens = {
      name: "mono",
      background: "#000000",
      snakeHead: "#ffffff",
      snakeBody: "#cccccc",
      food: "#888888",
      obstacle: "#444444",
    };
    registry.register(custom);
    expect(registry.has("mono")).toBe(true);
  });

  it("(2) 초기 getActive() 는 neon 기본 테마를 반환한다", () => {
    const registry = new ThemeRegistry();
    const active = registry.getActive();
    expect(active.name).toBe("neon");
    expect(active.background).toBe(NEON_THEME.background);
  });

  it("(3) setActive 후 getActive 는 새 테마를 반영한다", () => {
    const registry = new ThemeRegistry();
    const custom: ThemeTokens = {
      name: "mono",
      background: "#000000",
      snakeHead: "#ffffff",
      snakeBody: "#cccccc",
      food: "#888888",
      obstacle: "#444444",
    };
    registry.register(custom);
    registry.setActive("mono");
    expect(registry.getActive().name).toBe("mono");
  });

  it("(4) setActive('unknown') 는 silent fallback 으로 neon 을 유지한다 (throw 하지 않음)", () => {
    const registry = new ThemeRegistry();
    expect(() => registry.setActive("does-not-exist")).not.toThrow();
    expect(registry.getActive().name).toBe("neon");
  });
});
