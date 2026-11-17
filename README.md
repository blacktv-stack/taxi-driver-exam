# 🚕 택시면허 (taxi-driver-exam) — 택시운전자격시험 3초 벼락치기 CBT v4.2

> **"출퇴근길 딱 10문제 풀고 1초 만에 1원 받기! 최신 기출 실전 모의고사!"** (v4.2 — 성적표 저장·카톡 공유)
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
5. **📄 성적표 저장 · 📤 공유하기 (v4.2)**: 저장은 토스 SDK `File.saveBase64`로 폰 사진첩(갤러리)·파일 앱에 실제 저장하고, 공유하기는 웹 표준 Web Share API(`navigator.share({ files })`)로 OS 공유 시트를 열어 **카카오톡·문자로 이미지를 바로 전송**합니다. PC·웹 미리보기에서는 `<a download>` 다운로드로 폴백합니다.

---

## 3. 수익 모델 (Unit Economics)

- **출퇴근 10문제 완독**: 유저 1원 지급 / 보상형 광고 20원 노출 = **순익 19원 (마진율 95%)**
- **모의고사 채점 & 해설 보기 / 오답노트 클리닉**: 전면·보상형 광고 20원
- **1인당 예상 순익**: 40~60원

---

## 4. 프로젝트 구조

```
taxi-driver-exam/
├── index.html               # 미니앱 본체 (단일 파일 HTML/CSS/JS, v4.2)
├── src/ads.js               # 앱인토스 인앱 광고(전면형·배너) 연동 모듈
├── src/report.js            # 성적표 저장(File.saveBase64)·공유(Web Share) 모듈
├── scripts/inline-bundle.mjs# vite 산출물을 단일 index.html로 인라인
├── icon.png                 # 512×512 앱 아이콘 (콘솔 등록용)
├── public/icon.png          # 번들에 함께 포함되는 아이콘
├── apps-in-toss.config.ts   # 앱인토스 SDK 3.x 설정 (appName, webBundleDir 등)
├── tsconfig.json
├── package.json
└── package-lock.json
```

---

## 4-1. 인앱 광고 연동 (SDK 3.10.0, v4.1)

`src/ads.js` 가 `@apps-in-toss/web-framework` 3.10.0 의 광고 API를 직접 사용합니다.

| 구분 | 광고 그룹 ID | API | 진입 지점 |
| --- | --- | --- | --- |
| 전면형(Interstitial) | `ait.v2.live.25d0edef1a194483` | `loadFullScreenAd` / `showFullScreenAd` | 모의고사 `🎬 광고 보고 채점 결과 확인하기` |
| 배너(Banner) | `ait.v2.live.a803b0a902dc4434` | `TossAds.initialize` → `TossAds.attachBanner` | 모든 화면 하단 도크 `#tossBannerSlot` |

- **전면형**: 앱 시작 시 미리 `load` → 채점 버튼에서 `show` → `dismissed` 후 성적표 표시 → 다음 광고를 다시 `load` (`load → show → load` 규칙 유지).
- **배너**: `TossAds.initialize({ callbacks: { onInitialized } })` 성공 후 `attachBanner(adGroupId, '#tossBannerSlot', { theme:'auto', tone:'grey', variant:'card' })`. `onAdRendered` 에서 슬롯을 노출하고 목업 배너를 숨깁니다.
- **폴백(필수)**: ① 토스 앱 웹뷰가 아니면(deed.page·PC 브라우저) 전면 광고는 목업 모달로 시뮬레이션하고 하단 목업 배너를 그대로 노출, ② 광고 로드가 2.6초 안에 오지 않거나 `failedToShow`·오류·타임아웃(25초)이면 **광고 없이 곧바로 성적표를 열고** 안내 토스트만 띄웁니다(채점이 막히지 않음), ③ `onNoFill`·`onAdFailedToRender` 이면 목업 배너로 복귀해 빈 하단 띠가 남지 않습니다.
- 모든 SDK 호출은 `try/catch` + `isSupported()` 가드로 감싸 토스 앱 밖에서도 예외가 페이지로 새지 않습니다.

> SDK 3.x부터 설정 파일명은 `granite.config.ts` → **`apps-in-toss.config.ts`** 로 바뀌었습니다.
> 표시명(displayName)·아이콘은 번들이 아니라 **앱인토스 콘솔의 앱 정보**에서 설정합니다.

---

## 4-2. 성적표 저장 · 공유 연동 (SDK 3.10.0, v4.2)

`src/report.js` 가 성적표 모달의 `📄 저장` / `📤 공유하기` 를 담당합니다. 성적표 PNG(1080×1080)는 `#reportCanvas` 에 그린 뒤 아래 순서로 처리합니다.

| 동작 | 1순위 | 2순위 | 3순위 |
| --- | --- | --- | --- |
| 📄 저장 | `File.saveBase64({ data, fileName, mimeType })` — 토스 앱에서 기기 사진첩(Pictures)·파일 앱에 저장 | `navigator.share({ files })` — 저장/공유 시트의 '이미지 저장' | `<a download>` — PC·웹 미리보기의 다운로드 폴더 |
| 📤 공유하기 | `navigator.share({ files: [pngFile], title, text })` — 카카오톡·문자·이미지 저장 | `navigator.share({ title, text })` — 텍스트+링크 | `Share.sendMessage({ message })` → 클립보드 복사 |

- `File.saveBase64` 의 `data` 는 **데이터 URI 접두사 없는 순수 Base64** 입니다(문서 예시 `data: 'iVBORw0KGgo...'`).
- 토스 앱 사양상 `File.saveBase64` 는 저장 시 **OS 저장/공유 시트를 함께 띄웁니다**(안드로이드는 `Pictures` 저장 후 시트). 그래서 저장 토스트도 "사진첩(갤러리)·파일 앱에 저장했어요! 저장 확인 창이 뜨면 저장을 눌러주세요." 로 저장 위치와 다음 동작을 함께 안내합니다. 안내 문구(`#reportSaveHint`)는 토스 앱/웹에 따라 자동으로 바뀝니다.
- 공유는 **파일을 동기적으로 `File` 로 변환한 뒤 곧바로 `navigator.share()` 를 호출**해 사용자 제스처(transient activation)를 잃지 않게 했습니다. `navigator.canShare({ files })` 로 지원 여부를 먼저 확인합니다.
- 파일명은 `택시모의고사_성적표_{지역}_{이름}_{YYYYMMDD}_{HHMMSS}.png` 로 **초 단위까지** 붙여, 같은 이름의 파일이 이미 있을 때 저장이 어긋나는 사례를 피합니다.
- 모든 호출은 `isSupported()` + `try/catch` 로 감싸 토스 앱 밖(PC·deed.page)에서도 예외가 페이지로 새지 않습니다. 참고: 앱인토스에는 사진첩 직접 저장·이미지 첨부 공유 전용 API가 없어(텍스트 전용 `Share.sendMessage` 만 제공) 위와 같이 웹 표준 API를 함께 사용합니다.

---

## 5. 빌드 방법 (.ait 번들 만들기)

Node.js 22 이상(LTS) 필요.

```bash
npm install
npm run build          # = vite build && node scripts/inline-bundle.mjs && ait build
```

- `npm install` → `@apps-in-toss/web-framework` 3.10.0 (ait CLI 포함) 설치
- `vite build` → `dist/index.html` + `dist/assets/*.js` (광고 SDK 번들) 생성
- `node scripts/inline-bundle.mjs` → JS 청크를 `dist/index.html` 안으로 인라인(단일 파일화)
- `ait build` → 프로젝트 루트에 **`taxitaxi.ait`** 배포 번들 생성

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
