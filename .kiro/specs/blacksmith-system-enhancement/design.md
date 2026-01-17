# Design Document: Blacksmith System Enhancement

## Overview

This design document specifies the technical architecture and implementation details for enhancing the existing blacksmith/forge system in a roguelike dungeon crawler game. The enhancement adds 10 major feature areas while maintaining backward compatibility with existing save files and integrating seamlessly with the current BlacksmithSystem.js and ForgeUI.js codebase.

### Design Philosophy

1. **Incremental Enhancement**: Build upon existing systems rather than replacing them
2. **Strategic Depth**: Add meaningful choices and risk/reward mechanics
3. **Player Agency**: Provide tools to mitigate risks and customize progression
4. **Performance First**: Ensure smooth operation with large inventories
5. **Mobile Friendly**: Support touch interfaces throughout

### Integration Points

- **BlacksmithSystem.js**: Core business logic for all forge operations
- **ForgeUI.js**: User interface rendering and interaction handling
- **constants.js**: Configuration values for balancing
- **Save system**: Backward-compatible data persistence
- **Inventory system**: Material and item management
- **Audio system**: Feedback for operations

## Architecture

### System Components

```
BlacksmithSystem (Core)
├── EnhancementEngine
│   ├── FailureCalculator
│   ├── ProtectionItemHandler
│   └── SpecializationManager
├── SetEnhancementManager
├── EnchantmentSystem
│   ├── EnchantmentSlotManager
│   └── EnchantmentEffectApplicator
├── AwakeningSystem
│   └── SkillLibrary
├── MaterialSystem
│   ├── MaterialInventory
│   └── MaterialConverter
├── GemSystemEnhanced
│   ├── GemQualityManager
│   ├── GemFusionEngine
│   └── GemSetEffectCalculator
├── BlacksmithNPC
│   ├── LevelSystem
│   ├── AffinityTracker
│   └── DialogueManager
├── HistoryTracker
│   ├── EnhancementLogger
│   └── AchievementManager
└── BatchOperationProcessor

ForgeUI (Presentation)
├── EnhancementInterface
├── SetEnhancementInterface
├── EnchantmentInterface
├── AwakeningInterface
├── BatchOperationsPanel
├── ComparisonView
├── StatisticsPanel
├── MaterialManagementPanel
├── GemManagementPanel
└── BlacksmithDialogueUI
```

### Data Flow

```
User Action → ForgeUI → BlacksmithSystem → Validation → Processing → State Update → UI Refresh → Save
                                              ↓
                                        HistoryTracker
                                              ↓
                                        Achievement Check
```


## Components and Interfaces

### 1. EnhancementEngine

**Purpose**: Manages equipment enhancement with failure mechanics and protection items.

**Interface**:
```javascript
class EnhancementEngine {
  /**
   * Attempts to enhance equipment by one level
   * @param {Equipment} equipment - Equipment to enhance
   * @param {Object} options - Enhancement options
   * @param {boolean} options.useProtectionScroll - Whether to use protection scroll
   * @param {number} options.blessingStoneCount - Number of blessing stones to use
   * @returns {EnhancementResult} Result with success status and new level
   */
  enhance(equipment, options = {}) {}
  
  /**
   * Calculates success probability for next enhancement
   * @param {number} currentLevel - Current enhancement level
   * @param {number} blessingStoneCount - Number of blessing stones
   * @returns {number} Success probability (0-1)
   */
  calculateSuccessProbability(currentLevel, blessingStoneCount = 0) {}
  
  /**
   * Performs batch enhancement to target level
   * @param {Equipment} equipment - Equipment to enhance
   * @param {number} targetLevel - Target enhancement level
   * @param {Object} options - Batch options
   * @returns {BatchEnhancementResult} Results with history
   */
  batchEnhance(equipment, targetLevel, options = {}) {}
}

// Data structures
EnhancementResult {
  success: boolean,
  previousLevel: number,
  newLevel: number,
  protectionUsed: boolean,
  blessingStonesUsed: number,
  goldCost: number,
  materialsUsed: Object
}
```

**Configuration** (constants.js):
```javascript
ENHANCEMENT_CONFIG = {
  BASE_SUCCESS_RATE: {
    0-9: 1.0,    // 100% success
    10: 0.7,     // 70% success
    11: 0.6,
    12: 0.5,
    13: 0.4,
    14: 0.3,
    15: 0.2,
    16-19: 0.1   // Unlocked by high-level blacksmith
  },
  BLESSING_STONE_BONUS: 0.05,  // +5% per stone
  MAX_BLESSING_STONES: 5,       // Cap at +25%
  PROTECTION_SCROLL_COST: 1000, // Gold value
  BLESSING_STONE_COST: 500
}
```

**Algorithm**:
```
function enhance(equipment, options):
  1. Validate equipment can be enhanced (not at max level)
  2. Check and consume resources (gold, materials)
  3. Calculate success probability:
     baseRate = BASE_SUCCESS_RATE[equipment.level]
     bonusRate = options.blessingStoneCount * BLESSING_STONE_BONUS
     finalRate = min(baseRate + bonusRate, 0.95)  // Cap at 95%
  4. Roll random number (0-1)
  5. If roll <= finalRate:
       equipment.level += 1
       return success
     Else:
       if options.useProtectionScroll:
         // Level stays same, consume scroll
       else:
         equipment.level -= 1
       return failure
  6. Log to history
  7. Check achievements
  8. Save game state
```

### 2. SpecializationManager

**Purpose**: Manages enhancement specialization choices at milestone levels.

**Interface**:
```javascript
class SpecializationManager {
  /**
   * Checks if equipment can choose specialization
   * @param {Equipment} equipment
   * @returns {boolean} True if at milestone level without specialization
   */
  canChooseSpecialization(equipment) {}
  
  /**
   * Applies specialization choice to equipment
   * @param {Equipment} equipment
   * @param {string} direction - 'attack'|'defense'|'speed'|'balanced'
   * @returns {boolean} Success status
   */
  applySpecialization(equipment, direction) {}
  
  /**
   * Calculates bonus multipliers for specialization
   * @param {Equipment} equipment
   * @returns {Object} Attribute multipliers
   */
  getSpecializationBonuses(equipment) {}
}
```

**Specialization Bonuses**:
```javascript
SPECIALIZATION_BONUSES = {
  attack: {
    atk: 1.5,
    def: 0.8,
    spd: 1.0
  },
  defense: {
    atk: 0.8,
    def: 1.5,
    spd: 1.0
  },
  speed: {
    atk: 1.0,
    def: 0.8,
    spd: 1.5
  },
  balanced: {
    atk: 1.2,
    def: 1.2,
    spd: 1.2
  }
}

SPECIALIZATION_MILESTONES = [5, 10, 15]
```


### 3. SetEnhancementManager

**Purpose**: Manages set-based enhancement for equipment sets.

**Interface**:
```javascript
class SetEnhancementManager {
  /**
   * Checks if player has complete set for set enhancement
   * @param {string} setId - Set identifier
   * @returns {Object} Set completion status and pieces
   */
  checkSetCompletion(setId) {}
  
  /**
   * Performs set enhancement on all set pieces
   * @param {string} setId
   * @param {number} setEssenceCount - Amount of Set Essence to use
   * @returns {SetEnhancementResult}
   */
  enhanceSet(setId, setEssenceCount) {}
  
  /**
   * Calculates set enhancement bonuses
   * @param {Equipment[]} setPieces
   * @returns {Object} Combined set bonuses
   */
  calculateSetBonuses(setPieces) {}
}

SetEnhancementResult {
  success: boolean,
  setId: string,
  previousSetLevel: number,
  newSetLevel: number,
  affectedPieces: Equipment[],
  bonusesGained: Object
}
```

**Set Enhancement Formula**:
```javascript
SET_ENHANCEMENT_CONFIG = {
  ESSENCE_PER_LEVEL: 10,
  MAX_SET_LEVEL: 10,
  BONUS_PER_LEVEL: {
    2: 0.05,  // 2-piece set: +5% per level
    4: 0.08,  // 4-piece set: +8% per level
    6: 0.10   // 6-piece set: +10% per level
  }
}

// Set bonus calculation
function calculateSetBonuses(setPieces):
  setLevel = setPieces[0].setEnhancementLevel
  pieceCount = setPieces.length
  bonusRate = BONUS_PER_LEVEL[pieceCount] * setLevel
  
  return {
    allStats: bonusRate,  // Applies to all attributes
    setEffect: enhanceSetEffect(setLevel)  // Enhances existing set effect
  }
```

### 4. EnchantmentSystem

**Purpose**: Manages equipment enchantments independent of enhancement.

**Interface**:
```javascript
class EnchantmentSystem {
  /**
   * Applies enchantment to equipment slot
   * @param {Equipment} equipment
   * @param {number} slotIndex - Enchantment slot (0-2)
   * @param {Enchantment} enchantment
   * @returns {EnchantmentResult}
   */
  applyEnchantment(equipment, slotIndex, enchantment) {}
  
  /**
   * Gets available enchantments for equipment type
   * @param {string} equipmentType
   * @param {string} tier - 'basic'|'advanced'|'master'
   * @returns {Enchantment[]}
   */
  getAvailableEnchantments(equipmentType, tier) {}
  
  /**
   * Calculates total enchantment effects on equipment
   * @param {Equipment} equipment
   * @returns {Object} Combined enchantment effects
   */
  calculateEnchantmentEffects(equipment) {}
}

Enchantment {
  id: string,
  name: string,
  tier: 'basic'|'advanced'|'master',
  type: 'lifesteal'|'critical'|'elemental'|'resistance',
  effectValue: number,
  applicableTypes: string[]  // weapon, armor, accessory
}
```

**Enchantment Types and Values**:
```javascript
ENCHANTMENT_LIBRARY = {
  lifesteal: {
    basic: { value: 0.03, scrollCost: 5 },
    advanced: { value: 0.06, scrollCost: 15 },
    master: { value: 0.10, scrollCost: 30 }
  },
  critical: {
    basic: { value: 0.05, scrollCost: 5 },
    advanced: { value: 0.10, scrollCost: 15 },
    master: { value: 0.15, scrollCost: 30 }
  },
  fire_damage: {
    basic: { value: 10, scrollCost: 5 },
    advanced: { value: 25, scrollCost: 15 },
    master: { value: 50, scrollCost: 30 }
  },
  // ... more enchantment types
}

ENCHANTMENT_SLOTS_BY_TYPE = {
  weapon: 2,
  armor: 2,
  accessory: 1
}
```


### 5. AwakeningSystem

**Purpose**: Manages equipment awakening for Mythic +15 equipment.

**Interface**:
```javascript
class AwakeningSystem {
  /**
   * Checks if equipment can be awakened
   * @param {Equipment} equipment
   * @returns {boolean}
   */
  canAwaken(equipment) {}
  
  /**
   * Performs awakening on equipment
   * @param {Equipment} equipment
   * @param {number} awakeningStoneCount
   * @returns {AwakeningResult}
   */
  awaken(equipment, awakeningStoneCount) {}
  
  /**
   * Gets random awakening skill for equipment
   * @param {string} equipmentType
   * @returns {AwakeningSkill}
   */
  rollAwakeningSkill(equipmentType) {}
}

AwakeningSkill {
  id: string,
  name: string,
  type: 'active'|'passive',
  description: string,
  effect: Function,
  cooldown: number,  // For active skills
  applicableTypes: string[]
}

AwakeningResult {
  success: boolean,
  skill: AwakeningSkill,
  stonesUsed: number
}
```

**Awakening Skill Library**:
```javascript
AWAKENING_SKILLS = {
  weapon: [
    {
      id: 'blade_storm',
      name: '剑刃风暴',
      type: 'active',
      description: '释放剑气攻击周围所有敌人',
      effect: (user, targets) => { /* AOE damage */ },
      cooldown: 10
    },
    {
      id: 'critical_mastery',
      name: '暴击精通',
      type: 'passive',
      description: '暴击率+15%，暴击伤害+30%',
      effect: (stats) => { stats.critRate += 0.15; stats.critDmg += 0.30; }
    },
    // ... more weapon skills
  ],
  armor: [
    {
      id: 'iron_fortress',
      name: '钢铁堡垒',
      type: 'passive',
      description: '受到伤害时有20%几率免疫',
      effect: (damage) => { return Math.random() < 0.2 ? 0 : damage; }
    },
    // ... more armor skills
  ],
  accessory: [
    {
      id: 'mana_surge',
      name: '魔力涌动',
      type: 'passive',
      description: '技能冷却速度+30%',
      effect: (stats) => { stats.cooldownReduction += 0.30; }
    },
    // ... more accessory skills
  ]
}

AWAKENING_CONFIG = {
  REQUIRED_QUALITY: 'mythic',
  REQUIRED_ENHANCEMENT: 15,
  STONE_COST: 1,
  SUCCESS_RATE: 1.0  // Always succeeds
}
```

### 6. MaterialSystem

**Purpose**: Manages enhancement materials obtained from dismantling.

**Interface**:
```javascript
class MaterialSystem {
  /**
   * Calculates materials yielded from dismantling
   * @param {Equipment} equipment
   * @returns {Object} Material types and quantities
   */
  calculateDismantleYield(equipment) {}
  
  /**
   * Checks if player has sufficient materials
   * @param {Object} required - Required materials
   * @returns {boolean}
   */
  hasMaterials(required) {}
  
  /**
   * Consumes materials from inventory
   * @param {Object} materials - Materials to consume
   * @returns {boolean} Success status
   */
  consumeMaterials(materials) {}
  
  /**
   * Converts materials between types
   * @param {string} fromType
   * @param {string} toType
   * @param {number} amount
   * @returns {ConversionResult}
   */
  convertMaterials(fromType, toType, amount) {}
}
```

**Material Types and Yields**:
```javascript
MATERIAL_TYPES = {
  enhancement_stone: 'Enhancement Stone',
  reforge_crystal: 'Reforge Crystal',
  enchantment_dust: 'Enchantment Dust',
  set_essence: 'Set Essence',
  awakening_stone: 'Awakening Stone'
}

DISMANTLE_YIELD = {
  common: {
    enhancement_stone: [1, 3],
    reforge_crystal: [0, 1],
    enchantment_dust: [0, 1]
  },
  uncommon: {
    enhancement_stone: [2, 5],
    reforge_crystal: [1, 2],
    enchantment_dust: [1, 2]
  },
  rare: {
    enhancement_stone: [5, 10],
    reforge_crystal: [2, 4],
    enchantment_dust: [2, 4],
    set_essence: [0, 1]
  },
  epic: {
    enhancement_stone: [10, 20],
    reforge_crystal: [5, 10],
    enchantment_dust: [5, 10],
    set_essence: [1, 2]
  },
  legendary: {
    enhancement_stone: [20, 40],
    reforge_crystal: [10, 20],
    enchantment_dust: [10, 20],
    set_essence: [2, 5],
    awakening_stone: [0, 1]
  },
  mythic: {
    enhancement_stone: [40, 80],
    reforge_crystal: [20, 40],
    enchantment_dust: [20, 40],
    set_essence: [5, 10],
    awakening_stone: [1, 3]
  }
}

MATERIAL_CONVERSION_RATES = {
  enhancement_stone: {
    to_reforge_crystal: 3,  // 3 stones = 1 crystal
    to_enchantment_dust: 2
  },
  reforge_crystal: {
    to_enhancement_stone: 0.3,  // 1 crystal = 0.3 stones (lossy)
    to_enchantment_dust: 1
  },
  // ... more conversion rates
}
```


### 7. GemSystemEnhanced

**Purpose**: Extends existing gem system with quality, fusion, and set effects.

**Interface**:
```javascript
class GemSystemEnhanced {
  /**
   * Fuses two identical gems to upgrade quality
   * @param {Gem} gem1
   * @param {Gem} gem2
   * @returns {FusionResult}
   */
  fuseGems(gem1, gem2) {}
  
  /**
   * Extracts gem from equipment without destruction
   * @param {Equipment} equipment
   * @param {number} socketIndex
   * @returns {ExtractionResult}
   */
  extractGem(equipment, socketIndex) {}
  
  /**
   * Calculates gem set effects for equipment
   * @param {Equipment} equipment
   * @returns {Object} Set effect bonuses
   */
  calculateGemSetEffects(equipment) {}
  
  /**
   * Gets stat bonus for gem considering quality
   * @param {Gem} gem
   * @returns {Object} Stat bonuses
   */
  getGemBonus(gem) {}
}

Gem {
  id: string,
  type: string,  // ruby, sapphire, emerald, etc.
  quality: 'normal'|'fine'|'perfect',
  series: string,  // fire, ice, lightning, etc.
  baseStats: Object
}
```

**Gem Quality System**:
```javascript
GEM_QUALITY_MULTIPLIERS = {
  normal: 1.0,
  fine: 1.5,
  perfect: 2.0
}

GEM_FUSION_CONFIG = {
  normal: {
    canFuse: true,
    result: 'fine',
    successRate: 1.0
  },
  fine: {
    canFuse: true,
    result: 'perfect',
    successRate: 1.0
  },
  perfect: {
    canFuse: false  // Max quality
  }
}

GEM_EXTRACTION_COST = {
  normal: 1000,
  fine: 5000,
  perfect: 20000
}
```

**Gem Set Effects**:
```javascript
GEM_SERIES = {
  fire: ['ruby', 'fire_opal', 'sunstone'],
  ice: ['sapphire', 'aquamarine', 'moonstone'],
  lightning: ['topaz', 'citrine', 'amber'],
  nature: ['emerald', 'jade', 'peridot']
}

GEM_SET_BONUSES = {
  2: { bonus: 0.10, effect: 'minor' },   // 2 same series: +10% series effect
  3: { bonus: 0.25, effect: 'major' },   // 3 same series: +25% + special effect
  4: { bonus: 0.50, effect: 'ultimate' } // 4 same series: +50% + ultimate effect
}

// Example set effects
SERIES_EFFECTS = {
  fire: {
    minor: 'Attacks have 10% chance to burn',
    major: 'Burn damage +50%, duration +2s',
    ultimate: 'Burn spreads to nearby enemies'
  },
  ice: {
    minor: 'Attacks have 10% chance to slow',
    major: 'Slow effect +50%, movement speed -30%',
    ultimate: 'Slowed enemies can be frozen'
  }
  // ... more series effects
}
```

### 8. BlacksmithNPC

**Purpose**: Manages blacksmith character progression and interactions.

**Interface**:
```javascript
class BlacksmithNPC {
  /**
   * Adds experience to blacksmith
   * @param {number} exp - Experience points
   */
  addExperience(exp) {}
  
  /**
   * Checks if blacksmith leveled up
   * @returns {boolean}
   */
  checkLevelUp() {}
  
  /**
   * Increases affinity with blacksmith
   * @param {number} amount
   */
  increaseAffinity(amount) {}
  
  /**
   * Gets current discount rate based on affinity
   * @returns {number} Discount multiplier (0-1)
   */
  getDiscountRate() {}
  
  /**
   * Gets dialogue for current context
   * @param {string} context - 'greeting'|'success'|'failure'|'quest'
   * @returns {string} Dialogue text
   */
  getDialogue(context) {}
  
  /**
   * Checks available features based on level
   * @returns {Object} Feature availability
   */
  getAvailableFeatures() {}
}
```

**Blacksmith Progression**:
```javascript
BLACKSMITH_CONFIG = {
  LEVEL_THRESHOLDS: [
    { level: 1, exp: 0, unlocks: [] },
    { level: 2, exp: 100, unlocks: ['批量强化'] },
    { level: 3, exp: 300, unlocks: ['附魔系统'] },
    { level: 5, exp: 1000, unlocks: ['套装强化'] },
    { level: 7, exp: 3000, unlocks: ['宝石融合'] },
    { level: 10, exp: 10000, unlocks: ['+16强化', '觉醒系统'] }
  ],
  
  EXP_GAINS: {
    enhance: 1,
    reforge: 2,
    socket: 1,
    dismantle: 1,
    enchant: 3,
    awaken: 10
  },
  
  AFFINITY_THRESHOLDS: [
    { affinity: 0, discount: 0, title: '陌生' },
    { affinity: 100, discount: 0.05, title: '熟识' },
    { affinity: 500, discount: 0.10, title: '友好' },
    { affinity: 1000, discount: 0.15, title: '信赖' },
    { affinity: 3000, discount: 0.20, title: '挚友' }
  ],
  
  AFFINITY_GAINS: {
    operation: 1,
    success: 2,
    failure: 1,  // Still gain affinity on failure
    dialogue_choice: 5
  }
}

BLACKSMITH_DIALOGUES = {
  greeting: [
    '欢迎光临！需要强化装备吗？',
    '又见面了，今天想打造什么？',
    '我的手艺可是一流的！'
  ],
  success: [
    '成功了！看这光泽，完美！',
    '不愧是我打造的，质量上乘！',
    '哈哈，又是一件杰作！'
  ],
  failure: [
    '唉，这次运气不太好...',
    '别灰心，下次一定成功！',
    '强化本就有风险，再试试吧。'
  ],
  level_up: [
    '我的技艺又精进了！',
    '感谢你的信任，我学到了新技术！'
  ]
}
```


### 9. HistoryTracker

**Purpose**: Tracks enhancement history and manages achievements.

**Interface**:
```javascript
class HistoryTracker {
  /**
   * Logs enhancement attempt
   * @param {EnhancementRecord} record
   */
  logEnhancement(record) {}
  
  /**
   * Gets enhancement history
   * @param {Object} filters - Optional filters
   * @returns {EnhancementRecord[]}
   */
  getHistory(filters = {}) {}
  
  /**
   * Gets statistics summary
   * @returns {Object} Statistics
   */
  getStatistics() {}
  
  /**
   * Checks and unlocks achievements
   * @param {string} category - Achievement category
   */
  checkAchievements(category) {}
  
  /**
   * Gets all achievements with progress
   * @returns {Achievement[]}
   */
  getAchievements() {}
}

EnhancementRecord {
  timestamp: number,
  equipmentId: string,
  equipmentName: string,
  operation: string,  // 'enhance'|'reforge'|'enchant'|'awaken'
  previousLevel: number,
  newLevel: number,
  success: boolean,
  goldSpent: number,
  materialsUsed: Object,
  protectionUsed: boolean
}

Achievement {
  id: string,
  name: string,
  description: string,
  category: string,
  requirement: Function,
  progress: number,
  maxProgress: number,
  unlocked: boolean,
  reward: Object
}
```

**Achievement Definitions**:
```javascript
ACHIEVEMENTS = [
  {
    id: 'first_enhance',
    name: '初次强化',
    description: '完成第一次装备强化',
    category: 'enhancement',
    requirement: (stats) => stats.totalEnhancements >= 1,
    reward: { gold: 1000 }
  },
  {
    id: 'enhancement_master',
    name: '强化大师',
    description: '成功强化100次',
    category: 'enhancement',
    requirement: (stats) => stats.successfulEnhancements >= 100,
    reward: { gold: 10000, title: '强化大师' }
  },
  {
    id: 'max_enhancement',
    name: '极限强化',
    description: '将装备强化至+15',
    category: 'enhancement',
    requirement: (stats) => stats.maxEnhancementReached >= 15,
    reward: { gold: 50000, blessingStone: 10 }
  },
  {
    id: 'reforge_king',
    name: '重铸之王',
    description: '成功重铸出神话品质装备',
    category: 'reforge',
    requirement: (stats) => stats.mythicReforges >= 1,
    reward: { gold: 100000, setEssence: 5 }
  },
  {
    id: 'awakening_pioneer',
    name: '觉醒先驱',
    description: '完成第一次装备觉醒',
    category: 'awakening',
    requirement: (stats) => stats.totalAwakenings >= 1,
    reward: { gold: 200000, awakeningStone: 1 }
  },
  {
    id: 'gem_master',
    name: '宝石大师',
    description: '融合出10个完美品质宝石',
    category: 'gem',
    requirement: (stats) => stats.perfectGemsFused >= 10,
    reward: { gold: 50000 }
  },
  {
    id: 'big_spender',
    name: '挥金如土',
    description: '在铁匠铺累计消费1,000,000金币',
    category: 'general',
    requirement: (stats) => stats.totalGoldSpent >= 1000000,
    reward: { discount: 0.05 }  // Permanent 5% discount
  },
  {
    id: 'lucky_streak',
    name: '幸运连击',
    description: '连续成功强化10次',
    category: 'enhancement',
    requirement: (stats) => stats.consecutiveSuccesses >= 10,
    reward: { blessingStone: 20 }
  }
]
```

### 10. BatchOperationProcessor

**Purpose**: Handles batch operations efficiently with progress tracking.

**Interface**:
```javascript
class BatchOperationProcessor {
  /**
   * Performs batch enhancement
   * @param {Equipment} equipment
   * @param {number} targetLevel
   * @param {Object} options
   * @param {Function} progressCallback
   * @returns {Promise<BatchResult>}
   */
  async batchEnhance(equipment, targetLevel, options, progressCallback) {}
  
  /**
   * Performs batch dismantling
   * @param {Equipment[]} equipmentList
   * @param {Function} progressCallback
   * @returns {Promise<BatchResult>}
   */
  async batchDismantle(equipmentList, progressCallback) {}
  
  /**
   * Cancels ongoing batch operation
   */
  cancelBatch() {}
}

BatchResult {
  completed: number,
  failed: number,
  totalGoldSpent: number,
  totalGoldGained: number,
  materialsUsed: Object,
  materialsGained: Object,
  details: Array
}
```

**Batch Processing Algorithm**:
```javascript
async function batchEnhance(equipment, targetLevel, options, progressCallback):
  results = []
  currentLevel = equipment.level
  
  while currentLevel < targetLevel:
    // Check if should stop (user cancel, insufficient resources)
    if shouldStop():
      break
    
    // Perform single enhancement
    result = enhance(equipment, options)
    results.push(result)
    
    // Update progress
    progressCallback({
      current: currentLevel,
      target: targetLevel,
      attempts: results.length,
      successes: countSuccesses(results)
    })
    
    // If failed and no protection, level decreased
    if !result.success && !options.useProtectionScroll:
      currentLevel = equipment.level
    else if result.success:
      currentLevel = equipment.level
    
    // Small delay for UI responsiveness
    await delay(50)
  
  return {
    completed: currentLevel,
    attempts: results.length,
    successes: countSuccesses(results),
    totalCost: sumCosts(results),
    details: results
  }
```


## Data Models

### Equipment Data Structure (Extended)

```javascript
Equipment {
  // Existing fields
  id: string,
  name: string,
  type: string,
  quality: string,
  enhancementLevel: number,
  sockets: Socket[],
  
  // New fields
  specializations: {
    5: string|null,   // Specialization at +5
    10: string|null,  // Specialization at +10
    15: string|null   // Specialization at +15
  },
  setId: string|null,
  setEnhancementLevel: number,
  enchantments: Enchantment[],
  awakening: {
    isAwakened: boolean,
    skill: AwakeningSkill|null
  },
  history: {
    totalEnhancements: number,
    successfulEnhancements: number,
    totalGoldInvested: number
  }
}
```

### Save Data Structure (Extended)

```javascript
SaveData {
  // Existing fields
  player: PlayerData,
  inventory: Item[],
  equipment: Equipment[],
  
  // New fields
  forge: {
    materials: {
      enhancement_stone: number,
      reforge_crystal: number,
      enchantment_dust: number,
      set_essence: number,
      awakening_stone: number
    },
    protectionItems: {
      protection_scroll: number,
      blessing_stone: number
    },
    blacksmith: {
      level: number,
      experience: number,
      affinity: number,
      unlockedFeatures: string[]
    },
    history: EnhancementRecord[],
    achievements: {
      [achievementId]: {
        unlocked: boolean,
        progress: number,
        unlockedAt: number|null
      }
    },
    statistics: {
      totalEnhancements: number,
      successfulEnhancements: number,
      failedEnhancements: number,
      consecutiveSuccesses: number,
      maxConsecutiveSuccesses: number,
      totalGoldSpent: number,
      totalReforges: number,
      mythicReforges: number,
      totalEnchantments: number,
      totalAwakenings: number,
      perfectGemsFused: number,
      maxEnhancementReached: number
    }
  }
}
```

### Migration Strategy

```javascript
function migrateOldSaveData(oldData):
  // Check if forge data exists
  if !oldData.forge:
    oldData.forge = {
      materials: {
        enhancement_stone: 0,
        reforge_crystal: 0,
        enchantment_dust: 0,
        set_essence: 0,
        awakening_stone: 0
      },
      protectionItems: {
        protection_scroll: 0,
        blessing_stone: 0
      },
      blacksmith: {
        level: 1,
        experience: 0,
        affinity: 0,
        unlockedFeatures: []
      },
      history: [],
      achievements: {},
      statistics: {
        totalEnhancements: 0,
        successfulEnhancements: 0,
        failedEnhancements: 0,
        consecutiveSuccesses: 0,
        maxConsecutiveSuccesses: 0,
        totalGoldSpent: 0,
        totalReforges: 0,
        mythicReforges: 0,
        totalEnchantments: 0,
        totalAwakenings: 0,
        perfectGemsFused: 0,
        maxEnhancementReached: 0
      }
    }
  
  // Migrate equipment data
  for equipment in oldData.equipment:
    if !equipment.specializations:
      equipment.specializations = { 5: null, 10: null, 15: null }
    if !equipment.setEnhancementLevel:
      equipment.setEnhancementLevel = 0
    if !equipment.enchantments:
      equipment.enchantments = []
    if !equipment.awakening:
      equipment.awakening = { isAwakened: false, skill: null }
    if !equipment.history:
      equipment.history = {
        totalEnhancements: 0,
        successfulEnhancements: 0,
        totalGoldInvested: 0
      }
  
  return oldData
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Enhancement System Properties

**Property 1: Enhancement level changes correctly**
*For any* equipment and enhancement attempt, when enhancement succeeds the level SHALL increase by exactly 1, and when enhancement fails without protection the level SHALL decrease by exactly 1.
**Validates: Requirements 1.3, 1.4**

**Property 2: Low-level enhancement always succeeds**
*For any* equipment with enhancement level +9 or below, enhancement attempts SHALL succeed with 100% probability.
**Validates: Requirements 1.1**

**Property 3: Success probability calculation**
*For any* equipment with enhancement level +10 or above, the calculated success probability SHALL equal the base rate for that level plus (blessing stone count × blessing stone bonus), capped at 95%.
**Validates: Requirements 1.2, 2.2, 2.3**

**Property 4: Protection scroll prevents level decrease**
*For any* equipment enhancement that fails with protection scroll active, the equipment level SHALL remain unchanged.
**Validates: Requirements 2.1, 2.5**

**Property 5: Resource consumption ordering**
*For any* enhancement operation, protection items and materials SHALL be consumed from inventory before the enhancement result is determined.
**Validates: Requirements 2.4**

**Property 6: Enhancement persistence**
*For any* equipment that undergoes enhancement, saving then loading the game SHALL preserve the exact enhancement level.
**Validates: Requirements 1.5**

### Set Enhancement Properties

**Property 7: Set completion detection**
*For any* equipment set, the set enhancement option SHALL be enabled if and only if all pieces of the set are present in inventory or equipped.
**Validates: Requirements 4.1**

**Property 8: Set enhancement atomicity**
*For any* successful set enhancement, all pieces in the set SHALL have their set enhancement level increased by exactly 1.
**Validates: Requirements 4.3**

**Property 9: Independent enhancement levels**
*For any* equipment, the individual enhancement level and set enhancement level SHALL be stored and modified independently.
**Validates: Requirements 4.4**

**Property 10: Combined enhancement bonuses**
*For any* equipment with both individual and set enhancement, the calculated stats SHALL include bonuses from both enhancement types.
**Validates: Requirements 4.5**

### Specialization Properties

**Property 11: Specialization immutability**
*For any* equipment that has chosen a specialization direction, attempting to change that specialization SHALL fail and the original specialization SHALL remain unchanged.
**Validates: Requirements 5.5**

**Property 12: Specialization multipliers**
*For any* equipment with a specialization direction, the enhancement bonuses SHALL be multiplied by the direction-specific multipliers for each attribute.
**Validates: Requirements 5.4**

**Property 13: Specialization persistence**
*For any* equipment with a chosen specialization, saving then loading the game SHALL preserve the exact specialization choice.
**Validates: Requirements 5.3**

### Blacksmith NPC Properties

**Property 14: Experience gain**
*For any* forge operation, the blacksmith SHALL gain experience points according to the operation type.
**Validates: Requirements 6.2**

**Property 15: Feature unlocking**
*For any* blacksmith level threshold, reaching that level SHALL unlock exactly the features defined for that threshold.
**Validates: Requirements 6.3**

**Property 16: Affinity increase**
*For any* forge interaction, the blacksmith affinity SHALL increase by the amount defined for that interaction type.
**Validates: Requirements 6.4**

**Property 17: Affinity-based discounts**
*For any* forge operation cost, the final cost SHALL be reduced by the discount rate corresponding to the current affinity level.
**Validates: Requirements 6.5**

**Property 18: Dialogue variation**
*For any* dialogue context, the selected dialogue SHALL be appropriate for the current blacksmith level and affinity range.
**Validates: Requirements 7.2**

**Property 19: Dialogue choice effects**
*For any* dialogue choice that affects affinity, selecting that choice SHALL modify the affinity value by the specified amount.
**Validates: Requirements 7.4**

### Enchantment Properties

**Property 20: Enchantment independence**
*For any* equipment, enchantment slots SHALL exist and be modifiable regardless of the equipment's enhancement level.
**Validates: Requirements 8.1**

**Property 21: Enchantment overwriting**
*For any* filled enchantment slot, applying a new enchantment SHALL replace the old enchantment with the new one.
**Validates: Requirements 8.4**

**Property 22: Enchantment stat application**
*For any* equipment with enchantments, the calculated stats SHALL include all enchantment effects immediately after application.
**Validates: Requirements 8.5**

**Property 23: Enchantment tier scaling**
*For any* enchantment type, the effect magnitude SHALL increase with tier level (Basic < Advanced < Master).
**Validates: Requirements 9.2**

**Property 24: Enchantment power contribution**
*For any* equipment with enchantments, the total equipment power SHALL include contributions from all applied enchantments.
**Validates: Requirements 9.5**

### Awakening Properties

**Property 25: Awakening eligibility**
*For any* equipment, awakening SHALL be available if and only if the equipment is Mythic quality and +15 enhancement level.
**Validates: Requirements 10.1**

**Property 26: Awakening skill assignment**
*For any* successful awakening, the equipment SHALL receive exactly one skill from the awakening skill library appropriate for its equipment type.
**Validates: Requirements 10.3, 11.2, 11.3**

**Property 27: Awakening flag**
*For any* awakened equipment, the awakened flag SHALL be set to true and persist across save/load cycles.
**Validates: Requirements 10.4**

**Property 28: Awakening skill persistence**
*For any* awakened equipment, saving then loading the game SHALL preserve the exact awakening skill data.
**Validates: Requirements 11.4**

### Batch Operation Properties

**Property 29: Batch enhancement sequence**
*For any* batch enhancement operation, enhancements SHALL be performed sequentially until either the target level is reached or a failure occurs (without protection).
**Validates: Requirements 12.2, 12.3**

**Property 30: Batch resource consumption**
*For any* batch operation, resources SHALL be consumed according to the user settings for each individual operation in the batch.
**Validates: Requirements 12.5**

**Property 31: Batch dismantle completeness**
*For any* batch dismantle operation, all selected items SHALL be processed and removed from inventory.
**Validates: Requirements 13.2**

**Property 32: Batch dismantle yield calculation**
*For any* batch dismantle operation, the total gold and materials yielded SHALL equal the sum of yields from dismantling each item individually.
**Validates: Requirements 13.3**

**Property 33: Batch dismantle atomicity**
*For any* batch dismantle operation, either all selected items SHALL be removed or none SHALL be removed (no partial state).
**Validates: Requirements 13.5**

### Comparison and Preview Properties

**Property 34: Comparison completeness**
*For any* equipment comparison, the comparison data SHALL include enhancement level, quality, enchantments, and awakening status for both items.
**Validates: Requirements 14.3**

**Property 35: Preview stat difference**
*For any* equipment at current level N, the preview SHALL show the stat difference between level N and level N+1.
**Validates: Requirements 15.3**

**Property 36: Preview includes specialization**
*For any* equipment with specialization, the preview calculations SHALL include specialization bonuses.
**Validates: Requirements 15.4**

**Property 37: Preview probability accuracy**
*For any* equipment, the displayed success probability SHALL match the calculated probability from the enhancement engine.
**Validates: Requirements 3.4, 15.5**

### History and Statistics Properties

**Property 38: Enhancement logging**
*For any* enhancement attempt, a record SHALL be created with timestamp, equipment, operation type, result, and costs.
**Validates: Requirements 16.1**

**Property 39: Counter accuracy**
*For any* enhancement level, the success and failure counters SHALL match the actual number of successes and failures at that level.
**Validates: Requirements 16.2**

**Property 40: Gold tracking**
*For any* sequence of forge operations, the total gold tracked SHALL equal the sum of gold spent on each operation.
**Validates: Requirements 16.3**

**Property 41: History persistence**
*For any* enhancement history, saving then loading the game SHALL preserve all history records.
**Validates: Requirements 16.5**

**Property 42: Achievement unlocking**
*For any* achievement, when its condition is met, the achievement SHALL be marked as unlocked.
**Validates: Requirements 17.2**

**Property 43: Achievement persistence**
*For any* unlocked achievement, saving then loading the game SHALL preserve the unlocked status.
**Validates: Requirements 17.5**

**Property 44: Statistics accuracy**
*For any* displayed statistic, the value SHALL match the actual tracked value from the history system.
**Validates: Requirements 18.2**

**Property 45: Personal records**
*For any* personal record (highest enhancement, most valuable item, etc.), the displayed value SHALL be the maximum value achieved.
**Validates: Requirements 18.3**

**Property 46: Milestone progress**
*For any* milestone, the displayed progress SHALL accurately reflect the current count toward the milestone goal.
**Validates: Requirements 18.4**

### Material System Properties

**Property 47: Dismantle yields both resources**
*For any* equipment dismantled, the operation SHALL yield both gold and at least one type of enhancement material.
**Validates: Requirements 19.1**

**Property 48: Material quality mapping**
*For any* equipment dismantled, the quality of yielded materials SHALL match the quality tier of the equipment.
**Validates: Requirements 19.2**

**Property 49: Material storage separation**
*For any* material obtained, it SHALL be stored in the dedicated material inventory, not the regular item inventory.
**Validates: Requirements 19.3**

**Property 50: Material consumption**
*For any* forge operation, the appropriate material types SHALL be consumed from the material inventory.
**Validates: Requirements 19.4**

**Property 51: Material conversion formula**
*For any* material conversion, the output quantity SHALL equal the input quantity multiplied by the conversion rate for that material pair.
**Validates: Requirements 20.3**

**Property 52: Material validation**
*For any* forge operation, if insufficient materials exist, the operation SHALL fail before any state changes occur.
**Validates: Requirements 20.5**

### Gem System Properties

**Property 53: Gem quality multipliers**
*For any* gem, the stat bonus SHALL equal the base stat multiplied by the quality multiplier (Normal: 1.0, Fine: 1.5, Perfect: 2.0).
**Validates: Requirements 21.2, 21.5**

**Property 54: Gem quality persistence**
*For any* gem, saving then loading the game SHALL preserve the exact gem quality.
**Validates: Requirements 21.4**

**Property 55: Gem fusion validation**
*For any* gem fusion attempt, the operation SHALL succeed if and only if both gems are identical type and same quality (and not Perfect).
**Validates: Requirements 22.1, 22.4**

**Property 56: Gem fusion consumption**
*For any* successful gem fusion, both input gems SHALL be removed from inventory.
**Validates: Requirements 22.2**

**Property 57: Gem fusion output**
*For any* successful gem fusion, exactly one gem SHALL be created with quality one tier higher than the input gems.
**Validates: Requirements 22.3**

**Property 58: Gem set bonus application**
*For any* equipment with multiple gems from the same series, a set bonus SHALL be applied based on the number of matching gems.
**Validates: Requirements 24.2**

**Property 59: Gem set bonus scaling**
*For any* gem set, the bonus magnitude SHALL increase with the number of matching gems socketed.
**Validates: Requirements 24.3**

**Property 60: Gem set recalculation**
*For any* equipment, when gems are added or removed, the gem set effects SHALL be recalculated immediately.
**Validates: Requirements 24.5**

**Property 61: Gem extraction preservation**
*For any* gem extraction, the extracted gem SHALL be returned to inventory with all properties (type, quality, stats) unchanged.
**Validates: Requirements 25.3**

**Property 62: Gem extraction cost formula**
*For any* gem extraction, the cost SHALL be calculated based on the gem's quality and type according to the defined formula.
**Validates: Requirements 25.4**

### Backward Compatibility Properties

**Property 63: Save migration initialization**
*For any* old save file loaded, all new data fields SHALL be initialized with appropriate default values.
**Validates: Requirements 26.1**

**Property 64: Save migration preservation**
*For any* equipment in an old save file, all existing attributes SHALL be preserved exactly during migration to the new format.
**Validates: Requirements 26.2, 26.3**

**Property 65: Save completeness**
*For any* save operation, all new system data (materials, blacksmith state, history, achievements) SHALL be included in the saved data.
**Validates: Requirements 26.4**

**Property 66: Save integrity validation**
*For any* migrated save file, the data SHALL pass all integrity validation checks.
**Validates: Requirements 26.5**

### Configuration Properties

**Property 67: Configuration loading**
*For any* configurable value (probability, cost, bonus), the value used SHALL come from the configuration file, not hardcoded constants.
**Validates: Requirements 27.1**

**Property 68: Runtime configuration updates**
*For any* configuration value changed at runtime, subsequent operations SHALL use the new value.
**Validates: Requirements 27.2**

**Property 69: Configuration validation**
*For any* invalid configuration value, the system SHALL reject it and log a warning.
**Validates: Requirements 27.3**

**Property 70: Configuration fallback**
*For any* invalid configuration, the system SHALL use safe default values for all affected parameters.
**Validates: Requirements 27.4**

### Error Handling Properties

**Property 71: Validation error messages**
*For any* operation that fails validation, a specific error message SHALL be displayed indicating the validation failure reason.
**Validates: Requirements 28.1**

**Property 72: Input validation precedence**
*For any* forge operation, all inputs SHALL be validated before any state changes or resource consumption occurs.
**Validates: Requirements 28.2**

**Property 73: Resource error details**
*For any* operation failing due to insufficient resources, the error message SHALL include both required and available amounts.
**Validates: Requirements 28.3**

**Property 74: State integrity on failure**
*For any* operation that encounters an error, the game state SHALL remain valid and unchanged from before the operation.
**Validates: Requirements 28.5**

### Performance Properties

**Property 75: Stat caching**
*For any* equipment, calculated stats SHALL not be recalculated unless the equipment is modified.
**Validates: Requirements 29.2**

**Property 76: Batch chunking**
*For any* batch operation with more than 100 items, the processing SHALL be divided into chunks with progress updates between chunks.
**Validates: Requirements 29.4**

### Resource Validation Properties

**Property 77: Resource validation consistency**
*For any* forge operation requiring consumable resources (scrolls, stones, materials, essence), the operation SHALL fail if any required resource is insufficient, before any processing occurs.
**Validates: Requirements 2.4, 4.2, 8.2, 10.2, 19.4, 20.5, 25.2**

## Error Handling

### Validation Strategy

All forge operations follow a consistent validation pattern:

```javascript
function performForgeOperation(operation, params):
  // Phase 1: Input Validation
  errors = validateInputs(params)
  if errors.length > 0:
    return { success: false, errors: errors }
  
  // Phase 2: Resource Validation
  resourceCheck = validateResources(operation, params)
  if !resourceCheck.sufficient:
    return {
      success: false,
      error: 'INSUFFICIENT_RESOURCES',
      required: resourceCheck.required,
      available: resourceCheck.available
    }
  
  // Phase 3: Business Logic Validation
  businessCheck = validateBusinessRules(operation, params)
  if !businessCheck.valid:
    return {
      success: false,
      error: businessCheck.errorCode,
      message: businessCheck.message
    }
  
  // Phase 4: Execute Operation (with transaction)
  try:
    result = executeOperation(operation, params)
    saveGameState()
    return { success: true, result: result }
  catch error:
    rollbackState()
    logError(error)
    return {
      success: false,
      error: 'OPERATION_FAILED',
      message: 'An unexpected error occurred',
      details: error.message
    }
```

### Error Categories

**Validation Errors**:
- `INVALID_EQUIPMENT`: Equipment not found or invalid type
- `INVALID_LEVEL`: Enhancement level out of valid range
- `INVALID_QUALITY`: Quality tier not recognized
- `INVALID_SLOT`: Enchantment or socket slot index out of range
- `INVALID_MATERIAL_TYPE`: Material type not recognized

**Resource Errors**:
- `INSUFFICIENT_GOLD`: Not enough gold for operation
- `INSUFFICIENT_MATERIALS`: Not enough materials (includes details)
- `INSUFFICIENT_ITEMS`: Required items not in inventory
- `INVENTORY_FULL`: Cannot add items to full inventory

**Business Logic Errors**:
- `MAX_LEVEL_REACHED`: Equipment already at maximum enhancement level
- `AWAKENING_NOT_AVAILABLE`: Equipment doesn't meet awakening requirements
- `SET_INCOMPLETE`: Not all set pieces present for set enhancement
- `SPECIALIZATION_LOCKED`: Specialization already chosen
- `GEM_FUSION_INVALID`: Gems not compatible for fusion
- `FEATURE_LOCKED`: Blacksmith level too low for feature

**System Errors**:
- `SAVE_FAILED`: Failed to save game state
- `LOAD_FAILED`: Failed to load game state
- `MIGRATION_FAILED`: Failed to migrate old save data
- `OPERATION_FAILED`: Unexpected error during operation

### Error Recovery

**State Rollback**:
- All operations use transaction-like semantics
- On error, state is rolled back to pre-operation state
- Resources consumed during validation are restored
- History logs are not created for failed operations

**User Feedback**:
- All errors display user-friendly messages
- Technical details logged to console for debugging
- Resource errors show required vs available amounts
- Validation errors highlight specific invalid fields

**Graceful Degradation**:
- Invalid configuration falls back to safe defaults
- Missing save data fields initialized with defaults
- Corrupted data triggers migration/repair
- UI remains functional even if some features fail

## Testing Strategy

### Dual Testing Approach

This system requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and error conditions
- Specific enhancement scenarios (e.g., +14 to +15 with protection scroll)
- Edge cases (e.g., empty inventory, maximum values, boundary conditions)
- Error conditions (e.g., insufficient resources, invalid inputs)
- Integration points (e.g., save/load, UI interactions)

**Property Tests**: Verify universal properties across all inputs
- Enhancement mechanics across all levels and equipment types
- Resource consumption patterns for all operations
- Stat calculations with various combinations of enhancements/enchantments
- Save/load round-trip preservation

Together, these approaches provide comprehensive coverage: unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across the input space.

### Property-Based Testing Configuration

**Testing Library**: Use `fast-check` for JavaScript property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `// Feature: blacksmith-system-enhancement, Property {number}: {property_text}`

**Example Property Test Structure**:

```javascript
// Feature: blacksmith-system-enhancement, Property 1: Enhancement level changes correctly
test('enhancement level changes correctly on success and failure', () => {
  fc.assert(
    fc.property(
      fc.record({
        equipment: arbitraryEquipment(),
        useProtection: fc.boolean()
      }),
      ({ equipment, useProtection }) => {
        const initialLevel = equipment.enhancementLevel;
        const result = enhancementEngine.enhance(equipment, { useProtectionScroll: useProtection });
        
        if (result.success) {
          expect(equipment.enhancementLevel).toBe(initialLevel + 1);
        } else if (!useProtection) {
          expect(equipment.enhancementLevel).toBe(initialLevel - 1);
        } else {
          expect(equipment.enhancementLevel).toBe(initialLevel);
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Data Generators

**Arbitrary Equipment**:
```javascript
function arbitraryEquipment() {
  return fc.record({
    id: fc.uuid(),
    name: fc.string(),
    type: fc.constantFrom('weapon', 'armor', 'accessory'),
    quality: fc.constantFrom('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'),
    enhancementLevel: fc.integer({ min: 0, max: 15 }),
    sockets: fc.array(arbitrarySocket(), { maxLength: 4 }),
    specializations: fc.record({
      5: fc.option(fc.constantFrom('attack', 'defense', 'speed', 'balanced')),
      10: fc.option(fc.constantFrom('attack', 'defense', 'speed', 'balanced')),
      15: fc.option(fc.constantFrom('attack', 'defense', 'speed', 'balanced'))
    }),
    setId: fc.option(fc.string()),
    setEnhancementLevel: fc.integer({ min: 0, max: 10 }),
    enchantments: fc.array(arbitraryEnchantment(), { maxLength: 2 }),
    awakening: fc.record({
      isAwakened: fc.boolean(),
      skill: fc.option(arbitraryAwakeningSkill())
    })
  });
}
```

**Arbitrary Gem**:
```javascript
function arbitraryGem() {
  return fc.record({
    id: fc.uuid(),
    type: fc.constantFrom('ruby', 'sapphire', 'emerald', 'topaz', 'diamond'),
    quality: fc.constantFrom('normal', 'fine', 'perfect'),
    series: fc.constantFrom('fire', 'ice', 'nature', 'lightning', 'arcane'),
    baseStats: fc.record({
      atk: fc.integer({ min: 1, max: 50 }),
      def: fc.integer({ min: 1, max: 50 }),
      hp: fc.integer({ min: 10, max: 500 })
    })
  });
}
```

### Unit Test Coverage

**Critical Paths**:
- Enhancement success and failure at each level
- Protection scroll and blessing stone mechanics
- Set enhancement with complete and incomplete sets
- Specialization selection at milestones
- Enchantment application and overwriting
- Awakening for Mythic +15 equipment
- Batch operations with various sizes
- Material dismantling and conversion
- Gem fusion and extraction
- Save/load with migration

**Edge Cases**:
- Enhancement at maximum level
- Operations with zero resources
- Empty inventory operations
- Maximum stat values
- Corrupted save data
- Invalid configuration values

**Error Conditions**:
- Insufficient gold/materials
- Invalid equipment references
- Out-of-range values
- Concurrent operation conflicts
- Save/load failures

### Integration Testing

**Save/Load Round-Trip**:
- Perform various operations
- Save game state
- Load game state
- Verify all data preserved

**UI Integration**:
- Verify UI updates reflect system state
- Test user interactions trigger correct operations
- Validate error messages display correctly
- Check animations and audio feedback

**Performance Testing**:
- Large inventory (1000+ items)
- Batch operations (100+ items)
- Rapid successive operations
- Memory usage over time

### Test Execution

**Continuous Testing**:
- Run unit tests on every code change
- Run property tests before commits
- Run full test suite before releases

**Test Organization**:
```
tests/
├── unit/
│   ├── enhancement.test.js
│   ├── set-enhancement.test.js
│   ├── enchantment.test.js
│   ├── awakening.test.js
│   ├── materials.test.js
│   ├── gems.test.js
│   ├── blacksmith-npc.test.js
│   ├── history.test.js
│   └── batch-operations.test.js
├── property/
│   ├── enhancement.property.test.js
│   ├── resources.property.test.js
│   ├── stats.property.test.js
│   ├── persistence.property.test.js
│   └── validation.property.test.js
├── integration/
│   ├── save-load.test.js
│   ├── ui-integration.test.js
│   └── performance.test.js
└── helpers/
    ├── arbitraries.js
    ├── fixtures.js
    └── test-utils.js
```

### Success Criteria

- All unit tests pass
- All property tests pass (100 iterations each)
- Code coverage > 80% for core logic
- No memory leaks in performance tests
- All error paths tested
- Save/load round-trip successful for all data
- UI integration tests pass
- Mobile compatibility verified
