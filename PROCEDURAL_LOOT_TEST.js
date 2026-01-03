// PROCEDURAL_LOOT_TEST.js - 程序化装备生成系统测试示例
// 这个文件展示如何使用新的装备生成系统

import { lootGenerator } from './src/systems/LootGenerationSystem.js';

/**
 * 测试基础装备生成
 */
function testBasicGeneration() {
  console.log('=== 测试基础装备生成 ===\n');
  
  // 第1层普通掉落
  const floor1Item = lootGenerator.generate({ floor: 1 });
  console.log('第1层掉落:', floor1Item.name);
  console.log('  品质:', floor1Item.quality);
  console.log('  iPwr:', floor1Item.itemPower);
  console.log('  属性:', floor1Item.stats);
  console.log('  图标:', floor1Item.iconIndex);
  console.log();
  
  // 第10层高级掉落
  const floor10Item = lootGenerator.generate({ 
    floor: 10,
    monsterTier: 3  // 精英怪物
  });
  console.log('第10层精英怪掉落:', floor10Item.name);
  console.log('  品质:', floor10Item.quality);
  console.log('  iPwr:', floor10Item.itemPower);
  console.log('  属性:', floor10Item.stats);
  console.log();
}

/**
 * 测试职业亲和系统
 */
function testClassAffinity() {
  console.log('=== 测试职业亲和系统 ===\n');
  
  // 生成10个战士装备，统计类型分布
  const warriorDrops = {};
  for (let i = 0; i < 20; i++) {
    const item = lootGenerator.generate({
      floor: 5,
      playerClass: 'warrior'
    });
    
    const archetype = item.meta.archetype;
    warriorDrops[archetype] = (warriorDrops[archetype] || 0) + 1;
  }
  
  console.log('战士职业 20次掉落统计:');
  Object.entries(warriorDrops)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}次`);
    });
  console.log();
  
  // 法师装备
  const mageDrops = {};
  for (let i = 0; i < 20; i++) {
    const item = lootGenerator.generate({
      floor: 5,
      playerClass: 'mage'
    });
    
    const archetype = item.meta.archetype;
    mageDrops[archetype] = (mageDrops[archetype] || 0) + 1;
  }
  
  console.log('法师职业 20次掉落统计:');
  Object.entries(mageDrops)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}次`);
    });
  console.log();
}

/**
 * 测试命运骰子系统（模拟）
 */
function testFateRoll() {
  console.log('=== 测试命运骰子系统 ===\n');
  
  let normalCount = 0;
  let luckyCount = 0;
  let jackpotCount = 0;
  
  // 模拟1000次掉落
  for (let i = 0; i < 1000; i++) {
    const item = lootGenerator.generate({ floor: 10 });
    
    if (item.meta.isJackpot) {
      jackpotCount++;
    } else if (item.meta.isLucky) {
      luckyCount++;
    } else {
      normalCount++;
    }
  }
  
  console.log('1000次掉落统计:');
  console.log(`  普通: ${normalCount} (${(normalCount/10).toFixed(1)}%)`);
  console.log(`  幸运: ${luckyCount} (${(luckyCount/10).toFixed(1)}%)`);
  console.log(`  大奖: ${jackpotCount} (${(jackpotCount/10).toFixed(1)}%)`);
  console.log();
}

/**
 * 测试品质分布
 */
function testQualityDistribution() {
  console.log('=== 测试品质分布 ===\n');
  
  // 第1层
  const floor1Qualities = {};
  for (let i = 0; i < 100; i++) {
    const item = lootGenerator.generate({ floor: 1 });
    floor1Qualities[item.quality] = (floor1Qualities[item.quality] || 0) + 1;
  }
  
  console.log('第1层 100次掉落品质分布:');
  ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'].forEach(quality => {
    const count = floor1Qualities[quality] || 0;
    console.log(`  ${quality}: ${count}%`);
  });
  console.log();
  
  // 第20层（飞升5）
  const floor20Qualities = {};
  for (let i = 0; i < 100; i++) {
    const item = lootGenerator.generate({ 
      floor: 20,
      ascensionLevel: 5
    });
    floor20Qualities[item.quality] = (floor20Qualities[item.quality] || 0) + 1;
  }
  
  console.log('第20层+飞升5 100次掉落品质分布:');
  ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'].forEach(quality => {
    const count = floor20Qualities[quality] || 0;
    console.log(`  ${quality}: ${count}%`);
  });
  console.log();
}

/**
 * 测试魔法发现（Magic Find）
 */
function testMagicFind() {
  console.log('=== 测试魔法发现系统 ===\n');
  
  // 0% MF
  const noMF = {};
  for (let i = 0; i < 100; i++) {
    const item = lootGenerator.generate({ 
      floor: 10,
      magicFind: 0
    });
    noMF[item.quality] = (noMF[item.quality] || 0) + 1;
  }
  
  console.log('第10层 0% MF 品质分布:');
  ['RARE', 'EPIC', 'LEGENDARY'].forEach(quality => {
    console.log(`  ${quality}: ${noMF[quality] || 0}%`);
  });
  console.log();
  
  // 50% MF
  const highMF = {};
  for (let i = 0; i < 100; i++) {
    const item = lootGenerator.generate({ 
      floor: 10,
      magicFind: 0.5  // 50% MF
    });
    highMF[item.quality] = (highMF[item.quality] || 0) + 1;
  }
  
  console.log('第10层 50% MF 品质分布:');
  ['RARE', 'EPIC', 'LEGENDARY'].forEach(quality => {
    console.log(`  ${quality}: ${highMF[quality] || 0}%`);
  });
  console.log();
}

/**
 * 展示特殊装备示例
 */
function showExampleItems() {
  console.log('=== 特殊装备示例 ===\n');
  
  // 找几个有趣的装备
  const examples = [];
  
  for (let i = 0; i < 100; i++) {
    const item = lootGenerator.generate({
      floor: 15,
      monsterTier: 3,
      ascensionLevel: 5,
      playerClass: 'warrior'
    });
    
    // 收集高品质或有特殊词缀的装备
    if (item.quality === 'LEGENDARY' || item.quality === 'MYTHIC' || 
        item.meta.isJackpot || 
        (item.meta.suffix && ['of the Vampire', 'of Ragnarok', 'of the Dragon'].includes(item.meta.suffix))) {
      examples.push(item);
    }
  }
  
  // 显示前5个
  examples.slice(0, 5).forEach((item, index) => {
    console.log(`示例 ${index + 1}:`);
    console.log(`  名称: ${item.name}`);
    console.log(`  中文: ${item.nameZh}`);
    console.log(`  品质: ${item.quality}`);
    console.log(`  iPwr: ${item.itemPower}`);
    console.log(`  前缀: ${item.meta.prefix || '无'}`);
    console.log(`  后缀: ${item.meta.suffix || '无'}`);
    console.log(`  属性:`, item.stats);
    if (item.meta.isJackpot) console.log('  🎰 JACKPOT!');
    if (item.meta.isLucky) console.log('  🍀 Lucky!');
    console.log();
  });
}

/**
 * 运行所有测试
 */
function runAllTests() {
  console.clear();
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  程序化装备生成系统 - 测试套件                ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  
  testBasicGeneration();
  testClassAffinity();
  testFateRoll();
  testQualityDistribution();
  testMagicFind();
  showExampleItems();
  
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║  所有测试完成！                                ║');
  console.log('╚═══════════════════════════════════════════════╝');
}

// 导出测试函数
export {
  testBasicGeneration,
  testClassAffinity,
  testFateRoll,
  testQualityDistribution,
  testMagicFind,
  showExampleItems,
  runAllTests
};

// 如果直接运行此文件，执行所有测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

// 在浏览器控制台中可以运行：
// import('./PROCEDURAL_LOOT_TEST.js').then(m => m.runAllTests());

