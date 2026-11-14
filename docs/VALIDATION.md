# 구현과 검증 기록

공개 준비 검증과 이전 구현 단계의 기록을 구분한다. 합성 데이터와 정적 검증을 실제 계좌나 운영 연결 검증으로 표현하지 않는다.

## 공개 조회와 TradingView 위젯 전환 (2026-11-14)

웹 ID/PW 인증, demo 페이지와 런타임 합성 어댑터를 제거했다. 시세는 TradingView 공식 위젯으로 제공하고 엔진의 판단값과 본인의 주문·체결·성과는 기존 패널·표·카드로 구분한다. 아래 이전 기록의 인증·demo·Recharts 검증은 해당 단계의 결과다.

| 검증 | 결과 |
|---|---|
| Node / npm | 26.13.0 / 11.20.0 |
| 타입 검사 / 단위 테스트 / Next.js 빌드 | 통과 / 16개 통과 / standalone 빌드 통과 |
| Playwright | 10개 통과. 로그인 없는 페이지·RSC·BFF, demo 404, GET 전용, 필터·페이지네이션·체결 상세, 위젯 전환·차단·테마 확인 |
| 반응형 | 1440px / 390px, Light/Dark, 여섯 메뉴 이동과 페이지 가로 넘침 없음 확인 |
| 실제 TradingView 위젯 | QQQ·TQQQ·SPYM 가격 시계열 수신과 캔들 표시, 종목·테마 전환 확인. 페이지 스크립트 오류·CSP 차단 없음 |
| 엔진 테스트 연결 | 격리된 HTTPS 테스트 엔진과 Secrets Manager 응답으로 서버 인증·응답 검증 확인. 실제 AWS·계좌 연결 아님 |
| 클라이언트 번들 | 서버 설정·Secret SDK·테스트 토큰·합성 주문 marker 미검출 |
| Dockerfile | Podman으로 Docker 형식 Linux ARM64 이미지 빌드, 이미지 내 타입·단위·빌드 검사 통과 |
| 컨테이너 | 비루트 Node 26.13.0, 공개 페이지·healthz 200, demo 404, 미연결 데이터 503, 쓰기 405, no-store와 SIGTERM 종료 143 확인 |
| 배포 설정 | 로그인 Secret 항목 제거, cloudflared 유지. JSON·문서 상대 링크·git diff --check 통과 |
| 공개 파일 검사 | 비공개 배포 파일의 연결·권한 식별자 5개와 공개 대상 74개 파일의 일치 0건 |

실제 TradingView 위젯 확인은 외부 스크립트를 대체하는 자동 UI 테스트와 별도로 수행했다. 실제 엔진, Secrets Manager, Cloudflare Tunnel과 AWS 배포는 수행하지 않았다. 테스트용 컨테이너를 제거하고 검증에 사용한 Podman 머신을 정지했다.

## Cloudflare Tunnel 컨테이너 추가 (2026-11-14)

Dashboard Task에 cloudflared를 추가하고 시작 의존성·Secret 주입·Execution Role 정책 예시를 반영했다. 엔진 Task와 실제 AWS·Cloudflare 자원은 변경하지 않았다.

- ECS JSON 문법, 로컬 배포 파일의 Git 제외, 문서 상대 링크와 git diff --check 확인.
- 배포 테스트 2개 통과. 합성 설정으로 터널 포함/미포함 검증 성공과 평문 토큰·토큰 명령행·inbound 포트·시작 의존성 누락·다른 컨테이너 거부를 확인했다.
- 이번 검증은 사용 가능한 Node 24.22.1에서 수행했다. 프로젝트 기준 Node 26 빌드, cloudflared 실제 기동과 터널 연결·DNS·Secret·IAM·네트워크 검증은 수행하지 않았다.

## 명칭과 화면 구조 변경 검증 (2026-11-14)

TQQQ 200d MA Strategy Dashboard 명칭, 메인 요약과 여섯 메뉴를 적용했다. 기존 도메인, 저장소, 이미지 경로와 별도 ECS Fargate Service 템플릿은 유지했다. AWS 자원과 거래 엔진 코드는 변경하지 않았다.

| 검증 | 결과 |
|---|---|
| 참고 사이트 버전 비교 | Node 26.13.0, Next 16.3.4, React 19.2.8, TypeScript 5.9.3 일치 |
| 엔진 전략 비교 | 원격 최신 STRATEGY.md와 로컬 문서 동일. 정책·체결 반영 구현과 기본 규칙 충돌 미발견 |
| 타입 검사 / Next.js 빌드 | 통과 |
| 단위 테스트 | 16개 통과 |
| Playwright | 새 메뉴·요약·전략 설명·인증/RSC·GET 전용·기존 필터/상세 등 11개 통과 |
| Light/Dark와 반응형 | 1440px / 390px 검증 통과. 메인과 전략 페이지 캡처 확인 |
| 차트 이벤트 | 빈 이벤트 목록을 시세 전체의 체결 마커로 표시하지 않도록 수정하고 회귀 검증 통과 |
| 클라이언트 번들 | 서버 설정과 테스트 비밀정보 marker 미검출 |
| Dockerfile | Podman으로 Docker 형식 Linux ARM64 이미지 빌드 통과. 이미지 내 타입/단위/빌드 검사 통과 |
| 컨테이너 기동 | 비루트 Node 26.13.0, /healthz 200, 인증 미설정 시 메인·전략 503, 합성 데모 200, 쓰기 요청 405 확인 |
| 컨테이너 종료 | SIGTERM 종료 코드 143 확인. 테스트 컨테이너 제거 및 이번 검증용 머신 정지 |
| 설정·문서 | ECS JSON, Workflow/Compose YAML, shell 문법, 문서 링크와 git diff --check 통과 |
| 공개 범위 검사 | Gitleaks 8.30.1로 최종 공개 대상 80개 파일과 전체 Git 이력 검사, 탐지 0건 |

실제 엔진·시세·AWS 연결, Secrets Manager 조회, 원격 CI/GHCR 게시와 AMD64 컨테이너 실행은 이번에 검증하지 않았다. 신호가 없는 평가의 가격·SMA 미제공과 현재/과거 판단값 구분은 [전략 문서](STRATEGY.md)를 따른다.

아래 공개 준비 검증은 화면 구조 변경 전의 기록이다.

## 공개 준비 검증 (2026-11-14)

| 검증 | 결과 |
|---|---|
| Node.js / npm | 26.13.0 / 11.20.0 확인 |
| npm ci --offline | 캐시를 사용한 의존성 설치 성공 |
| npx next typegen / npm run typecheck | 통과 |
| npm test | 계약, 인증, 정밀도, Secret 캐시와 ECS 권한 경계 16개 통과 |
| npm run build | Next.js standalone 프로덕션 빌드 통과 |
| 클라이언트 번들 검사 | 서버 설정/Secret SDK/테스트 token marker 미검출 |
| Playwright | Health Check, 인증/RSC, 합성 데모, 차트, 필터, 오류 처리와 1440/390px 화면 등 8개 통과 |
| ECS JSON / Workflow·Compose YAML | JSON 6개, YAML 3개 문법 검사 통과 |
| ECS 오프라인 검사 | 합성 주소와 자원 ID로 치환한 Task/Service의 validate-ecs.mjs 검사 통과. AWS 호출 없음 |
| 컨테이너 smoke 스크립트 | bash -n 통과 |
| Gitleaks 8.30.1 | 공개 대상 76개 파일과 전체 Git 이력에서 탐지 0건 |
| 비공개 설정 대조 | 별도 운영 설정에서 추출한 민감 식별자 12개와 공개 대상의 일치 0건 |

Gitleaks와 식별자 대조는 검사 시점의 파일과 이력을 대상으로 한다. 실제 엔진과 AWS 자격 증명을 사용한 검증은 수행하지 않았다.

## 적용 버전

| 항목 | 버전 |
|---|---|
| Node.js | 26.13.0 |
| npm | 11.20.0 |
| Next.js | 16.3.4 |
| React / React DOM | 19.2.8 |
| TypeScript | 5.9.3 |
| 시세 차트 | TradingView 공식 Advanced Chart 위젯 |
| decimal.js | 10.6.0 |
| Zod | 4.6.7 |
| Playwright | 1.65.0 |

의존성의 실제 해석 버전은 package-lock.json에 고정한다.

## 이전 구현 단계의 검증 기록

2026-11-13 초안에서는 타입 검사, 단위 테스트 12개, standalone 빌드, 번들 검사와 설정 문법 검사를 통과했다. 이후 ECS 템플릿과 Secret 캐시를 추가한 단계에서는 단위 테스트 16개, 타입 검사, 빌드와 번들 검사를 통과했다.

기존 엔진 응답 검증은 fetch 대체를 사용했고 Secret 캐시는 가짜 loader로 확인했다. 실제 HTTP 엔진과 Secrets Manager를 사용한 검증은 아니다. 당시 실행하지 못한 브라우저 검증은 위 공개 준비 검증에서 별도로 수행했다.

## 미검증 범위

- 메모리 부하 측정과 양쪽 아키텍처 smoke는 미검증이다. Linux ARM64 Dockerfile 빌드·기동·종료 결과는 위 화면 구조 변경 검증에 기록했다.
- Nginx의 실제 `nginx -t`, HTTPS와 배포 환경의 DNS 갱신은 검증하지 않았다.
- GitHub Actions 원격 실행, GHCR 게시와 digest 검증은 수행하지 않았다.
- 실제 AWS 배포, Secrets Manager 조회, DNS, 네트워크 경계와 배포 교체는 검증하지 않았다.
- 실제 엔진과 메리츠 API 인증을 사용한 조회는 검증하지 않았다. Dashboard는 DB에 직접 연결하지 않는다. 시세 차트는 TradingView 공식 위젯을 사용하며 엔진의 평가 시점과 구분한다.

## 검토와 연결에 필요한 작업

[배포 문서](DEPLOYMENT.md)의 로컬 실행과 검증 명령을 사용한다. 카드 밀도, 차트와 마커, 모바일 표와 Dark 대비는 [디자인 기준](DESIGN.md)에 따라 확인한다. 자동화된 브라우저 검증을 전체 디자인 검토 완료로 해석하지 않는다.

실제 연결은 외부 실행 설정으로 구성하고 인증, TLS, 토큰 회전, 실패 처리와 비밀값 비노출을 검증한다. 시세는 TradingView 위젯으로 제공하며 [메리츠 확인 기록](MERITZ_API.md)과 별도로 관리한다. 전체 이력 검색에는 [API 범위](API_INTEGRATION.md)에 기록한 추가 조회 계약이 필요하다.
