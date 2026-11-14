# TQQQ 200d MA Strategy Dashboard 시스템 구성

Dashboard는 엔진의 읽기 전용 API로 운영 상태와 거래 정보를 조회한다. 엔진 주소와 인증정보는 실행 환경에서 주입하며, Dashboard는 DB에 직접 연결하지 않는다.

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

Noto Sans KR 가변 폰트를 `next/font/local`로 제공한다. 빌드가 Google Fonts 연결에 의존하지 않도록 [Google Fonts 원본](https://github.com/google/fonts/tree/main/ofl/notosanskr)과 OFL을 함께 보존한다. 원본 TTF는 약 10.4 MB이며 글꼴 분할 최적화는 추후 검토 대상이다.

메인 `/`와 `/strategy`, `/market`, `/trades`, `/portfolio`, `/engine`은 로그인 없이 조회한다. 상세 화면은 기존 컴포넌트를 재사용한다. demo 경로와 런타임 합성 어댑터는 제거했다. 기존 도메인·이미지·Task Definition과 별도 Fargate Service 배포 예시는 유지한다.

cloudflared는 Dashboard와 같은 Fargate Task에서 localhost:3000으로 연결한다. 엔진은 별도 Task로 유지하며 터널은 엔진 API를 공개하지 않는다. 터널 Secret은 ECS Execution Role로 주입한다.
