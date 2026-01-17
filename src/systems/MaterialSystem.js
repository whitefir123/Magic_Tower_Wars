/**
 * MaterialSystem - Manages enhancement materials obtained from dismantling
 * 
 * Handles:
 * - Material yield calculation from dismantling equipment
 * - Material inventory management
 * - Material consumption for forge operations
 * - Material conversion between types
 */

export class MaterialSystem {
  constructor(game) {
    this.game = game;
    
    // Material types
    this.MATERIAL_TYPES = {
      enhancement_stone: 'Enhancement Stone',
      reforge_crystal: 'Reforge Crystal',
      enchantment_dust: 'Enchantment Dust',
      set_essence: 'Set Essence',
      awakening_stone: 'Awakening Stone'
    };
    
    // Dismantle yield ranges by quality
    this.DISMANTLE_YIELD = {
      COMMON: {
        enhancement_stone: [1, 3],
        reforge_crystal: [0, 1],
        enchantment_dust: [0, 1]
      },
      UNCOMMON: {
        enhancement_stone: [2, 5],
        reforge_crystal: [1, 2],
        enchantment_dust: [1, 2]
      },
      RARE: {
        enhancement_stone: [5, 10],
        reforge_crystal: [2, 4],
        enchantment_dust: [2, 4],
        set_essence: [0, 1]
      },
      EPIC: {
        enhancement_stone: [10, 20],
        reforge_crystal: [5, 10],
        enchantment_dust: [5, 10],
        set_essence: [1, 2]
      },
      LEGENDARY: {
        enhancement_stone: [20, 40],
        reforge_crystal: [10, 20],
        enchantment_dust: [10, 20],
        set_essence: [2, 5],
        awakening_stone: [0, 1]
      },
      MYTHIC: {
        enhancement_stone: [40, 80],
        reforge_crystal: [20, 40],
        enchantment_dust: [20, 40],
        set_essence: [5, 10],
        awakening_stone: [1, 3]
      }
    };
    
    // Material conversion rates (lossy conversions)
    this.MATERIAL_CONVERSION_RATES = {
      enhancement_stone: {
        to_reforge_crystal: 3,  // 3 stones = 1 crystal
        to_enchantment_dust: 2  // 2 stones = 1 dust
      },
      reforge_crystal: {
        to_enhancement_stone: 0.3,  // 1 crystal = 0.3 stones (lossy)
        to_enchantment_dust: 1      // 1 crystal = 1 dust
      },
      enchantment_dust: {
        to_enhancement_stone: 0.5,  // 1 dust = 0.5 stones (lossy)
        to_reforge_crystal: 2       // 2 dust = 1 crystal
      }
    };
    
    // Initialize material inventory if not exists
    this._initializeMaterialInventory();
  }
  
  /**
   * Initialize material inventory in game state
   * @private
   */
  _initializeMaterialInventory() {
    if (!this.game.materials) {
      this.game.materials = {
        enhancement_stone: 0,
        reforge_crystal: 0,
        enchantment_dust: 0,
        set_essence: 0,
        awakening_stone: 0
      };
    }
  }
  
  /**
   * Calculate materials yielded from dismantling equipment
   * @param {Object} equipment - Equipment to dismantle
   * @returns {Object} Material types and quantities
   */
  calculateDismantleYield(equipment) {
    if (!equipment) {
      return {};
    }
    
    // Get equipment quality (normalize to uppercase)
    const quality = (equipment.quality || equipment.rarity || 'COMMON').toUpperCase();
    
    // Get yield configuration for this quality
    const yieldConfig = this.DISMANTLE_YIELD[quality];
    if (!yieldConfig) {
      console.warn(`[MaterialSystem] Unknown quality: ${quality}, using COMMON`);
      return this.calculateDismantleYield({ ...equipment, quality: 'COMMON' });
    }
    
    // Calculate random yield for each material type
    const yield_result = {};
    for (const [materialType, range] of Object.entries(yieldConfig)) {
      const [min, max] = range;
      const amount = Math.floor(Math.random() * (max - min + 1)) + min;
      if (amount > 0) {
        yield_result[materialType] = amount;
      }
    }
    
    // Bonus materials based on enhancement level
    const enhanceLevel = equipment.enhanceLevel || 0;
    if (enhanceLevel > 0) {
      const bonusStones = Math.floor(enhanceLevel * 0.5);
      yield_result.enhancement_stone = (yield_result.enhancement_stone || 0) + bonusStones;
    }
    
    return yield_result;
  }
  
  /**
   * Add materials to inventory
   * @param {Object} materials - Materials to add {materialType: amount}
   */
  addMaterials(materials) {
    if (!materials || typeof materials !== 'object') {
      return;
    }
    
    this._initializeMaterialInventory();
    
    for (const [materialType, amount] of Object.entries(materials)) {
      if (this.game.materials.hasOwnProperty(materialType)) {
        this.game.materials[materialType] += amount;
      } else {
        console.warn(`[MaterialSystem] Unknown material type: ${materialType}`);
      }
    }
  }
  
  /**
   * Check if player has sufficient materials
   * @param {Object} required - Required materials {materialType: amount}
   * @returns {boolean}
   */
  hasMaterials(required) {
    if (!required || typeof required !== 'object') {
      return true;
    }
    
    this._initializeMaterialInventory();
    
    for (const [materialType, amount] of Object.entries(required)) {
      const available = this.game.materials[materialType] || 0;
      if (available < amount) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Consume materials from inventory
   * @param {Object} materials - Materials to consume {materialType: amount}
   * @returns {boolean} Success status
   */
  consumeMaterials(materials) {
    if (!materials || typeof materials !== 'object') {
      return true;
    }
    
    // Check if we have enough materials first
    if (!this.hasMaterials(materials)) {
      return false;
    }
    
    this._initializeMaterialInventory();
    
    // Consume materials
    for (const [materialType, amount] of Object.entries(materials)) {
      this.game.materials[materialType] -= amount;
      
      // Ensure no negative values
      if (this.game.materials[materialType] < 0) {
        this.game.materials[materialType] = 0;
      }
    }
    
    return true;
  }
  
  /**
   * Convert materials between types
   * @param {string} fromType - Source material type
   * @param {string} toType - Target material type
   * @param {number} amount - Amount of source material to convert
   * @returns {Object} ConversionResult {success, consumed, produced, remaining}
   */
  convertMaterials(fromType, toType, amount) {
    const result = {
      success: false,
      consumed: 0,
      produced: 0,
      remaining: 0,
      error: null
    };
    
    // Validate inputs
    if (!fromType || !toType || amount <= 0) {
      result.error = 'Invalid conversion parameters';
      return result;
    }
    
    // Check if conversion is supported
    const conversionRates = this.MATERIAL_CONVERSION_RATES[fromType];
    if (!conversionRates) {
      result.error = `Cannot convert from ${fromType}`;
      return result;
    }
    
    const conversionKey = `to_${toType}`;
    const rate = conversionRates[conversionKey];
    if (rate === undefined) {
      result.error = `Cannot convert ${fromType} to ${toType}`;
      return result;
    }
    
    // Check if player has enough materials
    this._initializeMaterialInventory();
    const available = this.game.materials[fromType] || 0;
    if (available < amount) {
      result.error = `Insufficient ${fromType}: have ${available}, need ${amount}`;
      return result;
    }
    
    // Calculate conversion
    // If rate >= 1: need 'rate' source materials to produce 1 target material
    // If rate < 1: 1 source material produces 'rate' target materials
    let consumed, produced;
    
    if (rate >= 1) {
      // Need multiple source materials for 1 target
      consumed = Math.floor(amount / rate) * rate;
      produced = Math.floor(amount / rate);
    } else {
      // 1 source produces fractional target
      consumed = amount;
      produced = Math.floor(amount * rate);
    }
    
    // Perform conversion
    if (consumed > 0 && produced > 0) {
      this.game.materials[fromType] -= consumed;
      this.game.materials[toType] = (this.game.materials[toType] || 0) + produced;
      
      result.success = true;
      result.consumed = consumed;
      result.produced = produced;
      result.remaining = this.game.materials[fromType];
    } else {
      result.error = 'Insufficient materials for conversion';
    }
    
    return result;
  }
  
  /**
   * Get current material inventory
   * @returns {Object} Material inventory
   */
  getMaterials() {
    this._initializeMaterialInventory();
    return { ...this.game.materials };
  }
  
  /**
   * Get material type display name
   * @param {string} materialType - Material type key
   * @returns {string} Display name
   */
  getMaterialName(materialType) {
    return this.MATERIAL_TYPES[materialType] || materialType;
  }
}
