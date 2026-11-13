# 메리츠 Open API 확인 결과

웹사이트는 메리츠 API를 직접 호출하지 않는다. 엔진 조회 API를 우선 사용한다. 실제 시세 어댑터는 내부 연결 경로, 전용 인증, 거래소 코드와 이용 범위를 검증하기 전까지 미연결 상태다.

확인일은 2026-11-13이다. [API 목록](https://openapi.imeritz.com/apiservice), [이용 안내](https://openapi.imeritz.com/howto-use), [신청과 유의사항](https://openapi.imeritz.com/api-apply), [공식 JSON 명세](https://openapi.imeritz.com/api-spec/download/json)를 확인했다.

## 확인한 조회 기능

| 목적 | 공식 GET 경로 | 주요 필드 / 조건 |
|---|---|---|
| 현재가 | /market/v1/overseas/prices | mrkt_div_code, mrkt_cls_code, iscd, dely_rltm_cls_code → prpr, acml_vol, crnc_code |
| 일봉 | /market/v1/overseas/candles/days | 위 공통값과 mod_stpr_cls_code, from/to → date, prpr, oprc, hprc, lprc, acml_vol |
| 분봉 | /market/v1/overseas/candles/minutes | 위 공통값과 hour_cls_code → korea_date, korea_hour, prpr, oprc, hprc, lprc, cntg_vol |
| 보유 종목 | /accounts/v1/me/overseas/holdings | rmnd_dqty, avrg_unpr, vltn_prls_camt, frcr_vltn_amt. 연속조회 검증 필요 |
| 외화 잔고 | /accounts/v1/me/overseas/currencies | crcd, frcr_amt, estm_frcr_amt, entm_aset_vltn_amt |
| 주문과 체결 | /trading/v1/overseas/orders/history | oder_sta_date, oder_fin_date, cntg_cls_code, tr_cont/tr_cont_key |
| 실현손익 | /accounts/v1/me/overseas/profit-loss | 기간, ctcd, 거래소, 종목. 원화와 외화 실현값 구분 |
| 거래소 코드 | /reference/v1/overseas/exchanges | ovrs_stck_exch_idno, ovrs_exch_vndr_idno, ovrs_stck_mrkt_tr_cls_code |
| 장운영 | /reference/v1/overseas/market-hours | 시장 거래 코드, 운영 구분과 시작/종료 시각 |
| 영업일 | /reference/v1/overseas/market-days | 거래소 vendor 코드 → bsop_date. 완전한 과거/미래 달력 아님 |

일봉 `mod_stpr_cls_code=0`은 분할 보정, `1`은 보정 전 가격이다. from/to를 함께 지정하지 않으면 최신 40건이다. 분봉 hour_cls_code는 초 단위이며 300은 5분이다. 필수값 누락과 잘못된 값을 정규화하여 성공으로 취급하지 않는다. 실제 세 종목의 시세/주문/참조 거래소 코드는 별도로 확인해야 한다. 알려진 일반 거래소 이름만으로 값을 설정하지 않는다.

환율은 공식 목록의 환전 적용환율 조회, 고시환율 조회, 환율 시세 조회를 후속 검토한다. 실시간 해외주식 현재가와 접수/체결 통보도 공식 목록에서 확인했지만 WebSocket 구현은 이번 범위에 포함하지 않았다. 직접 사용하지 않는 API의 URL과 필드를 추정해 코드에 넣지 않았다.

## 인증, 이용 조건과 오류

- 증권사 OAuth 발급은 공식 명세의 `/oauth2/token`이다. App Key와 Secret은 서버 전용이다. 웹사이트가 기존 엔진의 브로커 토큰을 복제하지 않는다.
- 신청 유의사항은 본인의 투자 목적 사용과 제3자 정보 제공 금지를 명시한다. 공개 Mock에 실제 시세, 계좌, 체결 정보를 제공하지 않는다.
- 공개 범위에서 정확한 계좌별 TPS와 캐시 허용 기간을 확정하지 못했다. 운영 연동 전 포털의 해당 계좌 유량 조건을 확인한다. 임의의 숫자를 공식 제한으로 적지 않는다.
- 명세는 EGW00200을 초당 호출 제한 초과로 안내한다. 일부 조회는 5766, 거래소 조회는 코드별 성공 값 등 API마다 성공 판정이 다르다. HTTP 200이나 rsp_cd=0000만을 공통 성공 조건으로 사용하지 않는다.
- 응답의 빈 data, 응답 코드, 연속조회 키와 마지막 페이지를 함께 검증해야 한다. 원본 오류 메시지에 계좌 정보가 있을 수 있으므로 브라우저나 일반 로그에 전달하지 않는다.
- 실제 시세 연동 시 종목/주기/기간별 메모리 캐시와 동시 요청 병합을 사용하고 계좌별 호출 한도를 엔진과 함께 배정해야 한다. 이용 조건을 확인하기 전에는 실데이터 캐시 TTL을 확정하지 않는다.

## 현재 구현과 남은 작업

Mock은 30초 메모리 캐시를 사용한다. 실제 시세는 빈 bars와 미연결 사유를 반환한다. Mock 일봉, 분봉, SMA와 세션은 모두 합성 예시이며 실제 거래소 일정을 나타내지 않는다.

안전한 확장 경로는 전용 내부 조회 서비스 또는 기존 조회 계층의 별도 계약이다. 전용 자격 증명, 토큰 갱신, 공식 필드 검증, 시각 검증, 요청 예산, 오류 처리, 라이선스 범위를 검증한 뒤 server/market 어댑터를 교체한다.
