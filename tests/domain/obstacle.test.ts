/**
 * SPEC-GAME-CORE-001 REQ-DOMAIN-011 — Obstacle 도메인 단위 테스트.
 */

import { describe, expect, it } from "vitest";

import { Obstacle } from "../../src/domain/obstacle/Obstacle";
import { SnakeSegment } from "../../src/domain/snake/SnakeSegment";

describe("Obstacle (T-8) — REQ-DOMAIN-011", () => {
  it("생성 시 전달된 셀 목록을 그대로 보유한다", () => {
    const cells = [new SnakeSegment(3, 3), new SnakeSegment(10, 5)];
    const obstacle = new Obstacle(cells);
    expect(obstacle.cells.length).toBe(2);
  });

  it("contains() — 셀이 포함되면 true 를 반환한다 (AC-6)", () => {
    const obstacle = new Obstacle([
      new SnakeSegment(10, 5),
      new SnakeSegment(11, 5),
    ]);
    expect(obstacle.contains({ col: 10, row: 5 })).toBe(true);
    expect(obstacle.contains({ col: 11, row: 5 })).toBe(true);
  });

  it("contains() — 셀이 포함되지 않으면 false 를 반환한다", () => {
    const obstacle = new Obstacle([new SnakeSegment(10, 5)]);
    expect(obstacle.contains({ col: 0, row: 0 })).toBe(false);
    expect(obstacle.contains({ col: 11, row: 5 })).toBe(false);
  });

  it("cells 시야는 readonly 로 노출되며, 외부 push 시도에도 내부 상태가 보호된다", () => {
    const obstacle = new Obstacle([new SnakeSegment(1, 1)]);
    const view = obstacle.cells;
    (view as SnakeSegment[]).push(new SnakeSegment(99, 99));
    expect(obstacle.cells.length).toBe(1);
  });
});
