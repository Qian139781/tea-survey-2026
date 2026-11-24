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
      desc: main.desc + ' ' + sub.desc,
      reasons: reasons,
      share: '我的茶系身份是「' + main.name + ' · ' + sub.name + '」——' + main.desc
    };
  }

  window.TeaIdentity = { get: get };
})();
