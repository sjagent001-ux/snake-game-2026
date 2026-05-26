/**
 * SPEC-GAME-CORE-001 REQ-DOMAIN-011 — 장애물 도메인 객체.
 *
 * 하나 이상의 격자 셀로 구성된 정적 벽 타일을 나타낸다.
 * 게임 진행 중에는 불변(REQ-DOMAIN-008)이며, 셀 포함 판정만 노출한다.
 *
 * 본 도메인 클래스는 단일 장애물 instance 의 다중 셀 표현이 아닌
 * "셀 N개로 이뤄진 장애물 집합" 으로 사용된다 (ObstacleLayout 이 단일 셀 단위 인스턴스를 다수 생성).
 */

import { SnakeSegment } from "../snake/SnakeSegment";

export class Obstacle {
  private readonly _cells: SnakeSegment[];

  constructor(cells: readonly SnakeSegment[]) {
    this._cells = cells.map((c) => new SnakeSegment(c.col, c.row));
  }

  public get cells(): readonly SnakeSegment[] {
    return this._cells.slice();
  }

  /**
   * 주어진 (col, row) 셀이 이 장애물 인스턴스에 속하면 true.
   */
  public contains(cell: { col: number; row: number }): boolean {
    for (const c of this._cells) {
      if (c.col === cell.col && c.row === cell.row) return true;
    }
    return false;
  }
}
