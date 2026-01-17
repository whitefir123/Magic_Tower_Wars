// GamblerPositionEditor.js - 赌徒界面位置编辑器
// 用于调整界面元素位置并导出配置

/**
 * GamblerPositionEditor - 位置编辑工具
 * 允许拖动界面元素并导出位置配置
 */
export class GamblerPositionEditor {
  constructor(gamblerUI) {
    this.gamblerUI = gamblerUI;
    this.isEnabled = false;
    this.draggableElements = [];
    this.positions = {};
    this.controlPanel = null;
  }

  /**
   * 启用编辑模式
   */
  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;

    // 创建控制面板
    this.createControlPanel();

    // 将所有主要元素设为可拖动
    this.makeElementsDraggable();

    console.log('✓ 位置编辑模式已启用');
  }

  /**
   * 禁用编辑模式
   */
  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    // 移除拖动功能和清理事件监听器
    this.draggableElements.forEach(item => {
      item.element.style.cursor = '';
      item.element.style.outline = '';
      item.element.style.outlineOffset = '';
      item.element.classList.remove('position-editor-active');
      
      // 调用清理函数
      if (item.cleanup) {
        item.cleanup();
      }
    });
    this.draggableElements = [];

    // 移除控制面板
    if (this.controlPanel) {
      this.controlPanel.remove();
      this.controlPanel = null;
    }

    console.log('✓ 位置编辑模式已禁用');
  }

  /**
   * 创建控制面板
   */
  createControlPanel() {
    const panel = document.createElement('div');
    panel.id = 'gambler-position-editor-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid #ffd700;
      border-radius: 8px;
      padding: 15px;
      z-index: 100000;
      color: #fff;
      font-family: monospace;
      font-size: 12px;
      min-width: 300px;
      max-width: 350px;
      max-height: 80vh;
      overflow-y: auto;
    `;

    panel.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #ffd700; font-size: 14px;">🎰 位置编辑器</h3>
      <p style="margin: 0 0 10px 0; color: #aaa; font-size: 11px;">拖动元素调整位置</p>
      
      <div id="position-info" style="margin-bottom: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 4px; max-height: 300px; overflow-y: auto;">
        <div style="color: #888;">等待拖动...</div>
      </div>
      
      <button id="export-positions-btn" style="width: 100%; padding: 8px; background: #27ae60; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-bottom: 5px;">
        📋 导出位置配置
      </button>
      
      <button id="reset-positions-btn" style="width: 100%; padding: 8px; background: #e74c3c; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-bottom: 5px;">
        🔄 重置所有位置
      </button>
      
      <button id="close-editor-btn" style="width: 100%; padding: 8px; background: #95a5a6; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
        ❌ 关闭编辑器
      </button>
    `;

    document.body.appendChild(panel);
    this.controlPanel = panel;

    // 绑定按钮事件
    document.getElementById('export-positions-btn').addEventListener('click', () => this.exportPositions());
    document.getElementById('reset-positions-btn').addEventListener('click', () => this.resetPositions());
    document.getElementById('close-editor-btn').addEventListener('click', () => this.disable());
  }

  /**
   * 使元素可拖动
   */
  makeElementsDraggable() {
    const container = document.getElementById('slot-machine-bg');
    if (!container) return;

    // 先收集所有元素和它们的位置信息，然后再转换
    const elementsToMake = [];

    // 找到右侧面板 - 作为整体拖动，而不是拆分子元素
    const rightPanel = container.querySelector('div[style*="width: 180px"]');
    console.log('右侧面板:', rightPanel);
    
    if (rightPanel) {
      console.log('右侧面板子元素数量:', rightPanel.children.length);
      // 将整个右侧面板作为一个可拖动元素
      elementsToMake.push({ element: rightPanel, id: 'gambler-right-panel', name: '右侧面板（保底+历史）' });
    }

    // 需要调整位置的其他元素列表
    const elementConfigs = [
      { id: 'gambler-title', selector: '.modal-title-shop', name: '标题' },
      { id: 'gambler-jackpot-area', selector: '#gambler-jackpot', name: 'Jackpot显示', parent: true },
      { id: 'gambler-message', selector: '#gambler-message', name: '消息文本' },
      { id: 'gambler-reel-container', selector: '#gambler-reel-container', name: '奖品区域' },
      { id: 'gambler-result', selector: '#gambler-result', name: '结果显示' },
      { id: 'gambler-btn-standard', selector: '#gambler-btn-standard', name: '标准按钮' },
      { id: 'gambler-btn-high-roller', selector: '#gambler-btn-high-roller', name: '豪赌按钮' },
      { id: 'gambler-btn-batch', selector: '#gambler-btn-batch', name: '10连按钮' },
      { id: 'gambler-btn-leave', selector: '#gambler-btn-leave', name: '离开按钮' }
    ];

    // 收集其他元素
    elementConfigs.forEach(config => {
      let element;
      
      if (config.parent) {
        const child = container.querySelector(config.selector);
        element = child ? child.parentElement : null;
      } else {
        element = container.querySelector(config.selector);
      }

      if (element) {
        console.log(`找到元素: ${config.name}`, element);
        elementsToMake.push({ element, id: config.id, name: config.name });
      } else {
        console.warn(`未找到元素: ${config.name}`);
      }
    });

    // 现在一次性处理所有元素
    elementsToMake.forEach(item => {
      this.makeDraggable(item.element, item.id, item.name);
    });
  }

  /**
   * 使单个元素可拖动
   */
  makeDraggable(element, id, name) {
    // 保存原始位置
    const rect = element.getBoundingClientRect();
    const containerElement = document.getElementById('slot-machine-bg');
    const container = containerElement.getBoundingClientRect();
    
    // 保存原始样式
    const originalPosition = element.style.position;
    const originalWidth = element.style.width;
    const originalHeight = element.style.height;
    const originalLeft = element.style.left;
    const originalTop = element.style.top;
    
    // 计算相对于容器的位置
    const leftPos = rect.left - container.left;
    const topPos = rect.top - container.top;
    
    console.log(`${name} 位置计算:`, {
      elementRect: rect,
      containerRect: container,
      calculatedLeft: leftPos,
      calculatedTop: topPos
    });
    
    // 转换为绝对定位
    element.style.position = 'absolute';
    element.style.left = leftPos + 'px';
    element.style.top = topPos + 'px';
    
    // 保持原始尺寸（防止被压缩）
    if (!originalWidth || originalWidth === 'auto') {
      element.style.width = rect.width + 'px';
    }
    if (!originalHeight || originalHeight === 'auto') {
      element.style.height = rect.height + 'px';
    }
    
    element.style.cursor = 'move';
    element.classList.add('position-editor-active');
    
    // 添加视觉提示
    element.style.outline = '2px dashed #ffd700';
    element.style.outlineOffset = '2px';

    let isDragging = false;
    let startX, startY, startLeft, startTop;
    const isButton = element.tagName === 'BUTTON';

    const onMouseDown = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(element.style.left) || 0;
      startTop = parseInt(element.style.top) || 0;
      
      element.style.zIndex = '10000';
      
      // 阻止按钮的默认行为
      if (isButton) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newLeft = startLeft + deltaX;
      const newTop = startTop + deltaY;
      
      element.style.left = newLeft + 'px';
      element.style.top = newTop + 'px';
      
      // 更新位置信息
      this.updatePositionInfo(id, name, newLeft, newTop, element);
      
      if (isButton) {
        e.preventDefault();
      }
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        element.style.zIndex = '';
        
        // 保存位置
        this.positions[id] = {
          name: name,
          left: element.style.left,
          top: element.style.top,
          width: element.offsetWidth,
          height: element.offsetHeight
        };
      }
    };

    // 对于按钮，禁用点击事件并使用捕获阶段
    let preventClick = null;
    if (isButton) {
      preventClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      element.addEventListener('click', preventClick, true);
      element.addEventListener('mousedown', onMouseDown, true);
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('mouseup', onMouseUp, true);
    } else {
      element.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }

    this.draggableElements.push({
      element,
      id,
      name,
      originalPosition,
      originalWidth,
      originalHeight,
      originalLeft,
      originalTop,
      isButton,
      cleanup: () => {
        if (isButton) {
          element.removeEventListener('mousedown', onMouseDown, true);
          document.removeEventListener('mousemove', onMouseMove, true);
          document.removeEventListener('mouseup', onMouseUp, true);
          if (preventClick) {
            element.removeEventListener('click', preventClick, true);
          }
        } else {
          element.removeEventListener('mousedown', onMouseDown);
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        }
      }
    });

    // 初始化位置信息
    this.positions[id] = {
      name: name,
      left: element.style.left,
      top: element.style.top,
      width: element.offsetWidth,
      height: element.offsetHeight
    };
  }

  /**
   * 更新位置信息显示
   */
  updatePositionInfo(id, name, left, top, element) {
    const infoDiv = document.getElementById('position-info');
    if (!infoDiv) return;

    let html = '<div style="font-size: 10px; line-height: 1.6;">';
    
    Object.keys(this.positions).forEach(key => {
      const pos = this.positions[key];
      const isCurrent = key === id;
      html += `
        <div style="margin-bottom: 8px; padding: 5px; background: ${isCurrent ? 'rgba(255,215,0,0.2)' : 'transparent'}; border-radius: 3px;">
          <strong style="color: ${isCurrent ? '#ffd700' : '#fff'};">${pos.name}</strong><br>
          <span style="color: #aaa;">left: ${pos.left}, top: ${pos.top}</span><br>
          <span style="color: #888;">size: ${pos.width}x${pos.height}px</span>
        </div>
      `;
    });
    
    html += '</div>';
    infoDiv.innerHTML = html;
  }

  /**
   * 导出位置配置
   */
  exportPositions() {
    const config = {
      timestamp: new Date().toISOString(),
      containerSize: {
        width: document.getElementById('slot-machine-bg').offsetWidth,
        height: document.getElementById('slot-machine-bg').offsetHeight
      },
      elements: this.positions
    };

    const json = JSON.stringify(config, null, 2);
    
    // 复制到剪贴板
    navigator.clipboard.writeText(json).then(() => {
      alert('✓ 位置配置已复制到剪贴板！\n\n请将配置发送给开发者。');
      console.log('导出的位置配置：', config);
    }).catch(err => {
      // 回退：显示在控制台
      console.log('导出的位置配置：', json);
      alert('位置配置已输出到控制台（F12查看）');
    });

    // 同时下载为文件
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gambler-positions.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 重置所有位置
   */
  resetPositions() {
    if (!confirm('确定要重置所有元素位置吗？')) return;
    
    // 重新加载界面
    this.disable();
    this.gamblerUI.close();
    setTimeout(() => {
      this.gamblerUI.open();
      setTimeout(() => this.enable(), 100);
    }, 100);
  }
}

// 注入编辑器样式
if (typeof document !== 'undefined' && !document.getElementById('gambler-position-editor-styles')) {
  const style = document.createElement('style');
  style.id = 'gambler-position-editor-styles';
  style.textContent = `
    .position-editor-active {
      transition: none !important;
    }
    
    .position-editor-active:hover {
      outline-color: #ff6600 !important;
    }
  `;
  document.head.appendChild(style);
}
