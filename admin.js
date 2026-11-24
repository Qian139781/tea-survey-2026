(function () {
  const QS = window.QUESTIONS;
  const NO_DRINK = '最近一个月没有喝过';
  const $ = id => document.getElementById(id);
  const state = { records: [], filtered: [], page: 1, pageSize: 20, expanded: null, unlocked: false };

  /* 纯 JS SHA-256（兼容非 https 本地预览） */
  function sha256(message) {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    const bytes = [];
    for (let i = 0; i < message.length; i++) {
      const c = message.charCodeAt(i);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push((bitLen / Math.pow(2, i * 8)) & 0xff);
    const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Array(64);
    for (let off = 0; off < bytes.length; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    return h.map(x => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function num(v) { const m = String(v || '').match(/\d+/); return m ? Number(m[0]) : 0; }
  function isDrinker(a) { return a.Q3 && a.Q3 !== NO_DRINK; }
  function isB1(a) { return !isDrinker(a) && /每周 3 次及以上|每周 1–2 次/.test(a.Q4 || ''); }
  function groupOf(a) {
    const q15 = a.Q15 || '', q16 = a.Q16 || '';
    const q15low = /^(完全不了解|略知一二)/.test(q15), q16low = /^(完全不知道|看包装)/.test(q16);
    const q15high = /^(比较了解|很了解)/.test(q15), q16high = /^(先查攻略|有固定)/.test(q16);
    if (isDrinker(a)) {
      if (q15low || q16low) return 'A';
      if (q15high && q16high) return 'C';
      return 'X';
    }
    const p = num(a.Q12);
    if (p >= 4) return 'B';
    if (p <= 2) return 'D';
    return 'X';
  }
  function groupName(g) { return ({ A: 'A 有习惯·不懂茶', B: 'B 空白·想开始', C: 'C 有习惯·懂茶', D: 'D 空白·无意愿', X: '其他' })[g] || '其他'; }
  function flat(v) {
    if (Array.isArray(v)) return v.join(' | ');
    if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => k + ':' + x).join('; ');
    return v == null ? '' : String(v);
  }

  function bars(title, counts, total) {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return '<div><h3 style="font-size:14px;margin:0 0 12px">' + esc(title) + '</h3>' +
      (entries.length ? entries.map(([k, n]) =>
        '<div class="bar-row"><span class="bar-label" title="' + esc(k) + '">' + esc(k) + '</span><span class="bar-count">' + n + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + (total ? Math.max(2, n / total * 100) : 0) + '%"></span></span></div>'
      ).join('') : '<div class="muted">暂无数据</div>') + '</div>';
  }
  function countBy(key, map) {
    const c = {};
    map.forEach(r => { const k = r.a[key] || '（未答）'; c[k] = (c[k] || 0) + 1; });
    return c;
  }

  function renderStats() {
    const rs = state.records;
    const groups = { A: 0, B: 0, C: 0, D: 0, X: 0 };
    rs.forEach(r => groups[groupOf(r.a)]++);
    const b1 = rs.filter(r => isB1(r.a)).length;
    const meanQ22 = rs.length ? (rs.reduce((s, r) => s + num(r.a.Q22), 0) / rs.length).toFixed(2) : '0.00';
    $('stats').innerHTML = [
      [rs.length, '总答卷数'],
      [rs.filter(r => isDrinker(r.a)).length, '有喝茶习惯'],
      [groups.A, 'A 类 · 有习惯不懂茶'],
      [groups.B, 'B 类 · 空白想开始'],
      [groups.C, 'C 类 · 有习惯懂茶'],
      [b1, 'B1 · 喝奶茶未喝原叶茶'],
      [meanQ22, '定制方案兴趣均值']
    ].map(([v, l]) => '<div class="stat"><div class="value">' + esc(v) + '</div><div class="label">' + esc(l) + '</div></div>').join('');

    $('charts').innerHTML = [
      bars('Q3 喝茶频率', countBy('Q3', rs), rs.length),
      bars('Q15 茶叶了解程度', countBy('Q15', rs), rs.length),
      bars('Q19 茶与状态兴趣', countBy('Q19', rs), rs.length),
      bars('Q22 定制方案兴趣', countBy('Q22', rs), rs.length),
      bars('Q24 可接受月费', countBy('Q24', rs), rs.length),
      bars('分群分布', Object.fromEntries(Object.entries(groups).map(([k, v]) => [groupName(k), v])), rs.length)
    ].join('');
  }

  function renderTable() {
    const kw = ($('searchInput').value || '').trim().toLowerCase();
    state.filtered = state.records.filter(r => {
      if (!kw) return true;
      const hay = [r.a.Q1, r.a.Q2, groupName(groupOf(r.a)), r.contact, r.a.Q3].join(' ').toLowerCase();
      return hay.includes(kw);
    });
    state.page = Math.max(1, Math.min(state.page, Math.ceil(state.filtered.length / state.pageSize) || 1));
    const start = (state.page - 1) * state.pageSize;
    const page = state.filtered.slice(start, start + state.pageSize);
    $('rowCount').textContent = '（共 ' + state.filtered.length + ' 份）';
    $('pageInfo').textContent = state.page + ' / ' + (Math.ceil(state.filtered.length / state.pageSize) || 1);
    $('prevPage').disabled = state.page <= 1;
    $('nextPage').disabled = state.page * state.pageSize >= state.filtered.length;
    $('rows').innerHTML = page.map((r, i) => {
      const g = groupOf(r.a);
      const idx = start + i;
      let h = '<tr data-idx="' + idx + '" style="cursor:pointer">' +
        '<td>' + (idx + 1) + '</td><td>' + esc(new Date(r.ts).toLocaleString('zh-CN')) + '</td>' +
        '<td>' + esc(flat(r.a.Q1)) + '</td><td>' + esc(flat(r.a.Q3)) + '</td>' +
        '<td>' + esc(String(flat(r.a.Q15)).slice(0, 12)) + '</td><td>' + esc(flat(r.a.Q19)) + '</td>' +
        '<td>' + esc(flat(r.a.Q22)) + '</td>' +
        '<td><span class="group-tag ' + g.toLowerCase() + '">' + esc(groupName(g)) + '</span>' + (isB1(r.a) ? ' <span class="group-tag b">B1</span>' : '') + '</td>' +
        '<td>' + esc(r.contact || '—') + '</td></tr>';
      if (state.expanded === idx) {
        h += '<tr class="detail-row"><td colspan="9"><div class="detail-grid">' +
          QS.map(q => '<div><b>' + q.id + '</b>' + esc(flat(r.a[q.id]) || '—') + '</div>').join('') +
          '<div><b>填写时长</b>' + esc(r.dur || '—') + ' 秒</div><div><b>回执码</b>' + esc(r.binId || '—') + '</div>' +
          '</div></td></tr>';
      }
      return h;
    }).join('');
    $('rows').querySelectorAll('tr[data-idx]').forEach(tr => {
      tr.onclick = () => {
        const i = Number(tr.dataset.idx);
        state.expanded = state.expanded === i ? null : i;
        renderTable();
      };
    });
  }

  async function load() {
    $('loadMsg').classList.remove('hidden');
    $('loadMsg').textContent = '正在从云数据库读取答卷…';
    try {
      state.records = await window.TeaCloud.loadAll((a, b, c, d) => {
        $('loadMsg').textContent = '正在读取云端索引 ' + a + '/' + b + '，答卷 ' + c + '/' + d + ' …';
      });
      state.records.forEach((r, i) => { r.binId = r.binId || ''; });
      $('loadMsg').classList.add('hidden');
      $('lastUpdate').textContent = '最近加载：' + new Date().toLocaleString('zh-CN') + ' · 数据来自云数据库';
      renderStats(); renderTable();
    } catch (e) {
      $('loadMsg').className = 'alert alert-error';
      $('loadMsg').textContent = '读取失败：' + e.message;
    }
  }

  function exportCsv() {
    if (!state.records.length) { alert('当前没有可导出的答卷'); return; }
    const heads = ['编号', '提交时间', '填写时长(秒)', '联系方式', '分群'].concat(QS.map(q => q.id + ' ' + q.title));
    const rows = [heads];
    state.records.forEach((r, i) => {
      rows.push([i + 1, new Date(r.ts).toLocaleString('zh-CN'), r.dur || '', r.contact || '', groupName(groupOf(r.a))]
        .concat(QS.map(q => flat(r.a[q.id]))));
    });
    const csv = '\ufeff' + rows.map(row => row.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '饮茶调研答卷_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  $('unlockBtn').onclick = () => {
    const ok = sha256($('codeInput').value.trim()) === window.SURVEY_CONFIG.adminHash;
    if (!ok) { $('lockError').textContent = '口令不正确，请重试'; return; }
    state.unlocked = true;
    $('lock').classList.add('hidden');
    $('console').classList.remove('hidden');
    load();
  };
  $('codeInput').onkeydown = e => { if (e.key === 'Enter') $('unlockBtn').click(); };
  $('refreshBtn').onclick = load;
  $('csvBtn').onclick = exportCsv;
  $('searchInput').oninput = () => { state.page = 1; state.expanded = null; renderTable(); };
  $('prevPage').onclick = () => { state.page--; state.expanded = null; renderTable(); };
  $('nextPage').onclick = () => { state.page++; state.expanded = null; renderTable(); };
})();
