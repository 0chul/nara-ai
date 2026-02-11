
# Expert Proposal Automator

AI 기반 제안서 자동화 시스템입니다. 나라장터 공공입찰 데이터를 활용한 자동 제안서 생성 기능이 통합되어 있습니다.

## ✨ 주요 기능

### 1. RFP 파일 업로드
- PDF, PPTX, DOCX 형식의 제안요청서 업로드
- 다중 파일 지원

### 2. 나라장터 입찰 공고 검색 (신규!)
- 공공 입찰 공고 직접 검색 및 선택
- 자동 RFP 변환 및 제안서 생성
- Supabase 클라우드 저장소 연동

### 3. AI 멀티 에이전트 시스템
- **RFP 분석**: 요구사항 자동 추출
- **트렌드 연구**: HRD/비즈니스 트렌드 분석
- **전략 수립**: 3가지 차별화 전략 제시
- **과정 매칭**: 내부 강사/과정 자동 매칭
- **제안서 작성**: 전문 슬라이드 콘텐츠 생성

## 🚀 시작하기

### 1. 환경 설정

`.env.example`을 복사하여 `.env` 파일을 생성하고 다음 정보를 입력하세요:

```bash
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_NARA_API_KEY=your_nara_api_key (선택사항)
```

### 2. 로컬 실행

```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
```

## 📋 사용 방법

1. **대시보드** → "New Proposal" 클릭
2. **RFP 선택**:
   - **"나라장터 입찰 공고 가져오기"** (공공입찰 활용)
   - 또는 파일 업로드 (기존 방식)
3. **자동 분석** → AI가 요구사항 추출
4. **트렌드/전략** → AI가 제안 전략 생성
5. **과정 매칭** → 강사 및 교육과정 추천
6. **제안서 미리보기** → 최종 검토 및 다운로드

## 🔑 API Key 설정

- **Google AI Studio Key**: 웹사이트 상단 "에이전트 설정" 메뉴에서 입력
- **Nara API Key**: `.env` 파일에 추가 (선택사항)
- **Supabase Credentials**: `.env` 파일에 추가 (필수)

## 🏗️ 기술 스택

- **Frontend**: React + TypeScript + Vite
- **UI**: Lucide Icons + Custom CSS
- **AI**: Google Generative AI (Gemini)
- **Database**: Supabase + Dexie (IndexedDB)
- **Charts**: Recharts

