/**
 * SPEC-GAME-CORE-001 REQ-SCORE-001/002/003/010 — ScoreCalculator 단위 테스트.
 *
 * AC-3: applyFoodScore(1.0) → +10.
 * AC-8: highScore 갱신 시 persistence.saveHighScore 호출.
 * AC-15: currentScore / highScore 외부 쓰기 거부 (getter-only 런타임 방어).
 * AC-E3: reset() 후 currentScore=0, highScore 유지.
 */

import { describe, it, expect, vi } from "vitest";
import { ScoreCalculator } from "../../src/score/ScoreCalculator";

describe("ScoreCalculator", () => {
  it("applyFoodScore() with default multiplier adds 10 to currentScore", () => {
    const calc = new ScoreCalculator();
    expect(calc.currentScore).toBe(0);
    calc.applyFoodScore();
    expect(calc.currentScore).toBe(10);
    calc.applyFoodScore();
    expect(calc.currentScore).toBe(20);
  });

  it("applyFoodScore(2.0) adds 20 (10 × multiplier rounded)", () => {
    const calc = new ScoreCalculator();
    const added = calc.applyFoodScore(2.0);
    expect(added).toBe(20);
    expect(calc.currentScore).toBe(20);
  });

  it("AC-8: triggers persistence.saveHighScore when currentScore exceeds highScore", () => {
    const saveSpy = vi.fn();
    const calc = new ScoreCalculator({
      initialHighScore: 5,
      persistence: { saveHighScore: saveSpy },
    });
    expect(calc.highScore).toBe(5);

    // currentScore=10 > highScore=5 → 갱신
    calc.applyFoodScore();
    expect(calc.highScore).toBe(10);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledWith(10);
  });

  it("does NOT trigger persistence when currentScore <= highScore", () => {
    const saveSpy = vi.fn();
    const calc = new ScoreCalculator({
      initialHighScore: 100,
      persistence: { saveHighScore: saveSpy },
    });
    calc.applyFoodScore(); // 10 < 100
    expect(calc.highScore).toBe(100);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("AC-E3: reset() zeros currentScore but preserves highScore", () => {
    const calc = new ScoreCalculator({ initialHighScore: 80 });
    calc.applyFoodScore();
    calc.applyFoodScore();
    expect(calc.currentScore).toBe(20);

    // currentScore 가 highScore 보다 작으므로 highScore 는 80 유지
    expect(calc.highScore).toBe(80);

    calc.reset();
    expect(calc.currentScore).toBe(0);
    expect(calc.highScore).toBe(80);
  });

  it("AC-15: currentScore and highScore are read-only at runtime (getter-only)", () => {
    const calc = new ScoreCalculator({ initialHighScore: 50 });
    calc.applyFoodScore(); // currentScore=10, highScore=50 (10 < 50 이므로 불변)
    expect(calc.currentScore).toBe(10);
    expect(calc.highScore).toBe(50);

    // 런타임 강제 캐스팅으로 쓰기 시도 — getter-only 이므로 무시되거나 throw.
    // strict mode 에서는 throw, non-strict 에서는 silent ignore.
    try {
      (calc as unknown as { currentScore: number }).currentScore = 999;
    } catch {
      // setter 가 없으므로 strict mode 에서는 TypeError; 정상 동작.
    }
    expect(calc.currentScore).toBe(10);

    try {
      (calc as unknown as { highScore: number }).highScore = 999;
    } catch {
      // setter 가 없으므로 strict mode 에서는 TypeError; 정상 동작.
    }
    expect(calc.highScore).toBe(50);
  });
});
