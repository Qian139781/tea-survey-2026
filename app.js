(function () {
  const QS = window.QUESTIONS;
  const NO_DRINK = '最近一个月没有喝过';
  const DRAFT_KEY = 'tea_survey_draft_v16';
  const byId = Object.fromEntries(QS.map(q => [q.id, q]));

  const el = id => document.getElementById(id);
  const state = {
    answers: {},
    notes: {},
    idx: 0,
    startedAt: Date.now(),
    submitting: false
  };

  function visible(q) {
    const a = state.answers;
    if (q.only === 'drinker') return a.Q3 !== NO_DRINK;
    if (q.only === 'nondrinker') return a.Q3 === NO_DRINK;
    if (q.only === 'q19high') return Number(a.Q19) >= 4;
    if (q.only === 'q22high') return Number(a.Q22) >= 4;
    return true;
  }
  function buildFlow() { return QS.filter(visible); }
  function optLabel(o) { return typeof o === 'string' ? o : o.label; }
  function isOther(o) { return typeof o === 'object' && o.other; }
  function isExclusive(o) { return typeof o === 'object' && o.exclusive; }
  function noteKey(qid, label) { return qid + '|' + label; }
  function decorate(qid, label) {
    const note = (state.notes[noteKey(qid, label)] || '').trim();
    return note ? label.replace('（请注明______）', '') + '：' + note : label;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers: state.answers, notes: state.notes, startedAt: state.startedAt })); } catch (e) { }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { } }
  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (d && d.answers) {
        state.answers = d.answers; state.notes = d.notes || {};
        state.startedAt = d.startedAt || Date.now();
        return true;
      }
    } catch (e) { }
    return false;
  }

  function intro() {
    if (window.INTRO_LEAD) el('introLead').textContent = window.INTRO_LEAD;
    el('introRules').innerHTML = window.INTRO_RULES.map(r => '<li>' + esc(r) + '</li>').join('');

    const modal = el('letterModal');
    const openLetter = () => modal.classList.remove('hidden');
    const closeLetter = () => modal.classList.add('hidden');
    el('letterCard').onclick = openLetter;
    el('letterClose').onclick = closeLetter;
    el('letterBackdrop').onclick = closeLetter;
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeLetter(); });

    if (loadDraft()) {
      el('startBtn').innerHTML = '继续填写 <span aria-hidden="true">→</span>';
    }
    el('startBtn').onclick = () => {
      el('intro').classList.add('hidden');
      el('survey').classList.remove('hidden');
      render();
    };
  }

  function validate(q) {
    const v = state.answers[q.id];
    const label = { single: '请选择一项', multi: '请至少选择一项', rank: '请至少选择一项并排序', scale: '请选择分数', matrix: '请为每一行打分' };
    if (q.type === 'text') return null;
    if (q.type === 'matrix') {
      if (!q.rows.every((_, i) => v && v['row' + i])) return label.matrix;
      return null;
    }
    if (q.type === 'multi' || q.type === 'rank') {
      if (!Array.isArray(v) || !v.length) return label[q.type];
      if (v.length > q.max) return '最多只能选 ' + q.max + ' 项';
    } else if (!v && v !== 0) {
      return label[q.type];
    }
    // 选中「其他（请注明）」时，必须填写注明内容
    const others = (q.options || []).filter(isOther).map(optLabel);
    for (const ot of others) {
      const picked = Array.isArray(v) ? v.indexOf(ot) >= 0 : v === ot;
      if (picked && !(state.notes[noteKey(q.id, ot)] || '').trim()) return '请填写「其他」的具体内容';
    }
    return null;
  }

  function setError(msg, card) {
    let box = card.querySelector('.error-msg');
    if (!box) { box = document.createElement('div'); box.className = 'error-msg'; card.appendChild(box); }
    box.textContent = msg || '';
    card.classList.toggle('field-error', !!msg);
  }

  function render() {
    const flow = buildFlow();
    if (state.idx > flow.length) state.idx = flow.length;
    const total = flow.length + 1;
    const isFinal = state.idx === flow.length;
    const pct = Math.round((state.idx / total) * 100);
    el('progressFill').style.width = pct + '%';
    el('progressText').textContent = (state.idx + 1) + ' / ' + total;
    el('progressSection').textContent = isFinal ? '结束语' : (flow[state.idx].section || '问卷');
    el('prevBtn').disabled = state.idx === 0;
    const curQ = flow[state.idx];
    el('nextBtn').textContent = isFinal ? '提交答卷 ✓' : (curQ && curQ.id === 'Q28' ? '最后一步 →' : '下一题 →');

    const card = el('questionCard');
    card.classList.remove('field-error');
    if (isFinal) { renderFinal(card); return; }
    const q = flow[state.idx];
    const req = q.required ? '<span class="required-mark">必填</span>' : '<span class="required-mark">选填</span>';
    let title = esc(q.title);
    if (q.dynamic) {
      const first = (state.answers.Q7 || [])[0];
      if (first) title = title.replace('上一题排在第一位的那类茶', '<span class="dyn">' + esc(decorate('Q7', first)) + '</span>');
    }
    let html = '<div><span class="q-section">' + esc(q.section) + '</span><span class="q-id">' + q.id + (q.type === 'multi' || q.type === 'rank' ? ' · 最多 ' + q.max + ' 项' : '') + '</span></div>';
    html += '<div class="q-title">' + title + req + '</div>';
    if (q.hint) html += '<div class="q-hint">' + esc(q.hint) + '</div>';
    html += '<div class="q-body">' + renderBody(q) + '</div>';
    card.innerHTML = html;
    bind(q, card);
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderBody(q) {
    const v = state.answers[q.id];
    if (q.type === 'single' || q.type === 'multi') {
      let h = '<div class="options">';
      q.options.forEach((o, i) => {
        const label = optLabel(o);
        const checked = q.type === 'single' ? v === label : (Array.isArray(v) && v.includes(label));
        const typ = q.type === 'single' ? 'radio' : 'checkbox';
        h += '<label class="option' + (checked ? ' selected' : '') + '" data-i="' + i + '">' +
          '<input type="' + typ + '" name="' + q.id + '" value="' + i + '"' + (checked ? ' checked' : '') + ' />' +
          '<span class="option-label"><span class="option-index">' + (i + 1) + '.</span>' + esc(label) + '</span></label>';
        if (isOther(o) && checked) {
          h += '<input class="other-input" data-note="' + esc(noteKey(q.id, label)) + '" placeholder="请在这里注明…" value="' + esc(state.notes[noteKey(q.id, label)] || '') + '" />';
        }
      });
      return h + '</div>';
    }
    if (q.type === 'rank') {
      const selected = Array.isArray(v) ? v : [];
      let h = '<div class="rank-selected">';
      h += selected.length ? selected.map((label, i) =>
        '<div class="rank-item"><span class="rank-num">' + (i + 1) + '</span><span class="rank-label">' + esc(decorate(q.id, label)) + '</span>' +
        '<span class="rank-actions"><button type="button" data-rank="up" data-i="' + i + '" title="上移">↑</button>' +
        '<button type="button" data-rank="down" data-i="' + i + '" title="下移">↓</button>' +
        '<button type="button" data-rank="remove" data-i="' + i + '" title="移除">×</button></span></div>'
      ).join('') : '<div class="rank-empty">还没有选择，请从下方点选（最多 ' + q.max + ' 项）</div>';
      h += '</div><div class="options">';
      q.options.forEach((o, i) => {
        const label = optLabel(o);
        const on = selected.includes(label);
        const full = selected.length >= q.max;
        h += '<div class="option' + (on ? ' selected' : '') + (full && !on ? ' disabled' : '') + '" data-pick="' + i + '" role="button" tabindex="0">' +
          '<span class="option-label"><span class="option-index">' + (i + 1) + '.</span>' + esc(label) + (on ? ' <b style="color:var(--green)">已选 #' + (selected.indexOf(label) + 1) + '</b>' : '') + '</span></div>';
        if (isOther(o) && on) {
          h += '<input class="other-input" data-note="' + esc(noteKey(q.id, label)) + '" placeholder="请在这里注明…" value="' + esc(state.notes[noteKey(q.id, label)] || '') + '" />';
        }
      });
      return h + '</div>';
    }
    if (q.type === 'scale') {
      let h = '<div class="scale-grid">';
      q.scaleLabels.forEach((s, i) => {
        const n = i + 1;
        const on = Number(v) === n;
        h += '<div class="scale-cell' + (on ? ' selected' : '') + '" data-scale="' + n + '"><strong>' + n + '</strong>' + esc(s.split('＝')[1] || s) + '</div>';
      });
      return h + '</div>';
    }
    if (q.type === 'matrix') {
      let h = '<div class="matrix-wrap"><table class="matrix-table"><thead><tr><th></th><th>1 完全不同意</th><th>2 不太同意</th><th>3 一般</th><th>4 比较同意</th><th>5 完全同意</th></tr></thead><tbody>';
      q.rows.forEach((row, ri) => {
        h += '<tr><td>' + esc(row) + '</td>';
        for (let n = 1; n <= 5; n++) {
          const on = v && v['row' + ri] === n;
          h += '<td><input type="radio" name="matrix_' + q.id + '_' + ri + '" value="' + n + '" data-row="' + ri + '"' + (on ? ' checked' : '') + ' /></td>';
        }
        h += '</tr>';
      });
      return h + '</tbody></table></div>';
    }
    if (q.type === 'text') {
      return '<textarea class="text-input" id="text_' + q.id + '" placeholder="' + esc(q.placeholder || '') + '">' + esc(v || '') + '</textarea>';
    }
    return '';
  }

  function bind(q, card) {
    const v = state.answers[q.id];
    if (q.type === 'single' || q.type === 'multi') {
      card.querySelectorAll('input[name="' + q.id + '"]').forEach(inp => {
        inp.onchange = () => {
          const label = optLabel(q.options[Number(inp.value)]);
          if (q.type === 'single') state.answers[q.id] = label;
          else {
            const arr = Array.isArray(state.answers[q.id]) ? state.answers[q.id].slice() : [];
            const opt = q.options[Number(inp.value)];
            if (inp.checked) {
              if (isExclusive(opt)) { state.answers[q.id] = [label]; }
              else {
                const filtered = arr.filter(x => !q.options.some(o => isExclusive(o) && optLabel(o) === x));
                if (filtered.length < q.max) state.answers[q.id] = filtered.concat([label]);
                else { inp.checked = false; setError('最多只能选 ' + q.max + ' 项，请先取消一项', card); return; }
              }
            } else state.answers[q.id] = arr.filter(x => x !== label);
          }
          setError('', card); saveDraft(); render();
        };
      });
    } else if (q.type === 'rank') {
      card.querySelectorAll('[data-pick]').forEach(node => {
        node.onclick = () => {
          const label = optLabel(q.options[Number(node.dataset.pick)]);
          const arr = (state.answers[q.id] || []).slice();
          const i = arr.indexOf(label);
          if (i >= 0) arr.splice(i, 1);
          else if (arr.length < q.max) arr.push(label);
          state.answers[q.id] = arr;
          setError('', card); saveDraft(); render();
        };
      });
      card.querySelectorAll('[data-rank]').forEach(btn => {
        btn.onclick = () => {
          const arr = (state.answers[q.id] || []).slice();
          const i = Number(btn.dataset.i);
          if (btn.dataset.rank === 'remove') arr.splice(i, 1);
          else if (btn.dataset.rank === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
          else if (btn.dataset.rank === 'down' && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
          state.answers[q.id] = arr; saveDraft(); render();
        };
      });
    } else if (q.type === 'scale') {
      card.querySelectorAll('[data-scale]').forEach(node => {
        node.onclick = () => { state.answers[q.id] = Number(node.dataset.scale); setError('', card); saveDraft(); render(); };
      });
    } else if (q.type === 'matrix') {
      card.querySelectorAll('input[data-row]').forEach(inp => {
        inp.onchange = () => {
          const obj = Object.assign({}, state.answers[q.id] || {});
          obj['row' + inp.dataset.row] = Number(inp.value);
          state.answers[q.id] = obj; setError('', card); saveDraft();
          card.querySelectorAll('.error-msg').forEach(x => x.textContent = '');
        };
      });
    } else if (q.type === 'text') {
      const ta = card.querySelector('#text_' + q.id);
      if (ta) ta.oninput = () => { state.answers[q.id] = ta.value; saveDraft(); };
    }
    card.querySelectorAll('[data-note]').forEach(inp => {
      inp.oninput = () => {
        state.notes[inp.dataset.note] = inp.value;
        const [qid, label] = inp.dataset.note.split('|');
        if (q.type === 'single') state.answers[qid] = decorate(qid, label) && label;
        saveDraft();
      };
    });
  }

  function renderFinal(card) {
    card.innerHTML =
      '<div><span class="q-section">结束语（感谢页）</span><span class="q-id">最后一步</span></div>' +
      '<div class="q-title">谢谢你花这 8 分钟</div>' +
      '<div class="q-hint">你的答案会直接影响我们接下来做什么。</div>' +
      '<div class="q-body"><label class="option-label" for="contact">愿意参与后续试用或深聊的话，留个联系方式（选填）</label>' +
      '<input class="text-input" id="contact" style="min-height:auto" placeholder="手机号 / 微信 / 邮箱，任一即可" value="' + esc(state.contact || '') + '" />' +
      '<div class="privacy-note" style="margin-top:14px">联系方式仅用于后续联系；如不想留下，留空即可直接提交。</div></div>';
    const ci = card.querySelector('#contact');
    ci.oninput = () => { state.contact = ci.value; };
  }

  function serialize() {
    const out = {};
    buildFlow().forEach(q => {
      const v = state.answers[q.id];
      if (q.type === 'single') out[q.id] = decorate(q.id, v);
      else if (q.type === 'multi' || q.type === 'rank') out[q.id] = (v || []).map(x => decorate(q.id, x));
      else if (q.type === 'scale') {
        const n = Number(v);
        const full = (q.scaleLabels[n - 1] || String(n));
        out[q.id] = n ? n + '（' + (full.split('＝')[1] || full) + '）' : '';
      } else if (q.type === 'matrix') {
        const obj = {};
        q.rows.forEach((row, i) => { obj['abcdef'[i]] = (v && v['row' + i]) || ''; });
        out[q.id] = obj;
      } else out[q.id] = v || '';
    });
    return out;
  }

  function renderIdentity(record) {
    const box = el('identityCard');
    const id = window.TeaIdentity.get(record.a);
    box.innerHTML =
      '<div class="identity-emoji">' + esc(id.emoji) + '</div>' +
      '<div class="identity-kicker">你的茶系身份</div>' +
      '<div class="identity-title">' + esc(id.title) + '</div>' +
      '<div class="identity-desc">' + esc(id.desc) + '</div>' +
      '<div class="identity-reasons">' + id.reasons.map(r => '<span>· ' + esc(r) + '</span>').join('') + '</div>' +
      '<div class="identity-share">欢迎将自己的茶系身份分享转发给更多人</div>' +
      '<div class="identity-actions">' +
        '<button class="btn btn-primary" id="savePosterBtn" type="button">保存身份海报 ↓</button>' +
        '<button class="btn btn-ghost identity-copy" id="copyIdentityBtn" type="button">复制身份文案</button>' +
      '</div>';
    el('copyIdentityBtn').onclick = async () => {
      try {
        await navigator.clipboard.writeText(id.share);
        el('copyIdentityBtn').textContent = '已复制 ✓';
      } catch (e) {
        el('copyIdentityBtn').textContent = '复制失败，请长按选择文字';
      }
    };
    // 提前生成海报并缓存：保证点击保存时能同步调起系统分享（手机需要用户手势）
    let posterDataUrl = null;
    let posterPending = window.TeaIdentity.makePoster(id)
      .then(d => { posterDataUrl = d; return d; })
      .catch(() => null);

    function dataUrlToFile(dataUrl, filename) {
      const arr = String(dataUrl).split(',');
      const mime = (arr[0].match(/:(.*?);/) || [])[1] || 'image/png';
      const bin = atob(arr[1]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new File([bytes], filename, { type: mime });
    }

    function showPosterForLongPress(dataUrl) {
      const old = document.getElementById('posterModal');
      if (old) old.remove();
      const wrap = document.createElement('div');
      wrap.id = 'posterModal';
      wrap.className = 'poster-modal';
      wrap.innerHTML =
        '<div class="poster-backdrop"></div>' +
        '<div class="poster-panel">' +
          '<div class="poster-tip">长按下方图片，选择「保存到相册」</div>' +
          '<img src="' + dataUrl + '" alt="我的茶系身份海报" />' +
          '<button class="btn btn-ghost poster-close" type="button">关闭</button>' +
        '</div>';
      document.body.appendChild(wrap);
      const close = () => wrap.remove();
      wrap.querySelector('.poster-backdrop').onclick = close;
      wrap.querySelector('.poster-close').onclick = close;
    }

    el('savePosterBtn').onclick = async () => {
      const btn = el('savePosterBtn');
      const filename = '我的茶系身份-' + id.main.name + '.png';
      btn.disabled = true; btn.textContent = '正在准备海报…';
      try {
        const dataUrl = posterDataUrl || await posterPending;
        if (!dataUrl) throw new Error('海报生成失败');
        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        const file = dataUrlToFile(dataUrl, filename);
        const canShare = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));

        if (canShare) {
          try {
            await navigator.share({ files: [file], title: '我的茶系身份', text: '我的茶系身份：' + id.title });
            btn.textContent = '已调起系统分享 ✓';
          } catch (e) {
            if (e && e.name === 'AbortError') btn.textContent = '已取消分享';
            else { showPosterForLongPress(dataUrl); btn.textContent = '长按图片保存'; }
          }
        } else if (isMobile) {
          showPosterForLongPress(dataUrl);
          btn.textContent = '长按图片保存';
        } else {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = filename;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          btn.textContent = '已保存 ✓';
        }
      } catch (e) {
        btn.textContent = '生成失败，请重试';
      } finally {
        setTimeout(() => { btn.disabled = false; btn.textContent = '保存身份海报 ↓'; }, 2600);
      }
    };
    return id;
  }

  async function submit() {
    if (state.submitting) return;
    state.submitting = true;
    const btn = el('nextBtn');
    const old = btn.textContent;
    btn.disabled = true; btn.textContent = '正在提交…';
    const record = {
      v: 1,
      ts: new Date().toISOString(),
      dur: Math.round((Date.now() - state.startedAt) / 1000),
      src: window.SURVEY_CONFIG.version,
      contact: (state.contact || '').trim(),
      a: serialize()
    };
    const identity = window.TeaIdentity.get(record.a);
    record.identityMain = identity.main.name;
    record.identitySub = identity.sub.name;
    record.identityId = identity.main.id;
    try {
      const res = await window.TeaCloud.saveResponse(record);
      clearDraft();
      el('survey').classList.add('hidden');
      el('done').classList.remove('hidden');
      renderIdentity(record);
      el('receipt').textContent = '提交时间：' + new Date(record.ts).toLocaleString('zh-CN') + '　｜　回执码：' + res.binId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      alert(e.message || '提交失败，请稍后重试');
      btn.disabled = false; btn.textContent = old;
    } finally {
      state.submitting = false;
    }
  }

  el('nextBtn').onclick = () => {
    const flow = buildFlow();
    if (state.idx < flow.length) {
      const q = flow[state.idx];
      const err = validate(q);
      const card = el('questionCard');
      setError(err || '', card);
      if (err) { card.querySelector('.field-error') && null; window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      state.idx++; render();
    } else submit();
  };
  el('prevBtn').onclick = () => { if (state.idx > 0) { state.idx--; render(); } };
  el('againBtn').onclick = () => {
    state.answers = {}; state.notes = {}; state.contact = ''; state.idx = 0; state.startedAt = Date.now();
    clearDraft(); el('done').classList.add('hidden'); el('intro').classList.remove('hidden');
    el('startBtn').innerHTML = '开始填写 <span aria-hidden="true">→</span>';
    window.scrollTo({ top: 0 });
  };

  intro();
})();
