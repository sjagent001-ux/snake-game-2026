/**
 * SPEC-GAME-CORE-001 REQ-SCORE-004/005/006 — LocalStorageAdapter.
 *
 * 책임:
 *  - localStorage 가 사용 가능하면 highScore 를 LOCAL_STORAGE_KEY 키로 JSON 영속화.
 *  - localStorage 접근 / 읽기 / 쓰기가 throw 하거나 손상된 JSON 이 들어 있으면
 *    예외를 게임 루프로 전파하지 않고 인메모리 폴백을 사용한다 (REQ-SCORE-006).
 *
 * @MX:NOTE: [AUTO] REQ-SCORE-006 — 모든 storage 접근은 try/catch 로 감싼다.
 *           Safari private mode 의 QuotaExceededError, 비활성화 환경의 SecurityError,
 *           손상된 JSON 모두 안전하게 처리한다.
 */

import { LOCAL_STORAGE_KEY } from "../config/constants";

export interface LocalStorageAdapterOptions {
  /** 기본 키 오버라이드 (테스트용). */
  readonly storageKey?: string;
  /**
   * 주입된 storage. 명시적으로 null 을 전달하면 항상 인메모리 모드.
   * undefined 이면 window.localStorage 를 사용 시도 (실패 시 인메모리 폴백).
   */
  readonly storage?: Storage | null;
}

export class LocalStorageAdapter {
  private readonly _storageKey: string;
  private readonly _storage: Storage | null;
  private _inMemoryFallback: number;

  constructor(opts: LocalStorageAdapterOptions = {}) {
    this._storageKey = opts.storageKey ?? LOCAL_STORAGE_KEY;
    this._inMemoryFallback = 0;

    if (opts.storage === null) {
      // 명시적으로 인메모리 모드
      this._storage = null;
    } else if (opts.storage !== undefined) {
      this._storage = opts.storage;
    } else {
      // @MX:WARN: [AUTO] window.localStorage 접근 자체가 throw 할 수 있다.
      // @MX:REASON: [AUTO] Safari private mode 또는 비활성화 환경에서 SecurityError 발생.
      let resolved: Storage | null = null;
      try {
        // typeof 체크 + 접근을 try/catch 로 감싸 예외 전파를 차단한다.
        if (typeof window !== "undefined") {
          resolved = window.localStorage;
        }
      } catch {
        resolved = null;
      }
      this._storage = resolved;
    }
  }

  /**
   * highScore 를 영속화 시도. 실패 시 인메모리 폴백에만 기록하고 throw 하지 않는다.
   */
  public saveHighScore(value: number): void {
    // 인메모리 폴백은 storage 성공 여부와 무관하게 항상 갱신 (영속화 실패 시에도 동일 세션 내 일관성 보장).
    this._inMemoryFallback = value;
    if (this._storage === null) return;

    // @MX:WARN: [AUTO] setItem 은 QuotaExceededError 를 던질 수 있다.
    // @MX:REASON: [AUTO] Safari private mode / 쿼터 초과 / 비활성화 환경 모두 silent fallback 필요.
    try {
      this._storage.setItem(this._storageKey, JSON.stringify(value));
    } catch {
      // 영속화 실패 — 인메모리 폴백은 위에서 이미 갱신됨.
    }
  }

  /**
   * 저장된 highScore 를 로드. storage 접근 / 파싱 실패 시 인메모리 폴백 또는 0 반환.
   */
  public loadHighScore(): number {
    if (this._storage === null) {
      return this._inMemoryFallback;
    }
    // @MX:WARN: [AUTO] getItem 은 SecurityError 를 던질 수 있다.
    // @MX:REASON: [AUTO] localStorage 비활성화 환경에서 접근 차단; 인메모리 폴백 반환.
    let raw: string | null = null;
    try {
      raw = this._storage.getItem(this._storageKey);
    } catch {
      return this._inMemoryFallback;
    }
    if (raw === null) {
      return this._inMemoryFallback;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "number" && Number.isFinite(parsed)) {
        return parsed;
      }
      return 0;
    } catch {
      // JSON 파싱 실패 → 0 (REQ-SCORE-005 / AC-9b).
      return 0;
    }
  }
}
