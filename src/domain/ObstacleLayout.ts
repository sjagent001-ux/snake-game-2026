/**
 * SPEC-GAME-CORE-001 REQ-DOMAIN-007/008 — ObstacleLayout.
 *
 * 시드 결정적 PRNG(Mulberry32)를 사용해 N개의 1-셀 Obstacle 을 보드에 배치한다.
 * 동일 (seed, count, board, snakeInitial) → 동일한 list 배열.
 *
 * 게임 진행 동안 list 배열의 참조 identity 는 변하지 않으며 (REQ-DOMAIN-008, AC-14),
 * 외부 호출자는 list 를 read-only 로만 소비해야 한다.
 *
 * @MX:NOTE: [AUTO] REQ-DOMAIN-007 결정성 — Math.random 대신 Mulberry32 를 내부 구현해
 *           동일 시드 + 동일 입력에 대해 재현 가능한 출력을 보장한다.
 *           (Mulberry32 는 퍼블릭 도메인 32-bit PRNG 표준 패턴; plan.md R-5 참조.)
 */

import { Obstacle } from "./obstacle/Obstacle";
import { Board } from "./board/Board";
import { SnakeSegment } from "./snake/SnakeSegment";

/**
 * Mulberry32 PRNG.
 *
 * 32-bit 정수 seed 에서 [0, 1) 균등 분포 부동소수점 시퀀스를 생성한다.
 * 퍼블릭 도메인 알고리즘. 출력 시퀀스는 결정적이다.
 */
function mulberry32(seed: number): () => number {
  // seed 는 32-bit 정수로 정규화한다.
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ObstacleLayout {
  private readonly _list: readonly Obstacle[];

  private constructor(list: readonly Obstacle[]) {
    this._list = list;
  }

  /**
   * list 시야는 동일 인스턴스 동안 동일한 readonly 배열 참조를 반환한다 (AC-14).
   */
  public get list(): readonly Obstacle[] {
    return this._list;
  }

  /**
   * 결정적 PRNG 로 count 개의 단일-셀 Obstacle 을 보드 위에 배치한다.
   *
   * 제약 조건:
   *  - 셀 위치는 보드 격자 내부.
   *  - 뱀 초기 시드 영역(snakeInitial)과 충돌하지 않음.
   *  - 동일 셀에 중복 배치하지 않음.
   *
   * 빈 셀이 부족하면 가능한 범위만 채워서 반환한다 (방어적 동작).
   */
  public static generate(
    seed: number,
    count: number,
    board: Board,
    snakeInitial: readonly SnakeSegment[] = [],
  ): ObstacleLayout {
    const random = mulberry32(seed);
    const reserved = new Set<string>();
    const key = (col: number, row: number) => `${col},${row}`;
    for (const seg of snakeInitial) {
      reserved.add(key(seg.col, seg.row));
    }

    const obstacles: Obstacle[] = [];
    const maxAttempts = board.width * board.height * 4; // 무한 루프 방지
    let attempts = 0;

    while (obstacles.length < count && attempts < maxAttempts) {
      attempts += 1;
      const col = Math.floor(random() * board.width);
      const row = Math.floor(random() * board.height);
      const k = key(col, row);
      if (reserved.has(k)) continue;
      reserved.add(k);
      obstacles.push(new Obstacle([new SnakeSegment(col, row)]));
    }

    return new ObstacleLayout(Object.freeze(obstacles.slice()));
  }
}
