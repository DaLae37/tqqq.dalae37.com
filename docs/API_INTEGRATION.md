# TQQQ 200d MA Strategy Dashboard 엔진 조회 API 연동

실제 엔진과의 네트워크 연동은 아직 검증하지 않았다. 어댑터는 아래 조회 계약을 사용하며 실거래 주문과 계좌 변경 API는 제공하지 않는다. Dashboard는 DB에 직접 연결하지 않는다.

## 조회 계약

| 엔진 GET 경로 | 사용처 |
|---|---|
| /v1/status | 모드, 연결, 실거래 설정, 전략 판단, 진단 |
| /v1/portfolio | 장부 수량, 사이클, 예산, 계좌 스냅샷 |
| /v1/signals | QQQ 신호와 주문 연결 |
| /v1/orders | 주문 테이블과 상세 |
| /v1/fills | 개별 FILL 조회. 계약 지원 |
| /v1/order-events | 주문 전송, 상태 변경, 실제 체결과 상세 타임라인 |
| /v1/open-orders | 활성 주문. BFF 계약 지원 |
| /v1/errors | UNKNOWN / REJECTED. BFF 계약 지원 |
| /v1/tax-ledger | 최근 세무 원장 최대 200건 |
| /v1/annual-pnl | 연도별 메리츠 검증 손익과 외부 손익 반영 여부 |
| /v1/strategy-versions | 현재 버전에 맞는 설정 스냅샷 |
| /health/live | 프로세스와 루프 생존 |
| /health/ready | DB/API/schema 연결 준비 |

브라우저의 대응 경로는 `/api/dashboard/<resource>`다. `live`, `ready`는 엔진의 `/health/*`로만 변환한다. 경로는 고정 목록으로 제한한다. `limit=1..200`, `offset=0..100000` 이외 조회 파라미터는 허용하지 않는다. `/overview`, `/trades`는 BFF의 화면용 조회다. `/api/dashboard/market`과 `/api/demo/*`는 제공하지 않는다. 시세는 TradingView 공식 위젯에서 제공한다.

## 응답 기준

- readiness는 주문 가능 여부와 구분한다. 주문 가능 여부는 orders_enabled와 관련 설정, reason을 별도로 본다.
- 전략 버전 응답의 `strategy_version_id`, `version`을 BFF에서 UI 이름인 `version_id`, `strategy_version`으로 명시적으로 변환한다.
- 주문의 id/status/quantity 등 계약 필드를 검증하여 사용한다.
- 금액은 문자열, UTC 시각은 timezone이 포함된 문자열, 거래일은 미국 현지 날짜다. 과거 필드의 null은 0이 아니다.
- 현재 조회 API에는 종목별 평가손익, SPYM 평균 매입 단가, OHLCV, RP 보유액이 없다. 웹사이트가 보완값을 만들지 않는다.

## 인증과 요청 제약

`ENGINE_API_BASE_URL`은 관리자가 설정한 단일 origin이다. `ENGINE_API_ALLOWED_HOST`와 hostname이 일치해야 한다. 경로, query, userinfo가 붙은 origin은 거부한다. 운영은 기본 HTTPS다. 명시적인 ENGINE_API_TRANSPORT=vpc-http, 허용 호스트, ENGINE_PRIVATE_DNS_SUFFIX와 포트 8080이 일치할 때만 제한된 내부 HTTP를 허용한다. 이 모드를 사용할 때는 별도로 네트워크 경계를 검증한다. 개발 환경의 명시적인 loopback만 HTTP를 허용한다. URL이나 host를 브라우저 입력으로 받지 않는다. 실제 주소와 토큰은 공개 저장소에 포함하지 않는다.

`Authorization: Bearer`에는 32자 이상의 전용 read API 토큰을 사용한다. 운영은 ENGINE_READ_API_TOKEN_SECRET_ARN을 지정하고 Dashboard Task Role로 Secrets Manager AWSCURRENT의 token 필드를 읽는다. 평문 환경변수는 운영에서 사용하지 않는다. 60초 메모리 캐시와 동시 조회 병합, 만료 후 실패 시 차단, 401/403 후 캐시 무효화를 적용한다. Next.js 서버에서만 보관한다. 리다이렉트를 따르지 않고 인증정보를 다른 origin으로 전달하지 않는다. 요청은 GET, 5초 타임아웃, no-store이며 응답은 최대 2 MB다. TLS 검증을 해제하지 않는다. 사설 CA는 NODE_EXTRA_CA_CERTS로 신뢰 체인을 구성한다.

프로세스당 엔진 요청은 분당 120회, 공개 BFF는 분당 60회로 제한한다. 이는 이 애플리케이션의 보수적인 상한이며 메리츠의 공식 TPS를 의미하지 않는다. 다중 인스턴스에서는 프록시의 공유 제한이 필요하다. 실패 시 원본 예외와 응답 본문을 전달하지 않는다.

## 조회 범위

주문, 신호, 이벤트, 전략 버전은 200건씩 최대 2,000건 조회한다. 범위를 넘으면 화면에 제한을 표시한다. 테이블 정렬, 기간, 종목, 상태 필터와 페이지네이션은 로드된 주문 범위 전체에 적용한다. 이벤트가 독립적으로 제한되므로 오래된 주문의 모든 이벤트가 포함된다고 보장하지 않는다. 거래 상세도 같은 주문 범위다.

현재 계약은 서버 필터, 전체 건수, 주문 ID별 이벤트 조회, 일관된 snapshot cursor를 제공하지 않는다. 전체 이력 검색을 제공하려면 별도의 읽기 API 계약이 필요하다. BFF의 원본 페이지 경로는 명시적인 offset 조회를 지원하며 대시보드 조회량은 위 범위로 제한한다. 페이지별 관측 시각도 단일 snapshot을 의미하지 않는다.

## 연결 설정

`.env.example`은 연결되지 않은 `DATA_ADAPTER=disabled`를 기본으로 제공한다. 합성 데이터는 테스트 전용이며 런타임에서 사용하지 않는다. 실제 조회를 사용하려면 외부 실행 환경에서 `DATA_ADAPTER=engine`과 엔진 주소, 허용 호스트, 인증정보를 설정한다. 배포 템플릿의 `REPLACE_*`를 치환한 파일은 공개 저장소에 포함하지 않는다.

연결 실패는 해당 조회의 오류로 표시한다. 주소 확인, 인증정보 회전과 연결 교체 동작은 사용 환경에서 검증한다. 설정 방법은 [배포 문서](DEPLOYMENT.md)를 따른다.

화면과 BFF는 로그인 없이 공개한다. BFF 경로는 `/api/dashboard/*`를 유지한다. 새 메인과 상세 페이지가 브라우저에서 엔진 API를 직접 호출하지 않는다.
