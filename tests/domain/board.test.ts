/**
 * SPEC-GAME-CORE-001 REQ-DOMAIN-001 — Board.isOccupied 시그니처 SSOT.
 */

import { describe, expect, it } from "vitest";

import { Board } from "../../src/domain/board/Board";
import { Food } from "../../src/domain/food/Food";
import { Obstacle } from "../../src/domain/obstacle/Obstacle";
import { Snake } from "../../src/domain/snake/Snake";
import { SnakeSegment } from "../../src/domain/snake/SnakeSegment";

const buildSnake = (segments: Array<[number, number]>) =>
  new Snake(
    segments.map(([c, r]) => new SnakeSegment(c, r)),
    "right",
  );

describe("Board (T-5) — REQ-DOMAIN-001", () => {
  it("생성 시 width, height 가 노출된다", () => {
    const board = new Board(20, 20);
    expect(board.width).toBe(20);
    expect(board.height).toBe(20);
  });

  it("cellsInBounds() — 격자 안의 셀은 true, 음수/초과 좌표는 false (AC-5 와 동일 경계 규칙)", () => {
    const board = new Board(20, 20);
    expect(board.cellsInBounds({ x: 0, y: 0 })).toBe(true);
    expect(board.cellsInBounds({ x: 19, y: 19 })).toBe(true);
    expect(board.cellsInBounds({ x: -1, y: 5 })).toBe(false);
    expect(board.cellsInBounds({ x: 20, y: 5 })).toBe(false);
    expect(board.cellsInBounds({ x: 5, y: -1 })).toBe(false);
    expect(board.cellsInBounds({ x: 5, y: 20 })).toBe(false);
  });

  it("isOccupied() — 뱀 세그먼트 셀이면 true 를 반환한다", () => {
    const board = new Board(20, 20);
    const snake = buildSnake([
      [10, 10],
      [9, 10],
      [8, 10],
    ]);
    const occupied = board.isOccupied(
      { x: 9, y: 10 },
      { snake, obstacles: [], food: null },
    );
    expect(occupied).toBe(true);
  });

  it("isOccupied() — 장애물 셀이면 true 를 반환한다 (AC-6)", () => {
    const board = new Board(20, 20);
    const snake = buildSnake([
      [10, 10],
      [9, 10],
      [8, 10],
    ]);
    const obstacles: readonly Obstacle[] = [
      new Obstacle([new SnakeSegment(15, 5)]),
    ];
    expect(
      board.isOccupied(
        { x: 15, y: 5 },
        { snake, obstacles, food: null },
      ),
    ).toBe(true);
  });

  it("isOccupied() — 먹이 셀이면 true 를 반환한다", () => {
    const board = new Board(20, 20);
    const snake = buildSnake([
      [10, 10],
      [9, 10],
      [8, 10],
    ]);
    const food = new Food(7, 7);
    expect(
      board.isOccupied(
        { x: 7, y: 7 },
        { snake, obstacles: [], food },
      ),
    ).toBe(true);
  });

  it("isOccupied() — 어느 occupant 도 점유하지 않은 빈 셀이면 false 를 반환한다", () => {
    const board = new Board(20, 20);
    const snake = buildSnake([
      [10, 10],
      [9, 10],
      [8, 10],
    ]);
    const food = new Food(7, 7);
    const obstacles: readonly Obstacle[] = [
      new Obstacle([new SnakeSegment(15, 5)]),
    ];
    expect(
      board.isOccupied(
        { x: 1, y: 1 },
        { snake, obstacles, food },
      ),
    ).toBe(false);
  });
});
