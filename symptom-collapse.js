/* 中医诊疗系统 · 症状折叠 + 搜索过滤 + 星标置顶 */
(function () {
  'use strict';

  var COLLAPSE_KEY = 'pwa_symptom_collapse_state';
  var STAR_KEY = 'pwa_starred_symptoms';

  function getStars() {
    try { var a = JSON.parse(localStorage.getItem(STAR_KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function setStars(arr) { try { localStorage.setItem(STAR_KEY, JSON.stringify(arr)); } catch (e) {} }
  function isStarred(label) { return getStars().indexOf(label) >= 0; }
  function toggleStar(label) {
    var arr = getStars(); var i = arr.indexOf(label);
    if (i >= 0) arr.splice(i, 1); else arr.push(label);
    setStars(arr); return i < 0;
  }

  /* ---------- 折叠 ---------- */
  function applyCollapse() {
    var container = document.getElementById('symptomGroups');
    if (!container) return;
    container.querySelectorAll('.symptom-group').forEach(function (g) {
      if (g.dataset.pwaWrapped === '1') return;
      var title = g.querySelector('.symptom-group-title');
      if (!title) return;
      var body = document.createElement('div');
      body.className = 'pwa-group-body';
      var children = Array.prototype.slice.call(g.children);
      children.forEach(function (c) { if (c !== title) body.appendChild(c); });
      g.appendChild(body);
      var name = title.textContent.replace(/\d+/g, '').trim();
      g.dataset.pwaName = name;
      g.classList.add('pwa-collapsed');
      if (g.querySelector('.symptom-tag.active')) g.classList.remove('pwa-collapsed');
      title.addEventListener('click', function (e) {
        if (e.target.closest('.pwa-star-btn')) return;
        g.classList.toggle('pwa-collapsed');
        saveCollapseState();
      });
      g.dataset.pwaWrapped = '1';
    });
    addControlBar();
    restoreCollapseState();
  }

  function saveCollapseState() {
    try {
      var s = {};
      document.querySelectorAll('.symptom-group').forEach(function (g) {
        s[g.dataset.pwaName] = g.classList.contains('pwa-collapsed') ? 0 : 1;
      });
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  function restoreCollapseState() {
    try {
      var s = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}');
      Object.keys(s).forEach(function (name) {
        var g = document.querySelector('.symptom-group[data-pwa-name="' + CSS.escape(name) + '"]');
        if (!g) return;
        if (g.querySelector('.symptom-tag.active')) return;
        if (s[name]) g.classList.remove('pwa-collapsed');
        else g.classList.add('pwa-collapsed');
      });
    } catch (e) {}
  }

  function addControlBar() {
    if (document.getElementById('pwaCollapseBar')) return;
    var container = document.getElementById('symptomGroups');
    if (!container) return;
    var bar = document.createElement('div');
    bar.id = 'pwaCollapseBar';
    bar.innerHTML =
      '<button type="button" class="btn btn-secondary btn-sm" data-act="expand">▽ 展开全部</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-act="collapse">△ 收起全部</button>';
    container.parentNode.insertBefore(bar, container);
    bar.querySelector('[data-act="expand"]').onclick = function () {
      document.querySelectorAll('.symptom-group').forEach(function (g) { g.classList.remove('pwa-collapsed'); });
      saveCollapseState();
    };
    bar.querySelector('[data-act="collapse"]').onclick = function () {
      document.querySelectorAll('.symptom-group').forEach(function (g) { g.classList.add('pwa-collapsed'); });
      saveCollapseState();
    };
  }

  /* ---------- 搜索过滤 ---------- */
  function filterBySearch(kw) {
    var container = document.getElementById('symptomGroups');
    if (!container) return;
    var q = (kw || '').toLowerCase().trim();

    if (!q) {
      container.querySelectorAll('.pwa-hidden').forEach(function (el) { el.classList.remove('pwa-hidden'); });
      container.querySelectorAll('.symptom-group').forEach(function (g) {
        g.style.display = '';
        if (g.classList.contains('pwa-collapsed-before-search')) {
          g.classList.add('pwa-collapsed');
          g.classList.remove('pwa-collapsed-before-search');
        }
      });
      return;
    }

    container.querySelectorAll('.symptom-tag').forEach(function (t) {
      var text = (t.textContent || '').replace(/[⭐☆]/g, '').toLowerCase().trim();
      t.classList.toggle('pwa-hidden', text.indexOf(q) < 0);
    });

    container.querySelectorAll('.parent-group').forEach(function (pg) {
      var parentTag = pg.querySelector('.parent-tag');
      var parentMatch = parentTag && !parentTag.classList.contains('pwa-hidden');
      if (parentMatch) {
        pg.querySelectorAll('.symptom-tag').forEach(function (t) { t.classList.remove('pwa-hidden'); });
        pg.classList.remove('pwa-hidden');
      } else {
        var anyMod = pg.querySelector('.modifier-tag:not(.pwa-hidden)');
        if (anyMod) {
          pg.querySelector('.parent-tag').classList.remove('pwa-hidden');
          pg.classList.remove('pwa-hidden');
        } else {
          pg.classList.add('pwa-hidden');
        }
      }
    });

    container.querySelectorAll('.symptom-grid').forEach(function (sg) {
      var anyVisible = sg.querySelector('.symptom-tag:not(.pwa-hidden), .parent-group:not(.pwa-hidden)');
      sg.classList.toggle('pwa-hidden', !anyVisible);
    });

    container.querySelectorAll('.precondition-subtitle').forEach(function (ps) {
      var sib = ps.nextElementSibling; var anyVisible = false;
      while (sib) {
        if (sib.classList.contains('symptom-subgroup-title') || sib.classList.contains('symptom-group-title') || sib.classList.contains('precondition-subtitle')) break;
        if (!sib.classList.contains('pwa-hidden')) { anyVisible = true; break; }
        sib = sib.nextElementSibling;
      }
      ps.classList.toggle('pwa-hidden', !anyVisible);
    });

    container.querySelectorAll('.symptom-subgroup-title').forEach(function (ss) {
      var sib = ss.nextElementSibling; var anyVisible = false;
      while (sib) {
        if (sib.classList.contains('symptom-subgroup-title') || sib.classList.contains('symptom-group-title')) break;
        if (!sib.classList.contains('pwa-hidden')) { anyVisible = true; break; }
        sib = sib.nextElementSibling;
      }
      ss.classList.toggle('pwa-hidden', !anyVisible);
    });

    container.querySelectorAll('.symptom-group').forEach(function (g) {
      var anyVisible = g.querySelector('.symptom-tag:not(.pwa-hidden)');
      if (anyVisible) {
        g.style.display = '';
        if (g.classList.contains('pwa-collapsed')) {
          g.classList.add('pwa-collapsed-before-search');
          g.classList.remove('pwa-collapsed');
        }
      } else {
        g.style.display = 'none';
      }
    });
  }

  /* ---------- 星标 ---------- */
  function addStarButtons() {
    document.querySelectorAll('.symptom-tag').forEach(function (t) {
      if (t.dataset.pwaStarAdded === '1') return;
      t.dataset.pwaStarAdded = '1';
      var fullLabel = t.dataset.fullLabel || t.dataset.value || '';
      if (!fullLabel) return;
      var starred = isStarred(fullLabel);
      var star = document.createElement('span');
      star.className = 'pwa-star-btn' + (starred ? ' pwa-starred' : '');
      star.textContent = starred ? '⭐' : '☆';
      star.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        var on = toggleStar(fullLabel);
        star.textContent = on ? '⭐' : '☆';
        star.classList.toggle('pwa-starred', on);
        if (typeof showToast === 'function') showToast(on ? '⭐ 已标记常用：' + fullLabel : '已取消：' + fullLabel);
        updateStarredMarks();
        sortStarredFirst();
      });
      star.addEventListener('touchend', function (e) { e.stopPropagation(); star.click(); });
      t.appendChild(star);
    });
  }

  function updateStarredMarks() {
    document.querySelectorAll('.symptom-tag').forEach(function (t) {
      var fullLabel = t.dataset.fullLabel || t.dataset.value || '';
      if (!fullLabel) return;
      var on = isStarred(fullLabel);
      t.classList.toggle('pwa-starred-item', on);
      var wrap = t.parentNode;
      if (wrap && wrap.classList.contains('tag-wrap')) wrap.classList.toggle('pwa-starred-item', on);
    });
    document.querySelectorAll('.parent-group').forEach(function (pg) {
      var pt = pg.querySelector('.parent-tag');
      var lbl = pt && (pt.dataset.fullLabel || pt.dataset.value || '');
      pg.classList.toggle('pwa-starred-item', !!(lbl && isStarred(lbl)));
    });
  }

  function sortStarredFirst() {
    document.querySelectorAll('.symptom-grid').forEach(function (grid) {
      var items = Array.prototype.slice.call(grid.children);
      items.sort(function (a, b) {
        var aS = a.classList.contains('pwa-starred-item') || (a.querySelector && a.querySelector('.pwa-starred-item')) ? 1 : 0;
        var bS = b.classList.contains('pwa-starred-item') || (b.querySelector && b.querySelector('.pwa-starred-item')) ? 1 : 0;
        return bS - aS;
      });
      items.forEach(function (it) { grid.appendChild(it); });
    });
  }

  /* ---------- Hook 原系统 ---------- */
  function hookFunctions() {
    var origClear = window.clearSymptomSearch;
    if (typeof origClear === 'function' && !origClear._pwaHooked) {
      window.clearSymptomSearch = function () {
        if (origClear) origClear.apply(this, arguments);
        filterBySearch('');
      };
      window.clearSymptomSearch._pwaHooked = true;
    }
    var origRender = window.renderSymptoms;
    if (typeof origRender === 'function' && !origRender._pwaHooked) {
      window.renderSymptoms = function () {
        if (origRender) origRender.apply(this, arguments);
        setTimeout(init, 60);
      };
      window.renderSymptoms._pwaHooked = true;
    }
  }

  function bindSearchInput() {
    var input = document.getElementById('symptomSearchInput');
    if (!input || input.dataset.pwaFilterHooked === '1') return;
    input.dataset.pwaFilterHooked = '1';
    input.addEventListener('input', function () { filterBySearch(this.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setTimeout(function () { filterBySearch(''); }, 0);
    });
  }

  var _initLock = false;
  function init() {
    if (_initLock) return;
    _initLock = true;
    try {
      applyCollapse();
      addStarButtons();
      updateStarredMarks();
      sortStarredFirst();
      bindSearchInput();
      hookFunctions();
      hookDisplayResults();
      watchResultArea();
    } catch (e) {
      console.warn('[pwa-symptom] init error:', e);
    } finally {
      setTimeout(function () { _initLock = false; }, 120);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 200); });
  } else {
    setTimeout(init, 200);
  }
  /* ============================================
   * 辨证结果折叠增强
   * ============================================ */

  var RESULT_COLLAPSE_KEY = 'pwa_result_collapse_state';

  function getResultLevelMap() {
    try {
      var m = JSON.parse(localStorage.getItem(RESULT_COLLAPSE_KEY) || '{}');
      return (m && typeof m === 'object') ? m : {};
    } catch (e) { return {}; }
  }

  function setResultLevelMap(m) {
    try { localStorage.setItem(RESULT_COLLAPSE_KEY, JSON.stringify(m)); } catch (e) {}
  }

  /* 按置信度分档：
   *   high   >= 80%
   *   medium 50% ~ 79%
   *   low     < 50%
   */
  function getLevel(item) {
    var confEl = item.querySelector('.confidence');
    var txt = confEl ? confEl.textContent : '';
    var m = txt.match(/(\d+)\s*%/);
    if (!m) return 'low';
    var pct = parseInt(m[1], 10);
    if (pct >= 80) return 'high';
    if (pct >= 50) return 'medium';
    return 'low';
  }

  function enhanceResults() {
    var area = document.getElementById('resultArea');
    if (!area) return;

    var items = Array.prototype.slice.call(area.querySelectorAll('.result-item'));
    if (items.length === 0) return;

    /* 已经包过就不再处理 */
    if (area.dataset.pwaResultWrapped === '1') {
      /* 但结果可能更新了（items 变了），需重新分配分组 */
      var groups = area.querySelectorAll('.pwa-result-group');
      var itemCount = 0;
      groups.forEach(function (g) {
        itemCount += g.querySelectorAll('.result-item').length;
      });
      if (itemCount === items.length) return;
    }

    /* 清空旧的分组结构，把 result-item 重新拿出来 */
    var existingGroups = area.querySelectorAll('.pwa-result-group');
    existingGroups.forEach(function (g) {
      var its = Array.prototype.slice.call(g.querySelectorAll('.result-item'));
      its.forEach(function (it) { area.insertBefore(it, g); });
      g.remove();
    });

    var empty = area.querySelector('.empty-state');
    if (empty) empty.style.display = 'none';

    items = Array.prototype.slice.call(area.querySelectorAll('.result-item'));
    if (items.length === 0) return;

    /* 按 level 分组 */
    var buckets = { high: [], medium: [], low: [] };
    items.forEach(function (it) {
      var lv = getLevel(it);
      it.dataset.pwaResultLevel = lv;
      buckets[lv].push(it);
    });

    var levelMeta = {
      high:   { title: '🟢 高度推荐（置信度 ≥ 80%）', cls: 'pwa-result-high' },
      medium: { title: '🟠 可能推荐（50% ~ 79%）',      cls: 'pwa-result-medium' },
      low:    { title: '⚪ 参考（< 50%）',                cls: 'pwa-result-low' }
    };

    var levelMap = getResultLevelMap();

    ['high', 'medium', 'low'].forEach(function (lv) {
      var arr = buckets[lv];
      if (arr.length === 0) return;

      var group = document.createElement('div');
      group.className = 'pwa-result-group ' + levelMeta[lv].cls;
      group.dataset.pwaLevel = lv;

      var header = document.createElement('div');
      header.className = 'pwa-result-group-header';
      header.innerHTML =
        '<span class="pwa-result-group-title">' + levelMeta[lv].title +
        '<span class="pwa-result-group-count">' + arr.length + ' 项</span></span>' +
        '<span class="pwa-result-group-arrow">▼</span>';

      var body = document.createElement('div');
      body.className = 'pwa-result-group-body';

      /* 默认状态：记住用户上次选择，high 默认展开，其它默认折叠 */
      var lastState = levelMap[lv];
      var isCollapsed = (lastState === undefined)
        ? (lv !== 'high')      /* 首次：high 展开、medium/low 折叠 */
        : (lastState === 0);

      if (isCollapsed) group.classList.add('pwa-result-collapsed');

      /* 移动 item 进 body */
      arr.forEach(function (it) { body.appendChild(it); });

      group.appendChild(header);
      group.appendChild(body);

      header.addEventListener('click', function () {
        group.classList.toggle('pwa-result-collapsed');
        var m = getResultLevelMap();
        m[lv] = group.classList.contains('pwa-result-collapsed') ? 0 : 1;
        setResultLevelMap(m);
      });

      area.appendChild(group);
    });

    area.dataset.pwaResultWrapped = '1';
    addResultControlBar(area);
  }

  function addResultControlBar(area) {
    /* 移除旧的 */
    var old = document.getElementById('pwaResultControlBar');
    if (old) old.remove();

    var bar = document.createElement('div');
    bar.id = 'pwaResultControlBar';
    bar.innerHTML =
      '<button type="button" class="btn btn-secondary btn-sm" data-act="expand">▽ 展开全部</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-act="collapse">△ 收起全部</button>';

    /* 插到 resultArea 前面 */
    area.parentNode.insertBefore(bar, area);

    bar.querySelector('[data-act="expand"]').onclick = function () {
      document.querySelectorAll('.pwa-result-group').forEach(function (g) {
        g.classList.remove('pwa-result-collapsed');
      });
      var m = getResultLevelMap();
      m.high = 1; m.medium = 1; m.low = 1;
      setResultLevelMap(m);
    };
    bar.querySelector('[data-act="collapse"]').onclick = function () {
      document.querySelectorAll('.pwa-result-group').forEach(function (g) {
        g.classList.add('pwa-result-collapsed');
      });
      var m = getResultLevelMap();
      m.high = 0; m.medium = 0; m.low = 0;
      setResultLevelMap(m);
    };
  }

  /* hook 原系统的 displayResults */
  function hookDisplayResults() {
    var orig = window.displayResults;
    if (typeof orig === 'function' && !orig._pwaResultHooked) {
      window.displayResults = function () {
        var r = orig.apply(this, arguments);
        setTimeout(enhanceResults, 60);
        return r;
      };
      window.displayResults._pwaResultHooked = true;
    }
    /* 首次也可能已有结果 */
    setTimeout(enhanceResults, 500);
  }

  /* 观察 resultArea 变化（防止其它入口直接改 DOM） */
  function watchResultArea() {
    var area = document.getElementById('resultArea');
    if (!area || area.dataset.pwaResultObserver === '1') return;
    area.dataset.pwaResultObserver = '1';
    var ob = new MutationObserver(function () {
      enhanceResults();
    });
    ob.observe(area, { childList: true });
  }

})();