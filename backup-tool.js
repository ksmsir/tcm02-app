/* 中医诊疗系统 · 数据备份工具 v3（精简版） */
(function () {
  'use strict';

  var DATA_PREFIXES = ['tcm_', 'deepseek_'];

  /* ---------- 数据收集 ---------- */
  function collectData() {
    var dump = {
      __version: 1,
      __time: new Date().toISOString(),
      __ua: navigator.userAgent,
      data: {}
    };
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k) continue;
      var matched = false;
      for (var j = 0; j < DATA_PREFIXES.length; j++) {
        if (k.indexOf(DATA_PREFIXES[j]) === 0) { matched = true; break; }
      }
      if (matched) dump.data[k] = localStorage.getItem(k);
    }
    return dump;
  }

  function getStats(dump) {
    var keys = Object.keys(dump.data);
    var totalBytes = 0;
    keys.forEach(function (k) { totalBytes += (dump.data[k] || '').length; });
    return {
      count: keys.length,
      sizeKB: (totalBytes / 1024).toFixed(1),
      sizeMB: (totalBytes / 1024 / 1024).toFixed(2)
    };
  }

  /* ---------- 导出 ---------- */
  function exportData() {
    var dump = collectData();
    var stats = getStats(dump);
    var json = JSON.stringify(dump);
    var filename = 'tcm_backup_' + new Date().toISOString().replace(/[:T.]/g, '-').slice(0, 19) + '.json';
    showExportModal(json, filename, stats);
  }

  /* ---------- 下载文件 ---------- */
  function downloadFile(json, filename) {
    try {
      var blob = new Blob([json], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- 弹窗 ---------- */
  function showExportModal(json, filename, stats) {
    var old = document.getElementById('pwaBackupModal');
    if (old) old.remove();

    var isMobile = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(navigator.userAgent);

    var modal = document.createElement('div');
    modal.id = 'pwaBackupModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;';

    var tipText = isMobile
      ? '下载后，请到<b>「文件管理 → 下载」</b>里找到这个文件，<br>长按它 → 选择「分享」→ 发送给微信「文件传输助手」。<br><br>电脑端再从微信里下载，存到 <b>D:\\中医诊疗系统\\病历\\</b> 即可。'
      : '下载后，请立即把文件拖到 <b>D:\\中医诊疗系统\\病历\\</b> 文件夹<br>（或其他你想保存的位置）。';

    modal.innerHTML =
      '<div style="background:#fff;border-radius:14px;padding:20px;max-width:620px;width:100%;max-height:90vh;overflow:auto;">' +
        '<h3 style="margin:0 0 12px;color:#1e3a5a;">💾 导出备份</h3>' +
        '<div style="background:#f0f4f8;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;line-height:1.7;color:#2c4b6a;">' +
          '📦 共 <b>' + stats.count + '</b> 项数据<br>' +
          '📏 大小约 <b>' + stats.sizeKB + ' KB</b> (' + stats.sizeMB + ' MB)<br>' +
          '📄 文件名：<code style="background:#fff;padding:1px 6px;border-radius:4px;font-size:12px;">' + filename + '</code><br>' +
          '🕐 时间：' + new Date().toLocaleString('zh-CN', { hour12: false }) +
        '</div>' +
        '<button type="button" id="pwaBackupDownload" style="width:100%;padding:14px 16px;border:none;border-radius:8px;background:#4a90d9;color:#fff;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:12px;">⬇️ 下载备份文件</button>' +
        '<div id="pwaBackupHint" style="display:none;background:#e6f7ed;border:1px solid #86efac;color:#166534;font-size:13px;line-height:1.8;padding:12px 14px;border-radius:8px;margin-bottom:14px;">' +
          '✅ 文件已开始下载<br><br>' + tipText +
        '</div>' +
        '<div style="font-size:12.5px;color:#5b748b;line-height:1.7;margin-bottom:14px;background:#fef5e7;padding:8px 12px;border-radius:6px;">' +
          '⚠️ 备份文件包含患者隐私，请妥善保存，勿公开分享' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<button type="button" id="pwaBackupClose" style="padding:8px 20px;border:none;border-radius:8px;background:#e9eff6;color:#2a4058;font-size:14px;cursor:pointer;">关闭</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    document.getElementById('pwaBackupClose').onclick = function () { modal.remove(); };

    document.getElementById('pwaBackupDownload').onclick = function () {
      if (downloadFile(json, filename)) {
        var hint = document.getElementById('pwaBackupHint');
        if (hint) hint.style.display = 'block';
        this.disabled = true;
        this.style.opacity = '.5';
        this.textContent = '✅ 已下载';
        if (typeof showToast === 'function') showToast('💾 文件已开始下载');
      } else {
        alert('下载失败\n\n请尝试用浏览器打开本 App 再重试');
      }
    };
  }

  /* ---------- 恢复 ---------- */
  function importData(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var dump = JSON.parse(e.target.result);
        var data = dump.data || dump;
        var n = 0, skip = 0;
        Object.keys(data).forEach(function (k) {
          if (k.indexOf('__') === 0) return;
          if (typeof data[k] !== 'string') { skip++; return; }
          try {
            localStorage.setItem(k, data[k]);
            n++;
          } catch (err) { skip++; }
        });
        if (confirm('✅ 已恢复 ' + n + ' 项数据' + (skip ? '（跳过 ' + skip + ' 项）' : '') + '\n\n需要立即刷新页面吗？')) {
          location.reload();
        }
      } catch (err) {
        alert('❌ 恢复失败：' + err.message + '\n\n请确认文件是 App 导出的备份 JSON');
      }
    };
    reader.onerror = function () { alert('❌ 读取文件失败'); };
    reader.readAsText(file);
  }

  /* ---------- 注入按钮 ---------- */
  function injectButtons() {
    var menu = document.getElementById('dataMenu');
    if (!menu || menu.querySelector('[data-pwa-backup]')) return false;

    var label = document.createElement('div');
    label.className = 'group-label';
    label.textContent = '💾 PWA 备份（换机必备）';
    menu.appendChild(label);

    var item = document.createElement('div');
    item.className = 'menu-item';
    item.setAttribute('data-pwa-backup', '1');
    item.innerHTML =
      '<button class="btn btn-success btn-sm" type="button" data-act="exp">导出全量</button>' +
      '<button class="btn btn-secondary btn-sm" type="button" data-act="imp">恢复全量</button>' +
      '<input type="file" accept=".json,application/json,text/plain" style="display:none">';
    menu.appendChild(item);

    var fileInput = item.querySelector('input[type="file"]');
    item.querySelector('[data-act="exp"]').onclick = function () {
      var dm = document.getElementById('dataMenu');
      if (dm) dm.classList.remove('show');
      exportData();
    };
    item.querySelector('[data-act="imp"]').onclick = function () {
      fileInput.click();
    };
    fileInput.addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) importData(f);
      e.target.value = '';
      var dm = document.getElementById('dataMenu');
      if (dm) dm.classList.remove('show');
    });

    return true;
  }

  var _tries = 0;
  function tryInject() {
    _tries++;
    if (injectButtons()) return;
    if (_tries < 20) setTimeout(tryInject, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInject);
  } else {
    tryInject();
  }
})();