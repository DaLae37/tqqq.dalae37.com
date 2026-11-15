# 200TQQQ 시스템 구성

Dashboard는 엔진의 읽기 전용 API로 운영 상태와 거래 정보를 조회한다. 엔진 주소와 인증정보는 실행 환경에서 주입하며, Dashboard는 DB에 직접 연결하지 않는다.

메리츠증권 Super365 계좌와 Open API 연동, 전략 판단과 주문 실행은 [거래 엔진](https://github.com/DaLae37/tqqq.dalae37.com-engine)이 담당한다. 웹은 메리츠 API를 직접 호출하지 않으며 시세 차트는 TradingView 공식 위젯으로 제공한다.

```mermaid
flowchart TD
  User["브라우저 / HTTPS"] --> Tunnel["Cloudflare Tunnel / cloudflared"]
  Tunnel --> Dashboard["Dashboard / 공개 읽기 전용 BFF"]
  Dashboard --> Engine["읽기 전용 엔진 API"]
  Dashboard --> Secret["서버 인증정보"]
  User --> TradingView["TradingView 공식 시세 위젯"]
```

공개 저장소에는 주소, 자원 ID, ARN과 자격 증명을 채운 운영 설정을 포함하지 않는다. `.env.example`의 공란과 배포 템플릿의 `REPLACE_*`는 사용 환경에서 별도로 설정한다.

Dashboard와 BFF는 로그인 없이 공개한다. 엔진 API와 Secret은 서버 경계에 유지한다. 엔진 장애를 합성 데이터나 이전 정상 상태로 대체하지 않는다. Secret은 서버에서만 읽고 응답 허용 목록, no-store, GET 전용, timeout과 요청 제한을 적용한다. 시세는 TradingView 공식 위젯에서 직접 제공하며 엔진 데이터를 위젯에 전달하지 않는다.

배포 예시는 Dashboard만 대상으로 한다. 실행 설정과 템플릿 사용법은 [배포 문서](DEPLOYMENT.md)를 따른다.

## 구현 구조

| 경로 | 역할 |
|---|---|
| src/app | App Router 페이지, BFF, 웹 /healthz |
| src/components | 레이아웃, 차트, 상태, 거래 테이블, 상세 화면 |
| src/lib/contracts.ts | 엔진 응답의 허용 필드와 런타임 검증 |
| src/lib/server/engine.ts | GET 전용 엔진 어댑터, 타임아웃, 페이지 조회 |
| deploy | Dashboard용 ECS, Compose와 Nginx 설정 예시 |
| tests | 격리된 합성 fixture, 정밀도, 계약, 서버 경계, 장애 처리와 브라우저 검증 |

## 구현 기준

Next.js App Router, strict TypeScript와 `@/*` 경로를 사용한다. 코드는 2칸 들여쓰기, 큰따옴표, 세미콜론과 함수 컴포넌트 방식으로 작성한다.

Noto Sans KR 가변 폰트를 `next/font/local`로 제공한다. 빌드가 Google Fonts 연결에 의존하지 않도록 [Google Fonts 원본](https://github.com/google/fonts/tree/main/ofl/notosanskr)과 OFL을 함께 보존한다.

메인 `/`와 `/strategy`, `/market`, `/trades`, `/portfolio`, `/engine`은 로그인 없이 조회한다. 상세 화면은 공통 컴포넌트를 재사용한다. 화면별 역할은 [README](../README.md)의 화면 구성을 따른다.

cloudflared는 Dashboard와 같은 Fargate Task에서 localhost:3000으로 연결한다. 엔진은 별도 Task로 유지하며 터널은 엔진 API를 공개하지 않는다. 터널 Secret은 ECS Execution Role로 주입한다.

## 화면 구성 기준

메인은 엔진 상태, 세 개의 요약 카드, QQQ SMA200 매매 판단, TQQQ 시세 미리보기와 최근 거래 5건을 표시한다. 전체 거래 이력, 필터, 세무 원장과 오류 상세는 상세 화면에서 제공한다.

색 조합은 [세이브티커 뉴스](https://www.saveticker.com/news)를 참고한다. Light는 [네이버 증권](https://stock.naver.com/)처럼 흰 배경을 사용하고 짙은 회색 텍스트와 청보라색으로 강조한다. Dark는 차콜 배경과 밝은 청보라색을 사용한다. 색상과 여백은 `src/app/globals.css`에서 관리한다. 내비게이션과 표는 모바일 화면에서도 사용할 수 있도록 구성한다.

TradingView 위젯은 사이트의 Light/Dark 설정을 따르며 Market의 기본 종목은 TQQQ다. 엔진의 판단값과 실제 거래는 별도 패널과 표에 표시한다. 위젯 로딩 실패 시 안내와 다시 불러오기, TradingView 원문 링크를 제공하며 합성 시세로 대체하지 않는다.
