/**
 * SPEC-GAME-CORE-001 REQ-INPUT-001~007 — KeyboardHandler 단위 테스트.
 *
 * AC-12: 10개 매핑 키 모두 → 액션, KeyP 등 무매핑 키 → 무시.
 * AC-13: 매핑 키마다 event.preventDefault 1회 호출.
 * REQ-INPUT-005: Space (idle → START / running·paused → TOGGLE_PAUSE / gameover → 무시).
 * REQ-INPUT-006: gameover 에서 Space 무시; R 은 gameover 에서만 RESTART.
 * AC-2 변형: 반대 방향 입력은 StateMachine.setBufferedDirection 에 디스패치되지만 StateMachine 측에서 폐기.
 * detach() → removeEventListener.
 */

import { describe, it, expect, vi } from "vitest";
import { KeyboardHandler } from "../../src/input/KeyboardHandler";
import { Direction } from "../../src/domain/snake/Snake";
import {
  GameState,
  StateAction,
} from "../../src/engine/StateMachine";

interface StateMachineMock {
  currentState: GameState;
  transitions: StateAction[];
  bufferedDirections: Direction[];
  transition: (action: StateAction) => void;
  setBufferedDirection: (dir: Direction) => void;
}

function makeStateMachineMock(initial: GameState): StateMachineMock {
  const sm: StateMachineMock = {
    currentState: initial,
    transitions: [],
    bufferedDirections: [],
    transition: (action) => {
      sm.transitions.push(action);
    },
    setBufferedDirection: (dir) => {
      sm.bufferedDirections.push(dir);
    },
  };
  return sm;
}

function dispatchKey(target: Window, code: string): KeyboardEvent {
  const ev = new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true });
  const preventDefaultSpy = vi.spyOn(ev, "preventDefault");
  target.dispatchEvent(ev);
  // attach spy info for later assertion
  (ev as KeyboardEvent & { _preventDefaultSpy?: typeof preventDefaultSpy })._preventDefaultSpy = preventDefaultSpy;
  return ev;
}

describe("KeyboardHandler", () => {
  it("AC-12: maps 4 arrow keys to direction buffer", () => {
    const sm = makeStateMachineMock("running");
    const handler = new KeyboardHandler({ stateMachine: sm });
    handler.attach();

    dispatchKey(window, "ArrowUp");
    dispatchKey(window, "ArrowDown");
    dispatchKey(window, "ArrowLeft");
    dispatchKey(window, "ArrowRight");

    expect(sm.bufferedDirections).toEqual(["up", "down", "left", "right"]);
    handler.detach();
  });

  it("AC-12: maps 4 WASD keys to direction buffer", () => {
    const sm = makeStateMachineMock("running");
    const handler = new KeyboardHandler({ stateMachine: sm });
    handler.attach();

    dispatchKey(window, "KeyW");
    dispatchKey(window, "KeyS");
    dispatchKey(window, "KeyA");
    dispatchKey(window, "KeyD");

    expect(sm.bufferedDirections).toEqual(["up", "down", "left", "right"]);
    handler.detach();
  });

  it("REQ-INPUT-005 / AC-1: Space in idle → START transition", () => {
    const sm = makeStateMachineMock("idle");
    const handler = new KeyboardHandler({ stateMachine: sm });
    handler.attach();
    dispatchKey(window, "Space");
    expect(sm.transitions).toEqual(["START"]);
    handler.detach();
  });

  it("REQ-INPUT-005: Space in running → TOGGLE_PAUSE; in paused → TOGGLE_PAUSE", () => {
    const sm = makeStateMachineMock("running");
    const handler = new KeyboardHandler({ stateMachine: sm });
    handler.attach();
    dispatchKey(window, "Space");
    expect(sm.transitions).toEqual(["TOGGLE_PAUSE"]);

    sm.currentState = "paused";
    dispatchKey(window, "Space");
    expect(sm.transitions).toEqual(["TOGGLE_PAUSE", "TOGGLE_PAUSE"]);
    handler.detach();
  });

  it("REQ-INPUT-006: Space in gameover is ignored; R in gameover → RESTART", () => {
    const sm = makeStateMachineMock("gameover");
    const handler = new KeyboardHandler({ stateMachine: sm });
    handler.attach();

    dispatchKey(window, "Space");
    expect(sm.transitions).toEqual([]); // gameover 에서 Space 무시

    dispatchKey(window, "KeyR");
    expect(sm.transitions).toEqual(["RESTART"]);
    handler.detach();
  });

  it("REQ-INPUT-006: R in running / paused / idle is ignored", () => {
    const sm = makeStateMachineMock("running");
    const handler = new KeyboardHandler({ stateMachine: sm });
    handler.attach();
    dispatchKey(window, "KeyR");
    expect(sm.transitions).toEqual([]);
    sm.currentState = "paused";
    dispatchKey(window, "KeyR");
    expect(sm.transitions).toEqual([]);
    sm.currentState = "idle";
    dispatchKey(window, "KeyR");
    expect(sm.transitions).toEqual([]);
    handler.detach();
  });

  it("AC-12: KeyP and other unmapped keys are ignored — no transitions, no buffer push", () => {
    const sm = makeStateMachineMock("running");
    const handler = new KeyboardHandler({ stateMachine: sm });
    handler.attach();
    dispatchKey(window, "KeyP");
    dispatchKey(window, "KeyZ");
    dispatchKey(window, "Digit1");
    expect(sm.transitions).toEqual([]);
    expect(sm.bufferedDirections).toEqual([]);
    handler.detach();
  });

  it("AC-13 / REQ-INPUT-007: preventDefault called once per mapped key", () => {
    const sm = makeStateMachineMock("running");
    const handler = new KeyboardHandler({ stateMachine: sm });
    handler.attach();

    const mappedKeys = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "Space",
      "KeyR",
    ];
    for (const code of mappedKeys) {
      const ev = dispatchKey(window, code);
      const spy = (ev as KeyboardEvent & {
        _preventDefaultSpy?: ReturnType<typeof vi.spyOn>;
      })._preventDefaultSpy!;
      expect(spy).toHaveBeenCalledTimes(1);
    }

    // 무매핑 키는 preventDefault 호출되지 않음
    const unmapped = dispatchKey(window, "KeyP");
    const spyUnmapped = (unmapped as KeyboardEvent & {
      _preventDefaultSpy?: ReturnType<typeof vi.spyOn>;
    })._preventDefaultSpy!;
    expect(spyUnmapped).not.toHaveBeenCalled();
    handler.detach();
  });

  it("detach() removes the keydown listener — no further dispatches reach stateMachine", () => {
    const sm = makeStateMachineMock("running");
    const handler = new KeyboardHandler({ stateMachine: sm });
    handler.attach();
    dispatchKey(window, "ArrowUp");
    expect(sm.bufferedDirections).toEqual(["up"]);

    handler.detach();
    dispatchKey(window, "ArrowDown");
    expect(sm.bufferedDirections).toEqual(["up"]); // 추가 호출 없음
  });
});
