/**
 * SPEC-GAME-CORE-001 REQ-DOMAIN-005/006 — FoodSpawner 단위 테스트.
 *
 * - 빈 셀이 존재하면 그 셀들 중 하나에 Food 를 스폰한다.
 * - 보드가 가득 차면 null 반환, throw 하지 않는다 (AC-E1).
 * - 의존성 주입 random 으로 결정적 검증.
 */

import { describe, expect, it } from "vitest";

import { Board } from "../../src/domain/board/Board";
import { FoodSpawner } from "../../src/domain/FoodSpawner";
import { Obstacle } from "../../src/domain/obstacle/Obstacle";
import { Snake } from "../../src/domain/snake/Snake";
import { SnakeSegment } from "../../src/domain/snake/SnakeSegment";

describe("FoodSpawner (T-9) — REQ-DOMAIN-005/006", () => {
  it("빈 셀에 Food 인스턴스를 반환한다 (REQ-DOMAIN-005)", () => {
    const board = new Board(20, 20);
    const snake = new Snake(
      [new SnakeSegment(10, 10), new SnakeSegment(9, 10)],
      "right",
    );
    const obstacles: readonly Obstacle[] = [];
    const food = FoodSpawner.spawn(board, snake, obstacles, {
      random: () => 0.0,
    });
    expect(food).not.toBeNull();
  });

  it("결정적 random=0 일 때 첫 번째 빈 셀(0,0)에 스폰한다", () => {
    const board = new Board(20, 20);
    const snake = new Snake(
      [new SnakeSegment(10, 10), new SnakeSegment(9, 10)],
      "right",
    );
    const food = FoodSpawner.spawn(board, snake, [], { random: () => 0.0 });
    expect(food).not.toBeNull();
    expect(food!.cell.col).toBe(0);
    expect(food!.cell.row).toBe(0);
  });

  it("스폰된 Food 는 뱀 / 장애물 / 기존 점유 셀 중 어느 것과도 겹치지 않는다 (AC-3)", () => {
    const board = new Board(20, 20);
    const snake = new Snake(
      [
        new SnakeSegment(0, 0),
        new SnakeSegment(1, 0),
        new SnakeSegment(2, 0),
      ],
      "right",
    );
    const obstacles: readonly Obstacle[] = [
      new Obstacle([new SnakeSegment(3, 0)]),
    ];
    // random=0 일 때 가장 처음 등장하는 빈 셀이 (4, 0) 이어야 한다 (snake (0..2,0), obstacle (3,0) 모두 점유).
    const food = FoodSpawner.spawn(board, snake, obstacles, {
      random: () => 0.0,
    });
    expect(food).not.toBeNull();
    expect(food!.cell.col).toBe(4);
    expect(food!.cell.row).toBe(0);
  });

  it("보드가 가득 찬 경우 (작은 2×2 보드, 4셀 모두 뱀·장애물에 점유) null 반환, throw 없음 (AC-E1, REQ-DOMAIN-006)", () => {
    const board = new Board(2, 2);
    const snake = new Snake(
      [
        new SnakeSegment(0, 0),
        new SnakeSegment(1, 0),
        new SnakeSegment(0, 1),
        new SnakeSegment(1, 1),
      ],
      "right",
    );
    const food = FoodSpawner.spawn(board, snake, [], { random: () => 0.5 });
    expect(food).toBeNull();
  });

  it("opts 미지정 시 Math.random 기본값을 사용하며, 결과는 빈 셀 영역에 존재한다", () => {
    const board = new Board(20, 20);
    const snake = new Snake(
      [new SnakeSegment(10, 10), new SnakeSegment(9, 10)],
      "right",
    );
    const food = FoodSpawner.spawn(board, snake, []);
    expect(food).not.toBeNull();
    expect(food!.cell.col).toBeGreaterThanOrEqual(0);
    expect(food!.cell.col).toBeLessThan(20);
    expect(food!.cell.row).toBeGreaterThanOrEqual(0);
    expect(food!.cell.row).toBeLessThan(20);
    // 뱀 셀 (10,10), (9,10) 는 제외되어야 한다.
    expect(snake.containsCell(food!.cell)).toBe(false);
  });

  it("random=0.9999 일 때 마지막 빈 셀을 선택한다 (균등 분포 양 끝 검증)", () => {
    const board = new Board(2, 2);
    // 빈 셀이 1개만 남도록 구성: (0,0), (1,0), (0,1) 점유, (1,1) 만 빈 셀.
    const snake = new Snake(
      [
        new SnakeSegment(0, 0),
        new SnakeSegment(1, 0),
        new SnakeSegment(0, 1),
      ],
      "right",
    );
    const food = FoodSpawner.spawn(board, snake, [], { random: () => 0.9999 });
    expect(food).not.toBeNull();
    expect(food!.cell.col).toBe(1);
    expect(food!.cell.row).toBe(1);
  });
});
