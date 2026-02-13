# HWPX Form Service

나라장터 입찰 문서(HWPX) 양식에 데이터를 주입하기 위한 Java 백엔드 서비스입니다.

## Stack
- Java 17
- Spring Boot 3
- `kr.dogfoot:hwpxlib:1.0.8`
- `org.jsoup:jsoup:1.17.2`

## Run
```bash
cd backend/hwpx-form-service
mvn spring-boot:run
```

기본 포트: `8080`

## API
### 1) HWPX 필드 채우기
`POST /api/hwpx/fill`

multipart/form-data:
- `templateFile`: `.hwpx` 템플릿 파일
- `fieldsJson`: `{"fieldName":"value"}` 형태의 JSON 문자열
- `outputFileName` (optional): 결과 파일명

curl 예시:
```bash
curl -X POST "http://127.0.0.1:8080/api/hwpx/fill" \
  -F "templateFile=@./template.hwpx" \
  -F "fieldsJson={\"bidTitle\":\"AI 역량강화 사업\",\"issuingAgency\":\"OO공사\"}" \
  -F "outputFileName=proposal-filled.hwpx" \
  --output proposal-filled.hwpx
```

### 2) 공고 양식 자동 탐색
`GET /api/hwpx/forms/discover`

query params:
- `bidNtceNo` (required): 공고번호
- `bidNtceOrd` (optional): 공고차수
- `bidNtceUrl` (optional): 공고 원문 URL
- `apiKey` (optional): 데이터포털 서비스 키
- `shouldEncodeKey` (optional, default: `true`)

설명:
- 1차: `bidNtceUrl` 페이지에서 첨부파일 링크를 파싱
- 2차: 나라장터 `PNPE027` 공고의 내부 API를 호출해 첨부 목록(`itemPbancUntyAtchFileNo` 기반) 조회
- 3차: 필요 시 OpenAPI 응답 내 URL 후보를 탐색
- 결과는 `.hwpx/.hwp/.pdf/.docx/.zip` 등 확장자 기반으로 필터링

### 3) 탐색한 양식 다운로드
`GET /api/hwpx/forms/download?fileUrl={encodedUrl}`

설명:
- 브라우저 CORS 제약 없이 백엔드 프록시로 원격 파일을 다운로드
- 응답 헤더 `Content-Disposition`에 파일명을 포함

## Field Mapping Policy
- 1차: 본문 토큰 `{{fieldName}}` 문자열 치환
- 2차: HWPX 필드명(`FieldBegin.name`) 일치 항목에 값 삽입
- 3차: 표(Table) 내 라벨 셀(예: `공고명`, `사업명`, `공고번호`, `발주기관` 등)을 탐색해, 오른쪽(또는 아래) 값 셀의 빈 칸/placeholder에 값 삽입

## Notes
- 현재 채우기 엔드포인트는 `.hwpx`만 직접 지원합니다.
- `.hwp`는 `hwplib` 또는 `hwp2hwpx` 변환 후 처리하는 방식을 권장합니다.
- CORS 허용 기본값: `http://127.0.0.1:5173,http://localhost:5173`
