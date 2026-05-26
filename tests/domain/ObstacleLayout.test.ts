/**
 * SPEC-GAME-CORE-001 REQ-DOMAIN-007/008 — ObstacleLayout 단위 테스트.
 *
 * - 동일 시드 + 동일 카운트 + 동일 보드 → 동일 셀 배치 (AC-E2 결정성).
 * - 뱀 초기 시드 영역(중앙 + 좌측 3셀)을 침범하지 않는다.
 * - running 동안 list 참조 identity 가 유지된다 (AC-14).
 */

import { describe, expect, it } from "vitest";

import { Board } from "../../src/domain/board/Board";
import { ObstacleLayout } from "../../src/domain/ObstacleLayout";
import { SnakeSegment } from "../../src/domain/snake/SnakeSegment";

describe("ObstacleLayout (T-10) — REQ-DOMAIN-007/008", () => {
  it("동일 시드·카운트·보드로 두 번 호출 시 동일한 셀 목록을 반환한다 (AC-E2 결정성)", () => {
    const board = new Board(20, 20);
    const a = ObstacleLayout.generate(42, 8, board);
    const b = ObstacleLayout.generate(42, 8, board);
    expect(a.list.length).toBe(b.list.length);
    for (let i = 0; i < a.list.length; i += 1) {
      const aCells = a.list[i]!.cells;
      const bCells = b.list[i]!.cells;
      expect(aCells.length).toBe(bCells.length);
      for (let j = 0; j < aCells.length; j += 1) {
        expect(aCells[j]!.col).toBe(bCells[j]!.col);
        expect(aCells[j]!.row).toBe(bCells[j]!.row);
      }
    }
  });

  it("count 개의 장애물 인스턴스를 생성한다 (각 인스턴스는 셀 1개)", () => {
    const board = new Board(20, 20);
    const layout = ObstacleLayout.generate(42, 8, board);
    expect(layout.list.length).toBe(8);
  });

  it("뱀 초기 시드 영역(머리 + 초기 3 세그먼트)을 침범하지 않는다", () => {
    const board = new Board(20, 20);
    // spec.md §5.4 시작 셀: head = (floor(20/2), floor(20/2)) = (10, 10)
    // 초기 세그먼트: (10,10), (9,10), (8,10)
    const snakeInitial: readonly SnakeSegment[] = [
      new SnakeSegment(10, 10),
      new SnakeSegment(9, 10),
      new SnakeSegment(8, 10),
    ];
    const layout = ObstacleLayout.generate(42, 8, board, snakeInitial);
    for (const obstacle of layout.list) {
      for (const cell of obstacle.cells) {
        for (const seed of snakeInitial) {
          expect(
            cell.col === seed.col && cell.row === seed.row,
          ).toBe(false);
        }
      }
    }
  });

  it("모든 장애물 셀은 보드 격자 안에 있다", () => {
    const board = new Board(20, 20);
    const layout = ObstacleLayout.generate(42, 8, board);
    for (const obstacle of layout.list) {
      for (const cell of obstacle.cells) {
        expect(cell.col).toBeGreaterThanOrEqual(0);
        expect(cell.col).toBeLessThan(20);
        expect(cell.row).toBeGreaterThanOrEqual(0);
        expect(cell.row).toBeLessThan(20);
      }
    }
  });

  it("AC-14 — running 동안 list 참조 identity 가 유지된다 (100 가상 tick)", () => {
    const board = new Board(20, 20);
    const layout = ObstacleLayout.generate(42, 8, board);
    const initialRef = layout.list;
    // 100회 list 접근에도 동일한 참조가 반환되어야 한다 (REQ-DOMAIN-008 불변성).
    for (let tick = 0; tick < 100; tick += 1) {
      expect(layout.list).toBe(initialRef);
    }
    // 길이와 각 Obstacle 인스턴스 identity 도 보존된다.
    expect(layout.list.length).toBe(initialRef.length);
    for (let i = 0; i < initialRef.length; i += 1) {
      expect(layout.list[i]).toBe(initialRef[i]);
    }
  });

  it("다른 시드는 다른 배치를 만든다 (시드 의미 검증)", () => {
    const board = new Board(20, 20);
    const a = ObstacleLayout.generate(42, 8, board);
    const b = ObstacleLayout.generate(99, 8, board);
    // 두 배치가 완전히 동일할 가능성은 사실상 0 이지만, 안전을 위해 어떤 셀이라도 다르면 OK.
    let anyDifferent = false;
    for (let i = 0; i < a.list.length; i += 1) {
      const aCell = a.list[i]!.cells[0]!;
      const bCell = b.list[i]!.cells[0]!;
      if (aCell.col !== bCell.col || aCell.row !== bCell.row) {
        anyDifferent = true;
        break;
      }
    }
    expect(anyDifferent).toBe(true);
  });
});
