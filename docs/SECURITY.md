# 인증과 데이터 공개 범위

개인 계좌와 실제 거래 정보는 소유자 인증 후에만 조회한다. 공개 합성 Mock은 실데이터 경로를 사용하지 않는다. 기본 계정, 비밀번호와 외부 엔진 주소를 생성하지 않는다. Dashboard는 DB에 직접 연결하지 않는다.

## 접근 정책

| 범위 | 인증과 데이터 |
|---|---|
| /, /strategy, /market, /trades/*, /portfolio, /engine | proxy와 서버 페이지에서 인증 |
| /demo, /api/demo/* | 공개 합성 fixture. 실제 엔진 요청 없음 |
| /dashboard/* | Next.js proxy와 페이지의 이중 서버 인증 |
| /api/dashboard/* | proxy와 Route Handler에서 서버 인증 |
| /healthz | 비인증 최소 웹 상태. 엔진이나 계좌 상태 없음 |

현재 초안은 단일 소유자용 HTTP Basic 인증이다. 관리자가 이름과 scrypt 해시를 설정해야 한다. 평문 비밀번호를 저장하지 않으며 timingSafeEqual로 비교한다. 잘못된 자격 증명은 프로세스당 분당 20회 이후 차단하고 scrypt 동시 계산도 제한한다. 이는 중앙화된 공격 차단을 대신하지 않는다. 인터넷 운영은 HTTPS와 프록시의 공유 요청 제한을 함께 적용한다.

Basic 자격 증명은 브라우저가 캐시하므로 이 초안에는 로그아웃 버튼이 없다. 비밀번호 변경 시 서버 해시를 교체한다. 다중 사용자, MFA, 세션 회수가 필요하면 별도 인증 구성을 검토한다.

## 서버 경계

- 민감 응답은 private, no-store이고 공유 캐시를 사용하지 않는다. 보호 페이지는 force-dynamic이다. RSC 요청도 동일한 인증 경계를 통과한다.
- 조회 경로에는 GET만 구현한다. POST, PUT, PATCH, DELETE 거래 경로가 없다. 주문 실행과 설정 변경 기능도 없다.
- 엔진 주소는 운영자 설정의 단일 origin과 허용 hostname으로 제한한다. 브라우저 입력을 URL로 사용하지 않고 리다이렉트를 차단한다.
- 엔진 인증 토큰, 해시, 브로커 계좌번호와 원본 payload를 클라이언트로 전달하지 않는다. Zod 허용 목록 밖의 필드는 제거한다. 진단은 허용된 stage/code 등 최소값만 표시한다.
- 5초 타임아웃, 2 MB 응답 상한과 요청 제한을 적용한다. 오류 발생 시 이전 상태나 Mock으로 대체하지 않는다.
- CSP, frame 차단, no-referrer와 nosniff를 적용한다. Next.js hydration과 Recharts 스타일을 위해 현재 CSP의 script/style은 unsafe-inline을 포함한다. nonce 기반 엄격화는 후속 검토 대상이다.
- 프록시는 Authorization을 Next.js로 전달하지만 로그에 기록하지 않는다. 제시한 보호 경로의 access log는 비활성화한다. APM/인프라 로그에도 Authorization과 환경변수를 남기지 않는다.

## 설정 파일과 공개 범위

공개 저장소에는 `.env.example`의 공란과 `*.example.json`의 `REPLACE_*`만 저장한다. 실제 엔진 주소, DB 연결 정보, 계정 ID, ARN, 토큰, 비밀번호 해시와 운영 설정은 외부에서 관리한다. 합성 fixture에 실제 계좌나 거래 내역을 복사하지 않는다.

`.gitignore`는 실행 설정과 자격 증명 파일을 제외하고 `.dockerignore`는 이미지 빌드 context에서도 이를 제외한다. 이미 Git에 기록된 값은 ignore 설정만으로 제거되지 않으므로 공개 전에 전체 이력도 확인한다.

## 배포 전 필요한 확인

실제 인증 사용자와 비밀번호 해시는 실행 환경에서 지정한다. 주소, TLS 인증서, read 토큰 저장과 회전, 네트워크 접근 범위를 사용 환경에서 검증한다. BFF가 원격 엔진에 실제 연결됐다는 검증은 아직 없다.

비공개 데이터에 대한 인터넷 접근은 인증 오류, RSC, BFF, 요청 제한, 캐시와 클라이언트 번들을 포함해 검증한다. 메리츠 시세는 본인 투자 목적의 보호된 화면에서만 제공하며 제3자 공개나 재배포 권한을 가정하지 않는다. 실제 브로커 인증정보를 Next.js나 브라우저로 복사하여 이 제한을 우회하지 않는다.

## ECS 배포 보안 경계

Dashboard Task Role은 전용 read API Secret에만 GetSecretValue를 갖는다. Execution Role은 별도이며 지정 로그와 로그인 Secret 주입만 담당한다. DB와 브로커의 자격 증명, DB 직접 접근과 자원 관리 권한은 Dashboard에 부여하지 않는다. 실제 Role과 Secret ARN을 채운 파일은 외부에서 관리한다.

TLS를 기본으로 사용한다. `vpc-http`는 제한 네트워크에서만 명시적으로 선택하는 전송 모드다. DNS와 Security Group은 TLS를 대신하는 암호화가 아니며, 내부 HTTP의 인증정보와 계좌 데이터는 평문이다. 이 모드는 별도 경계 검증이 필요하다. 실제 배포와 연결 검증은 [검증 문서](VALIDATION.md)의 범위를 따른다.
