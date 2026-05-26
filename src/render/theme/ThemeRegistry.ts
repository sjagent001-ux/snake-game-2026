/**
 * SPEC-GAME-CORE-001 T-18 / REQ-SCORE-009 — ThemeRegistry.
 *
 * 책임:
 *  - 색 토큰 테마(name → ThemeTokens) 의 등록 / 조회.
 *  - 기본 active 테마는 'neon' (생성자에서 자동 등록 + setActive).
 *  - setActive('unknown') 는 throw 하지 않고 silent fallback 으로 'neon' 을 유지한다.
 *
 * 본 SPEC 범위에서는 단일 'neon' 테마만 사용되며, 후속 SPEC 에서 'mono', 'pastel'
 * 등이 추가될 수 있도록 register 진입점을 노출한다.
 */

import { NEON_THEME, ThemeTokens } from "./neon";

const FALLBACK_NAME = "neon";

export class ThemeRegistry {
  private readonly _themes: Map<string, ThemeTokens>;
  private _activeName: string;

  constructor() {
    this._themes = new Map();
    this._themes.set(NEON_THEME.name, NEON_THEME);
    this._activeName = NEON_THEME.name;
  }

  /**
   * 테마 토큰을 등록한다. 동일 name 의 기존 테마가 있으면 덮어쓴다.
   */
  public register(theme: ThemeTokens): void {
    this._themes.set(theme.name, theme);
  }

  /**
   * 등록된 이름이면 active 로 전환하고, 미등록이면 silent fallback 으로 neon 을 유지한다.
   * REQ-SCORE-009 — 기본 활성 테마는 neon.
   */
  public setActive(name: string): void {
    if (this._themes.has(name)) {
      this._activeName = name;
      return;
    }
    // silent fallback — 미등록 이름은 무시하고 현재 active 유지 (최초 상태에선 neon).
    this._activeName = FALLBACK_NAME;
  }

  /**
   * 현재 active 테마를 반환한다. 어떤 이유로든 active 가 사라졌다면 NEON_THEME 폴백.
   */
  public getActive(): ThemeTokens {
    return this._themes.get(this._activeName) ?? NEON_THEME;
  }

  public has(name: string): boolean {
    return this._themes.has(name);
  }
}
