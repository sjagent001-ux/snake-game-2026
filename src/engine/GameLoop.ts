/**
 * SPEC-GAME-CORE-001 REQ-LOOP-003/004/005/006 — GameLoop.
 *
 * 책임:
 *  - window.requestAnimationFrame 으로 매 frame 마다 (a) deltaMs 계산, (b) TickScheduler 위임,
 *    (c) tick 발행 시 lastTickAt 갱신, (d) onRender(alpha) 호출 — REQ-LOOP-003.
 *  - alpha = clamp((now - lastTickAt) / tickMs, 0, 1) — sub-grid 보간용.
 *  - stop() 시 cancelAnimationFrame 호출 및 핸들 null 리셋 (REQ-LOOP-006 / AC-E5).
 */

import { TickScheduler } from "./TickScheduler";

export interface GameLoopOptions {
  readonly tickScheduler: TickScheduler;
  readonly onRender: (alpha: number) => void;
  /** 시간 소스 — 기본값은 performance.now / Date.now. 테스트에서 결정적 주입 가능. */
  readonly now?: () => number;
  /** alpha 계산을 위한 tick 주기 (밀리초). 기본값은 TICK_MS 와 일치해야 한다. */
  readonly tickMs?: number;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export class GameLoop {
  private readonly _tickScheduler: TickScheduler;
  private readonly _onRender: (alpha: number) => void;
  private readonly _now: () => number;
  private readonly _tickMs: number;
  private _rafHandle: number | null;
  private _prevNow: number;
  private _lastTickAt: number;

  constructor(opts: GameLoopOptions) {
    this._tickScheduler = opts.tickScheduler;
    this._onRender = opts.onRender;
    this._now = opts.now ?? ((): number => performance.now());
    this._tickMs = opts.tickMs ?? 150;
    this._rafHandle = null;
    this._prevNow = 0;
    this._lastTickAt = 0;
  }

  /**
   * @MX:WARN: [AUTO] rAF 핸들이 stop() 호출 없이 누수되면 페이지가 사라진 후에도 콜백이 쌓인다.
   * @MX:REASON: [AUTO] start() 이후 반드시 stop() 으로 cancelAnimationFrame 을 호출해 핸들을 정리해야 한다.
   *
   * rAF 루프 시작. 이미 실행 중이면 무시한다.
   */
  public start(): void {
    if (this._rafHandle !== null) return;
    this._prevNow = this._now();
    this._lastTickAt = this._prevNow;
    this._scheduleNextFrame();
  }

  /**
   * rAF 루프 종료. 저장된 핸들에 cancelAnimationFrame 을 호출하고 null 로 리셋.
   * REQ-LOOP-006 / AC-E5.
   */
  public stop(): void {
    if (this._rafHandle === null) return;
    cancelAnimationFrame(this._rafHandle);
    this._rafHandle = null;
  }

  private _scheduleNextFrame(): void {
    this._rafHandle = requestAnimationFrame(() => {
      // stop() 가 frame 사이에 호출됐다면 _rafHandle 이 null 이므로 더 진행하지 않는다.
      // (advance 시점 raf mock 도 한 번만 호출되므로 정상 경로.)
      this._frame();
    });
  }

  private _frame(): void {
    const now = this._now();
    const deltaMs = now - this._prevNow;
    this._prevNow = now;

    // TickScheduler 에 deltaMs 위임 — emitted > 0 이면 lastTickAt 갱신.
    const emitted = this._tickScheduler.tick(deltaMs);
    if (emitted > 0) {
      this._lastTickAt = now;
    }

    // alpha 계산 — clamp 적용 (REQ-SCORE-007 의 보간 규칙과 일치).
    const alpha = clamp((now - this._lastTickAt) / this._tickMs, 0, 1);
    this._onRender(alpha);

    // 다음 frame 예약 — stop() 이 호출됐다면 _rafHandle 이 null 이지만,
    // 그 시점에는 이미 cancelAnimationFrame 이 호출되었으므로 자연스럽게 멈춘다.
    // 단, frame 콜백 내에서 새 rAF 예약을 하지 않도록 _rafHandle 가 null 이면 스킵.
    if (this._rafHandle !== null) {
      // _rafHandle 은 이전 frame 의 핸들이므로 새 frame 예약으로 덮어쓴다.
      this._scheduleNextFrame();
    }
  }
}
