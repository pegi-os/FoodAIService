# FoodAIService DB Schema (Draft)

이 문서는 현재 프로젝트에서 사용할 **음식점(restaurant) 중심 스키마 초안**입니다.  
SQLite 기준으로 작성했지만, MySQL/Postgres로 옮겨도 구조는 그대로 가져갈 수 있게 설계했습니다.

## 1) restaurants
음식점 기본 정보(지도 표시/검색의 기준 테이블).

- `id` INTEGER PRIMARY KEY
- `name` TEXT NOT NULL
- `address` TEXT NOT NULL
- `lat` REAL NULL
- `lng` REAL NULL
- `created_at` TEXT
- `updated_at` TEXT

## 2) restaurant_ai_summaries
AI가 생성한 요약/분석(1 restaurant : 1 summary).

- `restaurant_id` INTEGER PRIMARY KEY (FK → `restaurants.id`)
- `summary` TEXT  (AI 종합 리뷰)
- `pros_json` TEXT  (AI가 뽑은 장점: JSON 배열 문자열)
- `cons_json` TEXT  (AI가 뽑은 주의점: JSON 배열 문자열)
- `recommended_for_json` TEXT  (추천 대상: JSON 배열 문자열)
- `atmosphere` TEXT  (분위기)
- `value_for_money` TEXT  (가성비)
- `revisit_intent` TEXT  (재방문 의사)
- `updated_at` TEXT

### pros/cons/recommended_for를 JSON으로 둔 이유
초기엔 목록 항목이 늘거나 구조가 바뀌기 쉬워서, 테이블을 잘게 쪼개기보다 **JSON TEXT로 유연성**을 확보합니다.  
추후 검색/통계 요구가 커지면 정규화(별도 테이블 분리)로 이전합니다.

## 3) keywords
리뷰 키워드 사전 테이블.

- `id` INTEGER PRIMARY KEY
- `keyword` TEXT NOT NULL UNIQUE

## 4) restaurant_keywords
음식점-키워드 N:M 매핑 테이블.

- `restaurant_id` INTEGER NOT NULL (FK → `restaurants.id`)
- `keyword_id` INTEGER NOT NULL (FK → `keywords.id`)
- PRIMARY KEY (`restaurant_id`, `keyword_id`)

## 5) reviews
리뷰 원문/대표 리뷰/출처 저장(1 restaurant : N reviews).

- `id` INTEGER PRIMARY KEY
- `restaurant_id` INTEGER NOT NULL (FK → `restaurants.id`)
- `source` TEXT  (예: "카카오맵", "네이버")
- `content` TEXT NOT NULL
- `is_featured` INTEGER NOT NULL DEFAULT 0  (대표 리뷰 여부: 0/1)
- `written_at` TEXT  (예: "6일 전" 원문 보관 또는 ISO 문자열)
- `created_at` TEXT

## 확장 방향
- 메뉴/이미지/태그/영업시간처럼 **여러 개가 될 데이터는 별도 테이블**로 분리하는 쪽이 관리가 쉽습니다.
- 좌표(`lat/lng`)는 주소 기반 지오코딩을 통해 채우되, 한 번 구한 좌표는 DB에 저장해 **캐싱**하는 것을 권장합니다.

