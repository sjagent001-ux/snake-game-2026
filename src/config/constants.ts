/**
 * 게임 전역 상수. SPEC-GAME-CORE-001 §2 환경 및 가정 SSOT.
 *
 * 이 파일의 값이 변경되면 다음 파일이 함께 검토되어야 한다:
 * - tests/domain/board.test.ts
 * - tests/domain/ObstacleLayout.test.ts
 * - tests/engine/TickScheduler.test.ts
 * - tests/score/LocalStorageAdapter.test.ts
 */

// 보드 격자 크기 (셀 단위)
export const BOARD_WIDTH = 20;
export const BOARD_HEIGHT = 20;

// 도메인 tick 주기 (밀리초)
export const TICK_MS = 150;

// 장애물 배치 시드 및 개수
export const OBSTACLE_SEED = 42;
export const OBSTACLE_COUNT = 8;

// 점수 단위 (먹이 1회 섭취)
export const FOOD_BASE_SCORE = 10;

// localStorage 키 (product.md L101 SSOT)
export const LOCAL_STORAGE_KEY = "snake2026_highscore";

// 렌더링 캔버스 크기 (픽셀). cell size = CANVAS_SIZE / BOARD_WIDTH
export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 600;
