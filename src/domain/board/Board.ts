/**
 * SPEC-GAME-CORE-001 REQ-DOMAIN-001 — Board 도메인 모델.
 *
 * 격자 크기(width, height)를 보유하고 (x, y) 좌표가 격자 내부에 있는지
 * 그리고 주어진 occupants(뱀, 장애물, 먹이)에 의해 점유되었는지를 판정한다.
 *
 * 의존 방향 규칙(REQ-DOMAIN-012)을 위해 occupants 는 구조적 타이핑으로 받는다.
 * 즉 Snake, Obstacle, Food 의 구체 클래스에는 의존하지 않고 다음 형태만 요구한다.
 *   - snake: { containsCell(cell): boolean }
 *   - obstacles: readonly { contains(cell): boolean }[]
 *   - food: { cell: { col: number; row: number } } | null
 *
 * Board.isOccupied 는 (x, y) 좌표계를 사용한다 (REQ-DOMAIN-001 SSOT).
 * 내부적으로는 (x → col, y → row) 로 매핑하여 도메인 객체에 전달한다.
 */

// @MX:NOTE: [AUTO] REQ-DOMAIN-012 의존 방향 규칙 준수를 위한 구조적 타입.
//           Snake/Obstacle/Food 구체 클래스는 import 하지 않는다.
export interface OccupantsLike {
  readonly snake: { containsCell(cell: { col: number; row: number }): boolean };
  readonly obstacles: readonly {
    contains(cell: { col: number; row: number }): boolean;
  }[];
  readonly food: { readonly cell: { col: number; row: number } } | null;
}

export class Board {
  public readonly width: number;
  public readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * (x, y) 좌표가 격자 `[0, width) × [0, height)` 안에 있는지 확인한다.
   */
  public cellsInBounds(cell: { x: number; y: number }): boolean {
    return (
      cell.x >= 0 && cell.x < this.width && cell.y >= 0 && cell.y < this.height
    );
  }

  /**
   * @MX:ANCHOR: [AUTO] Board 점유 판정 진입점 — FoodSpawner / ObstacleLayout / 충돌 판정에서 호출.
   * @MX:REASON: [AUTO] REQ-DOMAIN-001 SSOT 시그니처. Snake/Obstacle/Food 는 구조적 타이핑으로 주입한다.
   *
   * (x, y) 셀이 어느 occupant 에 의해 점유되어 있으면 true.
   */
  public isOccupied(
    cell: { x: number; y: number },
    occupants: OccupantsLike,
  ): boolean {
    const gridCell = { col: cell.x, row: cell.y };
    if (occupants.snake.containsCell(gridCell)) return true;
    for (const obstacle of occupants.obstacles) {
      if (obstacle.contains(gridCell)) return true;
    }
    if (occupants.food !== null) {
      const fc = occupants.food.cell;
      if (fc.col === gridCell.col && fc.row === gridCell.row) return true;
    }
    return false;
  }
}
