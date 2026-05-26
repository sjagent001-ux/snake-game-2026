/**
 * SPEC-GAME-CORE-001 REQ-STATE-001~009 + REQ-INPUT-002/003/004 — StateMachine.
 *
 * 책임:
 *  - 4-state FSM 유지 (idle / running / paused / gameover) — REQ-STATE-001
 *  - 도메인 객체(Snake / Food / Obstacles) 의 라이프사이클 관리:
 *    START 시 초기화, RESTART 시 재시드.
 *  - update() 가 호출되면 running 일 때만 1 tick 진행 (방향 버퍼 소비 → 이동 →
 *    충돌 검사 → 먹이 검사 → 점수 가산 / 먹이 리스폰).
 *  - 충돌 시 gameover 전이 (REQ-STATE-006).
 *  - 방향 버퍼: input-time 반대 차단 (REQ-INPUT-002), tick-apply 시점 방어 가드 (REQ-INPUT-004).
 *
 * @MX:NOTE: [AUTO] REQ-INPUT-002 input-time 방어 + REQ-INPUT-004 tick-apply 방어의 이중 방어막.
 *           정상 경로에서는 input-time 차단만으로 충분하지만, 입력↔적용 사이 방향이 바뀌면
 *           tick-apply 시점에 다시 방어 가드가 발동한다.
 */

import { Board } from "../domain/board/Board";
import { Snake, Direction } from "../domain/snake/Snake";
import { SnakeSegment } from "../domain/snake/SnakeSegment";
import { Food } from "../domain/food/Food";
import { Obstacle } from "../domain/obstacle/Obstacle";
import { ObstacleLayout } from "../domain/ObstacleLayout";
import { FoodSpawner } from "../domain/FoodSpawner";
import { ScoreCalculator } from "../score/ScoreCalculator";
import type { RenderSnapshot } from "../render/Renderer";

export type GameState = "idle" | "running" | "paused" | "gameover";
export type StateAction = "START" | "TOGGLE_PAUSE" | "RESTART" | "COLLIDE";

export interface StateMachineOptions {
  readonly board: Board;
  readonly scoreCalculator: ScoreCalculator;
  readonly obstacleSeed: number;
  readonly obstacleCount: number;
  /** FoodSpawner 에 주입할 random — 테스트 결정성 확보용. */
  readonly random?: () => number;
}

type TransitionListener = (from: GameState, to: GameState) => void;

/**
 * 주어진 방향이 현재 방향과 정확히 반대인지 판정한다.
 * 입력 시점 차단(REQ-INPUT-002) + tick-apply 방어 가드(REQ-INPUT-004) 양쪽에서 공용.
 */
function isOpposite(current: Direction, candidate: Direction): boolean {
  return (
    (current === "up" && candidate === "down") ||
    (current === "down" && candidate === "up") ||
    (current === "left" && candidate === "right") ||
    (current === "right" && candidate === "left")
  );
}

export class StateMachine {
  private readonly _board: Board;
  private readonly _scoreCalculator: ScoreCalculator;
  private readonly _obstacleSeed: number;
  private readonly _obstacleCount: number;
  private readonly _random: () => number;

  private _state: GameState;
  private _snake: Snake;
  private _food: Food | null;
  private _obstacleLayout: ObstacleLayout;
  private _bufferedDirection: Direction | null;
  private readonly _listeners: Set<TransitionListener>;
  // 이전 tick 의 뱀 세그먼트 스냅샷 — Renderer 의 sub-grid 보간(REQ-SCORE-008)에 사용.
  // update() 가 _snake.move() 를 호출하기 직전에 갱신된다.
  private _previousSegments: readonly SnakeSegment[];

  constructor(opts: StateMachineOptions) {
    this._board = opts.board;
    this._scoreCalculator = opts.scoreCalculator;
    this._obstacleSeed = opts.obstacleSeed;
    this._obstacleCount = opts.obstacleCount;
    this._random = opts.random ?? Math.random;
    this._state = "idle";
    this._listeners = new Set();
    this._bufferedDirection = null;

    // 초기 도메인 상태 (idle 에서도 노출되는 기본값).
    const initial = this._initializeEntities();
    this._snake = initial.snake;
    this._food = initial.food;
    this._obstacleLayout = initial.layout;
    // 초기 previousSegments 는 현재 segments 와 동일 — alpha 보간 시 정지 상태로 보인다.
    this._previousSegments = this._snake.segments;
  }

  public get currentState(): GameState {
    return this._state;
  }

  public get snake(): Snake {
    return this._snake;
  }

  public get food(): Food | null {
    return this._food;
  }

  public get obstacleLayout(): ObstacleLayout {
    return this._obstacleLayout;
  }

  public get scoreCalculator(): ScoreCalculator {
    return this._scoreCalculator;
  }

  /**
   * Renderer 에 전달할 read-only 스냅샷을 구성한다 (REQ-SCORE-008).
   *
   * 현재 segments 와 이전 tick segments 를 함께 노출해 sub-grid 보간을 지원한다.
   * Snake/Food/Obstacle 도메인 객체는 노출하지 않으며, 셀 좌표 view 만 전달한다 —
   * Renderer 는 이를 mutating 없이 읽기만 한다 (AC-16).
   */
  public getRenderSnapshot(): RenderSnapshot {
    const obstacleCells: { col: number; row: number }[] = [];
    for (const obs of this._obstacleLayout.list) {
      for (const c of obs.cells) {
        obstacleCells.push({ col: c.col, row: c.row });
      }
    }
    return {
      snake: {
        segments: this._snake.segments,
        previousSegments: this._previousSegments,
        direction: this._snake.direction,
      },
      food:
        this._food === null
          ? null
          : { cell: { col: this._food.cell.col, row: this._food.cell.row } },
      obstacles: obstacleCells,
    };
  }

  /**
   * 상태 전이 리스너 등록. 반환된 함수를 호출하면 구독 해제.
   * REQ-STATE-009 / AC-11.
   */
  public onTransition(listener: TransitionListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * 입력 시점 방어 (REQ-INPUT-002): 현재 방향의 정반대 입력은 폐기, 버퍼는 보존.
   * 그 외에는 버퍼를 덮어쓴다 (1-슬롯).
   */
  public setBufferedDirection(direction: Direction): void {
    if (isOpposite(this._snake.direction, direction)) {
      return; // 입력 시점 폐기, 버퍼 보존.
    }
    this._bufferedDirection = direction;
  }

  /**
   * 테스트 / 디버그 전용 헬퍼 — input-time 차단을 우회해 버퍼를 강제 주입.
   * 정상 경로에서는 사용하지 말 것. REQ-INPUT-004 방어 가드 검증용.
   */
  public forceBufferedDirectionForTest(direction: Direction): void {
    this._bufferedDirection = direction;
  }

  public peekBufferedDirection(): Direction | null {
    return this._bufferedDirection;
  }

  /**
   * 테스트 전용 — food 를 명시적 셀에 배치한다. AC-3 통합 검증.
   */
  public placeFoodForTest(col: number, row: number): void {
    this._food = new Food(col, row);
  }

  /**
   * @MX:ANCHOR: [AUTO] StateMachine 의 진입점 — KeyboardHandler 와 Collision 흐름에서 호출됨.
   * @MX:REASON: [AUTO] action 타입 / state 매트릭스가 본 SPEC 의 핵심 계약. 시그니처 변경 시 광범위 영향.
   *
   * 사용자 액션 또는 도메인 이벤트(COLLIDE) 에 의한 상태 전이.
   */
  public transition(action: StateAction): void {
    const from = this._state;
    let to: GameState = from;

    switch (action) {
      case "START":
        if (from === "idle") {
          // 도메인 재초기화 (REQ-STATE-002 — 초기 머리·길이·방향·장애물).
          const init = this._initializeEntities();
          this._snake = init.snake;
          this._food = init.food;
          this._obstacleLayout = init.layout;
          this._bufferedDirection = null;
          this._previousSegments = this._snake.segments;
          to = "running";
        }
        break;
      case "TOGGLE_PAUSE":
        if (from === "running") {
          to = "paused";
        } else if (from === "paused") {
          to = "running";
        }
        break;
      case "RESTART":
        if (from === "gameover") {
          // currentScore 리셋, highScore 보존 (REQ-SCORE-010 / AC-E3).
          this._scoreCalculator.reset();
          const init = this._initializeEntities();
          this._snake = init.snake;
          this._food = init.food;
          this._obstacleLayout = init.layout;
          this._bufferedDirection = null;
          this._previousSegments = this._snake.segments;
          to = "idle";
        }
        break;
      case "COLLIDE":
        if (from === "running") {
          to = "gameover";
        }
        break;
    }

    if (to !== from) {
      this._state = to;
      for (const listener of this._listeners) {
        listener(from, to);
      }
    }
  }

  /**
   * 1 tick 진행. running 상태에서만 도메인 진행, 그 외는 no-op (REQ-LOOP-004 / REQ-STATE-005).
   */
  public update(): void {
    if (this._state !== "running") return;

    // 1. 방향 버퍼 소비 (REQ-INPUT-003) + 방어 가드 (REQ-INPUT-004).
    if (this._bufferedDirection !== null) {
      if (!isOpposite(this._snake.direction, this._bufferedDirection)) {
        this._snake.setDirection(this._bufferedDirection);
      }
      this._bufferedDirection = null;
    }

    // 2. 먹이 prediction — 다음 머리 위치가 먹이 위치와 일치하면 grow() 를 먼저 호출해
    //    이번 move() 가 꼬리를 보존하도록 한다. AC-3 (먹이 섭취 시 즉시 길이 +1) 보장.
    const currentHead = this._snake.head;
    const predictedHead = this._predictNextHead(currentHead);
    const willEatFood =
      this._food !== null &&
      this._food.cell.col === predictedHead.col &&
      this._food.cell.row === predictedHead.row;
    if (willEatFood) {
      this._snake.grow();
    }

    // 3. 뱀 이동 — 이동 직전에 previousSegments 를 스냅샷 (Renderer 의 sub-grid 보간용).
    this._previousSegments = this._snake.segments;
    this._snake.move();

    // 4. 충돌 검사 — 벽 / 자기 / 장애물.
    const head = this._snake.head;
    const headCell = { x: head.col, y: head.row };

    if (!this._board.cellsInBounds(headCell)) {
      this.transition("COLLIDE");
      return;
    }
    if (this._snake.collidesWithSelf()) {
      this.transition("COLLIDE");
      return;
    }
    for (const obstacle of this._obstacleLayout.list) {
      if (obstacle.contains({ col: head.col, row: head.row })) {
        this.transition("COLLIDE");
        return;
      }
    }

    // 5. 먹이 소비 처리 (prediction 결과 적용).
    if (willEatFood && this._food !== null) {
      this._food.consume();
      this._scoreCalculator.applyFoodScore();
      // 새 먹이 스폰 — null 이면 가득 찬 상태이므로 그대로 진행 (AC-E1).
      this._food = FoodSpawner.spawn(
        this._board,
        this._snake,
        this._obstacleLayout.list,
        { random: this._random },
      );
    }
  }

  /**
   * 현재 방향 + 머리 위치로부터 다음 tick 의 머리 셀을 예측한다.
   * Snake.move() 의 내부 _nextHead 로직과 동일해야 한다.
   */
  private _predictNextHead(head: SnakeSegment): { col: number; row: number } {
    switch (this._snake.direction) {
      case "up":
        return { col: head.col, row: head.row - 1 };
      case "down":
        return { col: head.col, row: head.row + 1 };
      case "left":
        return { col: head.col - 1, row: head.row };
      case "right":
        return { col: head.col + 1, row: head.row };
    }
  }

  /**
   * 초기 도메인 엔티티 생성. START / RESTART 양쪽에서 공용.
   * REQ-STATE-002: head = (floor(BOARD_WIDTH/2), floor(BOARD_HEIGHT/2)), length 3, direction=right.
   */
  private _initializeEntities(): {
    snake: Snake;
    food: Food | null;
    layout: ObstacleLayout;
  } {
    const cx = Math.floor(this._board.width / 2);
    const cy = Math.floor(this._board.height / 2);
    const initialSegments: SnakeSegment[] = [
      new SnakeSegment(cx, cy),
      new SnakeSegment(cx - 1, cy),
      new SnakeSegment(cx - 2, cy),
    ];
    const snake = new Snake(initialSegments, "right");

    // 장애물은 동일 시드로 재생성 — 결정적 배치 보장 (AC-E2).
    const layout = ObstacleLayout.generate(
      this._obstacleSeed,
      this._obstacleCount,
      this._board,
      initialSegments,
    );

    // 먹이 스폰.
    const obstacleArray: readonly Obstacle[] = layout.list;
    const food = FoodSpawner.spawn(this._board, snake, obstacleArray, {
      random: this._random,
    });

    return { snake, food, layout };
  }
}
