// InventoryBinder.properties.test.js - InventoryBinder属性测试
// 使用属性测试验证背包绑定系统的正确性

import { InventoryBinder } from '../../src/ui/forge/InventoryBinder.js';

/**
 * 创建测试用玩家对象
 */
function createTestPlayer() {
  return {
    equipment: {
      WEAPON: null,
      ARMOR: null,
      HELM: null,
      BOOTS: null,
      RING: null,
      AMULET: null,
      ACCESSORY: null
    },
    inventory: []
  };
}

/**
 * 创建测试用装备
 */
function createTestEquipment(type, id) {
  return {
    id: id || `${type}_${Date.now()}`,
    uid: `uid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: type,
    name: `Test ${type}`,
    enhanceLevel: 0,
    quality: 'COMMON',
    stats: { attack: 10 }
  };
}

describe('InventoryBinder - 属性测试', () => {
  let player;
  let binder;

  beforeEach(() => {
    player = createTestPlayer();
    binder = new InventoryBinder(player);
    binder.initialize();
  });

  afterEach(() => {
    binder.destroy();
  });

  /**
   * 属性 1: 背包装备显示同步
   * 验证：需求 1.1
   * 
   * 对于任何装备栏状态和背包状态，
   * getAllEquipment() 返回的装备列表应该与实际装备栏和背包中的装备完全一致
   */
  describe('属性 1: 背包装备显示同步', () => {
    test('装备栏装备应该在getAllEquipment中显示', () => {
      const weapon = createTestEquipment('WEAPON');
      player.equipment.WEAPON = weapon;
      
      // 刷新以更新缓存
      binder.refresh();
      
      const allEquipment = binder.getAllEquipment();
      const equippedWeapon = allEquipment.find(e => e.source === 'equipped' && e.slot === 'WEAPON');
      
      expect(equippedWeapon).toBeDefined();
      expect(equippedWeapon.item.uid).toBe(weapon.uid);
    });

    test('背包装备应该在getAllEquipment中显示', () => {
      const armor = createTestEquipment('ARMOR');
      player.inventory.push(armor);
      
      // 刷新以更新缓存
      binder.refresh();
      
      const allEquipment = binder.getAllEquipment();
      const inventoryArmor = allEquipment.find(e => e.source === 'inventory' && e.item.uid === armor.uid);
      
      expect(inventoryArmor).toBeDefined();
    });

    test('空装备栏和空背包应该返回空列表', () => {
      const allEquipment = binder.getAllEquipment();
      expect(allEquipment).toHaveLength(0);
    });

    test('多件装备应该全部显示', () => {
      player.equipment.WEAPON = createTestEquipment('WEAPON');
      player.equipment.ARMOR = createTestEquipment('ARMOR');
      player.inventory.push(createTestEquipment('HELM'));
      player.inventory.push(createTestEquipment('BOOTS'));
      
      binder.refresh();
      
      const allEquipment = binder.getAllEquipment();
      expect(allEquipment).toHaveLength(4);
    });
  });

  /**
   * 属性 2: 背包变化实时更新
   * 验证：需求 1.2
   * 
   * 当背包或装备栏发生变化时，
   * 应该立即触发相应的回调，并且getAllEquipment()应该反映最新状态
   */
  describe('属性 2: 背包变化实时更新', () => {
    test('添加装备到装备栏应该触发回调', (done) => {
      const weapon = createTestEquipment('WEAPON');
      
      binder.on('onEquipmentChange', (data) => {
        expect(data.type).toBe('equipment');
        expect(data.slot).toBe('WEAPON');
        expect(data.newValue).toBe(weapon);
        done();
      });
      
      player.equipment.WEAPON = weapon;
    });

    test('从装备栏移除装备应该触发回调', (done) => {
      const weapon = createTestEquipment('WEAPON');
      player.equipment.WEAPON = weapon;
      binder.refresh();
      
      binder.on('onEquipmentChange', (data) => {
        expect(data.type).toBe('equipment');
        expect(data.slot).toBe('WEAPON');
        expect(data.newValue).toBeNull();
        done();
      });
      
      player.equipment.WEAPON = null;
    });

    test('添加装备到背包应该触发回调', (done) => {
      const armor = createTestEquipment('ARMOR');
      
      binder.on('onInventoryChange', (data) => {
        expect(data.type).toBe('inventory');
        expect(data.operation).toBe('push');
        done();
      });
      
      player.inventory.push(armor);
    });

    test('从背包移除装备应该触发回调', (done) => {
      const armor = createTestEquipment('ARMOR');
      player.inventory.push(armor);
      binder.refresh();
      
      binder.on('onInventoryChange', (data) => {
        expect(data.type).toBe('inventory');
        expect(data.operation).toBe('pop');
        done();
      });
      
      player.inventory.pop();
    });

    test('onAnyChange应该捕获所有变化', (done) => {
      let callCount = 0;
      
      binder.on('onAnyChange', (data) => {
        callCount++;
        if (callCount === 2) {
          done();
        }
      });
      
      player.equipment.WEAPON = createTestEquipment('WEAPON');
      player.inventory.push(createTestEquipment('ARMOR'));
    });
  });

  /**
   * 属性 3: 装备操作双向同步
   * 验证：需求 1.3
   * 
   * 在铁匠铺中对装备的任何操作（强化、重铸等）
   * 应该立即反映到背包和装备栏中
   */
  describe('属性 3: 装备操作双向同步', () => {
    test('修改装备栏装备属性应该被检测', (done) => {
      const weapon = createTestEquipment('WEAPON');
      player.equipment.WEAPON = weapon;
      binder.refresh();
      
      binder.on('onEquipmentChange', (data) => {
        if (data.newValue && data.newValue.enhanceLevel === 5) {
          expect(data.slot).toBe('WEAPON');
          done();
        }
      });
      
      // 模拟强化
      player.equipment.WEAPON = { ...weapon, enhanceLevel: 5 };
    });

    test('修改背包装备属性应该被检测', (done) => {
      const armor = createTestEquipment('ARMOR');
      player.inventory.push(armor);
      binder.refresh();
      
      binder.on('onInventoryChange', (data) => {
        if (data.changes && data.changes.length > 0) {
          const change = data.changes.find(c => c.type === 'modified');
          if (change) {
            expect(change.newItem.enhanceLevel).toBe(3);
            done();
          }
        }
      });
      
      // 模拟强化
      player.inventory[0] = { ...armor, enhanceLevel: 3 };
    });

    test('装备在装备栏和背包间移动应该被追踪', () => {
      const weapon = createTestEquipment('WEAPON');
      player.equipment.WEAPON = weapon;
      binder.refresh();
      
      let equipmentChanges = 0;
      let inventoryChanges = 0;
      
      binder.on('onEquipmentChange', () => equipmentChanges++);
      binder.on('onInventoryChange', () => inventoryChanges++);
      
      // 卸下装备到背包
      player.equipment.WEAPON = null;
      player.inventory.push(weapon);
      
      expect(equipmentChanges).toBeGreaterThan(0);
      expect(inventoryChanges).toBeGreaterThan(0);
    });
  });

  /**
   * 属性 4: 强化等级标识显示
   * 验证：需求 1.5
   * 
   * 对于任何强化等级 > 0 的装备，
   * 其缓存数据应该包含正确的强化等级信息
   */
  describe('属性 4: 强化等级标识显示', () => {
    test('未强化装备应该显示等级0', () => {
      const weapon = createTestEquipment('WEAPON');
      weapon.enhanceLevel = 0;
      player.equipment.WEAPON = weapon;
      binder.refresh();
      
      const equipped = binder.getEquippedItems();
      expect(equipped[0].item.enhanceLevel).toBe(0);
    });

    test('强化装备应该显示正确等级', () => {
      const weapon = createTestEquipment('WEAPON');
      weapon.enhanceLevel = 10;
      player.equipment.WEAPON = weapon;
      binder.refresh();
      
      const equipped = binder.getEquippedItems();
      expect(equipped[0].item.enhanceLevel).toBe(10);
    });

    test('多件不同强化等级的装备应该正确显示', () => {
      player.equipment.WEAPON = { ...createTestEquipment('WEAPON'), enhanceLevel: 5 };
      player.equipment.ARMOR = { ...createTestEquipment('ARMOR'), enhanceLevel: 10 };
      player.inventory.push({ ...createTestEquipment('HELM'), enhanceLevel: 15 });
      binder.refresh();
      
      const allEquipment = binder.getAllEquipment();
      
      const weapon = allEquipment.find(e => e.item.type === 'WEAPON');
      const armor = allEquipment.find(e => e.item.type === 'ARMOR');
      const helm = allEquipment.find(e => e.item.type === 'HELM');
      
      expect(weapon.item.enhanceLevel).toBe(5);
      expect(armor.item.enhanceLevel).toBe(10);
      expect(helm.item.enhanceLevel).toBe(15);
    });
  });

  /**
   * 边界情况测试
   */
  describe('边界情况', () => {
    test('应该处理null和undefined', () => {
      player.equipment.WEAPON = null;
      player.equipment.ARMOR = undefined;
      player.inventory.push(null);
      player.inventory.push(undefined);
      
      binder.refresh();
      
      const allEquipment = binder.getAllEquipment();
      expect(allEquipment).toHaveLength(0);
    });

    test('应该过滤消耗品', () => {
      player.inventory.push({
        id: 'potion',
        type: 'CONSUMABLE',
        name: 'Health Potion'
      });
      
      binder.refresh();
      
      const inventoryEquipment = binder.getInventoryEquipment();
      expect(inventoryEquipment).toHaveLength(0);
    });

    test('应该处理大量装备', () => {
      // 添加100件装备到背包
      for (let i = 0; i < 100; i++) {
        player.inventory.push(createTestEquipment('ARMOR', `armor_${i}`));
      }
      
      binder.refresh();
      
      const inventoryEquipment = binder.getInventoryEquipment();
      expect(inventoryEquipment).toHaveLength(100);
    });

    test('应该处理快速连续变化', (done) => {
      let changeCount = 0;
      
      binder.on('onAnyChange', () => {
        changeCount++;
        if (changeCount === 10) {
          done();
        }
      });
      
      // 快速添加10件装备
      for (let i = 0; i < 10; i++) {
        player.inventory.push(createTestEquipment('ARMOR', `armor_${i}`));
      }
    });
  });
});
