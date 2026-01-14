/**
 * TutorialSystem.js
 * 情境式新手引导系统
 * 提供不打断流程的伴随式引导，帮助新玩家掌握游戏机制
 */

import { getItemDefinition } from '../constants.js';

export class TutorialSystem {
  constructor(game) {
    this.game = game;
    this.currentStep = null;
    this.currentHighlight = null;
    this.steps = {
      MOVE: {
        id: 'MOVE',
        text: '使用 W/A/S/D 或 方向键 移动',
        trigger: 'gameStart',
        highlight: null
      },
      ATTACK: {
        id: 'ATTACK',
        text: '遇到敌人！按方向键撞击怪物进行攻击',
        trigger: 'monsterInView',
        highlight: null
      },
      LOOT: {
        id: 'LOOT',
        text: '发现战利品，移动到物品上即可拾取',
        trigger: 'itemInView',
        highlight: null
      },
      EQUIP: {
        id: 'EQUIP',
        text: '获得新装备！点击右下角【背包】穿戴',
        trigger: 'equipmentInInventory',
        highlight: '#backpack-icon'
      },
      SKILL: {
        id: 'SKILL',
        text: '怒气已就绪！按 Q 释放技能，或 空格 释放必杀',
        trigger: 'skillReady',
        highlight: '#skill-bar'
      },
      STAIRS: {
        id: 'STAIRS',
        text: '找到楼梯了！击败守卫后可以前往下一层',
        trigger: 'stairsInView',
        highlight: null
      }
    };
    
    this.init();
  }

  /**
   * 初始化引导系统
   */
  init() {
    this.render();
    console.log('✓ TutorialSystem 已初始化');
  }

  /**
   * 检查是否触发某个引导步骤
   * @param {string} eventType - 事件类型
   * @param {object} context - 上下文信息
   */
  check(eventType, context = {}) {
    // 如果引导系统被禁用，直接返回
    if (!this.isEnabled()) {
      return;
    }

    // 遍历所有步骤，检查是否有匹配的触发条件
    for (const [stepId, stepConfig] of Object.entries(this.steps)) {
      // 如果该步骤已完成，跳过
      if (this.isStepCompleted(stepId)) {
        continue;
      }

      // 检查触发条件
      if (this.shouldTrigger(stepConfig, eventType, context)) {
        this.showGuide(stepId, stepConfig.text, stepConfig.highlight);
        break; // 一次只显示一个引导
      }
    }
  }

  /**
   * 判断是否应该触发某个步骤
   * @param {object} stepConfig - 步骤配置
   * @param {string} eventType - 事件类型
   * @param {object} context - 上下文
   * @returns {boolean}
   */
  shouldTrigger(stepConfig, eventType, context) {
    switch (stepConfig.trigger) {
      case 'gameStart':
        return eventType === 'gameStart' && !this.isStepCompleted(stepConfig.id);
      
      case 'monsterInView':
        if (eventType === 'fovUpdate' && context.monsters && context.monsters.length > 0) {
          // 检查视野内是否有怪物
          return context.monsters.some(m => this.isInView(m));
        }
        return false;
      
      case 'itemInView':
        if (eventType === 'fovUpdate' && context.items && context.items.length > 0) {
          // 检查视野内是否有物品
          return context.items.some(item => this.isInView(item));
        }
        return false;
      
      case 'equipmentInInventory':
        if (eventType === 'itemAdded' && context.item) {
          // 检查是否是装备
          const item = context.item;
          const itemId = typeof item === 'string' ? item : (item.itemId || item.id);
          if (!itemId) return false;
          
          // 检查是否是装备类型（需要从游戏获取装备定义）
          if (this.game && this.game.player) {
            // 使用全局导入的 getItemDefinition
            if (typeof getItemDefinition !== 'undefined') {
              const def = getItemDefinition(itemId);
              if (def && def.type && ['WEAPON', 'ARMOR', 'HELMET', 'BOOTS', 'RING'].includes(def.type)) {
                return true;
              }
            }
          }
        }
        return false;
      
      case 'skillReady':
        if (eventType === 'playerUpdate' && this.game && this.game.player) {
          const player = this.game.player;
          // 检查怒气是否足够或技能CD是否转好
          const rage = player.rage || 0;
          const skillCooldown = player.skillCooldown || 0;
          return rage >= 30 || skillCooldown <= 0;
        }
        return false;
      
      case 'stairsInView':
        if (eventType === 'fovUpdate' && context.stairs) {
          // 检查视野内是否有楼梯
          return context.stairs.some(stair => this.isInView(stair));
        }
        return false;
      
      default:
        return false;
    }
  }

  /**
   * 检查实体是否在玩家视野内
   * @param {object} entity - 实体对象
   * @returns {boolean}
   */
  isInView(entity) {
    if (!this.game || !this.game.player || !this.game.map) {
      return false;
    }
    
    const px = this.game.player.x;
    const py = this.game.player.y;
    const ex = entity.x || entity.tileX || 0;
    const ey = entity.y || entity.tileY || 0;
    
    // 检查是否在可见范围内
    if (this.game.map.visible && this.game.map.visible[ey] && this.game.map.visible[ey][ex]) {
      return true;
    }
    
    return false;
  }

  /**
   * 显示引导提示
   * @param {string} stepId - 步骤ID
   * @param {string} text - 提示文本
   * @param {string} highlightSelector - 需要高亮的元素选择器
   */
  showGuide(stepId, text, highlightSelector = null) {
    // 如果已经有引导在显示，先隐藏
    if (this.currentStep) {
      this.hideGuide();
    }

    this.currentStep = stepId;
    
    // 更新提示文本
    const textElement = document.getElementById('tutorial-text');
    if (textElement) {
      textElement.textContent = text;
    }

    // 显示引导框
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.style.display = 'block';
    }

    // 高亮目标元素
    if (highlightSelector) {
      this.highlightElement(highlightSelector);
    }

    console.log(`[Tutorial] 显示引导: ${stepId} - ${text}`);
  }

  /**
   * 隐藏引导提示
   */
  hideGuide() {
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }

    // 移除高亮
    if (this.currentHighlight) {
      this.currentHighlight.classList.remove('ui-highlight');
      this.currentHighlight = null;
    }

    this.currentStep = null;
  }

  /**
   * 高亮指定元素
   * @param {string} selector - CSS选择器
   */
  highlightElement(selector) {
    // 移除之前的高亮
    if (this.currentHighlight) {
      this.currentHighlight.classList.remove('ui-highlight');
    }

    // 查找目标元素
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('ui-highlight');
      this.currentHighlight = element;
    }
  }

  /**
   * 完成某个引导步骤
   * @param {string} stepId - 步骤ID
   */
  completeStep(stepId) {
    if (!this.game || !this.game.metaSaveSystem) {
      return;
    }

    this.game.metaSaveSystem.completeTutorialStep(stepId);
    this.hideGuide();
    console.log(`[Tutorial] 完成引导步骤: ${stepId}`);
  }

  /**
   * 检查步骤是否已完成
   * @param {string} stepId - 步骤ID
   * @returns {boolean}
   */
  isStepCompleted(stepId) {
    if (!this.game || !this.game.metaSaveSystem) {
      return false;
    }
    return this.game.metaSaveSystem.isTutorialStepCompleted(stepId);
  }

  /**
   * 检查引导系统是否启用
   * @returns {boolean}
   */
  isEnabled() {
    if (!this.game || !this.game.metaSaveSystem) {
      return true; // 默认启用
    }
    return this.game.metaSaveSystem.isTutorialEnabled();
  }

  /**
   * 渲染引导系统的DOM结构
   */
  render() {
    // 检查是否已存在
    if (document.getElementById('tutorial-overlay')) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.className = 'tutorial-overlay hidden';
    
    overlay.innerHTML = `
      <div class="tutorial-box">
        <p id="tutorial-text"></p>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  /**
   * 重置所有引导步骤
   */
  reset() {
    if (!this.game || !this.game.metaSaveSystem) {
      return;
    }
    
    this.game.metaSaveSystem.resetTutorial();
    this.hideGuide();
    console.log('[Tutorial] 引导已重置');
  }
}
