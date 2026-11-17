import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'taxitaxi',
  brand: {
    // 앱인토스 공통 UI는 기본 토스 블루를 사용하므로 호환용으로만 남깁니다.
    primaryColor: '#3182F6',
  },
  permissions: [],
  navigationBar: {
    withBackButton: true,
    withTitle: true,
    transparentBackground: false,
    theme: 'light',
  },
  webView: {
    bounces: false,
    pullToRefreshEnabled: false,
    overScrollMode: 'never',
    allowsBackForwardNavigationGestures: false,
  },
  webBundleDir: 'dist',
});
