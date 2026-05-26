/**
 * SPEC-GAME-CORE-001 REQ-INPUT-001~007 — KeyboardHandler.
 *
 * 책임:
 *  - window keydown 이벤트 구독 (REQ-INPUT-001).
 *  - 매핑 키 코드 → 방향 / 액션 변환.
 *  - 방향 키는 stateMachine.setBufferedDirection(dir) 에 디스패치 (input-time 반대 차단은 StateMachine 측 책임).
 *  - Space / KeyR 은 stateMachine.currentState 에 따라 적절한 StateAction 으로 변환.
 *  - 매핑된 키만 event.preventDefault() 호출 (REQ-INPUT-007).
 *
 * @MX:NOTE: [AUTO] REQ-INPUT-002 input-time 폐기 정책은 StateMachine.setBufferedDirection 에 위임.
 *           KeyboardHandler 자체는 키 → 방향 변환만 책임지며 게임 상태나 현재 방향을 알지 못한다.
 */

import { Direction } from "../domain/snake/Snake";
import { GameState, StateAction } from "../engine/StateMachine";

export interface KeyboardHandlerStateMachine {
  readonly currentState: GameState;
  transition(action: StateAction): void;
  setBufferedDirection(direction: Direction): void;
}

export interface KeyboardHandlerOptions {
  readonly window?: Window;
  readonly stateMachine: KeyboardHandlerStateMachine;
}

const DIRECTION_KEYS: Readonly<Record<string, Direction>> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

const MAPPED_KEYS: ReadonlySet<string> = new Set<string>([
  ...Object.keys(DIRECTION_KEYS),
  "Space",
  "KeyR",
]);

export class KeyboardHandler {
  private readonly _window: Window;
  private readonly _stateMachine: KeyboardHandlerStateMachine;
  private readonly _listener: (event: KeyboardEvent) => void;
  private _attached: boolean;

  constructor(opts: KeyboardHandlerOptions) {
    this._window = opts.window ?? window;
    this._stateMachine = opts.stateMachine;
    this._attached = false;
    // 인스턴스 메서드를 리스너로 직접 바인딩 — detach 시 동일 참조로 removeEventListener.
    this._listener = (event: KeyboardEvent) => {
      this._handleKeyDown(event);
    };
  }

  /**
   * @MX:WARN: [AUTO] window.addEventListener('keydown', ...) — detach 미호출 시 메모리 누수.
   * @MX:REASON: [AUTO] keydown listener 는 컴포넌트 라이프사이클 종료 시 반드시 removeEventListener 로 정리되어야 한다.
   */
  public attach(): void {
    if (this._attached) return;
    this._window.addEventListener("keydown", this._listener);
    this._attached = true;
  }

  public detach(): void {
    if (!this._attached) return;
    this._window.removeEventListener("keydown", this._listener);
    this._attached = false;
  }

  private _handleKeyDown(event: KeyboardEvent): void {
    const code = event.code;
    if (!MAPPED_KEYS.has(code)) {
      return; // 무매핑 키 — preventDefault 도 하지 않는다 (AC-13).
    }

    // 매핑 키는 무조건 preventDefault (REQ-INPUT-007 / AC-13).
    event.preventDefault();

    // 방향 키.
    const dir = DIRECTION_KEYS[code];
    if (dir !== undefined) {
      this._stateMachine.setBufferedDirection(dir);
      return;
    }

    // Space — 상태별 분기 (REQ-INPUT-005 / REQ-INPUT-006).
    if (code === "Space") {
      const state = this._stateMachine.currentState;
      if (state === "idle") {
        this._stateMachine.transition("START");
      } else if (state === "running" || state === "paused") {
        this._stateMachine.transition("TOGGLE_PAUSE");
      }
      // gameover 에서는 무시.
      return;
    }

    // KeyR — gameover 에서만 RESTART (REQ-INPUT-006).
    if (code === "KeyR") {
      if (this._stateMachine.currentState === "gameover") {
        this._stateMachine.transition("RESTART");
      }
      return;
    }
  }
}
