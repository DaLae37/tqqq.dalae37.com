# TQQQ 200d MA Strategy Dashboard

[tqqq.dalae37.com](https://tqqq.dalae37.com)의 소스 코드

QQQ SMA200 전략 신호와 TQQQ, SPYM의 거래 및 보유 현황을 확인하는 읽기 전용 자동매매 대시보드

![Next.js](https://img.shields.io/badge/Framework-Next.js_16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Container-Docker-2496ED?logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)

## 프로젝트 소개

메리츠증권 Super365 계좌와 공식 Open API를 활용하는 [Python 자동매매 엔진](https://github.com/DaLae37/tqqq.dalae37.com-engine)의 운영 상태와 거래 내역을 확인하기 위한 웹 대시보드

QQQ의 SMA 기반 전략 신호와 실제 거래 종목인 TQQQ, SPYM의 주문, 체결 및 보유 현황을 시각화함. 신호 발생, 주문 전송, 실제 체결을 구분하여 미체결 주문과 부분 체결 상태를 확인할 수 있도록 구성함

주문 실행과 전략 판단은 거래 엔진이 담당하며, 대시보드는 엔진의 읽기 전용 API를 통해 데이터를 조회함. 개인 계좌 정보와 실제 거래 내역은 인증 후 접근하도록 구성함

메리츠증권의 공식 서비스나 제휴 서비스가 아닌 개인 개발 프로젝트이며, 투자 성과나 전략 수익률을 보장하지 않음

## 주요 기능

- **운영 현황:** 엔진 실행 모드, 연결 상태, 마지막 전략 평가와 오류 확인
- **전략 상태:** QQQ 매매 신호, 현재 완충 폭, TQQQ 보유 사이클과 분할 익절 진행 상태 표시
- **시세 차트:** QQQ, TQQQ, SPYM의 종목별 가격, 거래량과 신호, 주문, 체결 마커 표시
- **거래 이력:** 기간, 종목, 매매 방향과 상태별 필터, 정렬, 페이지네이션 및 주문별 이벤트 조회
- **보유 자산:** TQQQ와 SPYM의 장부 수량, 목적별 자금, SPYM 적립 예산과 확인된 실현손익 조회
- **Mock 데모:** 실제 계좌와 분리한 합성 데이터로 화면과 기능 확인

메인 요약과 상세 화면을 구현한 상태이며, 실제 엔진과 시세 연결 및 운영 환경 검증은 별도로 진행함. API가 제공하지 않는 값은 미제공으로 표시하며, 조회 실패를 Mock 데이터로 대체하지 않음

공개 저장소에는 합성 데이터와 설정 예시만 포함함. 엔진 주소, 인증정보와 운영 설정은 외부에서 주입하며, 대시보드는 DB에 직접 연결하지 않음. 기본 데이터 어댑터는 비활성화되어 있으며 `/demo`에서 합성 화면을 확인할 수 있음

## 화면 구성

| 메뉴 | 경로 | 용도 |
|---|---|---|
| Dashboard | / | 엔진 상태, 세 개의 핵심 지표, QQQ/SMA200 미리보기와 최근 거래 5건 |
| Strategy | /strategy | 전략 원리, 현재 상태와 신호 판단 근거 |
| Market | /market | 종목·기간·봉 간격별 상세 차트 |
| Trades | /trades | 주문·체결 이력, 필터와 개별 이벤트 |
| Portfolio | /portfolio | 보유 자산과 손익 |
| Engine | /engine | Liveness, Readiness와 운영 상태 |

위 경로는 인증 후 접근함. `/demo`와 하위 경로는 같은 화면의 공개 합성 예시이며, 기존 `/dashboard`, `/demo/orders`, `/demo/health` 경로도 호환용으로 유지함

## 개발 환경

* **Node.js:** 26.13.0, `.nvmrc`로 고정
* **npm:** 11.20.0
* **Next.js:** 16.3.4
* **React:** 19.2.8
* **TypeScript:** 5.9
* **Chart / Data:** Recharts, decimal.js, Zod
* **Container / CI:** Docker, GitHub Actions

## 관련 문서

- [SMA200 전략 설명](docs/STRATEGY.md)
- [시스템 구성](docs/ARCHITECTURE.md)
- [화면과 데이터 기준](docs/DASHBOARD.md)
- [ECS 배포 및 운영](docs/DEPLOYMENT.md)
- [인증과 데이터 공개 범위](docs/SECURITY.md)
- [구현 및 검증 현황](docs/VALIDATION.md)

## 라이선스 (License)

[BSD 3-Clause](LICENSE)

Noto Sans KR 폰트는 [SIL Open Font License](src/app/fonts/OFL.txt)를 따름

## 개발

이 프로젝트는 OpenAI Codex를 활용하여 개발되었습니다.
