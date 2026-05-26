/**
 * SPEC-GAME-CORE-001 REQ-SCORE-004/005/006 — LocalStorageAdapter 단위 테스트.
 *
 * AC-8: save+load roundtrip.
 * AC-9b: JSON 파싱 실패 → 0 반환, no throw.
 * AC-9c: setItem QuotaExceededError → no throw, 인메모리 폴백 유지.
 * AC-9: localStorage undefined / getItem throw / 게임 부트 시 예외 미전파.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LocalStorageAdapter } from "../../src/score/LocalStorageAdapter";

/**
 * In-memory Storage stub. window.localStorage 와 동일한 인터페이스를 따른다.
 */
function makeInMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => {
      map.delete(k);
    },
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
}

describe("LocalStorageAdapter", () => {
  let originalLocalStorage: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalLocalStorage = Object.getOwnPropertyDescriptor(window, "localStorage");
  });

  afterEach(() => {
    if (originalLocalStorage) {
      Object.defineProperty(window, "localStorage", originalLocalStorage);
    }
  });

  it("AC-8: saveHighScore / loadHighScore roundtrip via injected storage", () => {
    const storage = makeInMemoryStorage();
    const adapter = new LocalStorageAdapter({ storage });
    adapter.saveHighScore(120);
    expect(adapter.loadHighScore()).toBe(120);

    // 새 인스턴스로 재생성 (페이지 새로고침 모사) — storage 는 그대로
    const reloaded = new LocalStorageAdapter({ storage });
    expect(reloaded.loadHighScore()).toBe(120);
  });

  it("AC-9b: returns 0 when stored value is invalid JSON, no throw", () => {
    const storage = makeInMemoryStorage();
    storage.setItem("snake2026_highscore", "NOT_JSON");
    const adapter = new LocalStorageAdapter({ storage });
    expect(adapter.loadHighScore()).toBe(0);
  });

  it("returns 0 when key is missing", () => {
    const storage = makeInMemoryStorage();
    const adapter = new LocalStorageAdapter({ storage });
    expect(adapter.loadHighScore()).toBe(0);
  });

  it("AC-9c: setItem QuotaExceededError → no throw, in-memory fallback retains value", () => {
    const throwingStorage: Storage = {
      ...makeInMemoryStorage(),
      setItem: vi.fn(() => {
        throw new Error("QuotaExceededError");
      }),
    };
    const adapter = new LocalStorageAdapter({ storage: throwingStorage });
    expect(() => adapter.saveHighScore(150)).not.toThrow();

    // 동일 세션 내 후속 load 는 인메모리 폴백에서 반환
    expect(adapter.loadHighScore()).toBe(150);
  });

  it("AC-9: getItem SecurityError → returns 0, no throw", () => {
    const throwingStorage: Storage = {
      ...makeInMemoryStorage(),
      getItem: vi.fn(() => {
        throw new Error("SecurityError");
      }),
    };
    const adapter = new LocalStorageAdapter({ storage: throwingStorage });
    expect(() => adapter.loadHighScore()).not.toThrow();
    expect(adapter.loadHighScore()).toBe(0);
  });

  it("AC-9: storage=null (no localStorage in environment) → in-memory fallback works", () => {
    const adapter = new LocalStorageAdapter({ storage: null });
    expect(adapter.loadHighScore()).toBe(0);

    // 인메모리 폴백에 저장 + 재조회
    expect(() => adapter.saveHighScore(75)).not.toThrow();
    expect(adapter.loadHighScore()).toBe(75);

    // 새 인스턴스 (페이지 새로고침 모사) → 영속성 없음, 0 반환 (정상)
    const reloaded = new LocalStorageAdapter({ storage: null });
    expect(reloaded.loadHighScore()).toBe(0);
  });

  it("uses window.localStorage by default and survives access throwing", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("SecurityError");
      },
    });
    // window.localStorage 접근 자체가 throw 해도 어댑터 생성과 후속 호출이 안전해야 한다.
    expect(() => new LocalStorageAdapter()).not.toThrow();
    const adapter = new LocalStorageAdapter();
    expect(adapter.loadHighScore()).toBe(0);
    expect(() => adapter.saveHighScore(42)).not.toThrow();
    expect(adapter.loadHighScore()).toBe(42); // 인메모리 폴백
  });
});
