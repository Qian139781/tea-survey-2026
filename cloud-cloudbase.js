/* 腾讯云 CloudBase 数据适配层
 * 与 cloud.js 暴露相同的 saveResponse / loadAll 接口。
 * 使用前需在 config.js 填写 cloudbaseEnv，并在 CloudBase 控制台：
 *   1. 开启“匿名登录”；
 *   2. 新建集合 survey_responses；
 *   3. 数据库权限设为“所有用户可读，仅创建者可写”或按需要自定义安全规则。
 */
(function () {
  const CFG = window.SURVEY_CONFIG;
  const SDK_URL = 'https://static.cloudbase.net/cloudbase-js-sdk/2.7.1/cloudbase.full.js';
  const COLLECTION = CFG.cloudbaseCollection || 'survey_responses';

  let app = null;
  let db = null;
  let readyPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const old = document.querySelector('script[data-cloudbase-sdk]');
      if (old && window.cloudbase) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.dataset.cloudbaseSdk = '1';
      s.onload = resolve;
      s.onerror = () => reject(new Error('CloudBase SDK 加载失败'));
      document.head.appendChild(s);
    });
  }

  async function ready() {
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      if (!CFG.cloudbaseEnv) throw new Error('未配置 CloudBase 环境 ID');
      await loadScript(SDK_URL);
      if (!window.cloudbase) throw new Error('CloudBase SDK 不可用');
      app = window.cloudbase.init({ env: CFG.cloudbaseEnv });
      const auth = app.auth();
      const user = auth.currentUser;
      if (!user) await auth.signInAnonymously();
      db = app.database();
      return db;
    })().catch(e => { readyPromise = null; throw e; });
    return readyPromise;
  }

  async function saveResponse(record) {
    await ready();
    const data = Object.assign({}, record, {
      createdAt: db.serverDate ? db.serverDate() : new Date(record.ts)
    });
    const res = await db.collection(COLLECTION).add({ data });
    const id = res && (res.id || (res.data && res.data.id)) ? (res.id || res.data.id) : '';
    return { binId: String(id), shard: 'cloudbase' };
  }

  async function loadAll(onProgress) {
    await ready();
    const all = [];
    const pageSize = 100;
    let skip = 0;
    while (true) {
      const res = await db.collection(COLLECTION)
        .orderBy('ts', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get();
      const list = (res && res.data) || [];
      all.push(...list);
      skip += list.length;
      if (onProgress) onProgress(1, 1, all.length, all.length);
      if (list.length < pageSize) break;
      if (skip >= 5000) break; // 防止异常无限循环
    }
    all.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
    return all;
  }

  window.TeaCloudBase = { ready, saveResponse, loadAll };
})();
