// app.js
App({
  onLaunch() {
    // ===== Cloud Development init =====
    // After you click "开通云开发" in WeChat DevTools, it creates an
    // environment and gives you an Env ID (e.g. "song-contest-xxxxxx").
    // Put that Env ID below (replace CLOUD_ENV). Until then, cloud calls
    // will fail gracefully and the UI shows a "请先开通云开发" message.
    if (wx.cloud) {
      try {
        wx.cloud.init({
          env: this.globalData.cloudEnv, // <-- set your cloud environment id
          traceUser: true
        });
        this.globalData.cloudReady = true;
      } catch (e) {
        this.globalData.cloudReady = false;
        console.error('cloud init failed', e);
      }
    } else {
      this.globalData.cloudReady = false;
      console.warn('wx.cloud not available — update base library to >= 2.2.3');
    }
  },

  globalData: {
    // ===== Cloud environment =====
    // TODO: replace with YOUR cloud env id from DevTools "云开发" console.
    // It is NOT the AppID. It looks like "song-contest-1g2h3j4k5l".
    cloudEnv: 'REPLACE_WITH_YOUR_CLOUD_ENV_ID',
    cloudReady: false,

    // Number of judges for the contest.
    judgeCount: 5,
    // Scoring dimensions, each out of its max. Total max = 100.
    dimensions: [
      { key: 'vocal', label: '音准/唱功', max: 40 },
      { key: 'emotion', label: '情感表达', max: 30 },
      { key: 'stage', label: '台风表现', max: 20 },
      { key: 'overall', label: '综合印象', max: 10 }
    ],

    // ===== Access control =====
    // Each authorized judge is bound to a fixed seat (0-based judge index).
    // A logged-in judge may ONLY view and edit their own seat's score.
    // The nickname must match (case-insensitive, trimmed) the "name" below.
    authorizedJudges: [
      { name: 'herring', seat: 0 },
      { name: '索隆', seat: 1 },
      { name: '克莱鹅🦢Claire', seat: 2 },
      { name: 'thinkerz', seat: 3 },
      { name: '青', seat: 4 }
    ]
  }
});
