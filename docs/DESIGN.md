# 디자인 초안

현재 디자인은 검토용이다. 참고 사이트의 Noto Sans KR, 녹색 CSS 변수, 여백, 간결한 헤더와 Light/Dark 연속성을 유지하면서 대시보드의 정보 밀도를 높였다.

상단 프로젝트 제목과 상태, 요약 카드, 중앙 QQQ/SMA200 차트 미리보기, 하단 최근 거래 5건 순서다. 전략 설명과 상태는 Strategy, 상세 차트는 Market에서 제공한다. 거래 상세, 보유 현황과 엔진 상태는 별도 화면이다. 1,440px와 390px 브라우저 검증 코드를 제공하며 실제 실행 결과는 검증 기록에 구분한다.

## 차트 라이브러리

| 후보 | 장점 | 제약과 라이선스 |
|---|---|---|
| Recharts | React 컴포넌트, 반응형, 툴팁, 선/거래량/이벤트 조합과 초안 수정이 간단 | 대규모 틱이나 전문 캔들 UI는 추가 구현 필요. MIT 라이선스와 고지 유지 |
| TradingView Lightweight Charts | 금융 시계열과 캔들, 확대/이동에 적합 | 명령형 수명주기 연결 필요. Apache-2.0과 TradingView NOTICE 및 링크 attribution 요구 확인 |

이번 초안에는 Recharts 3.10.1을 선택했다. 낮은 빈도의 읽기 전용 화면과 기존 React 작성 방식에 맞추기 쉽다. 전문 금융 차트와 고빈도 시세가 필요해지면 PriceChart 컴포넌트와 시장 어댑터 경계를 유지하고 교체할 수 있다.

근거: [Recharts 라이선스](https://github.com/recharts/recharts/blob/main/LICENSE), [Lightweight Charts 공식 안내](https://tradingview.github.io/lightweight-charts/docs).

## 다음 화면 검토 대상

- 카드 크기와 자산/손익 정보 우선순위
- 차트 높이, 거래량 대비, 마커 겹침과 툴팁 가독성
- 모바일의 표 스크롤과 필터 배치
- Dark 환경의 텍스트 대비와 상태 색상
- 반복되는 데이터 출처와 시각 표시의 밀도
- 자체 제공 폰트의 용량과 부분 분할

색상과 카드 모양은 globals.css 변수와 컴포넌트별 클래스로 조정한다. 신호/주문/체결 구분, 데이터 출처, Mock 배너와 인증 경계는 디자인 변경 중에도 유지한다.
