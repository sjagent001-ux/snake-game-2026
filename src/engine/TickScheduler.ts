/**
 * SPEC-GAME-CORE-001 REQ-LOOP-001/002/005 — TickScheduler.
 *
 * 책임: rAF 로부터 받은 per-frame deltaMs 를 내부 accumulator 에 누적하고,
 *       accumulatedMs >= tickMs 가 되면 onTick 콜백을 1회 호출하면서 tickMs 만큼
 *       accumulator 를 차감한다. while-loop 패턴으로 단일 프레임 내 누적이 큰 경우
 *       (예: 300ms) 다회 발행이 가능하다.
 *
 * @MX:NOTE: [AUTO] REQ-LOOP-005 FPS 독립성의 핵심 — accumulator carryover 패턴.
 *           60 FPS (16.67ms × 60) 와 7 FPS (143ms × 7) 가 1000ms 동안 동일한
 *           tick 횟수 (1000 / 150 = 6) 를 발행해야 한다 (AC-10a).
 */

export interface TickSchedulerOptions {
  readonly tickMs: number;
  readonly onTick: () => void;
}

export class TickScheduler {
  private readonly _tickMs: number;
  private readonly _onTick: () => void;
  private _accumulatedMs: number;

  constructor(opts: TickSchedulerOptions) {
    this._tickMs = opts.tickMs;
    this._onTick = opts.onTick;
    this._accumulatedMs = 0;
  }

  /**
   * deltaMs 를 누적한 뒤 임계치 도달 시 onTick 을 다회 호출할 수 있다.
   *
   * @returns 이번 호출에서 실제 발행된 tick 횟수 (GameLoop 가 lastTickAt 갱신에 사용).
   */
  public tick(deltaMs: number): number {
    this._accumulatedMs += deltaMs;
    let emitted = 0;
    while (this._accumulatedMs >= this._tickMs) {
      this._onTick();
      this._accumulatedMs -= this._tickMs;
      emitted += 1;
    }
    return emitted;
  }

  /**
   * 누적 카운터를 0 으로 초기화한다. RESTART 또는 일시정지 해제 시 호출.
   */
  public reset(): void {
    this._accumulatedMs = 0;
  }
}
