// PanelDrag.js - 面板拖拽功能
// 为"怪物图鉴 > 属性介绍页（右侧详情面板）"添加整体拖拽/移动能力

/**
 * enablePanelDrag - 启用面板拖拽功能
 * @param {HTMLElement} el - 要拖拽的元素
 * @param {Object} options - 配置选项
 * @param {HTMLElement} options.handle - 拖拽把手元素（不指定则整体可拖）
 * @param {string} options.saveKey - 持久化位置的localStorage键名
 * @returns {Object} 拖拽API对象
 */
export function enablePanelDrag(el, options) {
  if (!el) return null;
  
  const opts = options || {};
  const handle = opts.handle || el; // 可指定把手，不指定则整体可拖
  const saveKey = opts.saveKey || null; // 持久化位置
  let pos = { x: 0, y: 0 };

  // 恢复上次位置
  if (saveKey) {
    try {
      const saved = JSON.parse(localStorage.getItem(saveKey));
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        pos = saved;
        apply();
      }
    } catch (_e) {}
  }

  let start = null;
  let startPos = null;
  handle.style.cursor = handle.style.cursor || 'move';
  handle.style.touchAction = 'none'; // 防止移动端滚动干扰
  handle.addEventListener('pointerdown', onDown);

  function onDown(e) {
    // 仅响应鼠标左键/触摸
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY };
    startPos = { ...pos };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
  
  function onMove(e) {
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    pos.x = startPos.x + dx;
    pos.y = startPos.y + dy;
    apply();
  }
  
  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (saveKey) {
      try {
        localStorage.setItem(saveKey, JSON.stringify(pos));
      } catch (_e) {}
    }
  }
  
  function apply() {
    el.style.willChange = 'transform';
    // 注意：如果你的元素已有 transform，将被覆盖。如需合并请改为拼接。
    el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  }
  
  return {
    getPosition() {
      return { ...pos };
    },
    setPosition(x, y) {
      pos.x = +x || 0;
      pos.y = +y || 0;
      apply();
    }
  };
}

// 暴露到全局作用域
if (typeof window !== 'undefined') {
  window.enablePanelDrag = enablePanelDrag;

  // 默认：让"属性介绍页（右侧详情面板）"可拖拽
  let dragAPI = null;
  window.addEventListener('DOMContentLoaded', function() {
    const detail = document.querySelector('.bestiary-detail-panel');
    if (detail) {
      dragAPI = enablePanelDrag(detail, { saveKey: 'bestiaryDetailPanelPos' });
    }
  });

  // 对外暴露一个便捷方法，代码中可直接移动该面板
  window.setBestiaryDetailOffset = function(x, y) {
    if (dragAPI) {
      dragAPI.setPosition(x, y);
    }
  };
}

