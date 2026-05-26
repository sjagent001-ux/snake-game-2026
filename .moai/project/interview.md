# Project Interview

진행일: 2026-05-25
프로젝트 타입: New Project
사용자 정정: Round 3은 사용자가 "modern snake game"으로 바꾸길 원해 재진행하여 본 내용으로 확정.

## Round 1: Vision

Question: 스네이크 게임은 어떤 형태로 실행되어야 하며, 주 대상은 누구인가요?
Answer: 웹 브라우저에서 돌아가는 게임. HTML5 Canvas 기반으로 설치 없이 누구나 URL로 접속해 바로 플레이할 수 있는 형태. 캐주얼 게이머와 웹 포트폴리오/학습용을 동시에 겨냥.

## Round 2: Technology

Question: 주 기술 스택은 무엇을 선호하세요?
Answer: TypeScript + HTML5 Canvas (Vanilla TS, Vite).
- 외부 게임 프레임워크 없이 Canvas 2D API만 사용
- Vite 기반 개발 서버 + 빌드 파이프라인
- 타입 안전성 + Vitest 테스트
- 정적 배포(GitHub Pages, Vercel, Netlify) 호환

## Round 3: Scope — Modern Snake Game

Question (1차): 이번 프로젝트의 핵심 기능 범위는 어떤 단계까지 포함하시겠어요?
Answer (1차, 폐기): "클래식 모드 + 로컬 최고점수" → 사용자가 modern snake game으로 변경 요청.

Question (재질문): Modern Snake Game의 '모던함'은 주로 어떤 축을 의미하나요?
Answer: **비주얼 + 게임플레이 모두 모던**. 그라데이션/네온 계열의 룩앤필과 함께 클래식 룰을 뛰어넘는 메커닉을 동시에 도입.

Question: MVP에 포함할 모던 기능 (다중 선택)
Answer: 4가지 모두 채택:
1. **파워업 먹이**: 일시적 효과(속도 변화·점수 2배·무적)를 부여하는 특수 아이템.
2. **장애물/벽 모드**: 맵 내부에 고정/랜덤 배치되는 벽 타일로 난이도와 공간 안배 요구.
3. **부드러운 보간 이동(sub-grid)**: 격자 단위 텔레포트 대신 tick 사이 프레임을 보간해 자연스러운 움직임.
4. **네온/다크 테마 + 파티클·트레일 이펙트**: 다크 배경, 네온 그라데이션 뱀 몸, 먹이 섭취 시 잔해/섬광 파티클, 뱀 꼬리 글로우 트레일.

추가 합의 사항(파생):
- 점수: 일반 먹이 +10점, 파워업 종류별 가중치 부여, localStorage 최고점수 저장.
- 게임 상태 머신: idle / running / paused(Space) / gameover.
- 난이도: 기본 속도에서 점수에 비례한 점진 가속 + 파워업으로 인한 일시 변화.
- 비범위(Non-goals): 멀티플레이어, 온라인 랭킹, 모바일 터치 컨트롤(향후 확장), 사운드 의무(선택적, 음소거 기본).

## Derived Notes (orchestrator)

- 프로젝트 명: `snake-game-2026`
- 핵심 모듈: 게임 루프(고정 tick), 상태 머신, 입력 처리, sub-grid 보간 렌더러, 뱀/먹이/파워업/장애물 도메인, 파티클 시스템, 점수/스토리지, 테마/렌더 설정.
- 개발 방법론: 신규 프로젝트 → TDD (quality.yaml에 이미 "tdd"로 설정됨)
- DB: 미사용 (localStorage만)
