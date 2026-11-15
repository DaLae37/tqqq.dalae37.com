# 200TQQQ

[tqqq.dalae37.com](https://tqqq.dalae37.com)의 소스 코드

메리츠증권 Open API와 Super365 계좌로 운용하는 QQQ SMA200 기반 TQQQ·SPYM 자동매매 대시보드

![Next.js](https://img.shields.io/badge/Framework-Next.js_16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Container-Docker-2496ED?logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)

## 프로젝트 소개

메리츠증권 Super365 계좌와 공식 Open API를 활용하는 [Python 자동매매 엔진](https://github.com/DaLae37/tqqq.dalae37.com-engine)의 운영 상태와 거래 내역을 확인하기 위한 웹 대시보드

QQQ의 SMA 기반 전략 신호와 실제 거래 종목인 TQQQ, SPYM의 주문, 체결 및 보유 현황을 시각화함. 신호 발생, 주문 전송, 실제 체결을 구분하여 미체결 주문과 부분 체결 상태를 확인할 수 있도록 구성함

주문 실행과 전략 판단은 거래 엔진이 담당하며, 대시보드는 엔진의 읽기 전용 API를 통해 데이터를 조회함. 엔진 상태와 본인의 거래 및 운용 성과는 로그인 없이 공개함. 엔진 API 토큰은 Next.js 서버에서만 사용함

메리츠증권의 공식 서비스나 제휴 서비스가 아닌 개인 개발 프로젝트이며, 투자 성과나 전략 수익률을 보장하지 않음

## 주요 기능

- **운영 현황:** 엔진 실행 모드, 연결 상태, 마지막 전략 평가와 오류 확인
- **다음 매매 조건:** 메인에서 QQQ 확정 종가, SMA200, TQQQ 매수·전량 매도 기준 확인. 엔진 판단값 미제공 시 별도 표시
- **전략 상태:** QQQ 매매 신호, 현재 완충 폭, TQQQ 보유 사이클과 분할 익절 진행 상태 표시
- **시세 차트:** TradingView 공식 위젯으로 QQQ, TQQQ, SPYM의 종목별 가격과 거래량 제공
- **거래 이력:** 기간, 종목, 매매 방향과 상태별 필터, 정렬, 페이지네이션 및 주문별 이벤트 조회
- **보유 자산:** TQQQ와 SPYM의 장부 수량, 목적별 자금, SPYM 적립 예산과 확인된 실현손익 조회

API가 제공하지 않는 값은 미제공으로 표시하며, 조회 실패를 합성 데이터로 대체하지 않음

공개 저장소에는 소스 코드와 설정 예시를 포함함. 엔진 주소, 인증정보와 운영 설정은 외부에서 주입하며, 대시보드는 DB에 직접 연결하지 않음

시세 차트는 [TradingView 공식 Advanced Chart 위젯](https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/)을 사용함. 엔진의 SMA·완충 폭·신호는 전략 패널에서, 본인의 주문·실제 체결·운용 성과는 별도 표와 카드에서 제공함. 위젯에는 엔진 데이터를 전달하거나 거래 마커를 덧그리지 않음

## 화면 구성

| 메뉴 | 경로 | 용도 |
|---|---|---|
| Dashboard | / | 엔진 상태, 세 개의 핵심 지표, SMA200 매매 판단, TradingView TQQQ 시세 미리보기와 최근 거래 5건 |
| Strategy | /strategy | 전략 원리, 현재 상태와 신호 판단 근거 |
| Market | /market | 종목·기간·봉 간격별 상세 차트 |
| Trades | /trades | 주문·체결 이력, 필터와 개별 이벤트 |
| Portfolio | /portfolio | 보유 자산과 손익 |
| Engine | /engine | Liveness, Readiness와 운영 상태 |

위 경로는 로그인 없이 접근함. 기존 `/dashboard`와 하위 경로는 호환용으로 유지함

## 개발 환경

* **Node.js:** 26.13.0, `.nvmrc`로 고정
* **npm:** 11.20.0
* **Next.js:** 16.3.4
* **React:** 19.2.8
* **TypeScript:** 5.9
* **Chart / Data:** TradingView 공식 위젯, decimal.js, Zod
* **Container / CI:** Docker, GitHub Actions

## 관련 문서

- [SMA200 전략 설명](docs/STRATEGY.md)
- [시스템 구성](docs/ARCHITECTURE.md)
- [엔진 API 연동과 데이터 기준](docs/API_INTEGRATION.md)
- [ECS 배포 및 운영](docs/DEPLOYMENT.md)
- [데이터 공개 범위와 보안](docs/SECURITY.md)

## 라이선스 (License)

[BSD 3-Clause](LICENSE)

TradingView 위젯과 시세는 TradingView 및 데이터 제공자의 이용 조건을 따름

Noto Sans KR 폰트는 [SIL Open Font License](src/app/fonts/OFL.txt)를 따름

## 개발

이 프로젝트는 OpenAI Codex를 활용하여 개발되었습니다.
