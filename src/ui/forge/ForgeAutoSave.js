/**
 * ForgeAutoSave - 铁匠铺自动保存系统
 * 
 * 自动保存铁匠等级、好感度、装备状态等数据
 * 确保数据不会丢失
 */

export class ForgeAutoSave {
  constructor(forgeUI) {
    this.forgeUI = forgeUI;
    this.saveKey = 'forge_auto_save';
    this.lastSaveTime = 0;
    this.saveInterval = 5000; // 5秒保存间隔
    this.autoSaveTimer = null;
  }

  /**
   * 启动自动保存
   */
  start() {
    // 清除现有定时器
    this.stop();
    
    // 设置自动保存定时器
    this.autoSaveTimer = setInterval(() => {
      this.save();
    }, this.saveInterval);
    
    console.log('✓ 自动保存已启动');
  }

  /**
   * 停止自动保存
   */
  stop() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * 执行保存
   */
  save() {
    try {
      const game = window.game;
      if (!game || !game.player) {
        console.warn('无法保存：游戏或玩家对象不存在');
        return false;
      }
      
      const saveData = this.collectSaveData(game);
      
      // 保存到localStorage
      localStorage.setItem(this.saveKey, JSON.stringify(saveData));
      
      // 更新最后保存时间
      this.lastSaveTime = Date.now();
      
      console.log('✓ 铁匠铺数据已保存');
      return true;
    } catch (error) {
      console.error('保存失败:', error);
      return false;
    }
  }

  /**
   * 收集需要保存的数据
   * @param {Object} game - 游戏对象
   * @returns {Object} 保存数据
   */
  collectSaveData(game) {
    const player = game.player;
    const blacksmithNPC = game.blacksmithNPC;
    
    const saveData = {
      version: '1.0.0',
      timestamp: Date.now(),
      
      // 铁匠等级和经验
      blacksmith: {
        level: blacksmithNPC?.level || 1,
        experience: blacksmithNPC?.experience || 0,
        nextLevelExp: blacksmithNPC?.nextLevelExp || 100
      },
      
      // 好感度数据
      affinity: {
        level: blacksmithNPC?.affinity?.level || 0,
        points: blacksmithNPC?.affinity?.points || 0,
        title: blacksmithNPC?.affinity?.title || '陌生人'
      },
      
      // 装备状态（仅保存关键信息）
      equipment: {},
      
      // 材料库存（从背包中提取）
      materials: {},
      
      // 操作历史（最近50条）
      history: this.forgeUI.historyTracker ? 
        this.forgeUI.historyTracker.history.slice(0, 50) : []
    };
    
    // 保存装备状态
    if (player.equipment) {
      Object.keys(player.equipment).forEach(slot => {
        const item = player.equipment[slot];
        if (item) {
          saveData.equipment[slot] = {
            itemId: item.itemId || item.id,
            enhanceLevel: item.enhanceLevel || 0,
            quality: item.quality,
            sockets: item.meta?.sockets || [],
            luckyStoneSlots: item.luckyStoneSlots || []
          };
        }
      });
    }
    
    // 保存材料库存
    if (player.inventory && this.forgeUI.materialInventory) {
      const materials = this.forgeUI.materialInventory.materials;
      materials.forEach(material => {
        const count = this.forgeUI.materialInventory.getMaterialCount(material.id);
        if (count > 0) {
          saveData.materials[material.id] = count;
        }
      });
    }
    
    return saveData;
  }

  /**
   * 加载保存的数据
   * @returns {Object|null} 保存的数据或null
   */
  load() {
    try {
      const saved = localStorage.getItem(this.saveKey);
      if (!saved) {
        console.log('没有找到保存的数据');
        return null;
      }
      
      const saveData = JSON.parse(saved);
      console.log('✓ 加载了保存的数据:', saveData);
      return saveData;
    } catch (error) {
      console.error('加载保存数据失败:', error);
      return null;
    }
  }

  /**
   * 恢复保存的数据
   * @param {Object} saveData - 保存的数据
   */
  restore(saveData) {
    if (!saveData) return false;
    
    try {
      const game = window.game;
      if (!game || !game.player) {
        console.warn('无法恢复：游戏或玩家对象不存在');
        return false;
      }
      
      // 恢复铁匠等级和经验
      if (saveData.blacksmith && game.blacksmithNPC) {
        game.blacksmithNPC.level = saveData.blacksmith.level;
        game.blacksmithNPC.experience = saveData.blacksmith.experience;
        game.blacksmithNPC.nextLevelExp = saveData.blacksmith.nextLevelExp;
      }
      
      // 恢复好感度
      if (saveData.affinity && game.blacksmithNPC) {
        if (!game.blacksmithNPC.affinity) {
          game.blacksmithNPC.affinity = {};
        }
        game.blacksmithNPC.affinity.level = saveData.affinity.level;
        game.blacksmithNPC.affinity.points = saveData.affinity.points;
        game.blacksmithNPC.affinity.title = saveData.affinity.title;
      }
      
      // 恢复操作历史
      if (saveData.history && this.forgeUI.historyTracker) {
        this.forgeUI.historyTracker.history = saveData.history;
      }
      
      console.log('✓ 数据已恢复');
      return true;
    } catch (error) {
      console.error('恢复数据失败:', error);
      return false;
    }
  }

  /**
   * 清除保存的数据
   */
  clear() {
    try {
      localStorage.removeItem(this.saveKey);
      console.log('✓ 保存的数据已清除');
      return true;
    } catch (error) {
      console.error('清除数据失败:', error);
      return false;
    }
  }

  /**
   * 获取保存信息
   * @returns {Object} 保存信息
   */
  getSaveInfo() {
    const saveData = this.load();
    if (!saveData) {
      return {
        exists: false,
        timestamp: null,
        timeSinceLastSave: null
      };
    }
    
    return {
      exists: true,
      timestamp: saveData.timestamp,
      timeSinceLastSave: Date.now() - saveData.timestamp,
      version: saveData.version
    };
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.stop();
  }
}
