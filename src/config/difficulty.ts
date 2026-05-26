/**
 * 난이도 자리표시자. SPEC-GAME-CORE-001 §4-2: 본 SPEC에서는 단일 기본 난이도만 노출하며,
 * 점수 임계값 기반 자동 레벨업 / 동적 tick 단축은 SPEC-LEVEL-001 에서 도입된다.
 *
 * @MX:NOTE — placeholder; SPEC-LEVEL-001 확장 지점
 */
import { TICK_MS } from "./constants";

export interface DifficultyProfile {
  /** 도메인 tick 주기 (ms) */
  readonly tickMs: number;
  /** 점수 가산 배율 (기본 1.0) */
  readonly scoreMultiplier: number;
}

export const DEFAULT_DIFFICULTY: DifficultyProfile = {
  tickMs: TICK_MS,
  scoreMultiplier: 1.0,
};
