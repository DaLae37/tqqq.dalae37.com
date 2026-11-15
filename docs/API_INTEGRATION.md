# 200TQQQ 엔진 API 연동과 데이터 기준

Next.js 서버가 엔진의 조회 API를 호출하고 허용된 응답 필드만 공개한다. 메리츠증권 Open API와 Super365 계좌 연동은 거래 엔진이 담당한다. Dashboard는 DB나 메리츠 API에 직접 연결하지 않으며 주문 실행과 계좌 변경 API는 제공하지 않는다.

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

브라우저의 대응 경로는 `/api/dashboard/<resource>`다. `live`, `ready`는 엔진의 `/health/*`로만 변환한다. 경로는 고정 목록으로 제한한다. `limit=1..200`, `offset=0..100000` 이외 조회 파라미터는 허용하지 않는다. `/api/dashboard/overview`, `/api/dashboard/trades`는 BFF의 화면용 조회다. 시세 조회 API는 제공하지 않으며 차트는 TradingView 공식 위젯에서 제공한다.

## 응답 기준

- readiness는 주문 가능 여부와 구분한다. 주문 가능 여부는 orders_enabled와 관련 설정, reason을 별도로 본다.
- 전략 버전 응답의 `strategy_version_id`, `version`을 BFF에서 UI 이름인 `version_id`, `strategy_version`으로 명시적으로 변환한다.
- 주문의 id/status/quantity 등 계약 필드를 검증하여 사용한다.
- 금액은 문자열, UTC 시각은 timezone이 포함된 문자열, 거래일은 미국 현지 날짜다. 과거 필드의 null은 0이 아니다.
- 현재 조회 API에는 종목별 평가손익, SPYM 평균 매입 단가, OHLCV, RP 보유액이 없다. 웹사이트가 보완값을 만들지 않는다.

## 인증과 요청 제약

`ENGINE_API_BASE_URL`은 관리자가 설정한 단일 origin이다. `ENGINE_API_ALLOWED_HOST`와 hostname이 일치해야 한다. 경로, query, userinfo가 붙은 origin은 거부한다. 운영은 기본 HTTPS다. 명시적인 ENGINE_API_TRANSPORT=vpc-http, 허용 호스트, ENGINE_PRIVATE_DNS_SUFFIX와 포트 8080이 일치할 때만 제한된 내부 HTTP를 허용한다. 이 모드를 사용할 때는 별도로 네트워크 경계를 검증한다. 개발 환경의 명시적인 loopback만 HTTP를 허용한다. URL이나 host를 브라우저 입력으로 받지 않는다. 실제 주소와 토큰은 공개 저장소에 포함하지 않는다.

`Authorization: Bearer`에는 32자 이상의 전용 read API 토큰을 사용한다. 운영은 ENGINE_READ_API_TOKEN_SECRET_ARN을 지정하고 Dashboard Task Role로 Secrets Manager AWSCURRENT의 token 필드를 읽는다. 평문 환경변수는 운영에서 사용하지 않는다. 60초 메모리 캐시와 동시 조회 병합, 만료 후 실패 시 차단, 401/403 후 캐시 무효화를 적용한다. Next.js 서버에서만 보관한다. 리다이렉트를 따르지 않고 인증정보를 다른 origin으로 전달하지 않는다. 요청은 GET, 5초 타임아웃, no-store이며 응답은 최대 2 MB다. TLS 검증을 해제하지 않는다. 사설 CA는 NODE_EXTRA_CA_CERTS로 신뢰 체인을 구성한다.

프로세스당 엔진 요청은 분당 120회, 공개 BFF는 분당 60회로 제한한다. 이는 이 애플리케이션의 보수적인 상한이며 메리츠의 공식 TPS를 의미하지 않는다. 다중 인스턴스에서는 프록시의 공유 제한이 필요하다. 실패 시 원본 예외와 응답 본문을 전달하지 않는다. 서버 로그의 engine_read_failed에는 고정 resource, stage, 허용된 code와 HTTP 상태만 기록한다. DNS 조회 실패, 연결 거부, 시간 초과, Secret 접근 실패, 요청 제한과 응답 계약 오류를 구분하며 주소·ARN·토큰·원본 예외는 기록하지 않는다.

`/health/live`, `/health/ready`는 엔진 구현처럼 Bearer 토큰 없이 조회한다. read 토큰 조회 실패가 네트워크 생존 확인까지 막지 않도록 분리하며, `/v1/*` 조회는 기존 서버 인증을 유지한다.

## 조회 범위

주문, 신호, 이벤트, 전략 버전은 200건씩 최대 2,000건 조회한다. 범위를 넘으면 화면에 제한을 표시한다. 테이블 정렬, 기간, 종목, 상태 필터와 페이지네이션은 로드된 주문 범위 전체에 적용한다. 이벤트가 독립적으로 제한되므로 오래된 주문의 모든 이벤트가 포함된다고 보장하지 않는다. 거래 상세도 같은 주문 범위다.

현재 계약은 서버 필터, 전체 건수, 주문 ID별 이벤트 조회, 일관된 snapshot cursor를 제공하지 않는다. 전체 이력 검색을 제공하려면 별도의 읽기 API 계약이 필요하다. BFF의 원본 페이지 경로는 명시적인 offset 조회를 지원하며 대시보드 조회량은 위 범위로 제한한다. 페이지별 관측 시각도 단일 snapshot을 의미하지 않는다.

## 연결 설정

`.env.example`은 연결되지 않은 `DATA_ADAPTER=disabled`를 기본으로 제공한다. 합성 데이터는 테스트 전용이며 런타임에서 사용하지 않는다. 실제 조회를 사용하려면 외부 실행 환경에서 `DATA_ADAPTER=engine`과 엔진 주소, 허용 호스트, 인증정보를 설정한다. 배포 템플릿의 `REPLACE_*`를 치환한 파일은 공개 저장소에 포함하지 않는다.

연결 실패는 해당 조회의 오류로 표시한다. 주소 확인, 인증정보 회전과 연결 교체 동작은 사용 환경에서 검증한다. 설정 방법은 [배포 문서](DEPLOYMENT.md)를 따른다.

화면과 BFF는 로그인 없이 공개한다. BFF 경로는 `/api/dashboard/*`를 유지한다. 새 메인과 상세 페이지가 브라우저에서 엔진 API를 직접 호출하지 않는다.

## SMA200 매매 판단

웹은 `/v1/status`의 선택 필드 `assessment.trend_reference`를 수신한다. 엔진 버전과 응답에 따라 생략될 수 있으며, 아래 계약의 웹 수신 지원이 엔진 배포 완료를 의미하지 않는다.

| 필드 | 형식과 의미 |
|---|---|
| status | ready / unavailable. 판단 근거 제공 상태이며 주문 가능 여부와 구분 |
| reason | 원인 코드 또는 null. 생략 가능 |
| signal_symbol / trade_symbol | QQQ / TQQQ |
| evaluated_at | timezone이 포함된 ISO 평가 시각 |
| source_day | 마지막 확정 정규장 종가의 미국 거래일 YYYY-MM-DD 또는 null |
| sma_period / close_count | SMA 기간과 계산에 포함된 종가 수 |
| close_confirmed | 정규장 종가 확정 여부 |
| close / sma_value | QQQ 종가와 SMA200. Decimal 문자열 또는 null. 생략 가능 |
| buy_buffer / sell_buffer | 동일 평가의 완충 폭. 비율 문자열 또는 null. 생략 가능 |
| buy_threshold / sell_threshold | 동일 평가의 매수·매도 기준선. Decimal 문자열 또는 null. 생략 가능 |

메인의 판단 패널은 ready, 확정 종가, 200일·200개 자료, 거래일, 양수 종가·SMA와 완충 폭·기준선이 모두 제공될 때 해당 값을 표시한다. 기준선은 QQQ 가격 기준이며 TQQQ의 주문 단가가 아니다. 실제 신호와 주문 활성화는 별도 상태를 따른다.

이 필드가 생략된 경우에만 기존 `assessment.trend`의 신호 근거를 확인한다. 활성 전략 버전과 신호 버전이 같고 SMA 기간이 200일이며 유효 가격과 평가 시각이 있을 때, 해당 신호의 SMA와 완충 폭으로 기준선을 표시한다. 이를 현재의 다음 매매 가격과 구분하여 신호 당시 값으로 안내한다.

unavailable 또는 불완전한 스냅샷은 과거 신호로 대체하지 않는다. 현재 완충 폭을 과거 SMA에 적용하거나 TradingView 시세로 누락값을 추정하지 않는다. 현재 완충 폭은 `assessment.trend_buffer`, 익절 조건은 활성 전략 버전의 `config_snapshot`, 완료·실행 불가 단계는 사이클의 `completed`·`unavailable`을 사용한다.

## 자산과 손익

- 계좌 평가금액은 `daily_snapshots`에서 실제 `at`이 있는 최신 관측의 `equity`와 `currency`다. 현재 시세로 재평가한 값과 구분한다.
- 평가손익과 SPYM 평균 매입 단가는 API가 제공하지 않으면 미제공으로 표시한다. TQQQ 사이클의 `entry_price`는 전체 계좌의 세무 평균원가가 아니다.
- 확인된 실현손익은 조회한 `annual-pnl` 연도의 `verified_broker_pnl_krw` 합계다. `pending_count`와 외부 손익 미반영 여부를 함께 표시한다. 전체 기간·모든 증권사의 확정 손익을 의미하지 않는다.
- `profit_cash`는 남아 있는 익절 수익금 장부다. 누적 실현손익으로 표시하지 않는다.
- 실제 기준 예수금, 추정 예수금, 주문 가능 한도와 `funding_debit`은 따로 표시하고 동일 자산으로 합산하지 않는다. RP와 출금 가능 금액을 추정하지 않는다.
- SPYM 예산은 `spym_lots` 잔액 합계다. `available_day` 전 금액도 포함하므로 현재 주문 가능한 예산과 구분한다.
- 금액은 문자열로 유지하고 표시용 합계와 임계값은 decimal.js 100자리 정밀도로 계산한다.

## 체결과 시각

FILL은 `trade_id`와 `broker_execution_id`로 중복을 제거한다. 개별 `fill_quantity`만 사용하며 `cumulative_filled_quantity`를 다시 합산하지 않는다. 과거 `trade_history`의 FILL도 신규 이벤트와 중복 집계하지 않는다. UNKNOWN은 미확정, CANCEL_PENDING은 취소 요청 중, CANCELLED는 취소 완료다.

거래 시각은 Asia/Seoul과 America/New_York 중 선택하며 Intl의 IANA 시간대로 DST를 처리한다. 기간 필터는 선택한 시간대의 주문 생성일 기준이다. 상세에서는 실제 체결 시각을 따로 표시한다. 위젯 시세와 엔진의 확정 종가 판단은 서로 다른 관측이다.

엔진 데이터는 수동 새로고침과 선택형 60초 자동 갱신을 제공한다. 자동 갱신은 보이는 탭에서만 실행한다. `last_check_at`이 120초보다 오래되면 관측 오래됨을 표시한다. TradingView 갱신은 위젯 자체 동작을 따른다. 프로세스 생존, 연결 준비, pause 상태와 주문 활성화는 별도로 표시한다.
