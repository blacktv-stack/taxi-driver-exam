/**
 * 앱인토스(Apps in Toss) 인앱 광고 연동
 * ------------------------------------------------------------
 * SDK: @apps-in-toss/web-framework 3.10.0
 *
 * [전면형 / Interstitial]
 *   loadFullScreenAd({ options: { adGroupId }, onEvent, onError }) => () => void
 *   showFullScreenAd({ options: { adGroupId }, onEvent, onError }) => () => void
 *   - load 이벤트: { type: 'loaded' }
 *   - show 이벤트: 'requested' | 'show' | 'impression' | 'clicked' | 'dismissed' | 'failedToShow' | 'userEarnedReward'
 *   - load → show → (다음 load) 순서를 지켜야 하며, 같은 adGroupId로 동시에 하나만 미리 로드할 수 있음
 *
 * [배너 / Inline Banner]
 *   TossAds.initialize({ callbacks: { onInitialized, onInitializationFailed } })
 *   TossAds.attachBanner(adGroupId, target, { theme, tone, variant, callbacks }) => { destroy }
 *   - callbacks: onAdRendered | onAdViewable | onAdClicked | onAdImpression | onAdFailedToRender | onNoFill
 *
 * 토스 앱 웹뷰가 아닌 곳(일반 브라우저·deed.page)에서는 광고 API가 동작하지 않으므로
 * 모든 호출을 감싸서 실패해도 채점 결과/레이아웃이 깨지지 않도록 폴백 처리한다.
 */
import { loadFullScreenAd, showFullScreenAd, TossAds } from '@apps-in-toss/web-framework';

/** 앱인토스 콘솔에서 발급받은 광고 그룹 ID */
export const AD_GROUP_ID = {
  interstitial: 'ait.v2.live.25d0edef1a194483', // 전면형 (모의고사 채점)
  banner: 'ait.v2.live.a803b0a902dc4434', // 배너 (하단 인라인)
};

const LOAD_WAIT_MS = 2600; // 채점 버튼 클릭 후 광고 로드 대기 상한
const SHOW_GUARD_MS = 25000; // 전면 광고 표시 후 결과 콜백이 없을 때 안전 해제

/** 토스 앱 웹뷰 안인지 확인 (SDK 브릿지가 주입되는 유일한 환경) */
export function isTossWebView() {
  try {
    return typeof window !== 'undefined' && window.ReactNativeWebView != null;
  } catch (e) {
    return false;
  }
}

function supports(fn) {
  try {
    return typeof fn === 'function' && typeof fn.isSupported === 'function' && fn.isSupported() === true;
  } catch (e) {
    return false;
  }
}

function once(fn) {
  let called = false;
  return function () {
    if (called) return;
    called = true;
    try {
      return fn.apply(null, arguments);
    } catch (e) {
      /* noop */
    }
  };
}

// ---------------------------------------------------------------- 전면형 광고

let status = 'idle'; // idle | loading | loaded | failed
let unsubscribeLoad = null;
let unsubscribeShow = null;
let loadWaiters = [];
let showing = false;

function resolveWaiters(ok) {
  const list = loadWaiters;
  loadWaiters = [];
  list.forEach(function (fn) {
    try {
      fn(ok);
    } catch (e) {
      /* noop */
    }
  });
}

/** 전면 광고를 미리 불러온다 (load → show → load 패턴) */
export function preloadInterstitial() {
  if (!isTossWebView()) return;
  if (status === 'loading' || status === 'loaded' || showing) return;

  status = 'loading';
  try {
    if (typeof unsubscribeLoad === 'function') unsubscribeLoad();
  } catch (e) {
    /* noop */
  }
  unsubscribeLoad = null;

  try {
    unsubscribeLoad = loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID.interstitial },
      onEvent: function (event) {
        if (event && event.type === 'loaded') {
          status = 'loaded';
          resolveWaiters(true);
        }
      },
      onError: function () {
        status = 'failed';
        resolveWaiters(false);
      },
    });
  } catch (e) {
    // 토스 앱 밖이거나 지원하지 않는 앱 버전 — 조용히 폴백
    status = 'failed';
    resolveWaiters(false);
  }
}

function waitForLoad(ms) {
  if (status === 'loaded') return Promise.resolve(true);
  if (status === 'failed') return Promise.resolve(false);

  return new Promise(function (resolve) {
    let settled = false;
    const waiter = function (ok) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      loadWaiters = loadWaiters.filter(function (w) {
        return w !== waiter;
      });
      resolve(ok);
    };
    const timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      loadWaiters = loadWaiters.filter(function (w) {
        return w !== waiter;
      });
      resolve(false);
    }, ms);

    loadWaiters.push(waiter);
    preloadInterstitial();
  });
}

function showNow(done) {
  if (status !== 'loaded' || showing) {
    done({ shown: false, reason: 'not-loaded' });
    preloadInterstitial();
    return;
  }

  showing = true;
  status = 'loading';
  let finished = false;

  const finish = function (result) {
    if (finished) return;
    finished = true;
    clearTimeout(guard);
    try {
      if (typeof unsubscribeShow === 'function') unsubscribeShow();
    } catch (e) {
      /* noop */
    }
    unsubscribeShow = null;
    showing = false;
    status = 'idle';
    done(result);
    setTimeout(preloadInterstitial, 400);
  };

  const guard = setTimeout(function () {
    finish({ shown: false, reason: 'timeout' });
  }, SHOW_GUARD_MS);

  try {
    unsubscribeShow = showFullScreenAd({
      options: { adGroupId: AD_GROUP_ID.interstitial },
      onEvent: function (event) {
        const type = event && event.type;
        if (type === 'dismissed') {
          finish({ shown: true });
        } else if (type === 'failedToShow') {
          finish({ shown: false, reason: 'failedToShow' });
        }
      },
      onError: function () {
        finish({ shown: false, reason: 'error' });
      },
    });
  } catch (e) {
    finish({ shown: false, reason: 'exception' });
  }
}

/**
 * 전면 광고를 노출하고, 광고가 닫히면(또는 노출 실패 시) 반드시 한 번 콜백을 호출한다.
 * @param {(result: {shown: boolean, reason?: string}) => void} onDone
 */
export function showInterstitial(onDone) {
  const done = once(onDone);

  if (!isTossWebView()) {
    done({ shown: false, reason: 'web' });
    return;
  }

  waitForLoad(LOAD_WAIT_MS).then(function (ok) {
    if (!ok) {
      done({ shown: false, reason: 'not-ready' });
      preloadInterstitial();
      return;
    }
    showNow(done);
  });
}

// ------------------------------------------------------------------- 배너 광고

let bannerAttached = false;
let bannerHandle = null;

export function initBanner() {
  if (bannerAttached) return;
  const slot = document.getElementById('tossBannerSlot');
  if (!slot) return;
  bannerAttached = true;

  const mock = document.getElementById('bottomAdBanner');
  const showMockBanner = function () {
    slot.classList.remove('is-active');
    slot.classList.remove('is-armed');
    if (mock) mock.style.display = '';
  };
  const hideMockBanner = function () {
    if (mock) mock.style.display = 'none';
  };

  // 웹 미리보기(토스 앱 밖)에서는 기존 목업 배너를 그대로 노출
  if (!isTossWebView()) return;
  if (!supports(TossAds.initialize)) return;

  function attach() {
    hideMockBanner();
    // 광고 SDK가 실제로 그릴 수 있도록 슬롯을 먼저 레이아웃에 올린다(빈 상태 = 높이 0).
    slot.classList.add('is-armed');
    try {
      bannerHandle = TossAds.attachBanner(AD_GROUP_ID.banner, slot, {
        theme: 'auto',
        tone: 'grey',
        variant: 'card',
        callbacks: {
          onAdRendered: function () {
            slot.classList.add('is-active');
            hideMockBanner();
          },
          onNoFill: showMockBanner,
          onAdFailedToRender: showMockBanner,
        },
      });
    } catch (e) {
      showMockBanner();
    }
  }

  try {
    TossAds.initialize({
      callbacks: {
        onInitialized: attach,
        onInitializationFailed: showMockBanner,
      },
    });
  } catch (e) {
    showMockBanner();
  }
}

// ------------------------------------------------------------------- 자동 초기화

function boot() {
  initBanner();
  preloadInterstitial();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}

// HTML 인라인 스크립트(onclick 핸들러)에서 접근할 수 있도록 노출
if (typeof window !== 'undefined') {
  window.TaxiAds = {
    AD_GROUP_ID: AD_GROUP_ID,
    isTossWebView: isTossWebView,
    showInterstitial: showInterstitial,
    preloadInterstitial: preloadInterstitial,
    initBanner: initBanner,
  };
}
