/**
 * SPEC-GAME-CORE-001 REQ-DOMAIN-004 — 일반 먹이 도메인 객체.
 *
 * 하나의 (col, row) 격자 셀과 consumed 플래그를 보유한다.
 * 위치는 불변이며, 섭취 후에는 consumed 가 true 로 전이된다.
 * 새 위치 스폰은 FoodSpawner 책임으로, Food 자체는 위치를 이동시키지 않는다.
 */

import { SnakeSegment } from "../snake/SnakeSegment";

export class Food {
  public readonly cell: SnakeSegment;
  private _consumed: boolean;

  constructor(col: number, row: number) {
    this.cell = new SnakeSegment(col, row);
    this._consumed = false;
  }

  public get consumed(): boolean {
    return this._consumed;
  }

  /**
   * 먹이를 섭취 상태로 전이시킨다. 위치는 변경되지 않는다.
   */
  public consume(): void {
    this._consumed = true;
  }
}
