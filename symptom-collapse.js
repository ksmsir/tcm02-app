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
})();