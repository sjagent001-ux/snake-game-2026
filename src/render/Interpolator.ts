/**
 * SPEC-GAME-CORE-001 REQ-SCORE-007 — Sub-grid 선형 보간 헬퍼.
 *
 * GameLoop 에서 매 frame 마다 호출되어 alpha 값을 산출하고, Renderer 가
 * 이 alpha 로 previous-tick → current-tick 셀 사이를 lerp 한다.
 *
 * plan.md R-2 완화: 저 FPS 환경에서 alpha 가 [0, 1] 범위를 이탈하면 뱀이
 * 격자 밖으로 튀어 보이는 시각 아티팩트가 발생한다. clamp 는 이 글리치를
 * 차단한다.
 *
 * @MX:NOTE: [AUTO] REQ-SCORE-007 anti-glitch clamp — alpha 는 반드시 [0, 1] 로 제한된다.
 *           divide-by-zero 보호: tickInterval = 0 입력 시 0 반환.
 */

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * sub-grid 보간 비율을 계산한다.
 *
 * @param now            현재 시각 (ms, performance.now 기준)
 * @param lastTickAt     마지막 tick 발행 시각 (ms)
 * @param tickInterval   tick 주기 (ms, 일반적으로 TICK_MS = 150)
 * @returns              [0, 1] 범위의 보간 비율
 */
export function computeAlpha(
  now: number,
  lastTickAt: number,
  tickInterval: number,
): number {
  if (tickInterval <= 0) return 0; // divide-by-zero 방어.
  const raw = (now - lastTickAt) / tickInterval;
  return clamp(raw, 0, 1);
}

/**
 * 선형 보간 — `t` 는 호출자가 clamp 한 값을 전달해야 한다 (lerp 자체는 clamp 하지 않는다).
 * Renderer 에서 픽셀 좌표를 보간할 때 사용된다.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
