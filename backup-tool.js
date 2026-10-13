/* 中医诊疗系统 · 数据备份工具 v2 */
(function () {
  'use strict';

  var DATA_PREFIXES = ['tcm_', 'deepseek_'];
  var BACKUP_EMAIL = 'ksmsir@163.com';   // ★ 备份邮箱

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

  /* ---------- 复制到剪贴板 ---------- */
  function copyText(text, callback) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { callback(true); }).catch(function () { callback(fallbackCopy(text)); });
    } else {
      callback(fallbackCopy(text));
    }
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  /* ---------- 发送到 163 邮箱 ---------- */
  function sendToEmail(json, filename, stats) {
    var isMobile = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(navigator.userAgent);

    var subject = '中医诊疗系统数据备份 - ' + new Date().toLocaleDateString('zh-CN');
    var bodyText = [
      '中医诊疗系统 · 数据备份',
      '',
      '备份时间：' + new Date().toLocaleString('zh-CN', { hour12: false }),
      '数据项数：' + stats.count + ' 项',
      '文件大小：' + stats.sizeKB + ' KB',
      '文件名：' + filename,
      '',
      '【重要】如果这封邮件没有附件，请：',
      '1. 从"下载"文件夹找到 ' + filename,
      '2. 手动添加为附件',
      '3. 再发送'
    ].join('\n');

    /* 手机端：优先用系统分享（能自动带附件） */
    if (isMobile && navigator.canShare) {
      try {
        var blob = new Blob([json], { type: 'application/json' });
        var file = new File([blob], filename, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: '中医诊疗系统备份',
            text: '请发送到 ' + BACKUP_EMAIL
          }).then(function () {
            if (typeof showToast === 'function') showToast('📤 已打开分享面板');
            var m = document.getElementById('pwaBackupModal');
            if (m) m.remove();
          }).catch(function () {});
          return;
        }
      } catch (e) { /* 降级到 mailto */ }
    }

    /* 电脑 / 手机不支持分享：先下载，再打开邮件客户端 */
    downloadFile(json, filename);

    setTimeout(function () {
      var mailto = 'mailto:' + BACKUP_EMAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(bodyText);
      try {
        window.location.href = mailto;
      } catch (e) {}

      setTimeout(function () {
        var modal = document.getElementById('pwaBackupModal');
        if (modal) modal.remove();
        alert(
          '✅ 已准备发送邮件\n\n' +
          '1. 备份文件已下载：' + filename + '\n' +
          '   （在"下载"文件夹里）\n\n' +
          '2. 邮件客户端已打开，收件人：' + BACKUP_EMAIL + '\n\n' +
          '3. ⚠️ 请手动【添加附件】选刚才下载的文件\n\n' +
          '4. 点击"发送"即可'
        );
      }, 1000);
    }, 400);
  }

  /* ---------- 弹窗 ---------- */
  function showExportModal(json, filename, stats) {
    var old = document.getElementById('pwaBackupModal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'pwaBackupModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML =
      '<div style="background:#fff;border-radius:14px;padding:20px;max-width:620px;width:100%;max-height:90vh;overflow:auto;">' +
        '<h3 style="margin:0 0 12px;color:#1e3a5a;">💾 导出备份</h3>' +
        '<div style="background:#f0f4f8;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;line-height:1.7;color:#2c4b6a;">' +
          '📦 共 <b>' + stats.count + '</b> 项数据<br>' +
          '📏 大小约 <b>' + stats.sizeKB + ' KB</b> (' + stats.sizeMB + ' MB)<br>' +
          '🕐 时间：' + new Date().toLocaleString('zh-CN', { hour12: false }) +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">' +
          '<button type="button" id="pwaBackupDownload" style="padding:10px 16px;border:none;border-radius:8px;background:#4a90d9;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">⬇️ 下载文件</button>' +
          '<button type="button" id="pwaBackupEmail" style="padding:10px 16px;border:none;border-radius:8px;background:#e67e22;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">📧 发到 163 邮箱</button>' +
          '<button type="button" id="pwaBackupCopy" style="padding:10px 16px;border:none;border-radius:8px;background:#27ae60;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">📋 复制文本</button>' +
          '<button type="button" id="pwaBackupShare" style="padding:10px 16px;border:none;border-radius:8px;background:#f39c12;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">📤 分享到微信</button>' +
        '</div>' +
        '<div style="font-size:12.5px;color:#5b748b;line-height:1.7;margin-bottom:14px;background:#fef5e7;padding:8px 12px;border-radius:6px;">' +
          '💡 <b>发到 163 邮箱</b>：手机上自动弹出系统分享（选邮件即可）；电脑上会先下载文件，再打开邮件客户端，<b>需手动添加附件</b>。<br>' +
          '⚠️ 备份文件包含患者隐私，请勿公开分享' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<button type="button" id="pwaBackupClose" style="padding:8px 20px;border:none;border-radius:8px;background:#e9eff6;color:#2a4058;font-size:14px;cursor:pointer;">关闭</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    document.getElementById('pwaBackupClose').onclick = function () { modal.remove(); };

    document.getElementById('pwaBackupDownload').onclick = function () {
      if (downloadFile(json, filename)) {
        if (typeof showToast === 'function') showToast('💾 已开始下载');
        setTimeout(function () { modal.remove(); }, 800);
      } else {
        alert('下载失败，请用"复制文本"或"分享到微信"');
      }
    };

    document.getElementById('pwaBackupEmail').onclick = function () {
      sendToEmail(json, filename, stats);
    };

    document.getElementById('pwaBackupCopy').onclick = function () {
      copyText(json, function (ok) {
        if (ok) {
          if (typeof showToast === 'function') showToast('📋 已复制到剪贴板');
          alert('✅ 已复制到剪贴板\n\n请粘贴到微信"文件传输助手"，或备忘录中保存');
          modal.remove();
        } else {
          alert('复制失败');
        }
      });
    };

    document.getElementById('pwaBackupShare').onclick = function () {
      if (navigator.share) {
        try {
          var blob = new Blob([json], { type: 'application/json' });
          var file = new File([blob], filename, { type: 'application/json' });
          navigator.share({
            files: [file],
            title: '中医诊疗系统备份',
            text: '中医诊疗系统数据备份 ' + new Date().toLocaleString('zh-CN')
          }).then(function () {
            if (typeof showToast === 'function') showToast('📤 已分享');
            modal.remove();
          }).catch(function () {});
        } catch (e) {
          alert('分享失败：' + e.message);
        }
      } else {
        alert('当前浏览器不支持"分享"，请用"下载文件"或"复制文本"');
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
        alert('❌ 恢复失败：' + err.message);
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