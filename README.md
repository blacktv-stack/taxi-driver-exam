# 🚕 택시면허 (taxi-driver-exam) — 택시운전자격시험 3초 벼락치기 CBT v4.0

> **"출퇴근길 딱 10문제 풀고 1초 만에 1원 받기! 최신 기출 실전 모의고사!"**
> 앱인토스(Apps in Toss) WebView 미니앱 · appName `taxi-driver-exam` · 표시명 **택시면허**

---

## 1. 저작권 및 공공데이터 적법성

- **저작권법 제7조 (보호받지 못하는 저작물)** 준수:
  - 국가 법률·명령·규칙 및 국가기관 고시·공고는 저작권 보호 대상이 아닌 완전 공개 공공저작물.
  - 한국교통안전공단(TS) 표준 출제기준(도로교통법, 여객자동차운수사업법, 교통안전, 지리) 기반 자체 문제은행 및 팩트 해설 구축으로 **저작권 문제 0.00% 완전 무결**.

---

## 2. 핵심 기능

1. **⚡ 3초 벼락치기 (10문제)**: 출퇴근 지하철·신호 대기 중 1~2분 완독, 즉각 O/X 판정과 1줄 팩트 해설, 10문제 완독 시 토스 포인트 1원 적립.
2. **📝 실전 모의고사 (40문제 CBT)**: 실제 시험과 동일한 4대 과목 비중(법규, 안전운행, 서비스, 수도권 지리), 30분 카운트다운, 합격 커트라인 60점 자동 채점, 과목별 취약 영역 분석.
3. **💡 취약 오답노트 클리닉**: 틀린 문제만 로컬스토리지에 자동 누적.
4. **📊 모의고사 성적표 (합격 예측 리포트, 1080×1080)**: 토스(TDS) 스타일 화이트/토스블루 카드형 성적표. 총점·상태 배지·4과목 실제 득점률 프로그레스 바. 공인기관 사칭 요소 없는 학습 기록 리포트이며 "공식 자격증이나 시험 합격 증명이 아닙니다" 안내 문구 고정 표기.

---

## 3. 수익 모델 (Unit Economics)

- **출퇴근 10문제 완독**: 유저 1원 지급 / 보상형 광고 20원 노출 = **순익 19원 (마진율 95%)**
- **모의고사 채점 & 해설 보기 / 오답노트 클리닉**: 전면·보상형 광고 20원
- **1인당 예상 순익**: 40~60원

---

## 4. 프로젝트 구조

```
taxi-driver-exam/
├── index.html               # 미니앱 본체 (단일 파일 HTML/CSS/JS, v4.0)
├── icon.png                 # 512×512 앱 아이콘 (콘솔 등록용)
├── public/icon.png          # 번들에 함께 포함되는 아이콘
├── apps-in-toss.config.ts   # 앱인토스 SDK 3.x 설정 (appName, webBundleDir 등)
├── tsconfig.json
├── package.json
└── package-lock.json
```

> SDK 3.x부터 설정 파일명은 `granite.config.ts` → **`apps-in-toss.config.ts`** 로 바뀌었습니다.
> 표시명(displayName)·아이콘은 번들이 아니라 **앱인토스 콘솔의 앱 정보**에서 설정합니다.

---

## 5. 빌드 방법 (.ait 번들 만들기)

Node.js 22 이상(LTS) 필요.

```bash
npm install
npm run build          # = vite build && ait build
```

- `npm install` → `@apps-in-toss/web-framework` 3.10.0 (ait CLI 포함) 설치
- `vite build` → `dist/index.html` 생성 (본체 HTML을 그대로 번들링)
- `ait build` → 프로젝트 루트에 **`taxi-driver-exam.ait`** 배포 번들 생성

생성된 `.ait` 파일을 [앱인토스 콘솔](https://apps-in-toss.toss.im)의 해당 앱(`taxi-driver-exam`)에 업로드하면 QR 테스트 → 출시 요청이 가능합니다.

### `.ait` 내부 구조 (SDK 3.10.0)

```
sources/index.html          # 웹 번들 본체
sources/icon.png            # 아이콘
bundle.json                 # deploymentId, byteLength, SDK 버전, config(appName 등)
project-package.json        # 빌드 시점 package.json 스냅샷
```

---

## 6. 콘솔 등록 정보

| 항목 | 값 |
| --- | --- |
| appName | `taxi-driver-exam` |
| 표시명 | 택시면허 |
| 테마 색 | `#3182F6` (토스 블루) |
| 화면 | 세로(portrait) WebView, 스크롤·바운스 최소화 |
