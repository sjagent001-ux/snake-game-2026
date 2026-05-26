/**
 * SPEC-GAME-CORE-001 REQ-SCORE-001/002/003/010 — ScoreCalculator.
 *
 * 책임:
 *  - applyFoodScore(multiplier) 로 currentScore 를 누적 (기본 10 × multiplier, 반올림).
 *  - currentScore > highScore 이면 highScore 갱신 + persistence.saveHighScore 호출.
 *  - reset() 시 currentScore=0, highScore 유지 (AC-E3 / REQ-SCORE-010).
 *
 * 읽기 전용 노출 (AC-15): _currentScore / _highScore 는 private, getter 만 노출.
 */

import { FOOD_BASE_SCORE } from "../config/constants";

export interface ScorePersistence {
  saveHighScore(value: number): void;
}

export interface ScoreCalculatorOptions {
  /** 부트스트랩 시점에 localStorage 등에서 로드된 초기 highScore. */
  readonly initialHighScore?: number;
  /** highScore 갱신 시점에 호출될 persistence 어댑터. */
  readonly persistence?: ScorePersistence;
}

export class ScoreCalculator {
  private _currentScore: number;
  private _highScore: number;
  private readonly _persistence: ScorePersistence | null;

  constructor(opts: ScoreCalculatorOptions = {}) {
    this._currentScore = 0;
    this._highScore = opts.initialHighScore ?? 0;
    this._persistence = opts.persistence ?? null;
  }

  public get currentScore(): number {
    return this._currentScore;
  }

  public get highScore(): number {
    return this._highScore;
  }

  /**
   * @MX:ANCHOR: [AUTO] 점수 적립 진입점 — 본 SPEC + 후속 POWERUP SPEC 의 공용 진입점.
   * @MX:REASON: [AUTO] fan_in >= 3 (StateMachine.update / 후속 PowerUp 효과 / 테스트). multiplier 위치 변경 시 후속 SPEC 깨짐.
   *
   * 가산 점수를 계산하고 highScore 를 갱신한다.
   *
   * @param multiplier 점수 배율 (기본 1.0). POWERUP SPEC 의 doubleScore 효과 시 2.0 등으로 전달.
   * @returns 이번 호출에서 추가된 점수 (디버그 / 테스트 편의).
   */
  public applyFoodScore(multiplier: number = 1.0): number {
    const delta = Math.round(FOOD_BASE_SCORE * multiplier);
    this._currentScore += delta;
    if (this._currentScore > this._highScore) {
      this._highScore = this._currentScore;
      if (this._persistence !== null) {
        this._persistence.saveHighScore(this._highScore);
      }
    }
    return delta;
  }

  /**
   * 재시작 시 호출. currentScore=0, highScore 는 보존 (REQ-SCORE-010 / AC-E3).
   */
  public reset(): void {
    this._currentScore = 0;
  }
}
