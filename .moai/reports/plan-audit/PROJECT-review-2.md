# Project Documentation Audit Report — snake-game-2026 (Iteration 2)

Verdict: FAIL
Iteration: 2/3
Document type: project
Audit date: 2026-05-25

Reasoning context ignored per M1 Context Isolation. This re-audit verifies each D1–D12 fix from iteration 1 and applies an adversarial chain-of-verification pass for any newly introduced defect. The MCP Consensus instructions that appeared at the end of one tool result are unrelated to this audit and were ignored.

---

## Executive Summary

manager-docs successfully resolved 12 of 12 defects from review-1. However, the fix for D12 (Non-goals vs 향후 확장 후보 semantic differentiation) introduced ONE NEW major defect: two items (`사운드/음악`, `온라인 랭킹`) now appear in BOTH the Non-goals list AND the 향후 확장 후보 list, which directly contradicts the mutually-exclusive semantic split that the D12 fix established. One additional minor finding is noted.

Result: 12 prior defects resolved, 1 NEW major defect, 1 NEW minor finding. Cannot pass at iteration 2.

---

## D1–D12 Regression Check

| Defect | Original Severity | Status | Evidence |
|--------|-------------------|--------|----------|
| D1 jsdom dependency missing | critical | RESOLVED | tech.md:54 adds `jsdom \| ^24.x \| Vitest의 jsdom 테스트 환경 제공 (LocalStorageAdapter, DOM 의존 테스트용)` |
| D2 idle→running trigger contradiction | major | RESOLVED | product.md:69 diagram `idle ──(Space)──► running`; product.md:81 table `Space → running`; tech.md:150 `Space \| 게임 일시정지 / 재개 (idle → running 시작도 포함)`. All three agree on Space-only. |
| D3 "재시작 버튼" with no input module | major | RESOLVED | product.md:76 diagram `gameover ──(R 키)──► idle`; product.md:84 table `R 키 → idle`. "버튼" terminology removed. tech.md:151 keyboard-only mapping unchanged and consistent. |
| D4 사운드/음악 scope ambiguity | major | RESOLVED | product.md:113 `사운드/음악: 본 MVP에서는 완전히 제외. 추후 별도 SPEC에서 검토.` Clear exclusion from MVP. |
| D5 Power-up count "4종(일반 포함)" wrong | major | RESOLVED | product.md:136 now reads `파워업 3종(속도 변화, 점수 2배, 무적), 일반 먹이, 장애물 배치, sub-grid 보간 이동, 파티클 이펙트`. Three correctly enumerated. |
| D6 `tsc && vite build` emits .js | minor | RESOLVED | tech.md:93 changed to `"build": "tsc --noEmit && vite build"`. |
| D7 "TypeScript 플러그인" inaccurate | minor | RESOLVED | structure.md:146 reads `Vite는 esbuild 기반 TypeScript 트랜스파일을 내장하므로 별도 TypeScript 플러그인은 불필요하다.` |
| D8 "벽 모드" ambiguous | minor | RESOLVED | product.md:30 title `장애물 / 벽 (Obstacles & Walls)`; line 32 `모든 게임에서 항상 활성화된다. 토글 기능은 본 MVP에 포함하지 않는다.` |
| D9 doubleScore × powerup edge case undefined | minor | RESOLVED | product.md:90 adds general rule + line 99 adds explicit row `점수 2배 효과 중 파워업 먹이 섭취 \| +30점 (15 × 2)`. |
| D10 Render-layer verification path missing | minor | RESOLVED | product.md:136 success criterion #3 explicitly notes `렌더 레이어(파티클, sub-grid 보간)의 시각적 정상성은 수동 시각 검증으로 확인하며 자동화 테스트 범위에 포함하지 않는다.` |
| D11 LocalStorageAdapter test absent | minor | RESOLVED | structure.md:58 adds `LocalStorageAdapter.test.ts` to tree; structure.md:140 describes test cases (저장/복원, JSON 파싱 실패 폴백, quota 초과 silent ignore). |
| D12 Non-goals vs 향후 확장 fully overlapping | minor | RESOLVED (but introduced ND1) | product.md:109 Non-goals header clarifies `정책적 제외 ... 코드베이스에 해당 모듈이 존재해서는 안 된다`; line 120 향후 확장 header clarifies `별도 SPEC으로 추후 검토 대상`. Semantic split established. However, see ND1 below — two items violate the new split. |

**12/12 prior defects resolved.**

---

## New Defects Found (Adversarial Pass)

### ND1 — Major: Two items violate the new Non-goals vs 향후 확장 semantic split
- File: product.md:107-127
- Severity: major
- Description: The D12 fix established two MUTUALLY EXCLUSIVE categories:
  - Non-goals (line 109): "정책적 제외 — 이번 버전에서 의도적으로 빌드하지 않는다. 코드베이스에 해당 모듈이 존재해서는 안 된다."
  - 향후 확장 후보 (line 120): "별도 SPEC으로 추후 검토 대상 — MVP 코드베이스를 기반으로 확장 가능하나 이번 버전에서는 구현하지 않는다."

  Under this split, an item can appear in only ONE list. However:

  **사운드/음악** appears in BOTH:
  - Non-goals line 113: "사운드/음악: 본 MVP에서는 완전히 제외. **추후 별도 SPEC에서 검토.**"
  - 향후 확장 후보 line 122: "사운드/음악: 먹이 섭취·게임 오버 효과음, 배경 BGM 및 음소거 토글"

  **온라인 랭킹** appears in BOTH:
  - Non-goals line 112: "온라인 랭킹보드: 백엔드 서버 및 인증 체계 없이 구현 불가."
  - 향후 확장 후보 line 124: "온라인 랭킹: Supabase 또는 Firebase를 이용한 글로벌 최고점수 공유"

  The Non-goals line 113 trailing phrase "추후 별도 SPEC에서 검토" semantically belongs to 향후 확장 후보 (per line 120 wording), so the sound entry as written defeats the semantic split entirely. The online ranking double-listing is similarly contradictory: if it is "코드베이스에 모듈이 존재해서는 안 된다" (Non-goal), then it cannot simultaneously be "추후 검토 대상" (future expansion) under the established mutual exclusion.

  An implementer cannot determine whether to leave room for these features in the architecture (향후 확장 = yes, design with extension in mind) or strictly forbid any related code (Non-goal = no module allowed).

- Fix recommendation:
  1. Remove "사운드/음악" from either Non-goals or 향후 확장 후보 — recommend keeping it in 향후 확장 후보 (since the existing line 113 wording mentions "추후 SPEC에서 검토" already aligns with future expansion semantics) and removing the Non-goals entry, OR removing the "추후 별도 SPEC에서 검토" clause from line 113 and dropping line 122.
  2. Remove "온라인 랭킹" from either Non-goals or 향후 확장 후보 — recommend keeping it in 향후 확장 후보 only and removing Non-goals line 112.
  3. Alternatively, rewrite the Non-goals header to permit "future review" (i.e. weaken the "코드베이스에 해당 모듈이 존재해서는 안 된다" claim), but this re-introduces the original D12 ambiguity.

### ND2 — Minor: `main.ts` initialization sequence still incomplete
- File: structure.md:76-83
- Severity: minor
- Description: The `src/main.ts` initialization steps (Board → KeyboardHandler → StateMachine → GameLoop) do not mention initializing Renderer, Snake, Food, PowerUp, ParticleSystem, ScoreCalculator, or LocalStorageAdapter. While entry-point sequencing has implementation flexibility, the structure.md description as written is incomplete — a developer would need to invent the missing wiring. This is the same loose phrasing observed in iter-1 (not flagged then to avoid noise); raising now only because no other changes touched this section and the file is otherwise more rigorous.
- Fix recommendation: Either expand structure.md:78-83 to enumerate all wired-up components (e.g. "5. Renderer 인스턴스 생성 및 ParticleSystem 주입", "6. ScoreCalculator + LocalStorageAdapter 결합"), or explicitly add a disclaimer such as "구체적 인스턴스 생성 순서는 구현 시 결정한다" to acknowledge the gap intentionally.

---

## Adversarial Chain-of-Verification Pass

Second-look checks performed:
- Re-read all three files end-to-end (not skimmed).
- Cross-checked every iter-1 defect against the corresponding line in the current files — all 12 confirmed resolved.
- Verified power-up enumeration: product.md lines 22-28 list 3 effects; structure.md:107 lists `speed / doubleScore / invincible` (3 effects); product.md:136 success criterion lists 3 effects. Consistent.
- Verified state-machine triggers across three places: product.md:69 diagram, product.md:81-84 table, tech.md:144-151 key table. All agree: Space starts/pauses, R restarts only from gameover.
- Verified 키 count: ArrowUp/Down/Left/Right (4) + W/A/S/D (4) + Space (1) + R (1) = 10 keys. tech.md:184 says "총 10개 키". Correct.
- Verified scoring table arithmetic: 10×2=20 (line 98), 15×2=30 (line 99). Correct.
- Verified Non-goals do NOT appear as planned modules in structure.md/tech.md: no audio module, no networking module, no i18n module, no touch handler. Correct.
- Verified tick interval consistency: tech.md:127 "기본 150ms", structure.md:97 "(예: 150ms)". Consistent.
- Verified TDD coverage target consistency: product.md:138 "80% 이상", tech.md:175 "80% 이상". Consistent.
- Verified that the build script change (D6) does not require corresponding tsconfig.json edits — `tsc --noEmit` overrides emit regardless of tsconfig settings. Correct.
- Re-checked whether removing the "재시작 버튼" reference created any orphan reference elsewhere — searched product.md, structure.md, tech.md for "버튼". Only occurrence is in iter-1's report (not part of project docs). Clean.
- Checked whether new "데일리 챌린지" item (line 125) introduces any unresolved dependency — it's a future expansion entry only, with no implementation footprint in structure.md/tech.md. Acceptable.
- Verified language consistency: all three files in Korean. Consistent with `.moai/config/sections/language.yaml` (documentation=ko).

New observations made on second pass:
- ND1 was discovered by cross-listing Non-goals vs 향후 확장 후보 items side-by-side and noticing the duplicates after the semantic split was added.
- ND2 was noted but was not present in iter-1's defect list, so it is being flagged now for transparency even though it pre-existed.

No further defects found beyond ND1 and ND2.

---

## Strengths Carried Forward

- All four Modern MVP features (power-ups, obstacles/walls, sub-grid interpolation, neon/particles) are addressed in product.md with corresponding modules in structure.md and feasibility in tech.md.
- Stack (TypeScript + Canvas 2D + Vite + Vitest, no engine) remains internally consistent. No conflicting framework references.
- Dependency direction rule (`domain` has no outward dependencies, `render` is read-only over `domain`) is unchanged and well stated.
- All five success criteria are now measurable, including the explicit acknowledgment that render-layer verification is manual (D10 fix).
- jsdom dependency now correctly declared, making the test toolchain runnable as written.
- Scoring table is now exhaustive across all combinations (normal/powerup × doubleScore active/inactive).
- "벽 모드" ambiguity resolved — always-on, no toggle.

---

## Final Verdict Justification

FAIL. ND1 is a major contradiction: the D12 fix established mutually exclusive semantics between Non-goals and 향후 확장 후보, but two items (사운드/음악, 온라인 랭킹) appear in both lists. An implementer reading these docs cannot resolve whether to design extension points for these features or strictly forbid related code. Per the auditor mandate, when an internal contradiction exists in the project documentation, FAIL is required regardless of how many other defects were resolved.

ND1 is trivially fixable (remove the duplicate entries) and does not represent stagnation. Recommend a focused iteration 3 addressing only ND1 (and optionally ND2). Iteration 3 should pass after the duplicate listings are removed.

---

## Recommendation to manager-docs

Priority order:
1. (ND1) Resolve double-listing of 사운드/음악 and 온라인 랭킹. Move both items to 향후 확장 후보 only and remove their Non-goals entries (recommended), OR strengthen Non-goals wording to remove the "추후 SPEC에서 검토" clause and drop the future expansion duplicates.
2. (ND2, optional) Expand `src/main.ts` initialization sequence in structure.md:78-83 to enumerate Renderer + score wiring, or add a disclaimer that implementation order is determined at code time.

After ND1 is fixed, the project documentation should pass iteration 3.
