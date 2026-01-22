// InventoryBinder.js - 背包深度绑定系统
// 负责监听背包和装备栏变化，实现实时同步

/**
 * InventoryBinder - 背包深度绑定系统
 * 使用Proxy监听背包和装备栏变化，提供实时同步回调
 */
export class InventoryBinder {
  constructor(player) {
    if (!player) {
      throw new Error('InventoryBinder需要player对象');
    }

    this.player = player;
    
    // 装备缓存
    this.equipmentCache = new Map();
    
    // 背包装备缓存
    this.inventoryEquipmentCache = new Map();
    
    // 变化回调
    this.callbacks = {
      onEquipmentChange: [],
      onInventoryChange: [],
      onAnyChange: []
    };
    
    // 是否已初始化
    this.initialized = false;
    
    // Proxy引用
    this.proxies = {
      equipment: null,
      inventory: null
    };
    
    console.log('✓ InventoryBinder 已创建');
  }

  /**
   * 初始化绑定
   */
  initialize() {
    if (this.initialized) {
      console.warn('InventoryBinder已经初始化');
      return;
    }

    // 扫描并缓存当前装备
    this.scanEquipment();
    
    // 扫描并缓存背包装备
    this.scanInventory();
    
    // 设置Proxy监听
    this.setupProxies();
    
    this.initialized = true;
    console.log('✓ InventoryBinder 已初始化');
  }

  /**
   * 扫描装备栏
   */
  scanEquipment() {
    if (!this.player.equipment) {
      this.player.equipment = {};
    }

    const slots = ['WEAPON', 'ARMOR', 'HELM', 'BOOTS', 'RING', 'AMULET', 'ACCESSORY'];
    
    for (const slot of slots) {
      const item = this.player.equipment[slot];
      if (item) {
        const uid = this.getItemUID(item);
        this.equipmentCache.set(slot, {
          uid,
          item: this.cloneItem(item),
          slot
        });
      } else {
        this.equipmentCache.delete(slot);
      }
    }
    
    console.log(`✓ 扫描装备栏: ${this.equipmentCache.size}件装备`);
  }

  /**
   * 扫描背包中的装备
   */
  scanInventory() {
    if (!this.player.inventory) {
      this.player.inventory = [];
    }

    this.inventoryEquipmentCache.clear();
    
    this.player.inventory.forEach((item, index) => {
      if (item && this.isEquipment(item)) {
        const uid = this.getItemUID(item);
        this.inventoryEquipmentCache.set(uid, {
          uid,
          item: this.cloneItem(item),
          index
        });
      }
    });
    
    console.log(`✓ 扫描背包: ${this.inventoryEquipmentCache.size}件装备`);
  }

  /**
   * 设置Proxy监听
   */
  setupProxies() {
    // 监听装备栏变化
    this.proxies.equipment = new Proxy(this.player.equipment, {
      set: (target, property, value) => {
        const oldValue = target[property];
        target[property] = value;
        
        // 触发装备变化回调
        this.handleEquipmentChange(property, oldValue, value);
        
        return true;
      },
      
      deleteProperty: (target, property) => {
        const oldValue = target[property];
        delete target[property];
        
        // 触发装备变化回调
        this.handleEquipmentChange(property, oldValue, null);
        
        return true;
      }
    });

    // 替换player.equipment为Proxy
    this.player.equipment = this.proxies.equipment;

    // 监听背包变化
    const originalPush = Array.prototype.push;
    const originalSplice = Array.prototype.splice;
    const originalPop = Array.prototype.pop;
    const originalShift = Array.prototype.shift;
    const originalUnshift = Array.prototype.unshift;
    
    const self = this;
    
    // 重写数组方法
    this.player.inventory.push = function(...items) {
      const result = originalPush.apply(this, items);
      self.handleInventoryChange('push', items);
      return result;
    };
    
    this.player.inventory.splice = function(start, deleteCount, ...items) {
      const deleted = originalSplice.apply(this, [start, deleteCount, ...items]);
      self.handleInventoryChange('splice', { start, deleteCount, items, deleted });
      return deleted;
    };
    
    this.player.inventory.pop = function() {
      const item = originalPop.apply(this);
      self.handleInventoryChange('pop', item);
      return item;
    };
    
    this.player.inventory.shift = function() {
      const item = originalShift.apply(this);
      self.handleInventoryChange('shift', item);
      return item;
    };
    
    this.player.inventory.unshift = function(...items) {
      const result = originalUnshift.apply(this, items);
      self.handleInventoryChange('unshift', items);
      return result;
    };

    // 使用Proxy监听索引赋值
    this.proxies.inventory = new Proxy(this.player.inventory, {
      set: (target, property, value) => {
        // 只处理数字索引
        if (!isNaN(property)) {
          const oldValue = target[property];
          target[property] = value;
          self.handleInventoryChange('set', { index: parseInt(property), oldValue, newValue: value });
        } else {
          target[property] = value;
        }
        return true;
      }
    });

    this.player.inventory = this.proxies.inventory;
    
    console.log('✓ Proxy监听已设置');
  }

  /**
   * 处理装备栏变化
   * @param {string} slot - 装备槽位
   * @param {Object} oldValue - 旧值
   * @param {Object} newValue - 新值
   */
  handleEquipmentChange(slot, oldValue, newValue) {
    // 更新缓存
    if (newValue && this.isEquipment(newValue)) {
      const uid = this.getItemUID(newValue);
      this.equipmentCache.set(slot, {
        uid,
        item: this.cloneItem(newValue),
        slot
      });
    } else {
      this.equipmentCache.delete(slot);
    }

    // 触发回调
    const changeData = {
      type: 'equipment',
      slot,
      oldValue,
      newValue,
      timestamp: Date.now()
    };

    this.triggerCallbacks('onEquipmentChange', changeData);
    this.triggerCallbacks('onAnyChange', changeData);
    
    console.log(`装备栏变化: ${slot}`, changeData);
  }

  /**
   * 处理背包变化
   * @param {string} operation - 操作类型
   * @param {*} data - 操作数据
   */
  handleInventoryChange(operation, data) {
    // 重新扫描背包
    const oldCache = new Map(this.inventoryEquipmentCache);
    this.scanInventory();

    // 检测变化
    const changes = this.detectInventoryChanges(oldCache, this.inventoryEquipmentCache);

    if (changes.length > 0) {
      // 触发回调
      const changeData = {
        type: 'inventory',
        operation,
        data,
        changes,
        timestamp: Date.now()
      };

      this.triggerCallbacks('onInventoryChange', changeData);
      this.triggerCallbacks('onAnyChange', changeData);
      
      console.log(`背包变化: ${operation}`, changeData);
    }
  }

  /**
   * 检测背包装备变化
   * @param {Map} oldCache - 旧缓存
   * @param {Map} newCache - 新缓存
   * @returns {Array} 变化列表
   */
  detectInventoryChanges(oldCache, newCache) {
    const changes = [];

    // 检测新增和修改
    for (const [uid, newData] of newCache) {
      if (!oldCache.has(uid)) {
        changes.push({
          type: 'added',
          uid,
          item: newData.item,
          index: newData.index
        });
      } else {
        const oldData = oldCache.get(uid);
        if (!this.itemsEqual(oldData.item, newData.item)) {
          changes.push({
            type: 'modified',
            uid,
            oldItem: oldData.item,
            newItem: newData.item,
            index: newData.index
          });
        }
      }
    }

    // 检测删除
    for (const [uid, oldData] of oldCache) {
      if (!newCache.has(uid)) {
        changes.push({
          type: 'removed',
          uid,
          item: oldData.item,
          index: oldData.index
        });
      }
    }

    return changes;
  }

  /**
   * 注册变化回调
   * @param {string} event - 事件类型 ('onEquipmentChange'|'onInventoryChange'|'onAnyChange')
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消注册函数
   */
  on(event, callback) {
    if (!this.callbacks[event]) {
      throw new Error(`未知事件类型: ${event}`);
    }

    if (typeof callback !== 'function') {
      throw new Error('回调必须是函数');
    }

    this.callbacks[event].push(callback);

    // 返回取消注册函数
    return () => {
      const index = this.callbacks[event].indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    };
  }

  /**
   * 触发回调
   * @param {string} event - 事件类型
   * @param {*} data - 数据
   */
  triggerCallbacks(event, data) {
    if (this.callbacks[event]) {
      for (const callback of this.callbacks[event]) {
        try {
          callback(data);
        } catch (error) {
          console.error(`回调执行错误 (${event}):`, error);
        }
      }
    }
  }

  /**
   * 获取所有装备（装备栏+背包）
   * @returns {Array} 装备列表
   */
  getAllEquipment() {
    const equipment = [];

    // 添加装备栏装备
    for (const [slot, data] of this.equipmentCache) {
      equipment.push({
        ...data,
        source: 'equipped'
      });
    }

    // 添加背包装备
    for (const [uid, data] of this.inventoryEquipmentCache) {
      equipment.push({
        ...data,
        source: 'inventory'
      });
    }

    return equipment;
  }

  /**
   * 获取装备栏装备
   * @returns {Array} 装备列表
   */
  getEquippedItems() {
    return Array.from(this.equipmentCache.values()).map(data => ({
      ...data,
      source: 'equipped'
    }));
  }

  /**
   * 获取背包装备
   * @returns {Array} 装备列表
   */
  getInventoryEquipment() {
    return Array.from(this.inventoryEquipmentCache.values()).map(data => ({
      ...data,
      source: 'inventory'
    }));
  }

  /**
   * 判断是否为装备
   * @param {Object} item - 物品对象
   * @returns {boolean}
   */
  isEquipment(item) {
    if (!item || typeof item !== 'object') {
      return false;
    }

    // 排除消耗品
    if (item.type === 'CONSUMABLE') {
      return false;
    }

    // 检查是否有装备类型
    const equipmentTypes = ['WEAPON', 'ARMOR', 'HELM', 'BOOTS', 'RING', 'AMULET', 'ACCESSORY'];
    return equipmentTypes.includes(item.type);
  }

  /**
   * 获取物品唯一标识
   * @param {Object} item - 物品对象
   * @returns {string}
   */
  getItemUID(item) {
    if (item.uid) {
      return item.uid;
    }
    if (item.id) {
      return item.id;
    }
    // 生成临时UID
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 克隆物品对象
   * @param {Object} item - 物品对象
   * @returns {Object}
   */
  cloneItem(item) {
    // 深度克隆
    return JSON.parse(JSON.stringify(item));
  }

  /**
   * 比较两个物品是否相等
   * @param {Object} item1 - 物品1
   * @param {Object} item2 - 物品2
   * @returns {boolean}
   */
  itemsEqual(item1, item2) {
    // 简单比较：转JSON字符串
    return JSON.stringify(item1) === JSON.stringify(item2);
  }

  /**
   * 强制刷新
   */
  refresh() {
    this.scanEquipment();
    this.scanInventory();
    
    // 触发全量更新回调
    this.triggerCallbacks('onAnyChange', {
      type: 'refresh',
      timestamp: Date.now()
    });
    
    console.log('✓ InventoryBinder 已刷新');
  }

  /**
   * 销毁绑定
   */
  destroy() {
    // 清除所有回调
    for (const event in this.callbacks) {
      this.callbacks[event] = [];
    }

    // 清除缓存
    this.equipmentCache.clear();
    this.inventoryEquipmentCache.clear();

    this.initialized = false;
    
    console.log('✓ InventoryBinder 已销毁');
  }
}
