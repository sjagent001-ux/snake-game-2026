/**
 * SPEC-GAME-CORE-001 REQ-DOMAIN-002/003/004/010
 *
 * Snake / SnakeSegment 도메인 단위 테스트.
 */

import { describe, expect, it } from "vitest";

import { Snake } from "../../src/domain/snake/Snake";
import { SnakeSegment } from "../../src/domain/snake/SnakeSegment";

describe("SnakeSegment (T-4)", () => {
  it("동일한 (col, row) 셀끼리 equals()는 true 를 반환한다", () => {
    const a = new SnakeSegment(5, 7);
    const b = new SnakeSegment(5, 7);
    expect(a.equals(b)).toBe(true);
  });

  it("다른 (col, row) 셀끼리 equals()는 false 를 반환한다", () => {
    const a = new SnakeSegment(5, 7);
    const b = new SnakeSegment(5, 8);
    const c = new SnakeSegment(6, 7);
    expect(a.equals(b)).toBe(false);
    expect(a.equals(c)).toBe(false);
  });
});

describe("Snake (T-6) — REQ-DOMAIN-002/003/004/010", () => {
  it("초기 생성 시 segments[0] 가 head 이고 길이는 전달된 세그먼트 수와 일치한다 (REQ-DOMAIN-002)", () => {
    // spec.md §5.4 / REQ-STATE-002 기본 시작 패턴 모사
    // head = (10, 10), body extends leftward: (10,10), (9,10), (8,10)
    const snake = new Snake(
      [
        new SnakeSegment(10, 10),
        new SnakeSegment(9, 10),
        new SnakeSegment(8, 10),
      ],
      "right",
    );
    expect(snake.head.equals(new SnakeSegment(10, 10))).toBe(true);
    expect(snake.length).toBe(3);
    expect(snake.direction).toBe("right");
  });

  it("move() 시 머리가 현재 방향으로 한 칸 이동하고 비-머리 세그먼트가 앞 세그먼트 이전 위치로 시프트된다 (REQ-DOMAIN-003)", () => {
    const snake = new Snake(
      [
        new SnakeSegment(10, 10),
        new SnakeSegment(9, 10),
        new SnakeSegment(8, 10),
      ],
      "right",
    );
    snake.move();
    expect(snake.segments[0]!.equals(new SnakeSegment(11, 10))).toBe(true);
    expect(snake.segments[1]!.equals(new SnakeSegment(10, 10))).toBe(true);
    expect(snake.segments[2]!.equals(new SnakeSegment(9, 10))).toBe(true);
    expect(snake.length).toBe(3); // 길이 변화 없음
  });

  it("setDirection() 후 move() 시 새 방향으로 머리가 이동한다", () => {
    const snake = new Snake(
      [new SnakeSegment(5, 5), new SnakeSegment(4, 5), new SnakeSegment(3, 5)],
      "right",
    );
    snake.setDirection("up");
    snake.move();
    expect(snake.segments[0]!.equals(new SnakeSegment(5, 4))).toBe(true);
  });

  it("4방향(up/down/left/right) 모두 정상적으로 머리 위치를 갱신한다", () => {
    const make = () =>
      new Snake(
        [
          new SnakeSegment(5, 5),
          new SnakeSegment(4, 5),
          new SnakeSegment(3, 5),
        ],
        "right",
      );
    const s1 = make();
    s1.setDirection("up");
    s1.move();
    expect(s1.head.row).toBe(4);

    const s2 = make();
    s2.setDirection("down");
    s2.move();
    expect(s2.head.row).toBe(6);

    const s3 = make();
    // 현재 방향 right 의 반대 left 는 도메인 차원에서 허용되지만 (KeyboardHandler 가 입력 시점에 차단),
    // 도메인 자체는 명시된 방향으로 이동한다.
    s3.setDirection("down");
    s3.setDirection("left");
    s3.move();
    expect(s3.head.col).toBe(4);

    const s4 = make();
    s4.move();
    expect(s4.head.col).toBe(6);
  });

  it("grow() 호출 후 다음 move() 시 길이가 1 증가한다 (REQ-DOMAIN-004)", () => {
    const snake = new Snake(
      [new SnakeSegment(5, 5), new SnakeSegment(4, 5), new SnakeSegment(3, 5)],
      "right",
    );
    snake.grow();
    snake.move();
    expect(snake.length).toBe(4);
    // 머리는 정상 이동, 꼬리는 한 칸 더 유지되어 이전 꼬리 위치가 그대로 남는다.
    expect(snake.segments[0]!.equals(new SnakeSegment(6, 5))).toBe(true);
    expect(snake.segments[3]!.equals(new SnakeSegment(3, 5))).toBe(true);
  });

  it("grow() 는 한 tick에만 효과를 적용한다 — 다음 move() 부터는 다시 길이 유지", () => {
    const snake = new Snake(
      [new SnakeSegment(5, 5), new SnakeSegment(4, 5), new SnakeSegment(3, 5)],
      "right",
    );
    snake.grow();
    snake.move(); // length 4
    snake.move(); // length 4 유지
    expect(snake.length).toBe(4);
  });

  it("collidesWithSelf() — 머리가 자기 비-머리 세그먼트와 같은 셀이면 true (REQ-DOMAIN-010, AC-4)", () => {
    // 길이 5, 머리가 네 번째 세그먼트 셀과 일치하도록 인위 구성
    const snake = new Snake(
      [
        new SnakeSegment(5, 5),
        new SnakeSegment(5, 6),
        new SnakeSegment(6, 6),
        new SnakeSegment(6, 5),
        new SnakeSegment(5, 5), // 꼬리가 머리와 동일 → 자기 충돌
      ],
      "up",
    );
    expect(snake.collidesWithSelf()).toBe(true);
  });

  it("collidesWithSelf() — 머리가 어떤 세그먼트와도 겹치지 않으면 false", () => {
    const snake = new Snake(
      [new SnakeSegment(5, 5), new SnakeSegment(4, 5), new SnakeSegment(3, 5)],
      "right",
    );
    expect(snake.collidesWithSelf()).toBe(false);
  });

  it("containsCell() — 임의 세그먼트 셀에 대해 true 반환", () => {
    const snake = new Snake(
      [new SnakeSegment(5, 5), new SnakeSegment(4, 5), new SnakeSegment(3, 5)],
      "right",
    );
    expect(snake.containsCell(new SnakeSegment(4, 5))).toBe(true);
    expect(snake.containsCell(new SnakeSegment(5, 5))).toBe(true);
    expect(snake.containsCell(new SnakeSegment(99, 99))).toBe(false);
  });

  it("segments 는 readonly 시야로 노출되며 외부에서 push 호출이 컴파일 단계에서 차단된다 (런타임 사본 검증)", () => {
    const snake = new Snake(
      [new SnakeSegment(5, 5), new SnakeSegment(4, 5), new SnakeSegment(3, 5)],
      "right",
    );
    const view = snake.segments;
    // readonly 배열을 강제로 캐스팅해 변경 시도해도 내부 상태는 보호되어야 한다.
    (view as SnakeSegment[]).push(new SnakeSegment(99, 99));
    expect(snake.length).toBe(3);
  });
});
