# TQQQ 200d MA Strategy Dashboard 배포

Dashboard와 cloudflared를 함께 실행하는 ECS Fargate 템플릿과 선택형 Compose, Nginx 예시를 제공한다. 템플릿은 실제 자원과 연결되지 않은 예시이며 AWS 자원 생성과 배포는 별도로 수행한다. Dashboard는 DB에 직접 연결하지 않는다.

## 설정 파일과 공개 범위

주소, 자원 ID, ARN과 자격 증명은 실행 환경에서 주입한다. 공개 저장소에는 `.env.example`의 공란과 배포 예시의 `REPLACE_*`만 저장한다. 실제 값으로 치환한 설정과 인증정보는 Git과 Docker 빌드 context에 포함하지 않는다.

ECS 예시는 엔진 연결에 필요한 설정 항목을 보여 주며, `.env.example`과 Docker 이미지의 기본값은 `DATA_ADAPTER=disabled`다. 로그인 없이 실제 조회 결과를 공개하며, 설정이 없으면 미연결 상태를 표시한다. demo 경로는 제공하지 않는다.

## Task와 Service 템플릿

| 파일 | 용도 |
|---|---|
| deploy/ecs/task-definition.example.json | Dashboard와 cloudflared를 포함한 Task |
| deploy/ecs/service.example.json | Dashboard Service |
| deploy/ecs/discovery-service.example.json | Cloud Map A 레코드 설정 예시 |
| deploy/ecs/task-role-trust-policy.example.json | ECS Task 신뢰 정책 |
| deploy/ecs/task-role-policy.example.json | 애플리케이션의 read API Secret 조회 |
| deploy/ecs/execution-role-policy.example.json | 로그 전송, 터널 토큰 Secret 주입 |
| scripts/validate-ecs.mjs | 채워진 Task/Service 파일의 오프라인 검사. AWS 호출 없음 |

초기값은 Linux ARM64, Fargate awsvpc, 0.25 vCPU/512 MiB, desiredCount=1, port 3000이다. 두 컨테이너가 Task CPU와 메모리를 공유하며 실제 사용량을 측정한 뒤 사용 환경에 맞게 조정한다. 이미지는 검증된 manifest digest로 고정한다.

컨테이너는 standalone server.js를 node 사용자로 직접 실행한다. ECS initProcessEnabled와 stopTimeout=30을 설정하고 SIGTERM을 Node로 전달한다. Health Check는 `/healthz`의 서비스명과 정상 응답을 검사한다. 엔진 장애를 Dashboard liveness 실패로 연결하지 않는다.

Service는 Dashboard용 Task Definition, Task/Execution Role과 Security Group을 사용한다. rolling 100/200과 circuit breaker rollback을 설정한다. 교체 중에는 Dashboard가 일시적으로 2개일 수 있다. 메모리 캐시와 요청 제한은 프로세스별로 적용된다. 다중 인스턴스에서는 프록시의 공유 요청 제한도 구성한다.

## 환경변수와 Secret

| 설정 | 용도 |
|---|---|
| NODE_ENV / PORT / HOSTNAME | production / 3000 / 0.0.0.0 |
| AWS_REGION | Secrets Manager와 배포 예시의 AWS 리전 |
| DATA_ADAPTER | disabled / engine |
| ENGINE_API_BASE_URL | 외부 설정으로 주입하는 엔진 origin |
| ENGINE_API_ALLOWED_HOST | 위 origin의 hostname만 허용 |
| ENGINE_API_TRANSPORT | 기본 tls |
| ENGINE_PRIVATE_DNS_SUFFIX | 제한된 내부 HTTP를 선택한 경우의 호스트 검증 조건 |
| ENGINE_READ_API_TOKEN_SECRET_ARN | 전용 read API 토큰 Secret ARN |

운영에서 ENGINE_READ_API_TOKEN 평문 환경변수는 사용하지 않는다. 애플리케이션은 SDK 기본 자격 증명 체인의 Task Role로 Secrets Manager AWSCURRENT의 token 필드를 읽는다. 60초 메모리 캐시, 동시 요청 병합, 3초 조회 타임아웃을 적용한다. 만료 후 조회 실패 시 이전 토큰을 제공하지 않는다. 엔진 401/403은 캐시를 비우며 다음 조회에서 새 값을 읽는다. Secret 값과 SDK 예외는 로그나 브라우저로 출력하지 않는다.


Task Role은 전용 read API Secret의 GetSecretValue만 갖는다. Execution Role은 지정 로그 전송과 cloudflared 터널 토큰 주입을 담당한다. 실제 ARN, 계정 ID와 Secret 값은 외부 설정에만 둔다. DB와 브로커의 자격 증명이나 관리 권한은 Dashboard에 부여하지 않는다.

웹 ID/PW와 로그인용 Secret은 사용하지 않는다. TradingView 위젯은 브라우저에서 공식 스크립트와 프레임을 불러오며 별도 API 키가 필요하지 않다. 엔진 read API 토큰과 Cloudflare Tunnel 토큰은 기존처럼 서버 실행 환경에 유지한다.

## 네트워크와 HTTP 보안 경계

외부 접근은 HTTPS를 사용한다. Dashboard와 엔진 사이도 TLS를 기본으로 사용하며 인증서 검증을 해제하지 않는다. 사설 CA는 `NODE_EXTRA_CA_CERTS`로 신뢰 체인을 구성한다.

`vpc-http`는 검증된 제한 네트워크에서만 명시적으로 선택하는 전송 모드다. 내부 HTTP에서는 Bearer 토큰과 개인 데이터가 평문으로 흐른다. DNS와 Security Group은 암호화를 제공하지 않으므로 사용 환경의 경계를 별도로 검증해야 한다.

배포 예시의 네트워크 항목은 사용 환경에 맞게 설정한다. 공개 IP와 고정 Task IP를 엔진 연결 주소로 저장하지 않으며, 실제 DNS 이름과 네트워크 식별자를 채운 파일은 공개 저장소에서 제외한다.

## Cloudflare Tunnel 컨테이너

ECS Task에 `dashboard`와 `cloudflared`를 함께 실행한다. 엔진은 기존 별도 Task로 유지한다. `cloudflared`는 Dashboard의 `/healthz`가 정상인 뒤 시작하며, 필수 컨테이너로 지정하여 종료 시 ECS Service가 Task를 교체할 수 있도록 한다. 시작 의존성은 터널의 외부 연결 상태를 지속적으로 검사하는 기능이 아니다.

Cloudflare의 원격 관리 터널에서 공개 호스트 `tqqq.dalae37.com`의 서비스 URL을 `http://localhost:3000`으로 설정한다. 같은 Linux Fargate Task의 컨테이너는 localhost로 통신하므로 Task IP를 고정하지 않는다. 이 경로는 Cloudflare에서 별도로 설정해야 하며 Task JSON만으로 DNS나 터널 경로가 생성되지는 않는다. Nginx는 별도 진입 경로를 사용할 때만 필요한 선택형 예시다.

`REPLACE_CLOUDFLARE_TUNNEL_TOKEN_SECRET_ARN`에는 터널 토큰 문자열 전체를 저장한 Secrets Manager Secret ARN을 넣는다. ECS가 이를 `TUNNEL_TOKEN`으로 주입한다. JSON 형식 Secret을 사용한다면 해당 키를 선택하는 Secret 참조로 바꾼다. 명령행과 일반 environment에 토큰을 기록하지 않는다. Execution Role에 이 Secret의 `secretsmanager:GetSecretValue`를 허용하며 Task Role의 권한은 확장하지 않는다. 고객 관리 KMS 키를 사용하면 해당 키 복호화 권한도 별도로 확인한다.

cloudflared는 공식 공개 이미지 `cloudflare/cloudflared:latest`를 사용한다. 운영 버전을 고정할 때는 검증한 ARM64 지원 태그나 digest로 바꾼다. 컨테이너 업데이트는 ECS의 새 Task 교체로 적용한다. Dashboard용 IAM·로그 설정과 같이 실제 Secret ARN을 채운 파일은 공개 저장소에서 제외한다.

터널 컨테이너에는 inbound 포트 매핑이 없다. 터널 전용 진입이면 Dashboard 3000번도 인터넷에 개방할 필요가 없다. 기존 이미지/로그/Secret 조회용 HTTPS·DNS 경로와 함께 Cloudflare Tunnel 목적지에 outbound TCP/UDP 7844를 허용한다. 기존 Public IP 설정은 아웃바운드 경로이며 inbound 공개를 의미하지 않는다. Dashboard는 로그인 없이 공개한다. no-store 정책을 유지하고 Cloudflare에서도 데이터 페이지와 BFF를 캐시하지 않는다.

참고: [Cloudflare 실행 인자](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/), [Cloudflare 방화벽 조건](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/), [Fargate Task 네트워크](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-security-considerations.html).

## Nginx와 Compose 예시

`deploy/nginx/tqqq.dalae37.com.conf`는 Dashboard용 HTTPS 프록시 예시다. upstream, Resolver와 인증서 경로의 `REPLACE_*`를 외부 설정에서 치환한다. envsubst를 사용하면 치환할 환경변수만 명시적으로 허용하고 Nginx의 `$host`, `$request_uri`, `$dashboard_upstream` 변수는 보존한다.

프록시는 공개 조회 경로의 no-store와 요청 제한을 유지한다. 실제 사용 전 `nginx -t`, HTTPS, 공개 조회와 DNS 갱신을 확인한다. 설정 파일에 인증정보를 기록하지 않는다.

`deploy/compose.yaml`은 선택형 실행 예시다. 검증된 `DASHBOARD_IMAGE`, 외부 네트워크 설정과 별도의 `dashboard.env`를 사용 환경에서 제공한다. 실제 설정 파일은 공개 저장소에 포함하지 않는다.

## 독립 배포 절차

GHCR workflow는 Dashboard 이미지 빌드, 검증과 게시를 수행한다. AWS 배포는 아래 예시를 참고하여 별도로 진행한다.

1. Task/Service 예시를 로컬 설정 파일로 복사하고 모든 `REPLACE_*`를 외부 설정으로 채운다.
2. 검증된 manifest digest를 Task의 image에 입력한다.
3. AWS CLI로 Dashboard Task를 등록한다.

```bash
aws ecs register-task-definition --region "$AWS_REGION" \
  --cli-input-json file://deploy/ecs/task-definition.local.json
```

반환된 Dashboard Task Definition ARN:revision을 service.local.json에 넣고 오프라인 검사 후 등록한다. 설정 파일은 Git과 Docker 빌드 context에서 제외한다.

```bash
node scripts/validate-ecs.mjs deploy/ecs/task-definition.local.json deploy/ecs/service.local.json "$ECS_CLUSTER"
aws ecs create-service --region "$AWS_REGION" \
  --cli-input-json file://deploy/ecs/service.local.json
```

이후 배포는 새 Dashboard revision을 등록한 뒤 해당 Dashboard Service에 적용한다.

```bash
aws ecs update-service --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER" --service "$DASHBOARD_SERVICE" \
  --task-definition "$DASHBOARD_TASK_REVISION"
aws ecs wait services-stable --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER" --services "$DASHBOARD_SERVICE"
```

services-stable만으로 앱 정상이라고 판단하지 않는다. Task Health Check, `/healthz`, 로그인 없는 메인·상세 페이지와 `/dashboard`, 공개 BFF, 제거된 demo의 404, read 토큰 오류, 엔진 연결 실패와 로그의 비밀값 비노출을 확인한다. rollback은 Dashboard의 검증된 이전 revision을 사용한다.

## 로컬 개발과 검증

Node 26.13.0, npm 11.20.0을 사용한다. `npm ci` 후 `npm run dev`로 loopback `/`에서 화면을 확인한다. 엔진 연결 설정이 없으면 값은 미제공으로 표시하며 TradingView 차트는 별도로 불러온다. 브라우저 테스트는 격리된 테스트 엔진·Secret 응답을 사용하고 실제 계좌에 연결하지 않는다.

```bash
npm ci --no-audit --no-fund
npx next typegen
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
node scripts/verify-client-bundle.mjs
```

Docker 이미지 빌드, 비루트 실행, `/healthz` HTTP 응답과 SIGTERM 종료는 컨테이너 실행 환경에서 별도로 확인한다. 검증 결과와 미검증 범위는 [검증 문서](VALIDATION.md)를 따른다.
