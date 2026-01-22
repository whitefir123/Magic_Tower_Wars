# 设计文档：铁匠铺UI全面重构

## 概述

本设计文档规定了对现有铁匠铺系统进行全面UI重构的技术实现。重构将解决当前UI的多个关键问题，并创建一个沉浸式的铁匠铺体验。

重构重点关注五个关键领域：
1. **背包深度绑定** - 实现装备图标的实时同步显示
2. **强化功能完善** - 添加材料槽位、数值对比和成功率显示
3. **宝石系统优化** - 详细化镶嵌和合成信息，正确使用精灵图资源
4. **NPC交互系统** - 实现铁匠NPC的可视化、对话和送礼系统
5. **沉浸式UI设计** - 背景图片铺满、功能按钮优化布局、页面导航

实现将建立在现有的 `ForgeUI.js` 和 `BlacksmithSystem.js` 之上，同时保持与当前强化引擎、材料系统、宝石系统等的向后兼容性。所有新功能将作为渐进增强实现，在低性能设备上优雅降级。

## 架构

### 界面布局设计

铁匠铺UI采用三层布局结构：

**初始状态（默认视图）：**
```
┌─────────────────────────────────────────────────────────┐
│  [背景图片铺满整个屏幕]                    [功能按钮区] │
│                                            ┌──────────┐ │
│  ┌──────────┐                              │ ⚒️ 强化  │ │
│  │          │                              ├──────────┤ │
│  │  铁匠    │                              │ 💎 宝石  │ │
│  │  NPC     │                              ├──────────┤ │
│  │  精灵图  │                              │ 🔮 合成  │ │
│  │          │                              ├──────────┤ │
│  │  [等级]  │                              │ 🔨 拆解  │ │
│  │  [好感]  │                              ├──────────┤ │
│  └──────────┘                              │ 📦 批量  │ │
│                                            ├──────────┤ │
│                                            │ 📜 历史  │ │
│                                            └──────────┘ │
│                                                         │
│                                            [关闭按钮]   │
└─────────────────────────────────────────────────────────┘
```

**功能面板展开状态：**
```
┌─────────────────────────────────────────────────────────┐
│  [背景图片]                            [功能按钮区]     │
│                                        ┌──────────┐     │
│  ┌──────────┐    ┌─────────────────┐  │ ⚒️ 强化  │     │
│  │          │    │                 │  ├──────────┤     │
│  │  铁匠    │    │  功能面板       │  │ 💎 宝石  │     │
│  │  NPC     │    │  (半透明背景)   │  ├──────────┤     │
│  │          │    │                 │  │ 🔮 合成  │     │
│  │  [等级]  │    │  [装备列表]     │  ├──────────┤     │
│  │  [好感]  │    │  [详情面板]     │  │ 🔨 拆解  │     │
│  └──────────┘    │  [操作按钮]  [×]│  └──────────┘     │
│                  └─────────────────┘                    │
│                                            [关闭按钮]   │
└─────────────────────────────────────────────────────────┘
```

### 组件结构

铁匠铺UI系统遵循模块化架构，具有明确的关注点分离：

```
ForgeUI (主控制器)
├── InitialView (初始界面管理器)
│   ├── BackgroundRenderer (背景图片渲染)
│   ├── NPCDisplay (左侧NPC显示)
│   └── FunctionButtons (右上角功能按钮)
├── DynamicPanelManager (动态面板管理器)
│   ├── PanelAnimator (面板动画控制)
│   └── PanelStateManager (面板状态管理)
├── InventoryBinder (管理背包深度绑定和实时同步)
├── EnhancementPanel (处理强化界面和材料槽位)
│   ├── MaterialSlotManager (管理材料槽位)
│   ├── StatComparisonRenderer (渲染属性对比)
│   └── SuccessRateCalculator (计算和显示成功率)
├── GemPanel (处理宝石镶嵌和合成)
│   ├── GemSocketManager (管理宝石槽位)
│   ├── GemSelectionModal (宝石选择界面)
│   └── GemSynthesisRenderer (宝石合成界面)
├── BlacksmithNPCRenderer (处理NPC可视化和动画)
│   ├── NPCAnimator (管理NPC精灵图动画)
│   ├── DialogueSystem (处理对话显示)
│   └── GiftSystem (处理送礼功能)
├── AffinityManager (管理好感度系统)
├── NavigationController (处理功能面板切换)
├── SpriteManager (管理所有精灵图资源)
├── HistoryTracker (管理操作历史记录)
└── AccessibilityManager (处理响应式布局和无障碍支持)
```

### 数据流

1. **界面打开（初始状态）**
   - ForgeUI 初始化所有子系统
   - InitialView 渲染背景图片
   - NPCDisplay 显示铁匠NPC（左侧）
   - FunctionButtons 渲染功能按钮（右上角）
   - 不显示任何功能面板，保持界面简洁

2. **功能按钮点击**
   - 用户点击右上角功能按钮（如"强化"）
   - NavigationController 接收点击事件
   - DynamicPanelManager 创建对应的功能面板
   - PanelAnimator 播放面板滑入/淡入动画
   - 功能面板显示在界面中央偏右位置
   - 背景、NPC和功能按钮保持可见

3. **背包绑定** 
   - InventoryBinder 监听背包变化
   - 当功能面板打开时，实时更新装备列表

4. **装备选择** 
   - 触发详情面板渲染和材料槽位显示

5. **强化操作** 
   - MaterialSlotManager 收集材料 
   - EnhancementEngine 执行 
   - 结果动画 
   - 数据同步

6. **NPC交互** 
   - BlacksmithNPCRenderer 处理点击 
   - DialogueSystem 显示对话 
   - AffinityManager 更新好感度

7. **面板关闭**
   - 用户点击面板关闭按钮或切换功能
   - PanelAnimator 播放面板滑出/淡出动画
   - 返回初始状态（只显示背景、NPC和功能按钮）

8. **数据持久化** 
   - 所有操作自动保存到游戏存档

### 集成点

- **现有系统**：保持与 `BlacksmithSystem.js`、`EnhancementEngine.js`、`MaterialSystem.js`、`GemSystemEnhanced.js` 等的兼容性
- **音频系统**：与 `AudioManager` 集成实现音效反馈
- **背包系统**：深度绑定玩家背包数据
- **成就系统**：触发铁匠相关成就检查
- **存档系统**：自动保存所有操作和NPC关系数据

## 组件和接口

### InitialView

管理铁匠铺的初始界面状态，包括背景、NPC和功能按钮。

```javascript
class InitialView {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.npcDisplay = null;
    this.functionButtons = null;
  }

  /**
   * 渲染初始界面
   */
  render() {
    const container = this.forgeUI.elements.overlay;
    
    // 清空现有内容
    container.innerHTML = `
      <div class="forge-modal">
        <!-- 左侧NPC区域 -->
        <div class="forge-npc-area" id="forge-npc-area"></div>
        
        <!-- 右上角功能按钮区域 -->
        <div class="forge-function-buttons" id="forge-function-buttons"></div>
        
        <!-- 动态面板容器（初始为空） -->
        <div class="forge-dynamic-panel-container" id="forge-dynamic-panel"></div>
        
        <!-- 右上角关闭按钮 -->
        <button class="forge-close-btn" id="forge-close-btn">✕</button>
      </div>
    `;
    
    // 渲染NPC
    this.renderNPC();
    
    // 渲染功能按钮
    this.renderFunctionButtons();
  }

  /**
   * 渲染铁匠NPC
   */
  renderNPC() {
    const npcArea = document.getElementById('forge-npc-area');
    if (!npcArea) return;
    
    npcArea.innerHTML = `
      <div class="blacksmith-npc" id="blacksmith-npc">
        <canvas class="npc-sprite" id="npc-sprite-canvas" width="128" height="128"></canvas>
        <div class="npc-info">
          <div class="npc-level">
            等级: <span id="npc-level-value">1</span>
          </div>
          <div class="npc-affinity">
            <div id="npc-affinity-title">陌生</div>
            <div class="affinity-bar">
              <div class="affinity-progress" id="affinity-progress" style="width: 0%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // 初始化NPC渲染器
    if (this.forgeUI.npcRenderer) {
      this.forgeUI.npcRenderer.initialize();
    }
  }

  /**
   * 渲染功能按钮
   */
  renderFunctionButtons() {
    const buttonsArea = document.getElementById('forge-function-buttons');
    if (!buttonsArea) return;
    
    const buttons = [
      { id: 'enhance', icon: '⚒️', label: '强化/重铸', tooltip: '强化装备等级或重铸品质' },
      { id: 'socket', icon: '💎', label: '宝石镶嵌', tooltip: '镶嵌宝石提升装备属性' },
      { id: 'synthesis', icon: '🔮', label: '宝石合成', tooltip: '合成高级宝石' },
      { id: 'dismantle', icon: '🔨', label: '装备拆解', tooltip: '拆解装备获取材料' },
      { id: 'batch', icon: '📦', label: '批量操作', tooltip: '批量强化或拆解装备' },
      { id: 'history', icon: '📜', label: '操作历史', tooltip: '查看操作历史记录' }
    ];
    
    buttonsArea.innerHTML = buttons.map(btn => `
      <button class="forge-function-btn" data-function="${btn.id}" title="${btn.tooltip}">
        <span class="function-icon">${btn.icon}</span>
        <span class="function-label">${btn.label}</span>
      </button>
    `).join('');
    
    // 绑定点击事件
    buttons.forEach(btn => {
      const element = buttonsArea.querySelector(`[data-function="${btn.id}"]`);
      if (element) {
        element.addEventListener('click', () => {
          this.forgeUI.showFunctionPanel(btn.id);
        });
      }
    });
  }

  /**
   * 显示初始状态
   */
  show() {
    const npcArea = document.getElementById('forge-npc-area');
    const buttonsArea = document.getElementById('forge-function-buttons');
    
    if (npcArea) npcArea.style.display = 'block';
    if (buttonsArea) buttonsArea.style.display = 'flex';
  }

  /**
   * 隐藏初始状态（当显示功能面板时）
   */
  hide() {
    // 注意：不隐藏NPC和功能按钮，它们应该始终可见
  }
}
```

### DynamicPanelManager

管理功能面板的动态显示和切换。

```javascript
class DynamicPanelManager {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.currentPanel = null;
    this.panelAnimator = new PanelAnimator();
    this.panels = {
      enhance: null,
      socket: null,
      synthesis: null,
      dismantle: null,
      batch: null,
      history: null
    };
  }

  /**
   * 显示指定功能面板
   */
  async showPanel(panelId) {
    const container = document.getElementById('forge-dynamic-panel');
    if (!container) return;
    
    // 如果已有面板显示，先关闭
    if (this.currentPanel) {
      await this.closePanel();
    }
    
    // 创建新面板
    const panel = this.createPanel(panelId);
    if (!panel) return;
    
    // 添加到容器
    container.innerHTML = '';
    container.appendChild(panel);
    
    // 播放进入动画
    await this.panelAnimator.slideIn(panel);
    
    this.currentPanel = panelId;
    this.panels[panelId] = panel;
  }

  /**
   * 关闭当前面板
   */
  async closePanel() {
    if (!this.currentPanel) return;
    
    const panel = this.panels[this.currentPanel];
    if (!panel) return;
    
    // 播放退出动画
    await this.panelAnimator.slideOut(panel);
    
    // 移除面板
    const container = document.getElementById('forge-dynamic-panel');
    if (container) {
      container.innerHTML = '';
    }
    
    this.panels[this.currentPanel] = null;
    this.currentPanel = null;
  }

  /**
   * 创建功能面板
   */
  createPanel(panelId) {
    const panel = document.createElement('div');
    panel.className = 'forge-function-panel';
    panel.id = `forge-panel-${panelId}`;
    
    // 添加面板头部
    panel.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">${this.getPanelTitle(panelId)}</h3>
        <button class="panel-close-btn" id="panel-close-btn">✕</button>
      </div>
      <div class="panel-content" id="panel-content-${panelId}">
        <!-- 面板内容将在这里渲染 -->
      </div>
    `;
    
    // 绑定关闭按钮
    const closeBtn = panel.querySelector('.panel-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closePanel());
    }
    
    // 渲染面板内容
    this.renderPanelContent(panelId, panel);
    
    return panel;
  }

  /**
   * 获取面板标题
   */
  getPanelTitle(panelId) {
    const titles = {
      enhance: '装备强化/重铸',
      socket: '宝石镶嵌',
      synthesis: '宝石合成',
      dismantle: '装备拆解',
      batch: '批量操作',
      history: '操作历史'
    };
    return titles[panelId] || '未知功能';
  }

  /**
   * 渲染面板内容
   */
  renderPanelContent(panelId, panel) {
    const contentArea = panel.querySelector(`#panel-content-${panelId}`);
    if (!contentArea) return;
    
    switch (panelId) {
      case 'enhance':
        this.forgeUI.enhancementPanel?.render(contentArea);
        break;
      case 'socket':
        this.forgeUI.gemPanel?.renderSocketView(contentArea);
        break;
      case 'synthesis':
        this.forgeUI.gemPanel?.renderSynthesisView(contentArea);
        break;
      case 'dismantle':
        this.renderDismantlePanel(contentArea);
        break;
      case 'batch':
        this.forgeUI.batchOperationPanel?.render(contentArea);
        break;
      case 'history':
        this.forgeUI.historyTracker?.showHistoryPanel();
        break;
    }
  }

  /**
   * 渲染拆解面板
   */
  renderDismantlePanel(container) {
    container.innerHTML = `
      <div class="dismantle-panel">
        <div class="dismantle-list" id="dismantle-list">
          <!-- 装备列表 -->
        </div>
        <div class="dismantle-actions">
          <button class="forge-btn forge-btn-dismantle" id="dismantle-btn">拆解选中装备</button>
        </div>
      </div>
    `;
    
    // 渲染装备列表
    this.forgeUI.renderItemList('dismantle-list');
  }
}
```

### PanelAnimator

处理面板的进入和退出动画。

```javascript
class PanelAnimator {
  /**
   * 滑入动画
   */
  async slideIn(element) {
    element.style.opacity = '0';
    element.style.transform = 'translateX(100px)';
    element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // 触发重排
    element.offsetHeight;
    
    element.style.opacity = '1';
    element.style.transform = 'translateX(0)';
    
    return new Promise(resolve => {
      setTimeout(resolve, 300);
    });
  }

  /**
   * 滑出动画
   */
  async slideOut(element) {
    element.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
    element.style.opacity = '0';
    element.style.transform = 'translateX(100px)';
    
    return new Promise(resolve => {
      setTimeout(resolve, 250);
    });
  }

  /**
   * 淡入动画
   */
  async fadeIn(element) {
    element.style.opacity = '0';
    element.style.transition = 'opacity 0.3s ease';
    
    element.offsetHeight;
    
    element.style.opacity = '1';
    
    return new Promise(resolve => {
      setTimeout(resolve, 300);
    });
  }

  /**
   * 淡出动画
   */
  async fadeOut(element) {
    element.style.transition = 'opacity 0.25s ease';
    element.style.opacity = '0';
    
    return new Promise(resolve => {
      setTimeout(resolve, 250);
    });
  }
}
```

### InventoryBinder

管理背包与铁匠铺UI的深度绑定和实时同步。

```javascript
class InventoryBinder {
  constructor(forgeUI, player) {
    this.forgeUI = forgeUI;
    this.player = player;
    this.equipmentCache = new Map(); // 装备UID -> 装备对象
    this.observers = [];
  }

  /**
   * 初始化绑定
   * 扫描背包和装备栏，建立装备缓存
   */
  initialize() {
    this.scanInventory();
    this.setupObservers();
  }

  /**
   * 扫描背包和装备栏
   * 返回所有可强化装备的列表
   */
  scanInventory() {
    const equipment = [];
    
    // 扫描装备栏
    const slots = ['WEAPON', 'ARMOR', 'HELM', 'BOOTS', 'RING', 'AMULET', 'ACCESSORY'];
    slots.forEach(slot => {
      const item = this.player.equipment[slot];
      if (item && this.isEnhanceable(item)) {
        equipment.push({ item, source: 'equipped', slot });
        this.equipmentCache.set(item.uid, item);
      }
    });
    
    // 扫描背包
    this.player.inventory.forEach((item, index) => {
      if (item && this.isEnhanceable(item)) {
        equipment.push({ item, source: 'inventory', index });
        this.equipmentCache.set(item.uid, item);
      }
    });
    
    return equipment;
  }

  /**
   * 判断物品是否可强化
   */
  isEnhanceable(item) {
    return item && 
           typeof item === 'object' && 
           item.type !== 'CONSUMABLE' && 
           item.type !== 'GEM';
  }

  /**
   * 设置观察者监听背包变化
   */
  setupObservers() {
    // 使用 Proxy 监听背包数组变化
    const inventoryProxy = new Proxy(this.player.inventory, {
      set: (target, property, value) => {
        const result = Reflect.set(target, property, value);
        this.onInventoryChange();
        return result;
      }
    });
    
    // 监听装备栏变化
    const equipmentProxy = new Proxy(this.player.equipment, {
      set: (target, property, value) => {
        const result = Reflect.set(target, property, value);
        this.onEquipmentChange(property, value);
        return result;
      }
    });
    
    this.player.inventory = inventoryProxy;
    this.player.equipment = equipmentProxy;
  }

  /**
   * 背包变化回调
   */
  onInventoryChange() {
    if (this.forgeUI.isOpen) {
      this.forgeUI.renderItemList();
    }
  }

  /**
   * 装备栏变化回调
   */
  onEquipmentChange(slot, newItem) {
    if (this.forgeUI.isOpen) {
      // 如果当前选中的装备被卸下，清除选中状态
      if (this.forgeUI.selectedItem && 
          this.forgeUI.selectedSlot === slot && 
          !newItem) {
        this.forgeUI.clearSelection();
      }
      this.forgeUI.renderItemList();
    }
  }

  /**
   * 获取装备的实时数据
   */
  getEquipmentData(uid) {
    return this.equipmentCache.get(uid);
  }

  /**
   * 更新装备数据
   */
  updateEquipmentData(uid, updates) {
    const equipment = this.equipmentCache.get(uid);
    if (equipment) {
      Object.assign(equipment, updates);
      this.onInventoryChange();
    }
  }

  /**
   * 清理绑定
   */
  cleanup() {
    this.equipmentCache.clear();
    this.observers = [];
  }
}
```

### MaterialSlotManager

管理强化材料槽位的显示和交互。

```javascript
class MaterialSlotManager {
  constructor(enhancementPanel) {
    this.panel = enhancementPanel;
    this.slots = [
      { type: 'PROTECTION_SCROLL', item: null, maxStack: 1 },
      { type: 'LUCKY_STONE', item: null, maxStack: 5 },
      { type: 'BLESSING_STONE', item: null, maxStack: 3 }
    ];
    this.slotElements = [];
  }

  /**
   * 渲染材料槽位
   */
  render(containerElement) {
    containerElement.innerHTML = '';
    this.slotElements = [];
    
    this.slots.forEach((slot, index) => {
      const slotEl = this.createSlotElement(slot, index);
      containerElement.appendChild(slotEl);
      this.slotElements.push(slotEl);
    });
  }

  /**
   * 创建槽位元素
   */
  createSlotElement(slot, index) {
    const slotEl = document.createElement('div');
    slotEl.className = 'material-slot';
    slotEl.dataset.slotIndex = index;
    slotEl.dataset.slotType = slot.type;
    
    if (slot.item) {
      slotEl.classList.add('filled');
      slotEl.innerHTML = `
        <div class="material-icon">
          <canvas class="material-sprite"></canvas>
        </div>
        <div class="material-count">${slot.item.count || 1}</div>
        <button class="material-remove-btn">×</button>
      `;
      
      // 渲染精灵图图标
      const canvas = slotEl.querySelector('.material-sprite');
      this.renderMaterialIcon(canvas, slot.type);
      
      // 绑定移除按钮
      const removeBtn = slotEl.querySelector('.material-remove-btn');
      removeBtn.addEventListener('click', () => this.removeFromSlot(index));
    } else {
      slotEl.classList.add('empty');
      slotEl.innerHTML = `
        <div class="material-placeholder">
          <span class="material-type-label">${this.getSlotLabel(slot.type)}</span>
        </div>
      `;
    }
    
    // 绑定点击事件
    slotEl.addEventListener('click', () => this.onSlotClick(index));
    
    // 支持拖拽
    slotEl.addEventListener('dragover', (e) => e.preventDefault());
    slotEl.addEventListener('drop', (e) => this.onSlotDrop(e, index));
    
    return slotEl;
  }

  /**
   * 渲染材料图标（使用精灵图）
   */
  renderMaterialIcon(canvas, materialType) {
    const spriteManager = this.panel.forgeUI.spriteManager;
    const materialImage = spriteManager.getMaterialSprite();
    
    if (!materialImage || !materialImage.complete) {
      console.warn('材料精灵图未加载');
      return;
    }
    
    const iconData = FORGE_MATERIAL_ICONS[materialType];
    if (!iconData) {
      console.warn(`未知材料类型: ${materialType}`);
      return;
    }
    
    const ctx = canvas.getContext('2d');
    const cellW = materialImage.width / 3; // 3列
    const cellH = materialImage.height / 2; // 2行
    
    const sx = iconData.col * cellW;
    const sy = iconData.row * cellH;
    
    canvas.width = 48;
    canvas.height = 48;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(materialImage, sx, sy, cellW, cellH, 0, 0, 48, 48);
  }

  /**
   * 获取槽位标签
   */
  getSlotLabel(type) {
    const labels = {
      'PROTECTION_SCROLL': '保护卷轴',
      'LUCKY_STONE': '幸运石',
      'BLESSING_STONE': '祝福石'
    };
    return labels[type] || type;
  }

  /**
   * 槽位点击事件
   */
  onSlotClick(index) {
    const slot = this.slots[index];
    if (slot.item) {
      // 已有材料，点击移除
      this.removeFromSlot(index);
    } else {
      // 空槽位，打开材料选择
      this.openMaterialSelection(index);
    }
  }

  /**
   * 槽位拖拽放置事件
   */
  onSlotDrop(event, index) {
    event.preventDefault();
    const materialData = event.dataTransfer.getData('material');
    if (materialData) {
      const material = JSON.parse(materialData);
      this.addToSlot(index, material);
    }
  }

  /**
   * 添加材料到槽位
   */
  addToSlot(index, material) {
    const slot = this.slots[index];
    
    // 验证材料类型匹配
    if (material.type !== slot.type) {
      console.warn('材料类型不匹配');
      return false;
    }
    
    // 验证玩家是否拥有该材料
    const player = this.panel.forgeUI.player;
    const inventory = player.stats.materials || {};
    if (!inventory[material.type] || inventory[material.type] < 1) {
      console.warn('材料不足');
      return false;
    }
    
    // 添加到槽位
    slot.item = {
      type: material.type,
      count: Math.min(material.count || 1, slot.maxStack)
    };
    
    // 重新渲染
    this.render(this.slotElements[0].parentElement);
    
    // 更新强化成功率显示
    this.panel.updateSuccessRate();
    
    return true;
  }

  /**
   * 从槽位移除材料
   */
  removeFromSlot(index) {
    const slot = this.slots[index];
    slot.item = null;
    
    // 重新渲染
    this.render(this.slotElements[0].parentElement);
    
    // 更新强化成功率显示
    this.panel.updateSuccessRate();
  }

  /**
   * 打开材料选择界面
   */
  openMaterialSelection(index) {
    const slot = this.slots[index];
    const player = this.panel.forgeUI.player;
    const inventory = player.stats.materials || {};
    
    // 检查是否有该类型材料
    if (!inventory[slot.type] || inventory[slot.type] < 1) {
      this.panel.forgeUI.showMessage(`没有${this.getSlotLabel(slot.type)}`);
      return;
    }
    
    // 直接添加材料（简化版，可以扩展为选择数量）
    this.addToSlot(index, { type: slot.type, count: 1 });
  }

  /**
   * 获取所有槽位中的材料
   */
  getMaterials() {
    return this.slots
      .filter(slot => slot.item !== null)
      .map(slot => slot.item);
  }

  /**
   * 清空所有槽位
   */
  clearAll() {
    this.slots.forEach(slot => slot.item = null);
    if (this.slotElements.length > 0) {
      this.render(this.slotElements[0].parentElement);
    }
  }

  /**
   * 消耗槽位中的材料
   */
  consumeMaterials() {
    const player = this.panel.forgeUI.player;
    const materials = player.stats.materials || {};
    
    this.slots.forEach(slot => {
      if (slot.item) {
        const count = slot.item.count || 1;
        materials[slot.type] = (materials[slot.type] || 0) - count;
        if (materials[slot.type] < 0) materials[slot.type] = 0;
      }
    });
    
    this.clearAll();
  }
}
```

### StatComparisonRenderer

渲染强化前后的属性对比。

```javascript
class StatComparisonRenderer {
  constructor(enhancementPanel) {
    this.panel = enhancementPanel;
  }

  /**
   * 渲染属性对比
   */
  render(containerElement, equipment, nextLevel) {
    const currentStats = this.calculateStats(equipment, equipment.enhanceLevel || 0);
    const nextStats = this.calculateStats(equipment, nextLevel);
    
    containerElement.innerHTML = '';
    
    // 创建对比表格
    const table = document.createElement('div');
    table.className = 'stat-comparison-table';
    
    // 遍历所有属性
    const allStats = new Set([
      ...Object.keys(currentStats),
      ...Object.keys(nextStats)
    ]);
    
    allStats.forEach(statKey => {
      const currentValue = currentStats[statKey] || 0;
      const nextValue = nextStats[statKey] || 0;
      const diff = nextValue - currentValue;
      
      if (diff !== 0) {
        const row = this.createStatRow(statKey, currentValue, nextValue, diff);
        table.appendChild(row);
      }
    });
    
    containerElement.appendChild(table);
  }

  /**
   * 创建属性行
   */
  createStatRow(statKey, currentValue, nextValue, diff) {
    const row = document.createElement('div');
    row.className = 'stat-comparison-row';
    
    const statLabel = this.getStatLabel(statKey);
    const diffPercent = currentValue > 0 ? ((diff / currentValue) * 100).toFixed(1) : 0;
    const isIncrease = diff > 0;
    
    row.innerHTML = `
      <div class="stat-label">${statLabel}</div>
      <div class="stat-current">${this.formatStatValue(statKey, currentValue)}</div>
      <div class="stat-arrow ${isIncrease ? 'increase' : 'decrease'}">
        ${isIncrease ? '▲' : '▼'}
      </div>
      <div class="stat-next ${isIncrease ? 'increase' : 'decrease'}">
        ${this.formatStatValue(statKey, nextValue)}
      </div>
      <div class="stat-diff ${isIncrease ? 'increase' : 'decrease'}">
        ${isIncrease ? '+' : ''}${diff} (${isIncrease ? '+' : ''}${diffPercent}%)
      </div>
    `;
    
    return row;
  }

  /**
   * 计算装备属性
   */
  calculateStats(equipment, enhanceLevel) {
    const blacksmithSystem = this.panel.forgeUI.blacksmithSystem;
    return blacksmithSystem.calculateEquipmentStats(equipment, enhanceLevel);
  }

  /**
   * 获取属性标签
   */
  getStatLabel(statKey) {
    const labels = {
      'attack': '攻击力',
      'defense': '防御力',
      'hp': '生命值',
      'speed': '速度',
      'critRate': '暴击率',
      'critDamage': '暴击伤害',
      'dodge': '闪避',
      'accuracy': '命中'
    };
    return labels[statKey] || statKey;
  }

  /**
   * 格式化属性值
   */
  formatStatValue(statKey, value) {
    // 百分比属性
    if (['critRate', 'dodge', 'accuracy'].includes(statKey)) {
      return `${(value * 100).toFixed(1)}%`;
    }
    // 整数属性
    return Math.floor(value).toString();
  }
}
```


### BlacksmithNPCRenderer

处理铁匠NPC的可视化、动画和交互。

```javascript
class BlacksmithNPCRenderer {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.npcElement = null;
    this.animator = null;
    this.dialogueSystem = null;
    this.giftSystem = null;
    this.currentAnimation = 'IDLE';
  }

  /**
   * 初始化NPC渲染器
   */
  initialize(containerElement) {
    this.npcElement = this.createNPCElement();
    containerElement.appendChild(this.npcElement);
    
    this.animator = new NPCAnimator(this);
    this.dialogueSystem = new DialogueSystem(this);
    this.giftSystem = new GiftSystem(this);
    
    this.animator.startAnimation('IDLE');
    this.setupEventListeners();
  }

  /**
   * 创建NPC元素
   */
  createNPCElement() {
    const npcEl = document.createElement('div');
    npcEl.className = 'blacksmith-npc';
    npcEl.innerHTML = `
      <canvas class="npc-sprite" width="128" height="128"></canvas>
      <div class="npc-info">
        <div class="npc-level">等级 <span id="npc-level-value">1</span></div>
        <div class="npc-affinity">
          <span id="npc-affinity-title">陌生</span>
          <div class="affinity-bar">
            <div class="affinity-progress" id="npc-affinity-progress"></div>
          </div>
        </div>
      </div>
    `;
    return npcEl;
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    this.npcElement.addEventListener('click', () => {
      this.onNPCClick();
    });
  }

  /**
   * NPC点击事件
   */
  onNPCClick() {
    this.dialogueSystem.showDialogue();
  }

  /**
   * 更新NPC显示
   */
  update() {
    const blacksmithNPC = this.forgeUI.blacksmithSystem.blacksmithNPC;
    const info = blacksmithNPC.getInfo();
    
    // 更新等级
    const levelEl = this.npcElement.querySelector('#npc-level-value');
    if (levelEl) levelEl.textContent = info.level;
    
    // 更新好感度
    const titleEl = this.npcElement.querySelector('#npc-affinity-title');
    if (titleEl) titleEl.textContent = info.affinityTitle;
    
    const progressEl = this.npcElement.querySelector('#npc-affinity-progress');
    if (progressEl) {
      const progress = parseFloat(info.expProgress) || 0;
      progressEl.style.width = `${progress}%`;
    }
    
    // 根据等级更新NPC外观
    this.updateAppearance(info.level);
  }

  /**
   * 更新NPC外观
   */
  updateAppearance(level) {
    // 可以根据等级添加不同的装饰或效果
    if (level >= 10) {
      this.npcElement.classList.add('master-blacksmith');
    } else if (level >= 5) {
      this.npcElement.classList.add('expert-blacksmith');
    }
  }

  /**
   * 播放锻造动画
   */
  playHammeringAnimation() {
    this.animator.startAnimation('HAMMERING');
    setTimeout(() => {
      this.animator.startAnimation('IDLE');
    }, 2000);
  }
}
```

### NPCAnimator

管理NPC精灵图动画。

```javascript
class NPCAnimator {
  constructor(npcRenderer) {
    this.npcRenderer = npcRenderer;
    this.canvas = npcRenderer.npcElement.querySelector('.npc-sprite');
    this.ctx = this.canvas.getContext('2d');
    this.spriteImage = null;
    this.currentFrame = 0;
    this.animationInterval = null;
    this.currentAnimation = 'IDLE';
  }

  /**
   * 加载精灵图
   */
  loadSprite() {
    const spriteManager = this.npcRenderer.forgeUI.spriteManager;
    this.spriteImage = spriteManager.getBlacksmithSprite();
  }

  /**
   * 开始动画
   */
  startAnimation(animationType) {
    this.stopAnimation();
    this.currentAnimation = animationType;
    this.currentFrame = 0;
    
    if (!this.spriteImage) {
      this.loadSprite();
    }
    
    const frames = BLACKSMITH_ANIMATION_FRAMES[animationType];
    if (!frames || frames.length === 0) return;
    
    const frameDelay = animationType === 'HAMMERING' ? 150 : 500;
    
    this.animationInterval = setInterval(() => {
      this.renderFrame();
      this.currentFrame = (this.currentFrame + 1) % frames.length;
    }, frameDelay);
    
    this.renderFrame();
  }

  /**
   * 停止动画
   */
  stopAnimation() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }

  /**
   * 渲染当前帧
   */
  renderFrame() {
    if (!this.spriteImage || !this.spriteImage.complete) return;
    
    const frames = BLACKSMITH_ANIMATION_FRAMES[this.currentAnimation];
    const frameIndex = frames[this.currentFrame];
    
    const row = Math.floor(frameIndex / 3);
    const col = frameIndex % 3;
    
    const cellW = this.spriteImage.width / 3;
    const cellH = this.spriteImage.height / 2;
    
    const sx = col * cellW;
    const sy = row * cellH;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      this.spriteImage,
      sx, sy, cellW, cellH,
      0, 0, this.canvas.width, this.canvas.height
    );
  }
}
```

### DialogueSystem

处理NPC对话显示。

```javascript
class DialogueSystem {
  constructor(npcRenderer) {
    this.npcRenderer = npcRenderer;
    this.dialogueElement = null;
    this.currentDialogue = null;
    this.dialogueTimeout = null;
  }

  /**
   * 显示对话
   */
  showDialogue() {
    const blacksmithNPC = this.npcRenderer.forgeUI.blacksmithSystem.blacksmithNPC;
    const dialogue = blacksmithNPC.getDialogue('greeting');
    
    this.createDialogueElement();
    this.displayText(dialogue);
    
    // 显示对话选项
    this.showDialogueOptions();
  }

  /**
   * 创建对话元素
   */
  createDialogueElement() {
    if (this.dialogueElement) {
      this.dialogueElement.remove();
    }
    
    this.dialogueElement = document.createElement('div');
    this.dialogueElement.className = 'npc-dialogue-panel';
    this.dialogueElement.innerHTML = `
      <div class="dialogue-header">
        <span class="dialogue-npc-name">铁匠</span>
        <button class="dialogue-close-btn">×</button>
      </div>
      <div class="dialogue-content">
        <p class="dialogue-text"></p>
      </div>
      <div class="dialogue-options"></div>
    `;
    
    document.body.appendChild(this.dialogueElement);
    
    // 绑定关闭按钮
    const closeBtn = this.dialogueElement.querySelector('.dialogue-close-btn');
    closeBtn.addEventListener('click', () => this.hideDialogue());
  }

  /**
   * 显示文本
   */
  displayText(text) {
    const textEl = this.dialogueElement.querySelector('.dialogue-text');
    if (textEl) {
      textEl.textContent = text;
    }
  }

  /**
   * 显示对话选项
   */
  showDialogueOptions() {
    const optionsEl = this.dialogueElement.querySelector('.dialogue-options');
    if (!optionsEl) return;
    
    const options = [
      { text: '闲聊', action: 'chat', affinityGain: 5 },
      { text: '送礼', action: 'gift', affinityGain: 0 },
      { text: '离开', action: 'leave', affinityGain: 0 }
    ];
    
    optionsEl.innerHTML = '';
    options.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'dialogue-option-btn';
      btn.textContent = option.text;
      btn.addEventListener('click', () => this.onOptionClick(option));
      optionsEl.appendChild(btn);
    });
  }

  /**
   * 对话选项点击
   */
  onOptionClick(option) {
    const blacksmithNPC = this.npcRenderer.forgeUI.blacksmithSystem.blacksmithNPC;
    
    switch (option.action) {
      case 'chat':
        const result = blacksmithNPC.increaseAffinity('dialogue_choice');
        this.displayText(blacksmithNPC.getDialogue('affinity_increase'));
        
        if (result.titleChanged) {
          this.npcRenderer.forgeUI.showMessage(`与铁匠的关系变为：${result.newTitle}`);
        }
        
        setTimeout(() => this.hideDialogue(), 2000);
        break;
        
      case 'gift':
        this.hideDialogue();
        this.npcRenderer.giftSystem.showGiftSelection();
        break;
        
      case 'leave':
        this.hideDialogue();
        break;
    }
    
    this.npcRenderer.update();
  }

  /**
   * 隐藏对话
   */
  hideDialogue() {
    if (this.dialogueElement) {
      this.dialogueElement.remove();
      this.dialogueElement = null;
    }
  }
}
```


### GiftSystem

处理向NPC送礼的功能。

```javascript
class GiftSystem {
  constructor(npcRenderer) {
    this.npcRenderer = npcRenderer;
    this.giftModal = null;
  }

  /**
   * 显示礼物选择界面
   */
  showGiftSelection() {
    this.createGiftModal();
    this.renderGiftList();
  }

  /**
   * 创建礼物选择模态框
   */
  createGiftModal() {
    if (this.giftModal) {
      this.giftModal.remove();
    }
    
    this.giftModal = document.createElement('div');
    this.giftModal.className = 'gift-selection-modal';
    this.giftModal.innerHTML = `
      <div class="gift-modal-content">
        <div class="gift-modal-header">
          <h3>选择礼物</h3>
          <button class="gift-modal-close">×</button>
        </div>
        <div class="gift-list"></div>
      </div>
    `;
    
    document.body.appendChild(this.giftModal);
    
    // 绑定关闭按钮
    const closeBtn = this.giftModal.querySelector('.gift-modal-close');
    closeBtn.addEventListener('click', () => this.hideGiftSelection());
    
    // 点击背景关闭
    this.giftModal.addEventListener('click', (e) => {
      if (e.target === this.giftModal) {
        this.hideGiftSelection();
      }
    });
  }

  /**
   * 渲染礼物列表
   */
  renderGiftList() {
    const listEl = this.giftModal.querySelector('.gift-list');
    if (!listEl) return;
    
    const player = this.npcRenderer.forgeUI.player;
    const giftableItems = this.getGiftableItems(player);
    
    if (giftableItems.length === 0) {
      listEl.innerHTML = '<p class="no-gifts">没有可赠送的物品</p>';
      return;
    }
    
    listEl.innerHTML = '';
    giftableItems.forEach(item => {
      const itemEl = this.createGiftItemElement(item);
      listEl.appendChild(itemEl);
    });
  }

  /**
   * 获取可赠送的物品
   */
  getGiftableItems(player) {
    const giftable = [];
    
    // 从背包中筛选可赠送物品
    player.inventory.forEach((item, index) => {
      if (item && this.isGiftable(item)) {
        giftable.push({ item, index });
      }
    });
    
    return giftable;
  }

  /**
   * 判断物品是否可赠送
   */
  isGiftable(item) {
    // 装备、消耗品、材料都可以赠送
    return item.type === 'EQUIPMENT' || 
           item.type === 'CONSUMABLE' || 
           item.type === 'MATERIAL';
  }

  /**
   * 创建礼物物品元素
   */
  createGiftItemElement(giftData) {
    const { item, index } = giftData;
    const affinityGain = this.calculateAffinityGain(item);
    
    const itemEl = document.createElement('div');
    itemEl.className = 'gift-item';
    itemEl.innerHTML = `
      <div class="gift-item-icon">${item.icon || '📦'}</div>
      <div class="gift-item-info">
        <div class="gift-item-name quality-${item.quality || 'COMMON'}">
          ${item.displayName || item.name}
        </div>
        <div class="gift-item-affinity">好感度 +${affinityGain}</div>
      </div>
      <button class="gift-item-btn">赠送</button>
    `;
    
    // 绑定赠送按钮
    const btn = itemEl.querySelector('.gift-item-btn');
    btn.addEventListener('click', () => this.giveGift(item, index, affinityGain));
    
    return itemEl;
  }

  /**
   * 计算好感度增加值
   */
  calculateAffinityGain(item) {
    const qualityMultipliers = {
      'COMMON': 5,
      'UNCOMMON': 10,
      'RARE': 20,
      'EPIC': 40,
      'LEGENDARY': 80,
      'MYTHIC': 150
    };
    
    const baseGain = qualityMultipliers[item.quality] || 5;
    
    // 装备类型额外加成
    if (item.type === 'EQUIPMENT') {
      return Math.floor(baseGain * 1.5);
    }
    
    return baseGain;
  }

  /**
   * 赠送礼物
   */
  giveGift(item, inventoryIndex, affinityGain) {
    const player = this.npcRenderer.forgeUI.player;
    const blacksmithNPC = this.npcRenderer.forgeUI.blacksmithSystem.blacksmithNPC;
    
    // 从背包移除物品
    player.inventory.splice(inventoryIndex, 1);
    
    // 增加好感度
    blacksmithNPC.affinity += affinityGain;
    
    // 显示反馈
    const dialogue = blacksmithNPC.getDialogue('affinity_increase');
    this.npcRenderer.forgeUI.showMessage(`${dialogue} (好感度 +${affinityGain})`);
    
    // 更新NPC显示
    this.npcRenderer.update();
    
    // 关闭礼物选择
    this.hideGiftSelection();
    
    // 播放音效
    if (AudioManager && typeof AudioManager.playGift === 'function') {
      AudioManager.playGift();
    }
  }

  /**
   * 隐藏礼物选择
   */
  hideGiftSelection() {
    if (this.giftModal) {
      this.giftModal.remove();
      this.giftModal = null;
    }
  }
}
```

### SpriteManager

管理所有精灵图资源的加载和访问。

```javascript
class SpriteManager {
  constructor() {
    this.sprites = {
      materials: null,
      qualityBorders: null,
      blacksmithNPC: null,
      enhancementSuccess: null,
      enhancementFailure: null
    };
    this.loaded = {
      materials: false,
      qualityBorders: false,
      blacksmithNPC: false,
      enhancementSuccess: false,
      enhancementFailure: false
    };
  }

  /**
   * 加载所有精灵图
   */
  async loadAll() {
    const spriteUrls = {
      materials: 'path/to/forge_materials.png',
      qualityBorders: 'path/to/quality_borders.png',
      blacksmithNPC: 'path/to/blacksmith_npc.png',
      enhancementSuccess: 'path/to/enhancement_success.png',
      enhancementFailure: 'path/to/enhancement_failure.png'
    };
    
    const promises = Object.keys(spriteUrls).map(key => 
      this.loadSprite(key, spriteUrls[key])
    );
    
    await Promise.all(promises);
  }

  /**
   * 加载单个精灵图
   */
  loadSprite(key, url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.sprites[key] = img;
        this.loaded[key] = true;
        console.log(`✓ 精灵图加载成功: ${key}`);
        resolve(img);
      };
      img.onerror = () => {
        console.error(`✗ 精灵图加载失败: ${key}`);
        reject(new Error(`Failed to load sprite: ${key}`));
      };
      img.src = url;
    });
  }

  /**
   * 获取材料精灵图
   */
  getMaterialSprite() {
    return this.sprites.materials;
  }

  /**
   * 获取品质边框精灵图
   */
  getQualityBorderSprite() {
    return this.sprites.qualityBorders;
  }

  /**
   * 获取铁匠NPC精灵图
   */
  getBlacksmithSprite() {
    return this.sprites.blacksmithNPC;
  }

  /**
   * 获取强化成功特效精灵图
   */
  getSuccessEffectSprite() {
    return this.sprites.enhancementSuccess;
  }

  /**
   * 获取强化失败特效精灵图
   */
  getFailureEffectSprite() {
    return this.sprites.enhancementFailure;
  }

  /**
   * 检查所有精灵图是否已加载
   */
  isAllLoaded() {
    return Object.values(this.loaded).every(v => v === true);
  }
}
```


## 数据模型

### 装备对象（扩展）

```javascript
{
  uid: string,                    // 唯一标识符
  itemId: string,                 // 物品ID
  type: string,                   // 类型（WEAPON, ARMOR等）
  quality: string,                // 品质
  enhanceLevel: number,           // 强化等级
  stats: object,                  // 当前属性
  baseStats: object,              // 基础属性
  specializations: object,        // 特化方向
  setEnhancementLevel: number,    // 套装强化等级
  enchantments: array,            // 附魔列表
  awakening: object,              // 觉醒数据
  meta: {
    sockets: array,               // 宝石槽位
    socketedGems: array           // 已镶嵌宝石
  },
  history: {
    totalEnhancements: number,    // 总强化次数
    successfulEnhancements: number, // 成功次数
    totalGoldInvested: number     // 投入金币
  }
}
```

### 材料槽位对象

```javascript
{
  type: string,                   // 材料类型
  item: {
    type: string,                 // 材料类型
    count: number                 // 数量
  } | null,
  maxStack: number                // 最大堆叠数
}
```

### NPC状态对象

```javascript
{
  level: number,                  // 等级
  experience: number,             // 经验值
  affinity: number,               // 好感度
  affinityTitle: string,          // 好感度称号
  discountRate: number,           // 折扣率
  unlockedFeatures: array,        // 已解锁功能
  currentAnimation: string        // 当前动画状态
}
```

### 对话选项对象

```javascript
{
  text: string,                   // 选项文本
  action: string,                 // 动作类型
  affinityGain: number,           // 好感度增加值
  requirements: object            // 解锁要求（可选）
}
```

### 礼物对象

```javascript
{
  item: object,                   // 物品对象
  index: number,                  // 背包索引
  affinityGain: number            // 好感度增加值
}
```

### 操作历史记录对象

```javascript
{
  timestamp: number,              // 时间戳
  operation: string,              // 操作类型
  equipmentId: string,            // 装备ID
  equipmentName: string,          // 装备名称
  previousLevel: number,          // 之前等级
  newLevel: number,               // 新等级
  success: boolean,               // 是否成功
  goldSpent: number,              // 花费金币
  materialsUsed: object           // 使用的材料
}
```

## 正确性属性

属性是应该在系统的所有有效执行中保持为真的特征或行为——本质上，是关于系统应该做什么的正式陈述。属性充当人类可读规范和机器可验证正确性保证之间的桥梁。

### 属性 1: 背包装备显示同步

*对于任何*背包状态，当打开铁匠铺时，显示的装备数量和类型应当与背包中的可强化装备完全匹配。

**验证：需求 1.1**

### 属性 2: 背包变化实时更新

*对于任何*背包内容变化（添加、移除、修改装备），铁匠铺UI应当在下一个渲染周期内反映这些变化。

**验证：需求 1.2**

### 属性 3: 装备操作双向同步

*对于任何*在铁匠铺中对装备的操作（强化、镶嵌等），背包中对应装备的数据应当立即更新。

**验证：需求 1.3**

### 属性 4: 强化等级标识显示

*对于任何*强化等级大于0的装备，其图标应当显示强化等级标识。

**验证：需求 1.5**

### 属性 5: 强化按钮显示

*对于任何*被选中的装备，详情面板应当显示强化按钮。

**验证：需求 2.1**

### 属性 6: 资源不足按钮禁用

*对于任何*玩家资源不足以执行强化的情况，强化按钮应当显示为禁用状态并提示所需资源。

**验证：需求 2.3**

### 属性 7: 成功率显示正确性

*对于任何*装备和材料组合，显示的强化成功率应当与实际计算的成功率一致。

**验证：需求 2.4**

### 属性 8: 材料槽位数量

*对于任何*强化界面，应当提供至少3个材料槽位。

**验证：需求 3.1**

### 属性 9: 材料放置功能

*对于任何*有效的材料和空槽位，拖拽或点击应当成功将材料放入槽位。

**验证：需求 3.2**

### 属性 10: 材料效果应用

*对于任何*槽位中的材料，强化计算应当应用该材料的效果。

**验证：需求 3.4**

### 属性 11: 材料移除功能

*对于任何*已放置的材料，应当能够从槽位中移除。

**验证：需求 3.5**

### 属性 12: 属性完整显示

*对于任何*装备，强化界面应当显示该装备的所有属性值。

**验证：需求 4.1**

### 属性 13: 预期属性计算

*对于任何*装备和目标强化等级，显示的预期属性值应当与实际强化后的属性值一致。

**验证：需求 4.2**

### 属性 14: 属性增加绿色标识

*对于任何*强化后增加的属性，应当使用绿色箭头和文字标识。

**验证：需求 4.3**

### 属性 15: 属性减少红色标识

*对于任何*强化后减少的属性，应当使用红色箭头和文字标识。

**验证：需求 4.4**

### 属性 16: 宝石槽位状态显示

*对于任何*装备的宝石槽位，应当正确显示其状态（空闲或已占用）。

**验证：需求 5.1**

### 属性 17: 已镶嵌宝石信息完整性

*对于任何*已镶嵌宝石的槽位，应当显示宝石的图标、名称、品质和属性加成。

**验证：需求 5.2**

### 属性 18: 精灵图正确渲染

*对于任何*需要使用精灵图的UI元素，应当从正确的精灵图位置提取并渲染图标。

**验证：需求 5.3, 6.3, 14.1-14.5**

### 属性 19: 镶嵌成本显示

*对于任何*宝石镶嵌操作，应当显示正确的金币成本。

**验证：需求 5.4**

### 属性 20: 合成选项完整性

*对于任何*可合成的宝石组合，应当在合成界面中列出。

**验证：需求 6.1**

### 属性 21: 合成信息完整性

*对于任何*合成选项，应当显示所需材料、成功率和结果宝石属性。

**验证：需求 6.2**

### 属性 22: 宝石数量显示同步

*对于任何*宝石类型，显示的数量应当与玩家实际拥有的数量一致。

**验证：需求 6.4**

### 属性 23: 材料不足合成禁用

*对于任何*材料不足的合成选项，合成按钮应当禁用并提示所需材料。

**验证：需求 6.5**

### 属性 24: 背景图片响应式调整

*对于任何*窗口大小变化，背景图片应当自适应调整而不失真。

**验证：需求 7.4**

### 属性 25: NPC动画状态切换

*对于任何*NPC动画状态变化，应当正确切换精灵图帧。

**验证：需求 8.2**

### 属性 26: NPC等级外观变化

*对于任何*铁匠等级变化，NPC外观或装饰应当相应更新。

**验证：需求 8.3**

### 属性 27: NPC点击对话触发

*对于任何*NPC点击事件，应当触发对话界面显示。

**验证：需求 8.4, 9.1**

### 属性 28: 好感度对话内容变化

*对于任何*不同的好感度等级，显示的对话内容应当不同。

**验证：需求 9.2**

### 属性 29: 对话选项好感度更新

*对于任何*对话选项选择，应当按照预定值更新好感度。

**验证：需求 9.4**

### 属性 30: 送礼好感度计算

*对于任何*礼物，好感度增加值应当根据礼物类型和品质正确计算。

**验证：需求 10.3**

### 属性 31: 送礼物品移除

*对于任何*成功的送礼操作，物品应当从玩家背包中移除。

**验证：需求 10.5**

### 属性 32: 好感度进度条同步

*对于任何*好感度变化，进度条应当更新以反映新值。

**验证：需求 11.2**

### 属性 33: 好感度提升动画

*对于任何*好感度提升，应当播放视觉反馈动画。

**验证：需求 11.3**

### 属性 34: 功能按钮悬停提示

*对于任何*功能按钮，鼠标悬停时应当显示功能说明提示。

**验证：需求 12.5**

### 属性 35: 功能页面导航

*对于任何*功能按钮点击，应当切换到对应的功能页面。

**验证：需求 13.1**

### 属性 36: 页面切换元素持久性

*对于任何*页面切换，背景图片和NPC应当保持显示。

**验证：需求 13.2**

### 属性 37: 页面切换动画

*对于任何*页面切换，应当播放过渡动画。

**验证：需求 13.4**

### 属性 38: 页面状态记忆

*对于任何*铁匠铺关闭再打开，应当恢复上次使用的功能页面。

**验证：需求 13.5**

### 属性 39: 操作音效播放

*对于任何*用户操作（点击、强化、镶嵌等），应当播放相应的音效。

**验证：需求 26.1-26.5**

### 属性 40: 响应式布局适配

*对于任何*屏幕尺寸，UI应当正确适配并保持可用性。

**验证：需求 27.1-27.5**


## 错误处理

### UI渲染错误

**场景**：精灵图加载失败
- **处理**：使用回退图标（emoji或纯色方块）
- **用户反馈**：在控制台记录警告，UI继续正常显示
- **恢复**：5秒后重试加载精灵图

**场景**：背包数据损坏或格式错误
- **处理**：跳过无效装备，只显示有效装备
- **用户反馈**：在控制台记录错误详情
- **恢复**：提供"修复背包"选项，清理无效数据

### 数据同步错误

**场景**：背包与UI显示不同步
- **处理**：强制重新扫描背包并刷新UI
- **用户反馈**：显示"正在同步..."提示
- **恢复**：完成同步后移除提示

**场景**：强化操作后数据未保存
- **处理**：回滚操作，恢复之前状态
- **用户反馈**：显示"操作失败，请重试"
- **恢复**：允许用户重新执行操作

### 资源不足错误

**场景**：玩家尝试强化但金币不足
- **处理**：禁用强化按钮，显示所需金币
- **用户反馈**：按钮提示"金币不足（需要XXX金币）"
- **恢复**：当玩家获得足够金币时自动启用按钮

**场景**：玩家尝试使用材料但材料不足
- **处理**：阻止材料放入槽位
- **用户反馈**：显示"材料不足"提示
- **恢复**：提示材料获取途径

### NPC交互错误

**场景**：对话系统初始化失败
- **处理**：使用默认对话文本
- **用户反馈**：NPC显示通用问候语
- **恢复**：下次交互时重试初始化

**场景**：送礼操作失败（物品已被使用）
- **处理**：取消送礼，刷新物品列表
- **用户反馈**：显示"该物品已不可用"
- **恢复**：允许选择其他物品

### 动画错误

**场景**：动画帧丢失或卡顿
- **处理**：跳过当前帧，继续下一帧
- **用户反馈**：无可见指示（优雅降级）
- **恢复**：监控性能，必要时降低动画帧率

**场景**：强化特效播放失败
- **处理**：使用简单的颜色闪烁替代
- **用户反馈**：显示结果文字
- **恢复**：下次操作时重试完整特效

### 性能错误

**场景**：大量装备导致渲染缓慢
- **处理**：启用虚拟滚动，只渲染可见装备
- **用户反馈**：无可见指示
- **恢复**：自动优化渲染策略

**场景**：内存占用过高
- **处理**：清理缓存的精灵图和动画帧
- **用户反馈**：短暂的"优化中..."提示
- **恢复**：按需重新加载资源

## 测试策略

### 双重测试方法

铁匠铺UI重构将采用单元测试和基于属性的测试，以确保全面覆盖：

**单元测试**：专注于特定示例、边缘情况和集成点
- 特定UI交互（点击按钮、拖拽材料）
- 边缘情况（空背包、最大强化等级、资源为0）
- 与现有系统的集成（BlacksmithSystem、AudioManager）
- DOM操作和CSS类应用
- 错误处理场景

**基于属性的测试**：验证所有输入的通用属性
- 背包同步对任何背包状态都成立
- 材料效果对任何材料组合都正确应用
- 属性对比对任何装备和等级都正确计算
- NPC对话对任何好感度等级都有相应内容
- 精灵图渲染对任何图标位置都正确提取

### 基于属性的测试配置

**库**：fast-check（JavaScript基于属性的测试库）

**测试配置**：
- 每个属性测试最少100次迭代
- 每个测试都标记有功能名称和属性引用
- 标记格式：`// Feature: blacksmith-ui-comprehensive-overhaul, Property N: [属性文本]`

### 示例属性测试结构

```javascript
// Feature: blacksmith-ui-comprehensive-overhaul, Property 1: 背包装备显示同步
test('背包装备显示与实际背包内容同步', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({
        uid: fc.string(),
        type: fc.constantFrom('WEAPON', 'ARMOR', 'HELM'),
        quality: fc.constantFrom('COMMON', 'RARE', 'EPIC'),
        enhanceLevel: fc.integer({ min: 0, max: 15 })
      })),
      (inventory) => {
        const player = { inventory, equipment: {} };
        const forgeUI = new ForgeUI({ player });
        forgeUI.open();
        
        const displayedEquipment = forgeUI.getDisplayedEquipment();
        const enhanceableEquipment = inventory.filter(item => 
          item.type !== 'CONSUMABLE' && item.type !== 'GEM'
        );
        
        return displayedEquipment.length === enhanceableEquipment.length &&
               displayedEquipment.every((displayed, index) => 
                 displayed.uid === enhanceableEquipment[index].uid
               );
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: blacksmith-ui-comprehensive-overhaul, Property 7: 成功率显示正确性
test('显示的成功率与计算的成功率一致', () => {
  fc.assert(
    fc.property(
      fc.record({
        enhanceLevel: fc.integer({ min: 0, max: 15 }),
        materials: fc.array(
          fc.record({
            type: fc.constantFrom('PROTECTION_SCROLL', 'LUCKY_STONE', 'BLESSING_STONE'),
            count: fc.integer({ min: 1, max: 5 })
          }),
          { maxLength: 3 }
        )
      }),
      ({ enhanceLevel, materials }) => {
        const equipment = { enhanceLevel };
        const panel = new EnhancementPanel(forgeUI);
        
        // 设置材料槽位
        materials.forEach((material, index) => {
          panel.materialSlotManager.addToSlot(index, material);
        });
        
        const displayedRate = panel.getDisplayedSuccessRate();
        const calculatedRate = panel.calculateSuccessRate(equipment, materials);
        
        return Math.abs(displayedRate - calculatedRate) < 0.01; // 允许0.01的浮点误差
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: blacksmith-ui-comprehensive-overhaul, Property 18: 精灵图正确渲染
test('精灵图图标从正确位置提取', () => {
  fc.assert(
    fc.property(
      fc.constantFrom(
        'PROTECTION_SCROLL', 'BLESSING_STONE', 'SET_ESSENCE',
        'AWAKENING_STONE', 'ENCHANTMENT_SCROLL', 'LUCKY_STONE'
      ),
      (materialType) => {
        const spriteManager = new SpriteManager();
        const iconData = FORGE_MATERIAL_ICONS[materialType];
        
        const canvas = document.createElement('canvas');
        const materialImage = spriteManager.getMaterialSprite();
        
        // 渲染图标
        renderMaterialIcon(materialType, materialImage, 32);
        
        // 验证canvas不为空且有内容
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasContent = imageData.data.some(pixel => pixel !== 0);
        
        return hasContent && 
               iconData.row >= 0 && iconData.row < 2 &&
               iconData.col >= 0 && iconData.col < 3;
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: blacksmith-ui-comprehensive-overhaul, Property 30: 送礼好感度计算
test('送礼好感度增加值根据品质正确计算', () => {
  fc.assert(
    fc.property(
      fc.record({
        type: fc.constantFrom('EQUIPMENT', 'CONSUMABLE', 'MATERIAL'),
        quality: fc.constantFrom('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY')
      }),
      (item) => {
        const giftSystem = new GiftSystem(npcRenderer);
        const affinityGain = giftSystem.calculateAffinityGain(item);
        
        const qualityMultipliers = {
          'COMMON': 5,
          'UNCOMMON': 10,
          'RARE': 20,
          'EPIC': 40,
          'LEGENDARY': 80
        };
        
        const expectedBase = qualityMultipliers[item.quality];
        const expectedGain = item.type === 'EQUIPMENT' 
          ? Math.floor(expectedBase * 1.5) 
          : expectedBase;
        
        return affinityGain === expectedGain;
      }
    ),
    { numRuns: 100 }
  );
});
```

### 测试覆盖目标

- **单元测试覆盖率**：最低80%代码覆盖率
- **属性测试覆盖率**：实现所有40个正确性属性
- **集成测试覆盖率**：测试所有外部系统集成
- **UI测试覆盖率**：验证所有用户交互路径
- **性能测试覆盖率**：在95%的测试运行中保持60fps

### 测试环境

- **浏览器**：Chrome, Firefox, Safari（最新版本）
- **设备**：桌面（1920x1080）、平板（768x1024）、手机（375x667）
- **性能基准**：Intel i5 / 8GB RAM / 集成显卡
- **网络条件**：模拟慢速3G加载精灵图资源

