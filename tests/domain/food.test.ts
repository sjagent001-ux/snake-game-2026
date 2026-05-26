/**
 * SPEC-GAME-CORE-001 REQ-DOMAIN-004 — Food 도메인 단위 테스트.
 */

import { describe, expect, it } from "vitest";

import { Food } from "../../src/domain/food/Food";

describe("Food (T-7) — REQ-DOMAIN-004", () => {
  it("생성 시 (col, row) 셀을 보유하고 consumed 플래그는 false 이다", () => {
    const food = new Food(12, 8);
    expect(food.cell.col).toBe(12);
    expect(food.cell.row).toBe(8);
    expect(food.consumed).toBe(false);
  });

  it("consume() 호출 시 consumed 플래그가 true 로 전이된다", () => {
    const food = new Food(3, 4);
    food.consume();
    expect(food.consumed).toBe(true);
  });

  it("consume() 가 두 번 호출되어도 cell 위치는 불변이다", () => {
    const food = new Food(7, 9);
    food.consume();
    food.consume();
    expect(food.consumed).toBe(true);
    expect(food.cell.col).toBe(7);
    expect(food.cell.row).toBe(9);
  });
});
