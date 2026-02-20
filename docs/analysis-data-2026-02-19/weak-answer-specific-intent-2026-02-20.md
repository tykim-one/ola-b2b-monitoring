# 특정 의도 질문 대비 비실질 답변 케이스

> 작성일: 2026-02-20
>
> 목적: "종목명/코드 명시 또는 종합분석/추이 질문"인데도 실질 답변이 없는 케이스 식별

## 요약

- 총 건수: **6건**
- response_node 분포: AMBIGUOUS 6건

| 패턴 | 내부코드 | 건수 |
|---|---|---:|
| 정확한 종목요청인데 종목상태만 답한 케이스 | `entity_status_only_on_specific_request` | 5 |
| 추이질문인데 추이 데이터 없이 안내한 케이스 | `trend_question_but_no_concrete_trend` | 1 |

## 정확한 종목요청인데 종목상태만 답한 케이스

- 건수: **5건**

### entity_status_only_on_specific_request-001
- **timestamp**: 2026-02-20 01:01:36
- **tenant_id**: ibks
- **session_id**: e81b9063-1df4-40ec-8d5c-542582750dcd
- **x_enc_data**: TEAnTsvTzsD/KJyma/nW9HtfV7xXmHJgdkxWYIh0jzrSLMz9wpRsnI9zXxCyXC2J7oJQmOdVzUAsweSEE+MZtw==
- **response_node**: AMBIGUOUS
- **response_len**: 162
- **user_input**: STX엔진(077970)를 종합적으로 분석해줘
- **llm_response_1000**: - STX엔진(077970): 현재 KOSPI 시장에서 활발히 거래 중인 종목입니다. - 미국 주식은 나스닥100, S&P500 지수 내 종목만 다루므로, STX엔진은 한국 주식으로 분석 가능합니다. - 상세한 재무, 산업 동향, 경쟁사 비교 등 추가 정보가 필요하면 말씀해 주세요.

### entity_status_only_on_specific_request-002
- **timestamp**: 2026-02-19 00:17:28
- **tenant_id**: ibks
- **session_id**: 1d9f27a0-c38d-467c-9cc9-6352c6053b55
- **x_enc_data**: nUYEi89jInh5Qk3CYYUaI/2zJa71IRl4Xi0GE+FQzRaifCqsmdoFaAD9r4e06eOeT1VC6qfKqC8gvC5JYd4w0w==
- **response_node**: AMBIGUOUS
- **response_len**: 124
- **user_input**: 프레스티지바이오파마(950210)를 종합적으로 분석해줘
- **llm_response_1000**: - 프레스티지바이오파마(950210)는 현재 데이터에 존재하지 않는 종목입니다. - 대신 프레스티지바이오로직스(334970)는 KOSDAQ에서 활발히 거래 중인 종목입니다. - 정확한 종목코드 확인 후 다시 문의해 주세요.

### entity_status_only_on_specific_request-003
- **timestamp**: 2026-02-19 00:17:13
- **tenant_id**: ibks
- **session_id**: 4aec4ad3-0ad5-4fa9-bfb4-66092d54e9b0
- **x_enc_data**: vR19r4a3zik3PX29sedCYuSxEvSzPpEquMSTKQJoXZMGL7S/3V34gr8Ozmvi5Iwbt9DWfYTX1O6ej4jkI1RvxA==
- **response_node**: AMBIGUOUS
- **response_len**: 43
- **user_input**: 삼영(003720)를 종합적으로 분석해줘
- **llm_response_1000**: - 삼영(003720): KOSPI 상장, 현재 활발히 거래 중인 종목입니다.

### entity_status_only_on_specific_request-004
- **timestamp**: 2026-02-15 21:27:05
- **tenant_id**: ibks
- **session_id**: c68196c1-085d-4b79-9157-fbe09bf90fe7
- **x_enc_data**: 8Cebw0l1bn0Dt1jz7XiPJ1KB3C0c6YwnvyO94cPOMKr7YdnogMuUhaY+IcFBPK4gAkza6ql2rUJtSLk1S5uTHA==
- **response_node**: AMBIGUOUS
- **response_len**: 54
- **user_input**: SK텔레콤(017670)를 종합적으로 분석해줘
- **llm_response_1000**: - SK텔레콤(017670, SK텔레콤): 현재 KOSPI 시장에서 활발히 거래 중인 종목입니다.

### entity_status_only_on_specific_request-005
- **timestamp**: 2026-02-14 01:26:41
- **tenant_id**: ibks
- **session_id**: b851fc51-c54c-4fdc-8a93-9432db1deee5
- **x_enc_data**: CW4TEgGW9n5oEY5RyOzvs3HeEpxOB9Qw3As/6ilWCv+u3kbQylUnV9gri2yHKP7PLegdLlAAQEfBiQ6uTXZSYw==
- **response_node**: AMBIGUOUS
- **response_len**: 210
- **user_input**: 대동(000490)를 종합적으로 분석해줘
- **llm_response_1000**: - 대동(000490, KOSPI): 현재 활발히 거래 중인 종목입니다. - 대동기어(008830, KOSDAQ), 대동금속(020400, KOSDAQ), 대동전자(008110, KOSPI)와는 별개의 종목이니 혼동 주의 바랍니다. - 대동전자는 현재 거래가 중단된 상태입니다. - 추가적인 재무정보, 산업 동향, 경쟁사 비교 등 구체적 분석이 필요하면 알려주세요.

## 추이질문인데 추이 데이터 없이 안내한 케이스

- 건수: **1건**

### trend_question_but_no_concrete_trend-001
- **timestamp**: 2026-02-18 09:37:03
- **tenant_id**: ibks
- **session_id**: 9ece972e-5f8f-4541-a950-d0b41d2597ba
- **x_enc_data**: t6ffR/y7AOd3oeKClBLU9fpFsyM3kVgF2MA0+f5D7FBwJKt0iNaufVX1ILUE0+sZ8HAKnysZPa1ktuyefhFdmA==
- **response_node**: AMBIGUOUS
- **response_len**: 116
- **user_input**: 대원전선 최근 주가 변동 추이는 어떻습니까?
- **llm_response_1000**: - 대원전선(006340, KR) - 대원전선우(006345, KR) 두 종목 모두 KOSPI 시장에서 활발히 거래 중이며, 최근 주가 변동 추이에 대한 구체적인 데이터가 필요하면 추가로 알려주세요.
