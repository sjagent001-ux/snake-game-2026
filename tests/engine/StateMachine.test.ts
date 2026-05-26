/**
 * SPEC-GAME-CORE-001 REQ-STATE-001~009 + REQ-INPUT-002/003/004 — StateMachine 단위 테스트.
 *
 * 상태 전이, idle 시작 시 초기 뱀 배치, 일시정지 시 update 무시, 충돌 시 gameover,
 * 재시작 시 점수 리셋 + highScore 보존, onTransition 콜백, 방향 버퍼링 전체 시나리오.
 */

import { describe, it, expect, vi } from "vitest";
import { StateMachine } from "../../src/engine/StateMachine";
import { Board } from "../../src/domain/board/Board";
import { ScoreCalculator } from "../../src/score/ScoreCalculator";
import { BOARD_WIDTH, BOARD_HEIGHT } from "../../src/config/constants";

function buildMachine(opts?: {
  highScore?: number;
  random?: () => number;
}): StateMachine {
  const board = new Board(BOARD_WIDTH, BOARD_HEIGHT);
  const score = new ScoreCalculator({
    initialHighScore: opts?.highScore ?? 0,
  });
  return new StateMachine({
    board,
    scoreCalculator: score,
    obstacleSeed: 42,
    obstacleCount: 5,
    random: opts?.random ?? (() => 0.5),
  });
}

describe("StateMachine", () => {
  it("REQ-STATE-001: initial state is idle", () => {
    const sm = buildMachine();
    expect(sm.currentState).toBe("idle");
  });

  it("AC-1 / REQ-STATE-002: idle → running on START; snake initialized at center, length 3, direction right", () => {
    const sm = buildMachine();
    sm.transition("START");
    expect(sm.currentState).toBe("running");
    const snake = sm.snake;
    expect(snake.length).toBe(3);
    expect(snake.direction).toBe("right");
    const head = snake.head;
    expect(head.col).toBe(Math.floor(BOARD_WIDTH / 2));
    expect(head.row).toBe(Math.floor(BOARD_HEIGHT / 2));
    // 꼬리는 머리 왼쪽으로 연장
    const segs = snake.segments;
    expect(segs[1]!.col).toBe(head.col - 1);
    expect(segs[2]!.col).toBe(head.col - 2);
  });

  it("AC-7: TOGGLE_PAUSE running ↔ paused", () => {
    const sm = buildMachine();
    sm.transition("START");
    expect(sm.currentState).toBe("running");
    sm.transition("TOGGLE_PAUSE");
    expect(sm.currentState).toBe("paused");
    sm.transition("TOGGLE_PAUSE");
    expect(sm.currentState).toBe("running");
  });

  it("REQ-STATE-005: paused → update() is no-op; snake position unchanged across 10 ticks", () => {
    const sm = buildMachine();
    sm.transition("START");
    sm.transition("TOGGLE_PAUSE");
    const headCol = sm.snake.head.col;
    const headRow = sm.snake.head.row;
    for (let i = 0; i < 10; i += 1) sm.update();
    expect(sm.snake.head.col).toBe(headCol);
    expect(sm.snake.head.row).toBe(headRow);
  });

  it("AC-5 / REQ-STATE-006: wall collision triggers gameover", () => {
    const sm = buildMachine();
    sm.transition("START");
    // 머리는 (10,10) direction=right. 9칸 이동하면 (19,10) → 그 다음 tick 에 (20,10) 벽 충돌.
    // 정확히 10 tick 발행. 마지막 tick 에서 (20,10) → 벽 충돌 → gameover.
    for (let i = 0; i < 20; i += 1) {
      sm.update();
      if (sm.currentState === "gameover") break;
    }
    expect(sm.currentState).toBe("gameover");
  });

  it("AC-4 / REQ-STATE-006: COLLIDE action transitions running → gameover", () => {
    const sm = buildMachine();
    sm.transition("START");
    expect(sm.currentState).toBe("running");
    sm.transition("COLLIDE");
    expect(sm.currentState).toBe("gameover");
  });

  it("AC-E3 / REQ-STATE-007: RESTART (gameover → idle); score resets, highScore preserved", () => {
    const sm = buildMachine({ highScore: 80 });
    sm.transition("START");
    // currentScore 인위적으로 누적
    sm.scoreCalculator.applyFoodScore();
    sm.scoreCalculator.applyFoodScore();
    expect(sm.scoreCalculator.currentScore).toBe(20);
    sm.transition("COLLIDE");
    expect(sm.currentState).toBe("gameover");
    sm.transition("RESTART");
    expect(sm.currentState).toBe("idle");
    expect(sm.scoreCalculator.currentScore).toBe(0);
    expect(sm.scoreCalculator.highScore).toBe(80);
  });

  it("AC-E4 / REQ-STATE-008: direction keys do not transition from idle", () => {
    const sm = buildMachine();
    sm.setBufferedDirection("right");
    expect(sm.currentState).toBe("idle");
    sm.update();
    expect(sm.currentState).toBe("idle");
  });

  it("AC-11 / REQ-STATE-009: onTransition callback fires with (from, to)", () => {
    const sm = buildMachine();
    const spy = vi.fn();
    const unsubscribe = sm.onTransition(spy);
    sm.transition("START");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("idle", "running");

    // unsubscribe 동작 검증
    unsubscribe();
    sm.transition("TOGGLE_PAUSE");
    expect(spy).toHaveBeenCalledTimes(1); // 추가 호출 없음
  });

  it("AC-2 (input-time): setBufferedDirection rejects opposite of current direction; buffer preserved", () => {
    const sm = buildMachine();
    sm.transition("START"); // direction=right
    // (1) up 입력 — 반대 아님 → 버퍼링됨
    sm.setBufferedDirection("up");
    expect(sm.peekBufferedDirection()).toBe("up");
    // (2) left 입력 — right 의 반대 → 입력 시점 폐기, 버퍼는 'up' 유지
    sm.setBufferedDirection("left");
    expect(sm.peekBufferedDirection()).toBe("up");
  });

  it("REQ-INPUT-003: buffered direction applied on next tick then cleared", () => {
    const sm = buildMachine();
    sm.transition("START"); // direction=right
    sm.setBufferedDirection("up");
    sm.update(); // 'up' 적용 + 버퍼 소비
    expect(sm.snake.direction).toBe("up");
    expect(sm.peekBufferedDirection()).toBeNull();
  });

  it("REQ-INPUT-004: defensive guard discards buffer if it has become opposite by tick-apply time", () => {
    const sm = buildMachine();
    sm.transition("START"); // direction=right
    sm.setBufferedDirection("up");
    sm.update(); // up 적용 — snake.direction='up'
    expect(sm.snake.direction).toBe("up");
    // 이제 down 을 버퍼에 강제 주입 (정상 경로로는 input-time 차단이지만, 방어 테스트)
    sm.forceBufferedDirectionForTest("down"); // 헬퍼: 방어 가드 검증 전용
    sm.update();
    // direction='up' 의 반대인 'down' 은 tick-apply 시점에 폐기되어 'up' 유지
    expect(sm.snake.direction).toBe("up");
  });

  it("AC-3: food consumption increments length, score, and respawns food", () => {
    // Snake head (10,10), direction=right, food at (11,10), state=running.
    // Custom seed/random: random=0 → 가장 먼저 발견되는 빈 셀에 먹이 배치.
    // 더 결정적으로: 명시적 food 위치를 주입할 수 있도록 spawnFood 헬퍼 사용.
    const sm = buildMachine({ random: () => 0 });
    sm.transition("START");
    // 강제로 food 를 (11,10) 에 두기
    sm.placeFoodForTest(11, 10);
    const initialLen = sm.snake.length;
    const initialScore = sm.scoreCalculator.currentScore;

    sm.update();

    expect(sm.snake.head.col).toBe(11);
    expect(sm.snake.head.row).toBe(10);
    expect(sm.snake.length).toBe(initialLen + 1);
    expect(sm.scoreCalculator.currentScore).toBe(initialScore + 10);
    // 새 food 가 스폰됨
    expect(sm.food).not.toBeNull();
    if (sm.food !== null) {
      expect(sm.food.cell.col === 11 && sm.food.cell.row === 10).toBe(false);
    }
  });
});
