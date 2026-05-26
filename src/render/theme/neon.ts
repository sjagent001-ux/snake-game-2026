/**
 * SPEC-GAME-CORE-001 T-18 — neon 기본 테마 토큰.
 *
 * REQ-SCORE-009: Renderer 는 active 테마의 색 토큰을 읽어 사용한다.
 * 본 SPEC 범위에서는 단일 'neon' 테마만 등록되며 기본 active 이다.
 *
 * 색 선택 근거 (.moai/project/brand/visual-identity.md 와 일관성):
 *  - background  : 본 SPEC public/index.html body 배경과 동일 #0a0a12 (네온 다크).
 *  - snakeHead   : 청록 네온 #7cffd9 (가시성 ↑, 머리/몸 구분).
 *  - snakeBody   : 같은 계열 약간 어두운 톤 #5ad8b4.
 *  - food        : 핑크 네온 #ff6ec4 (보색 대비로 즉시 식별).
 *  - obstacle    : 중성 #3a3a4a (배경 위 약한 회색, 시선 분산 최소).
 *  - grid        : 매우 어두운 보라 #15152a (선택; 본 SPEC 에서는 미사용).
 */

export interface ThemeTokens {
  readonly name: string;
  readonly background: string;
  readonly snakeHead: string;
  readonly snakeBody: string;
  readonly food: string;
  readonly obstacle: string;
  readonly grid?: string;
}

export const NEON_THEME: ThemeTokens = {
  name: "neon",
  background: "#0a0a12",
  snakeHead: "#7cffd9",
  snakeBody: "#5ad8b4",
  food: "#ff6ec4",
  obstacle: "#3a3a4a",
  grid: "#15152a",
};
