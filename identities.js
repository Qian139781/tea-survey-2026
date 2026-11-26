/* 问卷结尾的「茶系身份」生成规则：主身份来自饮茶行为与认知分群，副标签来自内容/场景偏好 */
(function () {
  function val(a, k) { return String((a && a[k]) || ''); }
  function has(a, k, words) {
    const s = val(a, k);
    return words.some(w => s.indexOf(w) >= 0);
  }
  function num(a, k) {
    const m = val(a, k).match(/\d+/);
    return m ? Number(m[0]) : 0;
  }

  function get(a) {
    const drinker = val(a, 'Q3') && val(a, 'Q3').indexOf('没有喝过') < 0;
    let main;

    if (drinker &&
        (val(a, 'Q15').indexOf('比较了解') === 0 || val(a, 'Q15').indexOf('很了解') === 0) &&
        (val(a, 'Q16').indexOf('先查攻略') === 0 || val(a, 'Q16').indexOf('有固定') === 0)) {
      main = { id: 'C', emoji: '🧘', name: '茶桌扫地僧', desc: '茶对你不是谜题，是日常。你已经能自己选、自己泡，还能给别人推荐。' };
    } else if (drinker) {
      main = { id: 'A', emoji: '🍵', name: '随手一杯派', desc: '茶已经在你的日常里，但你不打算把它搞得太复杂——顺手、好喝、舒服就够了。' };
    } else if (has(a, 'Q4', ['每周 3 次及以上', '每周 1–2 次']) && num(a, 'Q12') >= 4) {
      main = { id: 'B1', emoji: '🧋➡️🍵', name: '奶茶转正选手', desc: '你早就熟悉“茶味”，只是还没正式认识原叶茶。离入门只差一次尝试。' };
    } else if (num(a, 'Q12') >= 4) {
      main = { id: 'B', emoji: '🌱', name: '好奇新芽', desc: '还没开始喝，但已经在认真想“要不要试试”。这份好奇心很珍贵。' };
    } else if (num(a, 'Q12') <= 2) {
      main = { id: 'D', emoji: '😌', name: '佛系路人', desc: '茶暂时不在你的必选项里。无关紧要，也是一种很自在的态度。' };
    } else {
      main = { id: 'X', emoji: '🤔', name: '观望酌量派', desc: '你对茶的态度是“看情况”。保持开放，说不定哪天就碰上对的那一杯。' };
    }

    let sub;
    if (num(a, 'Q19') >= 4 || has(a, 'Q20', ['成分与原理', '按状态给建议', '有没有科学研究支持'])) {
      sub = { name: '状态研究控', desc: '你真正关心的是：这杯茶和我的身体状态到底怎么相处。' };
    } else if (has(a, 'Q17', ['茶器与茶桌美学']) || has(a, 'Q10', ['盖碗或茶具']) || has(a, 'Q18', ['线下体验课'])) {
      sub = { name: '仪式感玩家', desc: '泡茶那几分钟，对你来说是少有的能慢下来的时间。' };
    } else if (has(a, 'Q6', ['提神']) || has(a, 'Q9', ['工作间隙', '午后提神', '加班'])) {
      sub = { name: '提神实干家', desc: '茶是你的工作节拍器：清醒一点，但不必像咖啡那样慌。' };
    } else if (num(a, 'Q22') >= 4) {
      sub = { name: '定制尝鲜官', desc: '你愿意试试“按自己的情况配一套喝茶方案”。' };
    } else if (has(a, 'Q13', ['单次成本低', '有小份试用装'])) {
      sub = { name: '理性试错家', desc: '先小成本试清楚，再决定要不要认真投入。' };
    } else {
      sub = { name: '自在随性派', desc: '喝茶这件事，你更相信自己的感觉，不太被规则牵着走。' };
    }

    const reasons = [];
    if (val(a, 'Q3')) reasons.push('你的饮茶频率是「' + val(a, 'Q3') + '」');
    if (val(a, 'Q15')) reasons.push('对茶的自我认知是「' + val(a, 'Q15') + '」');
    if (val(a, 'Q19')) reasons.push('对“茶与状态”的兴趣是 ' + val(a, 'Q19'));

    return {
      main: main,
      sub: sub,
      title: main.name + ' · ' + sub.name,
      emoji: main.emoji,
      avatar: avatarFor(main.name, sub.name),
      desc: main.desc + ' ' + sub.desc,
      reasons: reasons,
      share: '我的茶系身份是「' + main.name + ' · ' + sub.name + '」——' + main.desc
    };
  }

  // 32 种身份组合 → 形象图编号（见茶饮角色形象设定全集 v1）
  const AVATAR_MAP = {
    '茶桌扫地僧':     { '状态研究控':1, '仪式感玩家':2, '提神实干家':3, '定制尝鲜官':4,  '理性试错家':5,  '自在随性派':6 },
    '随手一杯派':     { '状态研究控':7, '仪式感玩家':8, '提神实干家':9, '定制尝鲜官':10, '理性试错家':11, '自在随性派':12 },
    '奶茶转正选手':   { '状态研究控':13,'仪式感玩家':14,                 '定制尝鲜官':15, '理性试错家':16, '自在随性派':17 },
    '好奇新芽':       { '状态研究控':18,'仪式感玩家':19,                 '定制尝鲜官':20, '理性试错家':21, '自在随性派':22 },
    '佛系路人':       { '状态研究控':23,'仪式感玩家':24,                 '定制尝鲜官':25, '理性试错家':26, '自在随性派':27 },
    '观望酌量派':     { '状态研究控':28,'仪式感玩家':29,                 '定制尝鲜官':30, '理性试错家':31, '自在随性派':32 }
  };
  function avatarFor(mainName, subName) {
    const row = AVATAR_MAP[mainName];
    const n = row && row[subName];
    return n ? ('assets/chars/' + String(n).padStart(2, '0') + '.webp') : '';
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const chars = String(text).split('');
    let line = '', lines = 0;
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        y += lineHeight; line = chars[i]; lines++;
        if (maxLines && lines >= maxLines) break;
      } else {
        line = test;
      }
    }
    if (line && (!maxLines || lines < maxLines)) ctx.fillText(line, x, y);
    return y + lineHeight;
  }

  function makePoster(id) {
    return new Promise((resolve, reject) => {
      const W = 1080, H = 1440;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#F7F6F0';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, 60, 60, W - 120, H - 120, 40);
      ctx.fill();
      ctx.strokeStyle = '#DDE2D8'; ctx.lineWidth = 2; ctx.stroke();

      const logo = new Image();
      const qr = new Image();
      const avatar = new Image();
      let logoLoaded = false, qrLoaded = false, avatarLoaded = false;
      const draw = () => {
        if (!logoLoaded || !qrLoaded) return;
        try {
          const lw = 340, lh = lw * (logo.height / logo.width);
          ctx.globalAlpha = 1;
          ctx.drawImage(logo, (W - lw) / 2, 100, lw, lh);

          ctx.textAlign = 'center';
          ctx.fillStyle = '#0F6E56';
          ctx.font = '600 28px sans-serif';
          ctx.fillText('知 茶 · 你 的 茶 系 身 份', W / 2, 385);

          // 左：人物形象；右：身份文字
          if (avatarLoaded) {
            ctx.drawImage(avatar, 110, 420, 340, 340);
          }
          const tx = 500;
          ctx.textAlign = 'left';
          ctx.fillStyle = '#7A8A80';
          ctx.font = '24px sans-serif';
          ctx.fillText('你的茶系身份', tx, 460);
          ctx.fillStyle = '#1F3A2B';
          ctx.font = '700 62px sans-serif';
          ctx.fillText(id.main.name, tx, 548);
          ctx.fillStyle = '#BA7517';
          ctx.font = '600 42px sans-serif';
          ctx.fillText(id.sub.name, tx, 618);
          ctx.fillStyle = '#4A5B50';
          ctx.font = '27px sans-serif';
          let ty = 682;
          ty = wrapText(ctx, id.main.desc, tx, ty, 460, 40, 2) + 6;
          ty = wrapText(ctx, id.sub.desc, tx, ty, 460, 40, 2) + 10;

          ctx.strokeStyle = '#DDE2D8'; ctx.lineWidth = 1;
          const lineY = Math.max(ty, 790);
          ctx.beginPath(); ctx.moveTo(140, lineY); ctx.lineTo(W - 140, lineY); ctx.stroke();
          let y = lineY + 46;

          ctx.textAlign = 'left';
          ctx.fillStyle = '#6B7B70';
          ctx.font = '25px sans-serif';
          id.reasons.forEach(r => {
            wrapText(ctx, '· ' + r, 150, y, W - 300, 38, 1);
            y += 42;
          });

          // 底部：左侧分享引导 + 右侧二维码（可扫码填问卷）
          const boxY = 1118, boxH = 210;
          ctx.fillStyle = '#E1F5EE';
          roundRect(ctx, 140, boxY, W - 280, boxH, 24); ctx.fill();
          ctx.strokeStyle = '#9FE1CB'; ctx.lineWidth = 2; ctx.stroke();

          ctx.textAlign = 'left';
          ctx.fillStyle = '#0F6E56';
          ctx.font = '700 34px sans-serif';
          ctx.fillText('欢迎把身份分享给更多人', 180, boxY + 56);
          ctx.fillStyle = '#5A7A6C';
          ctx.font = '26px sans-serif';
          ctx.fillText('也来测测你的茶系身份', 180, boxY + 104);
          ctx.fillStyle = '#8A978D';
          ctx.font = '23px sans-serif';
          ctx.fillText('长按识别二维码 →', 180, boxY + 158);

          const qrSize = 128, qrX = 758, qrY = boxY + 41;
          ctx.fillStyle = '#FFFFFF';
          roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12); ctx.fill();
          ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);

          ctx.textAlign = 'center';
          ctx.fillStyle = '#9AA79E';
          ctx.font = '22px sans-serif';
          ctx.fillText('生成依据来自你的 28 道回答', W / 2, 1372);
          ctx.fillStyle = '#0F6E56';
          ctx.font = '600 25px sans-serif';
          ctx.fillText('知茶 · ZHI CHA', W / 2, 1405);

          resolve(canvas.toDataURL('image/png'));
        } catch (e) { reject(e); }
      };
      logo.onload = () => { logoLoaded = true; draw(); };
      qr.onload = () => { qrLoaded = true; draw(); };
      avatar.onload = () => { avatarLoaded = true; draw(); };
      logo.onerror = () => reject(new Error('logo 加载失败'));
      qr.onerror = () => reject(new Error('二维码加载失败'));
      avatar.onerror = () => { avatarLoaded = false; draw(); };
      logo.src = 'assets/zhicha-logo.jpg';
      qr.src = 'assets/survey-qr.png';
      if (id.avatar) avatar.src = id.avatar;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  window.TeaIdentity = { get: get, makePoster: makePoster };
})();
