/* 云数据库访问层：ExtendsClass JSON Storage（无需注册，支持跨域） */
(function () {
  const CFG = window.SURVEY_CONFIG;

  // 配置 CloudBase 环境后，改由腾讯云数据库承载答卷
  if (CFG.cloudbaseEnv) {
    const CB = window.TeaCloudBase;
    if (!CB) throw new Error('CloudBase 适配层未加载：请确认 cloud-cloudbase.js 在 cloud.js 之前引入');
    window.TeaCloud = {
      createBin: async () => { throw new Error('CloudBase 模式不使用 bin'); },
      readBin: async () => [],
      writeBin: async () => {},
      saveResponse: (...args) => CB.saveResponse(...args),
      loadAll: (...args) => CB.loadAll(...args)
    };
    return;
  }

  // 服务端在 JSON 后附带站点 HTML，这里取出第一个完整 JSON 值
  function extractJson(text) {
    const s = String(text || '').trim();
    let start = -1;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '{' || s[i] === '[') { start = i; break; }
    }
    if (start < 0) throw new Error('云端返回内容无法解析');
    const open = s[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') { inStr = true; continue; }
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return JSON.parse(s.slice(start, i + 1));
      }
    }
    throw new Error('云端返回内容不完整');
  }

  async function parseResponse(res, what) {
    const text = await res.text();
    if (!res.ok) throw new Error(what + '失败（HTTP ' + res.status + '）');
    try { return extractJson(text); } catch (e) { throw new Error(what + '返回异常'); }
  }

  async function createBin(data) {
    const res = await fetch(CFG.cloudBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const out = await parseResponse(res, '创建云端记录');
    if (out.status !== 0 || !out.id) throw new Error('创建云端记录失败');
    return out.id;
  }

  async function readBin(id) {
    const url = CFG.cloudBase + '/' + encodeURIComponent(id) + '?cb=' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    const res = await fetch(url, { cache: 'no-store' });
    return await parseResponse(res, '读取云端数据');
  }

  async function writeBin(id, data) {
    const res = await fetch(CFG.cloudBase + '/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const out = await parseResponse(res, '写入云端数据');
    if (out.status !== 0) throw new Error('写入云端数据被拒绝');
    return true;
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function shardFor(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return CFG.indexBins[h % CFG.indexBins.length];
  }

  /* 先把答卷写入独立 bin，再把索引写入分片 bin；索引采用读取-追加-写回 + 重试 */
  async function saveResponse(record) {
    const binId = await createBin(record);
    const shard = shardFor(binId);
    let lastErr;
    for (let attempt = 0; attempt < 7; attempt++) {
      try {
        const list = await readBin(shard);
        const arr = Array.isArray(list) ? list : [];
        if (!arr.some(x => x && x.id === binId)) {
          arr.push({ id: binId, ts: record.ts });
          await writeBin(shard, arr);
        }
        return { binId, shard };
      } catch (e) {
        lastErr = e;
        await sleep(180 * (attempt + 1) + Math.floor(Math.random() * 120));
      }
    }
    const err = new Error('答卷已存入云端，但索引同步失败，请保存此回执码：' + binId);
    err.binId = binId;
    err.shard = shard;
    throw err;
  }

  async function loadAll(onProgress) {
    const ids = [];
    for (let i = 0; i < CFG.indexBins.length; i++) {
      let arr = [];
      try { arr = await readBin(CFG.indexBins[i]); } catch (e) { /* 单个分片失败不影响其余 */ }
      if (Array.isArray(arr)) arr.forEach(x => { if (x && x.id) ids.push(x.id); });
      if (onProgress) onProgress(i + 1, CFG.indexBins.length, 0, ids.length);
    }
    const unique = Array.from(new Set(ids));
    const records = [];
    for (let i = 0; i < unique.length; i += 10) {
      const batch = unique.slice(i, i + 10);
      const results = await Promise.all(batch.map(async id => {
        try { return await readBin(id); } catch (e) { return null; }
      }));
      results.forEach(r => { if (r && typeof r === 'object' && r.a) records.push(r); });
      if (onProgress) onProgress(CFG.indexBins.length, CFG.indexBins.length, Math.min(i + 10, unique.length), unique.length);
    }
    records.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
    return records;
  }

  window.TeaCloud = { createBin, readBin, writeBin, saveResponse, loadAll, extractJson };
})();
