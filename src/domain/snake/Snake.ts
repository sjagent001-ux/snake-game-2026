/**
 * SPEC-GAME-CORE-001 REQ-DOMAIN-002/003/004/010 — Snake 도메인 모델.
 *
 * 책임:
 * - 머리와 비-머리 세그먼트로 구성된 정렬된 셀 목록
 * - 단일 tick에 대한 head 이동 + 트레일 시프트 (move)
 * - 다음 tick 에서 꼬리 보존 (grow)
 * - 자기 충돌 판정 (collidesWithSelf)
 * - 셀 포함 여부 (containsCell)
 *
 * @MX:NOTE: [AUTO] REQ-DOMAIN-002 SSOT — segments[0]가 head, segments[length-1]가 tail.
 */

import { SnakeSegment } from "./SnakeSegment";

export type Direction = "up" | "down" | "left" | "right";

export class Snake {
  private readonly _segments: SnakeSegment[];
  private _direction: Direction;
  private _pendingGrowth: number;

  constructor(initialSegments: readonly SnakeSegment[], initialDirection: Direction) {
    if (initialSegments.length === 0) {
      throw new Error("Snake은 최소 한 개 이상의 세그먼트로 생성되어야 한다.");
    }
    // 내부 사본을 보관해 외부 변형에 영향받지 않도록 한다.
    this._segments = initialSegments.map((s) => new SnakeSegment(s.col, s.row));
    this._direction = initialDirection;
    this._pendingGrowth = 0;
  }

  public get head(): SnakeSegment {
    // 생성자 단계에서 길이 >= 1을 보장하므로 head 는 항상 존재한다.
    return this._segments[0]!;
  }

  public get length(): number {
    return this._segments.length;
  }

  public get direction(): Direction {
    return this._direction;
  }

  /**
   * 외부에는 readonly 시야만 노출하고, 내부 상태는 보호된다.
   * 호출자가 강제 캐스팅으로 변형을 시도해도 사본을 반환하여 내부 무결성이 보존된다.
   */
  public get segments(): readonly SnakeSegment[] {
    return this._segments.slice();
  }

  /**
   * 다음 move() 적용 시 사용할 새 방향을 설정한다.
   * 반대 방향 차단은 입력 레이어(KeyboardHandler)와 StateMachine 의 책임이며,
   * 도메인 자체는 지정된 방향을 그대로 수용한다.
   */
  public setDirection(direction: Direction): void {
    this._direction = direction;
  }

  /**
   * 다음 move() 한 번에 한해 꼬리 보존(길이 +1) 효과를 적용한다.
   * REQ-DOMAIN-004 — 먹이 섭취 시 호출.
   */
  public grow(): void {
    this._pendingGrowth += 1;
  }

  /**
   * @MX:ANCHOR: [AUTO] Snake 의 핵심 진입점 — StateMachine.update 와 충돌 판정에서 호출됨.
   * @MX:REASON: [AUTO] fan_in >= 3 (StateMachine.update, 충돌 판정, FoodSpawner 흐름) — 시그니처 변경 금지.
   *
   * REQ-DOMAIN-003: 머리를 현재 방향으로 한 칸 이동시키고 각 비-머리 세그먼트는
   * 앞 세그먼트의 이전 위치로 시프트한다. pendingGrowth 가 양수면 꼬리를 잘라내지 않아
   * 결과적으로 길이가 1 증가한다.
   */
  public move(): void {
    const next = this._nextHead();
    this._segments.unshift(next);
    if (this._pendingGrowth > 0) {
      this._pendingGrowth -= 1;
    } else {
      this._segments.pop();
    }
  }

  private _nextHead(): SnakeSegment {
    const h = this.head;
    switch (this._direction) {
      case "up":
        return new SnakeSegment(h.col, h.row - 1);
      case "down":
        return new SnakeSegment(h.col, h.row + 1);
      case "left":
        return new SnakeSegment(h.col - 1, h.row);
      case "right":
        return new SnakeSegment(h.col + 1, h.row);
    }
  }

  /**
   * REQ-DOMAIN-010 — 머리가 자기 비-머리 세그먼트 중 어느 하나와 같은 셀에 있으면 true.
   */
  public collidesWithSelf(): boolean {
    const head = this.head;
    for (let i = 1; i < this._segments.length; i += 1) {
      if (this._segments[i]!.equals(head)) return true;
    }
    return false;
  }

  /**
   * Board.isOccupied 와 FoodSpawner 가 활용하는 셀 포함 헬퍼.
   * 격자 셀 자체만 비교하므로 어떤 (col,row) 형 객체도 받아들인다.
   */
  public containsCell(cell: { col: number; row: number }): boolean {
    for (const seg of this._segments) {
      if (seg.col === cell.col && seg.row === cell.row) return true;
    }
    return false;
  }
}
