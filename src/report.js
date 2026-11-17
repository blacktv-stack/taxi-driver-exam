/**
 * 성적표(1080×1080 PNG) 저장 · 공유 연동
 * ------------------------------------------------------------
 * SDK: @apps-in-toss/web-framework 3.10.0
 *
 * [저장]
 *   File.saveBase64({ data, fileName, mimeType })   (함수형 별칭: saveBase64Data)
 *   - Base64 문자열(데이터 URI 접두사 없이)을 기기에 저장한다.
 *   - 토스 앱 사양상 저장 시 OS 저장/공유 시트가 함께 뜬다(안드로이드: Pictures에 저장 후 시트).
 *   - SDK 저장이 실패/미지원이면 navigator.share({ files }) 로 저장 시트를 띄우고,
 *     토스 앱 밖(PC·deed.page)에서는 <a download> 로 다운로드 폴더에 저장한다.
 *
 * [공유]
 *   1순위 navigator.share({ files: [File] })  : 웹 표준 Web Share Level 2 — 카카오톡·문자·이미지 저장 등 OS 공유 시트
 *   2순위 Share.sendMessage({ message })      : 앱인토스 SDK 텍스트 공유(이미지 첨부 미지원 → 요약 텍스트 + 링크)
 *   3순위 navigator.share({ text }) / 클립보드 복사
 *
 * 모든 SDK 호출은 isSupported()/try-catch 로 감싸 토스 앱 밖에서도 예외가 페이지로 새지 않는다.
 */
import { File as TossFile, Share } from '@apps-in-toss/web-framework';

const APP_LINK = 'https://taxicbt.deed.page/';

/** 토스 앱 웹뷰 안인지 확인 (SDK 브릿지가 주입되는 유일한 환경) */
function isTossWebView() {
  try {
    return typeof window !== 'undefined' && window.ReactNativeWebView != null;
  } catch (e) {
    return false;
  }
}

function supportsSave() {
  try {
    return typeof TossFile.saveBase64 === 'function' && TossFile.saveBase64.isSupported() === true;
  } catch (e) {
    return false;
  }
}

function dataUrlToBase64(dataUrl) {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function dataUrlToFile(dataUrl, fileName) {
  const comma = dataUrl.indexOf(',');
  const head = comma >= 0 ? dataUrl.slice(0, comma) : '';
  const mimeMatch = /:(.*?);/.exec(head);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(dataUrlToBase64(dataUrl));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], fileName, { type: mimeType });
}

function triggerDownload(dataUrl, fileName) {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  setTimeout(function () { link.remove(); }, 0);
}

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    /* 권한이 없으면 아래 폴백 */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch (e) {
    return false;
  }
}

/**
 * OS 공유 시트로 이미지 파일을 넘긴다. (같은 시트의 '이미지 저장'으로 사진첩 저장도 가능)
 * @returns {Promise<'shared'|'canceled'|'unsupported'|'failed'>}
 */
async function tryShareFile(dataUrl, fileName, title, text) {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return 'unsupported';
    // 동기 변환 → 사용자 제스처(activation)를 잃지 않고 곧바로 share() 를 호출한다.
    const file = dataUrlToFile(dataUrl, fileName);
    const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    if (!canShareFiles) return 'unsupported';
    try {
      await navigator.share({ files: [file], title: title, text: text });
      return 'shared';
    } catch (error) {
      if (error && error.name === 'AbortError') return 'canceled';
      console.warn('[TaxiReport] navigator.share(files) 실패', error);
      return 'failed';
    }
  } catch (e) {
    console.warn('[TaxiReport] 파일 공유 준비 실패', e);
    return 'failed';
  }
}

async function tryShareText(title, text) {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return 'unsupported';
    await navigator.share({ title: title, text: text });
    return 'shared';
  } catch (error) {
    if (error && error.name === 'AbortError') return 'canceled';
    return 'failed';
  }
}

/**
 * 성적표 이미지를 기기에 저장한다.
 * @returns {Promise<{ok: boolean, via: 'toss-save'|'share-save'|'download'|'none', canceled?: boolean, error?: string}>}
 */
export async function saveReport(canvas, meta) {
  const dataUrl = canvas.toDataURL('image/png');
  const fileName = meta.fileName || 'taxi-report.png';
  const inToss = isTossWebView();

  // 1) 토스 앱: SDK 가 기기 사진첩(Pictures)·파일 앱으로 저장한다.
  if (inToss && supportsSave()) {
    try {
      await TossFile.saveBase64({
        data: dataUrlToBase64(dataUrl),
        fileName: fileName,
        mimeType: 'image/png',
      });
      return { ok: true, via: 'toss-save' };
    } catch (error) {
      console.warn('[TaxiReport] File.saveBase64 실패 — 공유 시트로 저장 폴백', error);
    }
  }

  // 2) 토스 앱인데 SDK 저장이 안 되면: 공유 시트의 '이미지 저장'으로 저장 경로를 만든다.
  if (inToss) {
    const shared = await tryShareFile(dataUrl, fileName, meta.title, meta.text);
    if (shared === 'shared') return { ok: true, via: 'share-save' };
    if (shared === 'canceled') return { ok: false, via: 'share-save', canceled: true };
    return { ok: false, via: 'none' };
  }

  // 3) PC·웹 브라우저: 다운로드 폴더로 저장
  try {
    triggerDownload(dataUrl, fileName);
    return { ok: true, via: 'download' };
  } catch (error) {
    return { ok: false, via: 'download', error: String(error) };
  }
}

/**
 * 성적표를 공유한다. (이미지 파일 → 텍스트+링크 → 클립보드 순 폴백)
 * @returns {Promise<{ok: boolean, via: 'share-file'|'toss-share-text'|'share-text'|'clipboard'|'none', canceled?: boolean}>}
 */
export async function shareReport(canvas, meta) {
  const dataUrl = canvas.toDataURL('image/png');
  const fileName = meta.fileName || 'taxi-report.png';
  const title = meta.title || '택시면허 모의고사 성적표';
  const text = meta.text || '';

  // 1순위: Web Share Level 2 — 이미지까지 카카오톡·문자·이미지 저장으로 바로 보낼 수 있다.
  const fileShare = await tryShareFile(dataUrl, fileName, title, text);
  if (fileShare === 'shared') return { ok: true, via: 'share-file' };
  if (fileShare === 'canceled') return { ok: false, via: 'share-file', canceled: true };

  // 2순위: 텍스트만이라도 OS 공유 시트(카카오톡·문자)
  const textShare = await tryShareText(title, text);
  if (textShare === 'shared') return { ok: true, via: 'share-text' };
  if (textShare === 'canceled') return { ok: false, via: 'share-text', canceled: true };

  // 3순위: 앱인토스 SDK 네이티브 공유 시트(텍스트 전용)
  if (isTossWebView()) {
    try {
      if (Share && typeof Share.sendMessage === 'function') {
        await Share.sendMessage({ message: text });
        return { ok: true, via: 'toss-share-text' };
      }
    } catch (error) {
      console.warn('[TaxiReport] Share.sendMessage 실패 — 클립보드 폴백', error);
    }
  }

  // 4순위: 클립보드 복사
  if (await copyText(text)) return { ok: true, via: 'clipboard' };
  return { ok: false, via: 'none' };
}

/** 저장 위치 안내 문구를 환경에 맞게 바꾼다. */
export function applySaveHint() {
  const hint = document.getElementById('reportSaveHint');
  if (!hint) return;
  hint.innerText = isTossWebView()
    ? '저장한 성적표는 폰 사진첩(갤러리) 또는 파일 앱에서 확인할 수 있어요.'
    : '웹 미리보기에서는 이미지가 다운로드 폴더에 저장돼요.';
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySaveHint);
  } else {
    applySaveHint();
  }
}

// HTML 인라인 스크립트(onclick 핸들러)에서 접근할 수 있도록 노출
if (typeof window !== 'undefined') {
  window.TaxiReport = {
    APP_LINK: APP_LINK,
    isTossWebView: isTossWebView,
    saveReport: saveReport,
    shareReport: shareReport,
  };
}
