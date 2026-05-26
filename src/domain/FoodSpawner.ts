/**
 * SPEC-GAME-CORE-001 REQ-DOMAIN-005/006 — FoodSpawner.
 *
 * Board 의 빈 셀(뱀 세그먼트·장애물 셀·기존 먹이가 점유하지 않은 셀) 중에서
 * 균등 분포로 하나를 골라 Food 인스턴스를 반환한다. 빈 셀이 없으면 null.
 *
 * @MX:NOTE: [AUTO] REQ-DOMAIN-005 — random 함수는 의존성 주입으로 받아 테스트 가능성을 확보한다.
 *           프로덕션 기본값은 Math.random, 테스트는 결정적 PRNG 또는 () => 0.0 등을 주입.
 */

import { Board } from "./board/Board";
import { Food } from "./food/Food";
import { Obstacle } from "./obstacle/Obstacle";
import { Snake } from "./snake/Snake";

export interface FoodSpawnOptions {
  /** 의존성 주입 random — 기본값은 Math.random. */
  random?: () => number;
}

export class FoodSpawner {
  /**
   * 빈 셀을 모두 모은 뒤 random() 으로 균등 선택한다.
   * 보드가 가득 차면 null. throw 하지 않는다 (REQ-DOMAIN-006, AC-E1).
   */
  public static spawn(
    board: Board,
    snake: Snake,
    obstacles: readonly Obstacle[],
    opts?: FoodSpawnOptions,
  ): Food | null {
    const random = opts?.random ?? Math.random;
    const emptyCells: Array<{ col: number; row: number }> = [];

    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        const occupied = board.isOccupied(
          { x, y },
          { snake, obstacles, food: null },
        );
        if (!occupied) {
          emptyCells.push({ col: x, row: y });
        }
      }
    }

    if (emptyCells.length === 0) {
      return null;
    }

    // Math.floor(random * N) 는 균등 분포 인덱스를 생성한다.
    // random = 0.0 → 0, random = 0.9999 → N-1.
    const index = Math.min(
      emptyCells.length - 1,
      Math.floor(random() * emptyCells.length),
    );
    const cell = emptyCells[index]!;
    return new Food(cell.col, cell.row);
  }
}
