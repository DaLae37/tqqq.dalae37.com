# 데이터 공개 범위와 보안

소규모 공개 포트폴리오 용도로 엔진 상태, 전략 판단, 본인의 주문·체결·보유 자산과 운용 성과를 공개한다. 웹사이트의 ID/PW 로그인은 사용하지 않는다. Dashboard는 DB에 직접 연결하지 않는다.

## 접근 정책

| 범위 | 데이터 |
|---|---|
| /, /strategy, /market, /trades/*, /portfolio, /engine | 로그인 없이 공개 조회 |
| /dashboard/* | 기존 경로 호환용 공개 화면 |
| /api/dashboard/* | 허용 목록의 공개 읽기 전용 BFF |
| /healthz | 최소 웹 상태. 엔진이나 계좌 상태 없음 |
| /demo, /api/demo/* | 제거. 404 응답 |

시세 차트는 [TradingView 공식 위젯](https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/)으로 제공한다. 위젯에는 종목, 테마 등 공개 차트 설정만 전달한다. 엔진의 SMA·완충 폭·신호와 실제 주문·체결은 별도 패널과 표에서 제공하며 위젯에 덧그리거나 데이터를 추출하지 않는다. TradingView의 표시와 출처 링크를 유지한다.

## 서버 경계

- 페이지는 force-dynamic이며 BFF는 no-store다. Cloudflare와 프록시에서도 데이터 응답을 캐시하지 않는다.
- 조회 경로에는 GET만 구현한다. 주문 실행, 재시작과 설정 변경 기능은 없다.
- 엔진 주소는 운영자 설정의 단일 origin과 허용 hostname으로 제한한다. 브라우저 입력을 URL로 사용하지 않고 리다이렉트를 차단한다.
- 엔진 인증 토큰, 브로커 계좌번호와 원본 payload를 클라이언트로 전달하지 않는다. Zod 허용 목록 밖의 필드는 제거한다. 진단은 허용된 stage/code 등 최소값만 표시한다.
- 5초 타임아웃, 2 MB 응답 상한과 요청 제한을 적용한다. 오류 발생 시 이전 상태나 합성 데이터로 대체하지 않는다.
- CSP는 공식 위젯 스크립트와 프레임 주소만 추가로 허용한다. 사이트 자체의 프레임 삽입 차단, no-referrer와 nosniff는 유지한다. hydration과 위젯 스타일을 위해 script/style의 unsafe-inline을 사용한다.
- 엔진 Bearer 토큰과 실행 환경변수를 로그에 남기지 않는다. APM과 인프라 로그에도 동일한 기준을 적용한다.

## 설정 파일과 공개 범위

운용 정보 공개와 자격 증명 공개는 구분한다. 공개 저장소에는 `.env.example`의 공란과 `*.example.json`의 `REPLACE_*`만 저장한다. 실제 엔진 주소, DB 연결 정보, 계정 ID, ARN, 토큰과 운영 설정은 외부에서 관리한다. 테스트 fixture는 `tests/`에만 두며 실제 사이트에서 사용하지 않는다.

`.gitignore`는 실행 설정과 자격 증명 파일을 제외하고 `.dockerignore`는 이미지 빌드 context에서도 이를 제외한다. 이미 Git에 기록된 값은 ignore 설정만으로 제거되지 않으므로 공개 전에 전체 이력도 확인한다.

## ECS 배포 보안 경계

Dashboard Task Role은 전용 read API Secret에만 GetSecretValue를 갖는다. Execution Role은 지정 로그 전송과 cloudflared 터널 토큰 주입을 담당한다. 웹 로그인용 Secret은 필요 없다. DB와 브로커의 자격 증명, DB 직접 접근과 자원 관리 권한은 Dashboard에 부여하지 않는다.

엔진 API는 내부 네트워크에 유지하고 Next.js 서버에서 인증하여 조회한다. TLS를 기본으로 사용한다. `vpc-http`는 제한 네트워크에서만 명시적으로 선택하는 전송 모드다. 내부 HTTP는 평문이므로 DNS와 Security Group을 포함한 경계를 별도로 검증한다. 실제 배포와 연결 검증은 [검증 문서](VALIDATION.md)의 범위를 따른다.
