// EnhancementPanel.properties.test.js - 强化面板属性测试

import { EnhancementPanel } from '../../src/ui/forge/EnhancementPanel.js';
import { MaterialSlotManager } from '../../src/ui/forge/MaterialSlotManager.js';
import { SuccessRateCalculator } from '../../src/ui/forge/SuccessRateCalculator.js';
import { StatComparisonRenderer } from '../../src/ui/forge/StatComparisonRenderer.js';

/**
 * 创建测试用装备
 */
function createTestItem(enhanceLevel = 0) {
  return {
    id: 'test_weapon',
    uid: 'test_uid_' + Date.now(),
    type: 'WEAPON',
    name: 'Test Weapon',
    enhanceLevel: enhanceLevel,
    quality: 'COMMON',
    stats: {
      attack: 100,
      crit_rate: 0.1
    }
  };
}

/**
 * 创建测试用玩家
 */
function createTestPlayer() {
  return {
    stats: {
      gold: 10000
    },
    inventory: []
  };
}

/**
 * 创建模拟BlacksmithSystem
 */
function createMockBlacksmithSystem() {
  return {
    calculateEnhanceCost: (item) => 100 * (item.enhanceLevel + 1),
    getItemDisplayName: (item) => item.name + ' +' + item.enhanceLevel,
    getItemQualityColor: (item) => '#ffffff',
    enhanceItem: (item, player, options) => ({
      success: true,
      message: '强化成功',
      item: item
    }),
    reforgeItem: (item, player) => ({
      success: true,
      message: '重铸成功',
      item: item
    }),
    dismantleItem: (item, player) => ({
      success: true,
      message: '拆解成功'
    })
  };
}

describe('EnhancementPanel - 属性测试', () => {
  let panel;
  let blacksmithSystem;
  let player;
  let container;

  beforeEach(() => {
    blacksmithSystem = createMockBlacksmithSystem();
    player = createTestPlayer();
    panel = new EnhancementPanel(blacksmithSystem, player);
    container = document.createElement('div');
  });

  /**
   * 属性 5: 强化按钮显示
   * 验证：需求 2.1
   */
  describe('属性 5: 强化按钮显示', () => {
    test('选中装备后应该显示强化按钮', () => {
      const item = createTestItem(0);
      panel.render(container, item);
      
      const enhanceBtn = container.querySelector('#enhance-button');
      expect(enhanceBtn).toBeTruthy();
      expect(enhanceBtn.textContent).toContain('强化');
    });

    test('未选中装备时不应该显示强化按钮', () => {
      panel.render(container, null);
      
      const enhanceBtn = container.querySelector('#enhance-button');
      expect(enhanceBtn).toBeFalsy();
    });

    test('应该同时显示重铸和拆解按钮', () => {
      const item = createTestItem(0);
      panel.render(container, item);
      
      const reforgeBtn = container.querySelector('#reforge-button');
      const dismantleBtn = container.querySelector('#dismantle-button');
      
      expect(reforgeBtn).toBeTruthy();
      expect(dismantleBtn).toBeTruthy();
    });
  });

  /**
   * 属性 6: 资源不足按钮禁用
   * 验证：需求 2.3
   */
  describe('属性 6: 资源不足按钮禁用', () => {
    test('金币不足时强化按钮应该被禁用', () => {
      const item = createTestItem(0);
      player.stats.gold = 0; // 金币不足
      
      panel.render(container, item);
      
      const enhanceBtn = container.querySelector('#enhance-button');
      expect(enhanceBtn.disabled).toBe(true);
    });

    test('金币充足时强化按钮应该可用', () => {
      const item = createTestItem(0);
      player.stats.gold = 10000; // 金币充足
      
      panel.render(container, item);
      
      const enhanceBtn = container.querySelector('#enhance-button');
      expect(enhanceBtn.disabled).toBe(false);
    });

    test('达到最大等级时强化按钮应该被禁用', () => {
      const item = createTestItem(15); // 最大等级
      
      panel.render(container, item);
      
      const enhanceBtn = container.querySelector('#enhance-button');
      expect(enhanceBtn.disabled).toBe(true);
    });
  });
});

describe('MaterialSlotManager - 属性测试', () => {
  let manager;
  let player;
  let container;

  beforeEach(() => {
    player = createTestPlayer();
    manager = new MaterialSlotManager(player);
    container = document.createElement('div');
  });

  /**
   * 属性 8: 材料槽位数量
   * 验证：需求 3.1
   */
  describe('属性 8: 材料槽位数量', () => {
    test('应该提供3个材料槽位', () => {
      manager.render(container);
      
      const slots = container.querySelectorAll('.material-slot');
      expect(slots.length).toBe(3);
    });
  });

  /**
   * 属性 9: 材料放置功能
   * 验证：需求 3.2
   */
  describe('属性 9: 材料放置功能', () => {
    test('应该能够放置材料到槽位', () => {
      manager.render(container);
      manager.placeMaterial(0, 'blessing_stone');
      
      const materials = manager.getMaterials();
      expect(materials.blessingStoneCount).toBe(1);
    });

    test('应该能够放置多个材料', () => {
      manager.render(container);
      manager.placeMaterial(0, 'blessing_stone');
      manager.placeMaterial(1, 'protection_scroll');
      
      const materials = manager.getMaterials();
      expect(materials.blessingStoneCount).toBe(1);
      expect(materials.useProtectionScroll).toBe(true);
    });
  });

  /**
   * 属性 10: 材料效果应用
   * 验证：需求 3.4
   */
  describe('属性 10: 材料效果应用', () => {
    test('祝福石应该增加成功率', () => {
      const calculator = new SuccessRateCalculator(createMockBlacksmithSystem());
      const item = createTestItem(10);
      
      const rateWithout = calculator.calculate(item, {});
      const rateWith = calculator.calculate(item, { blessingStoneCount: 1 });
      
      expect(rateWith).toBeGreaterThan(rateWithout);
    });

    test('保护卷轴应该被正确识别', () => {
      manager.render(container);
      manager.placeMaterial(0, 'protection_scroll');
      
      const materials = manager.getMaterials();
      expect(materials.useProtectionScroll).toBe(true);
    });
  });

  /**
   * 属性 11: 材料移除功能
   * 验证：需求 3.5
   */
  describe('属性 11: 材料移除功能', () => {
    test('应该能够移除槽位中的材料', () => {
      manager.render(container);
      manager.placeMaterial(0, 'blessing_stone');
      manager.removeMaterial(0);
      
      const materials = manager.getMaterials();
      expect(materials.blessingStoneCount).toBe(0);
    });

    test('清空所有槽位应该移除所有材料', () => {
      manager.render(container);
      manager.placeMaterial(0, 'blessing_stone');
      manager.placeMaterial(1, 'protection_scroll');
      manager.clearAll();
      
      const materials = manager.getMaterials();
      expect(materials.blessingStoneCount).toBe(0);
      expect(materials.useProtectionScroll).toBe(false);
    });
  });
});

describe('SuccessRateCalculator - 属性测试', () => {
  let calculator;
  let blacksmithSystem;

  beforeEach(() => {
    blacksmithSystem = createMockBlacksmithSystem();
    calculator = new SuccessRateCalculator(blacksmithSystem);
  });

  /**
   * 属性 7: 成功率显示正确性
   * 验证：需求 2.4
   */
  describe('属性 7: 成功率显示正确性', () => {
    test('低等级装备应该有100%成功率', () => {
      const item = createTestItem(5);
      const rate = calculator.calculate(item, {});
      
      expect(rate).toBe(1.0);
    });

    test('高等级装备应该有较低成功率', () => {
      const item = createTestItem(14);
      const rate = calculator.calculate(item, {});
      
      expect(rate).toBeLessThan(1.0);
      expect(rate).toBeGreaterThan(0);
    });

    test('成功率应该在0-1范围内', () => {
      for (let level = 0; level < 15; level++) {
        const item = createTestItem(level);
        const rate = calculator.calculate(item, {});
        
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe('StatComparisonRenderer - 属性测试', () => {
  let renderer;
  let blacksmithSystem;
  let container;

  beforeEach(() => {
    blacksmithSystem = createMockBlacksmithSystem();
    renderer = new StatComparisonRenderer(blacksmithSystem);
    container = document.createElement('div');
  });

  /**
   * 属性 12: 属性完整显示
   * 验证：需求 4.1
   */
  describe('属性 12: 属性完整显示', () => {
    test('应该显示所有装备属性', () => {
      const item = createTestItem(5);
      renderer.render(container, item);
      
      const rows = container.querySelectorAll('.stat-comparison-row');
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  /**
   * 属性 13: 预期属性计算
   * 验证：需求 4.2
   */
  describe('属性 13: 预期属性计算', () => {
    test('下一级属性应该比当前属性高10%', () => {
      const item = createTestItem(5);
      const nextStats = renderer.calculateNextLevelStats(item);
      
      expect(nextStats.attack).toBeCloseTo(item.stats.attack * 1.1, 0);
    });
  });

  /**
   * 属性 14: 属性增加绿色标识
   * 验证：需求 4.3
   */
  describe('属性 14: 属性增加绿色标识', () => {
    test('属性增加应该显示绿色箭头', () => {
      const item = createTestItem(5);
      renderer.render(container, item);
      
      const positiveArrows = container.querySelectorAll('.stat-comparison-arrow.positive');
      expect(positiveArrows.length).toBeGreaterThan(0);
    });
  });
});
