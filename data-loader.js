/* 中医诊疗系统 · 数据自动加载器
 * 从 GitHub 加载大数据文件，注入到内存，不占 localStorage
 */
(function () {
  'use strict';

  var DATA_URL = './data/weight-table.json';

  function inject(json) {
    // 使用全局 eval 直接赋值给顶层 let 变量
    try {
      var geval = eval;
      geval('WEIGHT_TABLE_RAW = ' + json + ';');
      return true;
    } catch (e) {
      console.warn('[data-loader] 全局 eval 失败，尝试备用方案：', e);
      try {
        // 备用：用 Function 构造，作用域在全局
        var fn = new Function('json', 'return eval("WEIGHT_TABLE_RAW = " + json)');
        fn(json);
        return true;
      } catch (e2) {
        console.error('[data-loader] 备用方案也失败：', e2);
        return false;
      }
    }
  }

  function refresh() {
    // 重新渲染相关 UI
    try {
      if (typeof updateStorageInfo === 'function') updateStorageInfo();
      if (typeof refreshUI === 'function') refreshUI();
    } catch (e) {}
  }

  function load() {
    fetch(DATA_URL, { cache: 'default' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (text) {
        var parsed;
        try { parsed = JSON.parse(text); }
        catch (e) { throw new Error('JSON 格式错误：' + e.message); }

        if (!Array.isArray(parsed)) throw new Error('JSON 顶层不是数组');

        var ok = inject(JSON.stringify(parsed));
        if (ok) {
          console.log('[data-loader] ✅ 赋分表已从云端加载：' + parsed.length + ' 行');
          setTimeout(refresh, 200);
        } else {
          console.warn('[data-loader] 数据注入失败');
        }
      })
      .catch(function (e) {
        console.warn('[data-loader] 加载失败：' + e.message + '（可能是首次离线，忽略）');
      });
  }

  // 等主脚本执行完再加载
  if (document.readyState === 'complete') {
    setTimeout(load, 300);
  } else {
    window.addEventListener('load', function () { setTimeout(load, 300); });
  }
})();