/**
 * SPEC-GAME-CORE-001 REQ-DOMAIN-002 — 뱀 세그먼트 값 객체.
 *
 * (col, row) 격자 좌표만을 보유하며, equals() 헬퍼를 통해 셀 동등성을 비교한다.
 * 도메인 레이어의 가장 원자적 단위이며, 어떤 외부 레이어에도 의존하지 않는다.
 */

export class SnakeSegment {
  public readonly col: number;
  public readonly row: number;

  constructor(col: number, row: number) {
    this.col = col;
    this.row = row;
  }

  /**
   * 두 세그먼트가 동일한 격자 셀을 가리키면 true 를 반환한다.
   */
  public equals(other: SnakeSegment): boolean {
    return this.col === other.col && this.row === other.row;
  }
}
