// SettingsUI.js - 设置界面
// 独立管理设置UI的所有渲染和交互逻辑

import { CURRENT_VERSION } from '../data/changelog.js';

/**
 * SettingsUI - 设置界面管理器
 * 负责渲染设置界面、处理设置项交互等
 * 完全独立的组件，不依赖外部 DOM 操作
 */
export class SettingsUI {
  constructor(config = {}) {
    // 样式配置对象（允许外部自定义）
    this.style = {
      panelOffsetX: config.panelOffsetX || 0,
      panelOffsetY: config.panelOffsetY || 0,
      panelScale: config.panelScale || 1.0,
      ...config.customStyles
    };

    // 内部状态
    this.isOpen = false;
    this.game = null; // 游戏实例引用（用于访问 settings, audio 等）

    // DOM 元素引用（延迟初始化）
    this.elements = {
      overlay: null
    };

    // 初始化
    this.init();
  }

  /**
   * 初始化组件
   */
  init() {
    this.initDOMElements();
    console.log('✓ SettingsUI 已初始化', this.style);
  }

  /**
   * 获取设置界面的完整 HTML 字符串
   * @returns {string} HTML 字符串
   */
  getHTML() {
    return `
    <!-- Left Sidebar - Category List -->
    <div class="settings-sidebar">
      <div class="settings-category active" data-category="audio">
        <span class="category-name">音频</span>
      </div>
      <div class="settings-category" data-category="graphics">
        <span class="category-name">画质</span>
      </div>
      <div class="settings-category" data-category="gameplay">
        <span class="category-name">游戏</span>
      </div>
      <div class="settings-category" data-category="display">
        <span class="category-name">显示</span>
      </div>
      <div class="settings-category" data-category="about">
        <span class="category-name">关于</span>
      </div>
    </div>
    <div class="settings-modal">
      <!-- Settings Header -->
      <div class="settings-header">
        <h2 class="settings-title">设置</h2>
        <button class="settings-close-btn" aria-label="关闭"></button>
      </div>

      <!-- Settings Content -->
      <div class="settings-content">
        <!-- Right Panel - Settings Options -->
        <div class="settings-panel">
          <!-- Audio Settings -->
          <div class="settings-section active" data-section="audio">
            <h3 class="section-title">音频设置</h3>
            
            <div class="settings-item">
              <div class="item-label">
                <span class="label-text">背景音乐音量</span>
                <span class="label-value" id="bgm-value">100%</span>
              </div>
              <div class="slider-container">
                <input type="range" id="bgm-volume" class="settings-slider" min="0" max="100" value="100" title="背景音乐音量" />
              </div>
            </div>

            <div class="settings-item">
              <div class="item-label">
                <span class="label-text">音效音量</span>
                <span class="label-value" id="sfx-value">100%</span>
              </div>
              <div class="slider-container">
                <input type="range" id="sfx-volume" class="settings-slider" min="0" max="100" value="100" title="音效音量" />
              </div>
            </div>

            <div class="settings-item">
              <div class="item-label">
                <span class="label-text">UI音效</span>
                <span class="label-value" id="ui-sfx-value">100%</span>
              </div>
              <div class="slider-container">
                <input type="range" id="ui-sfx-volume" class="settings-slider" min="0" max="100" value="100" title="UI音效音量" />
              </div>
            </div>

            <div class="settings-item checkbox-item">
              <label class="checkbox-label">
                <input type="checkbox" id="audio-enabled" class="settings-checkbox" checked title="启用音频" />
                <span class="checkbox-text">启用音频</span>
              </label>
            </div>
          </div>

          <!-- Graphics Settings -->
          <div class="settings-section" data-section="graphics">
            <h3 class="section-title">画质设置</h3>
            
            <div class="settings-item">
              <div class="item-label">
                <span class="label-text">画质预设</span>
              </div>
              <div class="button-group">
                <button class="quality-btn active" data-quality="low">低</button>
                <button class="quality-btn" data-quality="medium">中</button>
                <button class="quality-btn" data-quality="high">高</button>
              </div>
            </div>

            <div class="settings-item checkbox-item">
              <label class="checkbox-label">
                <input type="checkbox" id="particle-effects" class="settings-checkbox" checked title="粒子效果" />
                <span class="checkbox-text">粒子效果</span>
              </label>
            </div>

            <div class="settings-item checkbox-item">
              <label class="checkbox-label">
                <input type="checkbox" id="screen-shake" class="settings-checkbox" checked title="屏幕震动" />
                <span class="checkbox-text">屏幕震动</span>
              </label>
            </div>

            <div class="settings-item checkbox-item">
              <label class="checkbox-label">
                <input type="checkbox" id="bloom-effect" class="settings-checkbox" checked title="光晕效果" />
                <span class="checkbox-text">光晕效果</span>
              </label>
            </div>
          </div>

          <!-- Gameplay Settings -->
          <div class="settings-section" data-section="gameplay">
            <h3 class="section-title">游戏设置</h3>
            
            <div class="settings-item checkbox-item">
              <label class="checkbox-label">
                <input type="checkbox" id="auto-save" class="settings-checkbox" checked title="自动保存" />
                <span class="checkbox-text">自动保存</span>
              </label>
            </div>

            <div class="settings-item checkbox-item">
              <label class="checkbox-label">
                <input type="checkbox" id="difficulty-scaling" class="settings-checkbox" checked title="难度动态调整" />
                <span class="checkbox-text">难度动态调整</span>
              </label>
            </div>

            <div class="settings-item checkbox-item">
              <label class="checkbox-label">
                <input type="checkbox" id="show-damage-numbers" class="settings-checkbox" checked title="显示伤害数字" />
                <span class="checkbox-text">显示伤害数字</span>
              </label>
            </div>
          </div>

          <!-- Display Settings -->
          <div class="settings-section" data-section="display">
            <h3 class="section-title">显示设置</h3>
            
            <div class="settings-item">
              <div class="item-label">
                <span class="label-text">亮度</span>
                <span class="label-value" id="brightness-value">100%</span>
              </div>
              <div class="slider-container">
                <input type="range" id="brightness" class="settings-slider" min="50" max="150" value="100" title="亮度" />
              </div>
            </div>

            <div class="settings-item">
              <div class="item-label">
                <span class="label-text">对比度</span>
                <span class="label-value" id="contrast-value">100%</span>
              </div>
              <div class="slider-container">
                <input type="range" id="contrast" class="settings-slider" min="50" max="150" value="100" title="对比度" />
              </div>
            </div>

            <div class="settings-item checkbox-item">
              <label class="checkbox-label">
                <input type="checkbox" id="show-fps" class="settings-checkbox" title="显示FPS" />
                <span class="checkbox-text">显示FPS</span>
              </label>
            </div>

            <div class="settings-item checkbox-item">
              <label class="checkbox-label">
                <input type="checkbox" id="fullscreen-mode" class="settings-checkbox" title="全屏模式" />
                <span class="checkbox-text">全屏模式</span>
              </label>
            </div>
          </div>

          <!-- About Section -->
          <div class="settings-section" data-section="about">
            <h3 class="section-title">关于游戏</h3>
            
            <div class="about-content">
              <div class="about-item">
                <span class="about-label">游戏名称:</span>
                <span class="about-value">魔塔战记 RPG</span>
              </div>
              <div class="about-item">
                <span class="about-label">版本:</span>
                <span class="about-value">${CURRENT_VERSION}</span>
              </div>
              <div class="about-item">
                <span class="about-label">开发者:</span>
                <span class="about-value">Game Studio</span>
              </div>
              <div class="about-item">
                <span class="about-label">引擎:</span>
                <span class="about-value">Canvas 2D</span>
              </div>
              <div class="about-description">
                <p>这是一款黑暗幻想风格的RPG游戏，融合了Roguelike元素和塔防机制。</p>
                <p>探索神秘的魔法塔，击败各种怪物，收集强大的装备和技能。</p>
              </div>
              
              <!-- 开发者模式入口 -->
              <div class="settings-item" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 215, 0, 0.2);">
                <div class="item-label">
                  <span class="label-text">开发者模式</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; margin-top: 10px;">
                  <input 
                    type="password" 
                    id="dev-code-input" 
                    placeholder="输入开发者密码"
                    style="flex: 1; padding: 8px 12px; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 4px; color: #fff; font-family: var(--font-body);"
                  />
                  <button 
                    id="dev-code-submit" 
                    class="dev-code-submit-btn"
                    style="padding: 8px 20px; background: rgba(255, 215, 0, 0.2); border: 1px solid #ffd700; border-radius: 4px; color: #ffd700; cursor: pointer; font-family: var(--font-body); transition: all 0.2s ease;"
                  >
                    确认
                  </button>
                </div>
                <div id="dev-mode-status" style="margin-top: 8px; font-size: 0.85rem; color: #8c8273; display: none;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Footer -->
      <div class="settings-footer">
        <button class="btn-core btn-system" id="settings-reset-btn">恢复默认</button>
        <button class="btn-core btn-system" id="settings-close-btn">关闭</button>
      </div>
    </div>
    `;
  }

  /**
   * 初始化 DOM 元素引用
   */
  initDOMElements() {
    // 检查是否存在 settings-overlay 元素
    this.elements.overlay = document.getElementById('settings-overlay');
    
    // 如果不存在，创建新的 overlay 元素
    if (!this.elements.overlay) {
      console.log('Creating settings-overlay element dynamically');
      const overlay = document.createElement('div');
      overlay.id = 'settings-overlay';
      overlay.className = 'settings-overlay hidden';
      
      // 注入 HTML 内容
      overlay.innerHTML = this.getHTML();
      
      // 将 overlay 添加到 body（确保全屏覆盖）
      document.body.appendChild(overlay);
      this.elements.overlay = overlay;
    }
    
    console.log('✓ SettingsUI DOM elements initialized:', {
      overlay: !!this.elements.overlay
    });
  }

  /**
   * 设置游戏实例引用（用于访问 settings, audio 等）
   * @param {object} game - 游戏实例
   */
  setGame(game) {
    this.game = game;
  }

  /**
   * 更新版本号显示
   * 确保版本号始终与 changelog.js 中的 CURRENT_VERSION 保持同步
   */
  updateVersion() {
    if (!this.elements.overlay) return;

    // 查找所有的 .about-item 元素
    const aboutItems = this.elements.overlay.querySelectorAll('.about-item');
    
    for (const item of aboutItems) {
      // 查找该 item 内的 .about-label 元素
      const label = item.querySelector('.about-label');
      if (!label) continue;

      // 检查标签文本是否包含 "版本" 或 "Version"
      const labelText = label.textContent || label.innerText || '';
      if (labelText.includes('版本') || labelText.includes('Version')) {
        // 找到对应的 .about-value 元素并更新版本号
        const valueElement = item.querySelector('.about-value');
        if (valueElement) {
          valueElement.textContent = CURRENT_VERSION;
          console.log(`✓ 版本号已更新为: ${CURRENT_VERSION}`);
          break; // 找到后退出循环
        }
      }
    }
  }

  /**
   * 打开设置界面
   */
  open() {
    if (!this.elements.overlay) {
      this.initDOMElements();
    }

    if (!this.elements.overlay) {
      console.warn('Settings overlay element not found');
      return;
    }

    // 加载设置到 UI（如果游戏实例存在）
    if (this.game && this.game.loadSettingsUI) {
      this.game.loadSettingsUI();
    }

    // 更新版本号显示（确保始终是最新版本）
    this.updateVersion();

    // 显示 overlay
    this.elements.overlay.classList.remove('hidden');
    this.elements.overlay.style.setProperty('display', 'flex', 'important');

    // 强制重排以确保过渡生效
    void this.elements.overlay.offsetWidth;

    this.elements.overlay.classList.remove('overlay-fade-out');
    this.elements.overlay.classList.add('overlay-fade-in');

    // 模态框进场动画
    const modal = this.elements.overlay.querySelector('.settings-modal');
    if (modal) {
      modal.classList.remove('modal-animate-exit');
      modal.classList.add('modal-animate-enter');
    }

    // 设置事件监听器（如果游戏实例存在）
    if (this.game && this.game.setupSettingsEventListeners) {
      this.game.setupSettingsEventListeners();
    }

    this.isOpen = true;
    console.log('✓ SettingsUI 已打开');
  }

  /**
   * 关闭设置界面
   */
  close() {
    if (!this.elements.overlay) return;

    // 模态框离场动画
    const modal = this.elements.overlay.querySelector('.settings-modal');
    if (modal) {
      modal.classList.remove('modal-animate-enter');
      modal.classList.add('modal-animate-exit');
    }

    // 背景淡出
    this.elements.overlay.classList.remove('overlay-fade-in');
    this.elements.overlay.classList.add('overlay-fade-out');

    // 延时隐藏 (250ms 匹配动画时长)
    setTimeout(() => {
      this.elements.overlay.classList.add('hidden');
      this.elements.overlay.style.setProperty('display', 'none', 'important');

      // 清理动画类，为下次打开做准备
      this.elements.overlay.classList.remove('overlay-fade-out');
      if (modal) {
        modal.classList.remove('modal-animate-exit');
      }
    }, 250);

    // 保存设置（如果游戏实例存在）
    if (this.game && this.game.saveSettings) {
      this.game.saveSettings();
    }

    this.isOpen = false;
    console.log('✓ SettingsUI 已关闭');
  }

  /**
   * 切换设置界面开关
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 销毁组件（清理资源）
   */
  destroy() {
    this.close();
    this.game = null;
    console.log('✓ SettingsUI 已销毁');
  }
}
