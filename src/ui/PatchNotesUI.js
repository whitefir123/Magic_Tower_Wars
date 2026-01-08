// PatchNotesUI.js - 更新公告 UI 组件
// 负责渲染更新公告弹窗和入口按钮

import { CHANGELOG, CURRENT_VERSION } from '../data/changelog.js';

/**
 * PatchNotesUI - 更新公告界面管理器
 * 负责渲染更新公告列表、入口按钮、自动弹出等
 */
export class PatchNotesUI {
  constructor() {
    this.isOpen = false;
    this.button = null;
    this.overlay = null;
    this.lastReadVersion = localStorage.getItem('last_read_version') || null;
  }

  /**
   * 初始化入口按钮（在主菜单右上角）
   */
  initButton() {
    const mainMenu = document.getElementById('main-menu');
    if (!mainMenu) {
      console.warn('[PatchNotesUI] 主菜单元素不存在');
      return;
    }

    // 检查按钮是否已存在
    if (document.getElementById('patch-notes-btn')) {
      this.updateButtonNotification();
      return;
    }

    // 创建按钮
    this.button = document.createElement('button');
    this.button.id = 'patch-notes-btn';
    this.button.className = 'patch-notes-btn';
    this.button.innerHTML = ''; // 使用图片背景，不需要文字
    this.button.title = '更新公告';
    this.button.setAttribute('aria-label', '更新公告');

    // 绑定点击事件
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.open();
    });

    // 添加到主菜单
    mainMenu.appendChild(this.button);

    // 更新红点状态
    this.updateButtonNotification();

    console.log('✓ PatchNotesUI: 入口按钮已创建');
  }

  /**
   * 更新按钮上的红点通知
   */
  updateButtonNotification() {
    if (!this.button) {
      this.button = document.getElementById('patch-notes-btn');
    }
    if (!this.button) return;

    // 检查是否有未读更新
    const hasUnread = this.lastReadVersion !== CURRENT_VERSION;

    // 移除现有的红点
    const existingDot = this.button.querySelector('.notification-dot');
    if (existingDot) {
      existingDot.remove();
    }

    // 如果有未读更新，添加红点
    if (hasUnread) {
      const dot = document.createElement('div');
      dot.className = 'notification-dot';
      this.button.appendChild(dot);
    }
  }

  /**
   * 检查并自动弹出更新公告（如果版本不一致）
   */
  checkAndShow() {
    if (this.lastReadVersion !== CURRENT_VERSION) {
      // 检测昵称注册弹窗是否正在显示
      const nicknameModal = document.getElementById('nickname-modal');
      if (nicknameModal && !nicknameModal.classList.contains('hidden')) {
        console.log('[PatchNotesUI] 检测到注册弹窗，推迟显示更新公告');
        return;
      }

      // 延迟一点时间，确保主菜单已完全显示
      setTimeout(() => {
        this.open();
      }, 500);
    }
  }

  /**
   * 打开更新公告弹窗
   */
  open() {
    if (this.isOpen) return;

    // 创建或获取 overlay
    if (!this.overlay) {
      this.createOverlay();
    }

    if (!this.overlay) {
      console.error('[PatchNotesUI] 无法创建弹窗');
      return;
    }

    // 显示弹窗
    this.overlay.classList.remove('hidden');
    this.overlay.style.display = 'flex';
    
    // 触发淡入动画
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.overlay.classList.remove('overlay-fade-out');
        this.overlay.classList.add('overlay-fade-in');
      });
    });

    this.isOpen = true;
    this.render();
  }

  /**
   * 关闭更新公告弹窗
   */
  close() {
    if (!this.isOpen || !this.overlay) return;

    // 更新已读版本
    localStorage.setItem('last_read_version', CURRENT_VERSION);
    this.lastReadVersion = CURRENT_VERSION;

    // 移除红点
    this.updateButtonNotification();

    // 触发淡出动画
    this.overlay.classList.remove('overlay-fade-in');
    this.overlay.classList.add('overlay-fade-out');

    // 等待动画完成后隐藏
    setTimeout(() => {
      this.overlay.classList.add('hidden');
      this.overlay.style.display = 'none';
      this.overlay.classList.remove('overlay-fade-out');
      this.isOpen = false;
    }, 300);
  }

  /**
   * 创建弹窗 DOM 结构
   */
  createOverlay() {
    // 检查是否已存在
    const existing = document.getElementById('patch-notes-overlay');
    if (existing) {
      this.overlay = existing;
      return;
    }

    // 创建 overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'patch-notes-overlay';
    this.overlay.className = 'modal-overlay patch-notes-overlay hidden';

    // 创建 modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content patch-notes-content';

    // 创建 header
    const header = document.createElement('div');
    header.className = 'modal-header patch-notes-header';
    header.innerHTML = `
      <h3>Patch Notes</h3>
      <button class="modal-close-btn patch-notes-close-btn" aria-label="关闭">×</button>
    `;

    // 创建 body
    const body = document.createElement('div');
    body.className = 'modal-body patch-notes-body';
    body.id = 'patch-notes-body';

    // 组装结构
    modalContent.appendChild(header);
    modalContent.appendChild(body);
    this.overlay.appendChild(modalContent);

    // 添加到 body
    document.body.appendChild(this.overlay);

    // 绑定关闭事件
    const closeBtn = header.querySelector('.patch-notes-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // 点击 overlay 外部关闭
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
  }

  /**
   * 渲染更新公告内容
   */
  render() {
    const body = document.getElementById('patch-notes-body');
    if (!body) return;

    // 清空内容
    body.innerHTML = '';

    // 遍历所有版本
    CHANGELOG.forEach((version, index) => {
      const isLatest = index === 0;

      // 创建版本块
      const versionBlock = document.createElement('div');
      versionBlock.className = `patch-version-block ${isLatest ? 'latest' : ''}`;

      // 创建版本头部（只显示"最新"徽章，如果有）
      const versionHeader = document.createElement('div');
      versionHeader.className = 'patch-version-header';
      if (isLatest) {
        versionHeader.innerHTML = `
          <span class="patch-version-badge">最新</span>
        `;
      } else {
        versionHeader.style.display = 'none'; // 非最新版本不显示头部
      }

      // 创建版本标题（包含版本号、标题和日期）
      const versionTitle = document.createElement('div');
      versionTitle.className = 'patch-version-title';
      versionTitle.innerHTML = `
        <span class="patch-version-number">v${version.version}</span>
        <span>${version.title}</span>
        <span class="patch-version-title-date">${version.date}</span>
      `;

      // 创建条目列表
      const patchList = document.createElement('ul');
      patchList.className = 'patch-list';

      // 渲染每个条目（直接显示原始文本，不解析标签）
      version.lines.forEach(line => {
        const listItem = document.createElement('li');
        listItem.className = 'patch-item';

        // 直接显示原始内容，不进行解析和标签处理
        const content = document.createElement('span');
        content.className = 'patch-content';
        content.textContent = line;
        listItem.appendChild(content);

        patchList.appendChild(listItem);
      });

      // 组装版本块
      versionBlock.appendChild(versionHeader);
      versionBlock.appendChild(versionTitle);
      versionBlock.appendChild(patchList);

      // 添加到 body
      body.appendChild(versionBlock);
    });
  }

  /**
   * 解析更新条目字符串
   * @param {string} line - 原始字符串
   * @returns {object} { type, tagText, content }
   */
  parsePatchLine(line) {
    if (!line || typeof line !== 'string') {
      return { type: null, tagText: '', content: line || '' };
    }

    // 查找冒号位置
    const colonIndex = line.indexOf(':');
    
    // 如果没有冒号，默认为 INFO
    if (colonIndex === -1) {
      return {
        type: 'INFO',
        tagText: '[信息]',
        content: line.trim()
      };
    }

    // 提取类型和内容
    const typeStr = line.substring(0, colonIndex).trim().toUpperCase();
    const content = line.substring(colonIndex + 1).trim();

    // 映射类型
    const typeMap = {
      'NEW': { type: 'NEW', tagText: '[新增]' },
      'FIX': { type: 'FIX', tagText: '[修复]' },
      'BALANCE': { type: 'BALANCE', tagText: '[调整]' },
      'INFO': { type: 'INFO', tagText: '[信息]' }
    };

    const typeInfo = typeMap[typeStr] || typeMap['INFO'];

    return {
      type: typeInfo.type,
      tagText: typeInfo.tagText,
      content: content || line.trim()
    };
  }

  /**
   * 销毁组件（清理资源）
   */
  destroy() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.button) {
      this.button.remove();
      this.button = null;
    }
    this.isOpen = false;
  }
}

