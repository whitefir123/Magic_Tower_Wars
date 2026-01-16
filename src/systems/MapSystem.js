// MapSystem.js - 地图生成、寻路、渲染逻辑
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, TILE, EQUIPMENT_DB, getEquipmentDropForFloor, getRandomConsumable, OBJ_TRAP, OBJ_SHRINE_HEAL, OBJ_SHRINE_POWER, OBJ_CRATE, OBJ_BARREL, OBJ_ALTAR_CURSED, LOOT_TABLE_DESTRUCTIBLE, MONSTER_STATS, GAMBLER_SPAWN_CONFIG, SOUL_CRYSTAL_CONFIG, getAscensionLevel, ELITE_SPAWN_CONFIG, ELITE_AFFIXES } from '../constants.js';
import { Sprite, FogParticle } from '../utils.js';
import { Monster, Merchant, Gambler } from '../entities.js';

export class MapSystem {
  constructor(loader, difficultyMultiplier = 1.0) {
    this.loader = loader; 
    this.width = MAP_WIDTH; 
    this.height = MAP_HEIGHT;
    this.monsters = []; 
    this.items = []; 
    this.grid = []; 
    this.npcs = []; 
    this.objects = [];
    this.fogParticles = []; // Array of FogParticle objects for dynamic fog
    this.explored = []; // 2D array to track which tiles have been explored (seen before)
    this.visible = []; // 2D array to track which tiles are currently visible
    this.lightSources = []; // Array of light sources for colored lighting effects
    this.difficultyMultiplier = difficultyMultiplier; // @deprecated 保留用于向后兼容
    this.ascensionLevel = 1; // 新的噩梦层级（1-25）
    this.lastMerchantFloor = 0; // 追踪地精商人上次出现的楼层数（0表示从未出现）
    this.lastGamblerFloor = 0; // 追踪赌徒上次出现的楼层数
  }
  
  static isInsideRoom(room, x, y) { return x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h; }
  
  /**
   * 内部辅助方法：获取随机数
   * @private
   */
  _random() {
    return this._currentRng ? this._currentRng.next() : Math.random();
  }
  
  /**
   * 内部辅助方法：获取随机整数
   * @private
   */
  _randomInt(min, max) {
    if (this._currentRng) {
      return this._currentRng.nextInt(min, max);
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  getRoomConnectorCandidates(room) {
    const cons = [];
    for (let x = room.x; x < room.x + room.w; x++) {
      if (room.y - 2 >= 0 && this.grid[room.y - 2]?.[x] === TILE.FLOOR) cons.push({ x, y: room.y - 1, side: 'top' });
      if (room.y + room.h + 1 < this.height && this.grid[room.y + room.h + 1]?.[x] === TILE.FLOOR) cons.push({ x, y: room.y + room.h, side: 'bottom' });
    }
    for (let y = room.y; y < room.y + room.h; y++) {
      if (room.x - 2 >= 0 && this.grid[y]?.[room.x - 2] === TILE.FLOOR) cons.push({ x: room.x - 1, y, side: 'left' });
      if (room.x + room.w + 1 < this.width && this.grid[y]?.[room.x + room.w + 1] === TILE.FLOOR) cons.push({ x: room.x + room.w, y, side: 'right' });
    }
    return cons;
  }
  
  forceCreateConnector(room, asDoor=false) {
    const edges = [];
    if (room.y - 1 > 0) edges.push({ x: Math.floor(room.x + room.w / 2), y: room.y - 1, outX: Math.floor(room.x + room.w / 2), outY: room.y - 2, side: 'top' });
    if (room.y + room.h < this.height - 1) edges.push({ x: Math.floor(room.x + room.w / 2), y: room.y + room.h, outX: Math.floor(room.x + room.w / 2), outY: room.y + room.h + 1, side: 'bottom' });
    if (room.x - 1 > 0) edges.push({ x: room.x - 1, y: Math.floor(room.y + room.h / 2), outX: room.x - 2, outY: Math.floor(room.y + room.h / 2), side: 'left' });
    if (room.x + room.w < this.width - 1) edges.push({ x: room.x + room.w, y: Math.floor(room.y + room.h / 2), outX: room.x + room.w + 1, outY: Math.floor(room.y + room.h / 2), side: 'right' });
    if (edges.length === 0) return null;
    const pick = edges[this._randomInt(0, edges.length - 1)];
    this.grid[pick.y][pick.x] = asDoor ? TILE.DOOR : TILE.FLOOR;
    if (pick.outY >= 0 && pick.outY < this.height && pick.outX >= 0 && pick.outX < this.width) this.grid[pick.outY][pick.outX] = TILE.FLOOR;
    return { x: pick.x, y: pick.y };
  }
  
  generateLevel(floor, ascensionLevel = 1, rng = null) {
    // ✅ FIX: 清理动态物品Map，防止内存泄漏
    // 注意：已经捡到背包里的物品不应被清理（它们应该已经在Player.inventory中了）
    // 这里只清理地上的临时物品数据
    if (window.__dynamicItems && window.__dynamicItems instanceof Map) {
      // 只清理未拾取的物品（地上的物品）
      // 由于generateLevel会重新生成地图，所有地上的物品都会被清理
      window.__dynamicItems.clear();
      console.log('[MapSystem] 已清理动态物品Map，防止内存泄漏');
    }
    
    // 存储当前噩梦层级（用于怪物生成）
    this.ascensionLevel = ascensionLevel;
    this.monsters = []; this.items = []; this.grid = []; this.objects = [];
    this.fogParticles = []; // Reset fog particles
    
    // 存储 RNG 供内部方法使用
    this._currentRng = rng;
    
    // Initialize explored and visible arrays (fog of war)
    this.explored = [];
    this.visible = [];
    for (let y = 0; y < this.height; y++) {
      const exploredRow = [];
      const visibleRow = [];
      for (let x = 0; x < this.width; x++) {
        exploredRow.push(false); // All tiles start unexplored
        visibleRow.push(false); // All tiles start invisible
      }
      this.explored.push(exploredRow);
      this.visible.push(visibleRow);
    }
    for (let y = 0; y < this.height; y++) { const row = []; for (let x = 0; x < this.width; x++) row.push(TILE.WALL); this.grid.push(row); }
    const rooms = [];
    for (let i = 0; i < 100 && rooms.length < 8; i++) {
      const w = this._randomInt(5, 8);
      const h = this._randomInt(5, 8);
      const x = this._randomInt(1, this.width - w - 2);
      const y = this._randomInt(1, this.height - h - 2);
      let ok = true;
      for (let r of rooms) { if (x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y) { ok = false; break; } }
      if (!ok) continue;
      const room = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2), isSecure: false, isBoss: false, isStart: false };
      rooms.push(room);
      for (let ry = y; ry < y + h; ry++) for (let rx = x; rx < x + w; rx++) this.grid[ry][rx] = TILE.FLOOR;
    }
    if (rooms.length === 0) return;
    // 保存房间数据，用于智能迷雾驱散
    this.rooms = rooms;
    const start = rooms[0]; start.isStart = true;
    // ✅ 无限层数挑战 + 层域守卫：Boss 生成逻辑
    const game = window.game;
    const infiniteMode = game?.config?.infiniteMode || false;
    // 无限模式：每10层生成 Boss；普通模式：每一层都生成 Boss
    const shouldSpawnBoss = infiniteMode ? (floor % 10 === 0) : (floor >= 1);
    const bossRoom = rooms[rooms.length - 1]; 
    if (shouldSpawnBoss) { 
      bossRoom.isSecure = true; 
      bossRoom.isBoss = true; 
    }
    const candidates = rooms.filter(r => r !== start && r !== bossRoom);
    for (let i = candidates.length - 1; i > 0; i--) { const j = this._randomInt(0, i); [candidates[i], candidates[j]] = [candidates[j], candidates[i]]; }
    const tCount = Math.max(2, Math.min(3, candidates.length));
    const treasureRooms = candidates.slice(0, tCount); treasureRooms.forEach(r => r.isSecure = true);
    for (let y = 1; y < this.height - 1; y += 2) for (let x = 1; x < this.width - 1; x += 2) if (this.grid[y][x] === TILE.WALL && this.countFloors(x, y) === 0) this.carve(x, y);
    const allSecure = rooms.filter(r => r.isSecure);
    rooms.forEach(r => {
      const cons = this.getRoomConnectorCandidates(r);
      if (r.isSecure) { if (cons.length > 0) { const chosen = cons[this._randomInt(0, cons.length - 1)]; this.grid[chosen.y][chosen.x] = TILE.DOOR; } else { this.forceCreateConnector(r, true); } }
      else {
        const count = Math.min(3, Math.max(1, this._randomInt(1, 3)));
        if (cons.length > 0) { for (let i = cons.length - 1; i > 0; i--) { const j = this._randomInt(0, i); [cons[i], cons[j]] = [cons[j], cons[i]]; } const picks = cons.slice(0, Math.min(count, cons.length)); picks.forEach(p => this.grid[p.y][p.x] = TILE.FLOOR); }
        else { this.forceCreateConnector(r, false); }
      }
    });
    if (!this.npcs) this.npcs = [];
    // 先设置玩家出生点（楼梯向上）
    this.grid[start.cy][start.cx] = TILE.STAIRS_UP;
    
    // 判断地精商人是否在本层出现
    const merchantShouldAppear = Merchant.shouldAppear(floor, this.lastMerchantFloor);
    
    // 判断赌徒是否在本层出现（允许与商人同层，但需要避免重叠）
    const gamblerShouldAppear = Gambler.shouldAppear(floor, GAMBLER_SPAWN_CONFIG);
    
    if (merchantShouldAppear) {
      // 在随机位置放置地精商人（不在起点）
      const floorTiles = [];
      for (let y = 1; y < this.height - 1; y++) {
        for (let x = 1; x < this.width - 1; x++) {
          // 收集所有地板瓷砖，但排除起点附近的区域
          if (this.grid[y][x] === TILE.FLOOR && !(x === start.cx && y === start.cy)) {
            floorTiles.push({ x, y });
          }
        }
      }
      
      // 从地板瓷砖中随机选择一个放置商人
      if (floorTiles.length > 0) {
        const randomTile = floorTiles[this._randomInt(0, floorTiles.length - 1)];
        this.npcs.push(new Merchant(randomTile.x, randomTile.y, this.loader));
        this.lastMerchantFloor = floor; // 更新上次出现的楼层
      }
    } else if (gamblerShouldAppear) {
      // 在随机位置放置赌徒（不在起点，且与NPC保持距离）
      const floorTiles = [];
      const minDistance = 10; // 最小曼哈顿距离
      const maxAttempts = 50; // 最多尝试次数
      
      for (let y = 1; y < this.height - 1; y++) {
        for (let x = 1; x < this.width - 1; x++) {
          if (this.grid[y][x] === TILE.FLOOR && !(x === start.cx && y === start.cy)) {
            // 检查是否与NPC重叠
            const isNpcTile = this.npcs.some(npc => npc.x === x && npc.y === y);
            if (!isNpcTile) {
              floorTiles.push({ x, y });
            }
          }
        }
      }
      
      // 尝试找到一个与NPC距离足够远的位置
      let gamblerPlaced = false;
      let attempts = 0;
      
      // 打乱地板瓷砖顺序，增加随机性
      for (let i = floorTiles.length - 1; i > 0; i--) {
        const j = this._randomInt(0, i);
        [floorTiles[i], floorTiles[j]] = [floorTiles[j], floorTiles[i]];
      }
      
      while (!gamblerPlaced && attempts < maxAttempts && floorTiles.length > 0) {
        attempts++;
        const candidate = floorTiles[this._randomInt(0, floorTiles.length - 1)];
        
        // 检查与所有NPC的距离
        let isFarEnough = true;
        for (const npc of this.npcs) {
          const manhattanDist = Math.abs(candidate.x - npc.x) + Math.abs(candidate.y - npc.y);
          if (manhattanDist < minDistance) {
            isFarEnough = false;
            break;
          }
        }
        
        if (isFarEnough) {
          // 找到合适位置，放置赌徒
          this.npcs.push(new Gambler(candidate.x, candidate.y, this.loader));
          this.lastGamblerFloor = floor;
          gamblerPlaced = true;
          console.log(`✓ 赌徒已生成在第 ${floor} 层 (${candidate.x}, ${candidate.y})`);
        }
      }
      
      // 如果尝试多次后仍找不到合适位置，则强制放置（避免完全不生成）
      if (!gamblerPlaced && floorTiles.length > 0) {
        const fallbackTile = floorTiles[this._randomInt(0, floorTiles.length - 1)];
        this.npcs.push(new Gambler(fallbackTile.x, fallbackTile.y, this.loader));
        this.lastGamblerFloor = floor;
        console.log(`✓ 赌徒已强制生成在第 ${floor} 层 (${fallbackTile.x}, ${fallbackTile.y}) - 未找到足够远的位置`);
      }
    }
    
    // 铁匠铺出现逻辑（每3层出现一次，允许与商人同层但避免重叠）
    const shouldSpawnForge = floor % 3 === 0;
    if (shouldSpawnForge) {
      // 在随机位置放置铁砧（不在起点，且与NPC保持距离）
      const floorTiles = [];
      const minDistance = 10; // 最小曼哈顿距离
      const maxAttempts = 50; // 最多尝试次数
      
      // 收集所有可用的地板瓷砖
      for (let y = 1; y < this.height - 1; y++) {
        for (let x = 1; x < this.width - 1; x++) {
          if (this.grid[y][x] === TILE.FLOOR && !(x === start.cx && y === start.cy)) {
            // 检查是否与NPC、怪物、物品或其他对象重叠
            const isNpcTile = this.npcs.some(npc => npc.x === x && npc.y === y);
            const hasMonster = this.getMonsterAt(x, y);
            const hasItem = this.getItemAt(x, y);
            const hasObject = this.objects.some(o => o.x === x && o.y === y);
            if (!isNpcTile && !hasMonster && !hasItem && !hasObject) {
              floorTiles.push({ x, y });
            }
          }
        }
      }
      
      // 尝试找到一个与NPC距离足够远的位置
      let forgePlaced = false;
      let attempts = 0;
      
      // 打乱地板瓷砖顺序，增加随机性
      for (let i = floorTiles.length - 1; i > 0; i--) {
        const j = this._randomInt(0, i);
        [floorTiles[i], floorTiles[j]] = [floorTiles[j], floorTiles[i]];
      }
      
      while (!forgePlaced && attempts < maxAttempts && floorTiles.length > 0) {
        attempts++;
        const candidate = floorTiles[this._randomInt(0, floorTiles.length - 1)];
        
        // 检查与所有NPC的距离
        let isFarEnough = true;
        for (const npc of this.npcs) {
          const manhattanDist = Math.abs(candidate.x - npc.x) + Math.abs(candidate.y - npc.y);
          if (manhattanDist < minDistance) {
            isFarEnough = false;
            break;
          }
        }
        
        // ✅ FIX: Double-check that position is still available (defensive check)
        const hasMonster = this.getMonsterAt(candidate.x, candidate.y);
        const hasItem = this.getItemAt(candidate.x, candidate.y);
        const hasObject = this.objects.some(o => o.x === candidate.x && o.y === candidate.y);
        
        if (isFarEnough && !hasMonster && !hasItem && !hasObject) {
          // 找到合适位置，放置铁砧
          this.objects.push({
            type: 'INTERACTIVE_FORGE',
            x: candidate.x,
            y: candidate.y,
            sprite: new Sprite({ assetKey: 'OBJ_FORGE', loader: this.loader })
          });
          forgePlaced = true;
          console.log(`✓ 铁砧已生成在第 ${floor} 层 (${candidate.x}, ${candidate.y})`);
        }
      }
      
      // 如果尝试多次后仍找不到合适位置，则强制放置（避免完全不生成）
      if (!forgePlaced && floorTiles.length > 0) {
        const fallbackTile = floorTiles[this._randomInt(0, floorTiles.length - 1)];
        // ✅ FIX: Clear any conflicting objects before force-placing forge
        const monster = this.getMonsterAt(fallbackTile.x, fallbackTile.y);
        const item = this.getItemAt(fallbackTile.x, fallbackTile.y);
        if (monster) this.monsters = this.monsters.filter(m => m !== monster);
        if (item) this.items = this.items.filter(i => i !== item);
        this.objects = this.objects.filter(o => !(o.x === fallbackTile.x && o.y === fallbackTile.y));
        
        this.objects.push({
          type: 'INTERACTIVE_FORGE',
          x: fallbackTile.x,
          y: fallbackTile.y,
          sprite: new Sprite({ assetKey: 'OBJ_FORGE', loader: this.loader })
        });
        console.log(`✓ 铁砧已强制生成在第 ${floor} 层 (${fallbackTile.x}, ${fallbackTile.y}) - 未找到足够远的位置`);
      }
    }
    const endRoom = rooms[rooms.length - 1]; this.grid[endRoom.cy][endRoom.cx] = TILE.STAIRS_DOWN;
    
    // 尝试确保至少三条从出生点到下层楼梯的独立路径
    try {
      this.ensureMultiplePaths(3, start, endRoom, rooms);
    } catch (e) {
      console.warn('ensureMultiplePaths failed', e);
    }

    // Initial reveal around player start position (will be updated by game loop with player's actual vision radius)
    this.revealAround(start.cx, start.cy, 4);
    
    // 获取噩梦层级配置（用于地图生成修饰符）
    const ascConfig = getAscensionLevel(ascensionLevel);
    
    // @deprecated 保留旧的difficultyScalar用于向后兼容
    const difficultyScalar = 1 + (this.difficultyMultiplier - 1) * 0.5;
    
    // ✅ Boss生成（使用新的噩梦层级系统 + 无限层数挑战支持 + 层域守卫）
    // 注意：game、infiniteMode 和 shouldSpawnBoss 变量已在前面声明，这里直接使用
    if (shouldSpawnBoss) { 
      // Boss使用ascensionLevel而不是旧的diff系统
      this.monsters.push(new Monster('BOSS', endRoom.cx, endRoom.cy - 1, this.loader, 1, TILE, floor, ascensionLevel)); 
    }
    treasureRooms.forEach(r => this.addItem('OBJ_CHEST', r.cx, r.cy));

    // @deprecated 保留旧的diff计算用于向后兼容，但Monster构造函数会使用ascensionLevel
    const diff = (1 + floor * 0.2) * difficultyScalar;
    
    // 怪物等级定义：用于计算距离权重
    // 等级越高，应该离出生地越远
    const monsterLevels = {
      SLIME: 1,          // 最弱
      BAT: 2,            // 较弱
      VOID: 3,           // 中等偏弱
      SKELETON: 4,       // 中等
      SWAMP: 5,          // 中等偏强
      CLOCKWORK: 6,      // 较强
      GHOST: 6,          // 较强（隐身特性）
      REAPER: 7,         // 很强
      GOLEM: 8           // 最强
    };
    
    // 怪物权重配置：根据怪物强度设置生成权重
    // 权重越高，生成几率越高，数量也越多
    const monsterWeights = {
      SLIME: 100,        // 最弱，权重最高
      BAT: 90,           // 较弱
      VOID: 80,          // 中等偏弱
      SKELETON: 60,      // 中等
      SWAMP: 50,         // 中等偏强
      CLOCKWORK: 40,     // 较强
      GHOST: 35,         // 较强（隐身特性）
      REAPER: 25,        // 很强
      GOLEM: 15          // 最强，权重最低
    };
    
    // 为第二层及以上的所有楼层启用全怪物池（包括幽灵）
    // 根据楼层数逐步增加高等级怪物的权重
    let pool = ['SLIME', 'BAT', 'VOID', 'SKELETON', 'SWAMP', 'CLOCKWORK', 'REAPER', 'GOLEM', 'GHOST'];
    
    // 根据楼层调整怪物权重：高楼层的强力怪物权重增加
    const floorWeightMultiplier = Math.max(1, (floor - 1) * 0.15);
    const adjustedWeights = { ...monsterWeights };
    
    // 增加高等级怪物的权重（但保持相对关系）
    adjustedWeights.REAPER = Math.floor(25 + 25 * floorWeightMultiplier);
    adjustedWeights.GOLEM = Math.floor(15 + 20 * floorWeightMultiplier);
    adjustedWeights.CLOCKWORK = Math.floor(40 + 15 * floorWeightMultiplier);
    adjustedWeights.GHOST = Math.floor(35 + 20 * floorWeightMultiplier); // 幽灵权重随楼层增加
    
    // 创建加权怪物池（用于随机选择）
    const createWeightedPool = (weights) => {
      const weighted = [];
      for (const [monsterType, weight] of Object.entries(weights)) {
        for (let i = 0; i < weight; i++) {
          weighted.push(monsterType);
        }
      }
      return weighted;
    };
    
    const weightedPool = createWeightedPool(adjustedWeights);
    
    // 计算位置与出生地的距离权重（使用同心圆机制）
    // 低等级怪物可以在任何地方刷新（只要在自己的最小距离外）
    // 高等级怪物应该离出生地更远
    // 返回值：0-1 之间，1 表示完全符合距离要求，0 表示完全不符合
    const getDistanceWeightForMonster = (x, y, monsterType) => {
      // 使用曼哈顿距离计算
      const manhattanDist = Math.abs(x - start.cx) + Math.abs(y - start.cy);
      
      // 从 MONSTER_STATS 获取该怪物的最小刷新距离（同心圆）
      const monsterStats = MONSTER_STATS[monsterType];
      const minSpawnDist = monsterStats?.minSpawnDistance ?? 0;
      
      // 如果实际距离 >= 最小刷新距离，权重为 1.0（完全符合）
      // 如果实际距离 < 最小刷新距离，权重为 0（不符合，不能刷新）
      if (manhattanDist >= minSpawnDist) {
        return 1.0;
      } else {
        return 0.0;
      }
    };
    
    // 房间内怪物生成（应用怪物密度修饰符）
    const monsterDensityMultiplier = 1 + ascConfig.monsterDensity;
    rooms.forEach(r => {
      if (r === start || r.isSecure) return; if (pool.length === 0) return;
      const baseCount = Math.max(3, Math.floor((r.w * r.h) / 8));
      // 使用 Math.ceil 确保至少有一个怪物的增加，防止低层级时密度修饰符无效
      const count = Math.ceil(baseCount * monsterDensityMultiplier);
      let spawned = 0, attempts = 0;
      while (spawned < count && attempts < count * 10) {
        attempts++;
        const mx = this._randomInt(r.x + 1, r.x + r.w - 2);
        const my = this._randomInt(r.y + 1, r.y + r.h - 2);
        if (this.grid[my][mx] === TILE.FLOOR && !this.getMonsterAt(mx, my)) {
          // 根据距离权重选择怪物类型
          let selectedMonster = null;
          let attempts2 = 0;
          while (selectedMonster === null && attempts2 < 5) {
            const candidate = weightedPool[this._randomInt(0, weightedPool.length - 1)];
            const distWeight = getDistanceWeightForMonster(mx, my, candidate);
            // 根据距离权重决定是否接受这个怪物
            if (this._random() < distWeight) {
              selectedMonster = candidate;
            }
            attempts2++;
          }
          // 如果无法找到符合距离要求的怪物，就使用权重池中的随机怪物
          if (selectedMonster === null) {
            selectedMonster = weightedPool[this._randomInt(0, weightedPool.length - 1)];
          }
          
          // 创建怪物实例并检查同心圆刷新条件（使用新的噩梦层级系统）
          const monster = new Monster(selectedMonster, mx, my, this.loader, diff, TILE, floor, ascensionLevel);
          // 检查该怪物是否符合该位置的刷新条件（同心圆机制）
          if (monster.isValidSpawnLocation(mx, my, start.cx, start.cy)) {
            this.monsters.push(monster);
            spawned++;
          }
        }
      }
    });
    
    // 走廊和空地怪物生成（使用相同的加权池，并考虑距离权重）
    for (let y = 1; y < this.height - 1; y++) for (let x = 1; x < this.width - 1; x++) {
      if (this.grid[y][x] !== TILE.FLOOR) continue;
      let insideAnyRoom = false; for (const r of rooms) { if (MapSystem.isInsideRoom(r, x, y)) { insideAnyRoom = true; break; } }
      if (insideAnyRoom) continue; if (this.getMonsterAt(x, y)) continue; if (this.getItemAt(x, y)) continue;
      
      // 使用权重来决定是否生成怪物
      // 强力怪物的生成几率更低
      if (this._random() < 0.08 && pool.length > 0) {
        // 根据距离权重选择怪物类型
        let selectedMonster = null;
        let attempts2 = 0;
        while (selectedMonster === null && attempts2 < 5) {
          const candidate = weightedPool[this._randomInt(0, weightedPool.length - 1)];
          const distWeight = getDistanceWeightForMonster(x, y, candidate);
          // 根据距离权重决定是否接受这个怪物
          if (this._random() < distWeight) {
            selectedMonster = candidate;
          }
          attempts2++;
        }
        // 如果无法找到符合距离要求的怪物，就使用权重池中的随机怪物
        if (selectedMonster === null) {
          selectedMonster = weightedPool[this._randomInt(0, weightedPool.length - 1)];
        }
        
        // 创建怪物实例并检查同心圆刷新条件（使用新的噩梦层级系统）
        const monster = new Monster(selectedMonster, x, y, this.loader, diff, TILE, floor, ascensionLevel);
        // 检查该怪物是否符合该位置的刷新条件（同心圆机制）
        if (monster.isValidSpawnLocation(x, y, start.cx, start.cy)) {
          this.monsters.push(monster);
        }
      }
    }
    const secureCount = rooms.filter(r => r.isSecure).length; const eligible = [];
    for (let y = 1; y < this.height - 1; y++) for (let x = 1; x < this.width - 1; x++) {
      if (this.grid[y][x] !== TILE.FLOOR) continue; let insideSecure = false; for (const sr of rooms.filter(r=>r.isSecure)) { if (MapSystem.isInsideRoom(sr, x, y)) { insideSecure = true; break; } } if (!insideSecure) eligible.push({ x, y });
    }
    for (let i = eligible.length - 1; i > 0; i--) { const j = this._randomInt(0, i); [eligible[i], eligible[j]] = [eligible[j], eligible[i]]; }
    for (let i = 0; i < Math.min(secureCount, eligible.length); i++) { const pos = eligible[i]; this.addItem('ITEM_KEY_BRONZE', pos.x, pos.y); }
    if (this.items.filter(i => i.type.includes('KEY')).length === 0) this.addItem('ITEM_KEY_BRONZE', Math.min(this.width - 2, start.cx + 1), start.cy);

    // Generate Destructible Objects: Crates and Barrels (5-10 per level)
    // ✅ 确认生成顺序：可破坏物体在陷阱之前生成，陷阱生成时会自动跳过已有箱子的位置，从而物理上杜绝重叠
    const destructibleCount = this._randomInt(5, 10);
    let destructiblesPlaced = 0;
    let destructibleAttempts = 0;
    while (destructiblesPlaced < destructibleCount && destructibleAttempts < destructibleCount * 10) {
      destructibleAttempts++;
      const dx = this._randomInt(1, this.width - 2);
      const dy = this._randomInt(1, this.height - 2);
      
      // 严格检查地板类型
      if (this.grid[dy][dx] !== TILE.FLOOR) continue;
      
      // ✅ FIX: 严格检查位置占用：怪物、物品、或者任何已存在的对象
      const isOccupied = this.getMonsterAt(dx, dy) || 
                         this.getItemAt(dx, dy) || 
                         this.objects.some(o => o.x === dx && o.y === dy);
      
      if (isOccupied) continue;
      
      // Avoid start and stairs
      if ((dx === start.cx && dy === start.cy) || (dx === endRoom.cx && dy === endRoom.cy)) continue;
      
      // Random choice: Crate or Barrel
      const destructibleType = this._random() < 0.5 ? 'OBJ_CRATE' : 'OBJ_BARREL';
      const config = destructibleType === 'OBJ_CRATE' ? OBJ_CRATE : OBJ_BARREL;
      
      this.objects.push({
        type: destructibleType,
        config: config,
        x: dx,
        y: dy,
        visualX: dx * TILE_SIZE,
        visualY: dy * TILE_SIZE,
        hp: config.hp,
        destroyed: false
      });
      destructiblesPlaced++;
    }

    // Generate Traps: 应用陷阱密度修饰符
    // ✅ 确认生成顺序：陷阱在可破坏物体之后生成，通过 this.objects.some(...) 检查自动跳过已有箱子的位置
    const baseTrapChance = 0.05;
    const trapChance = Math.min(0.25, baseTrapChance + ascConfig.trapDensity * baseTrapChance); // 最多25%概率
    const trapDamageMultiplier = 1 + ascConfig.trapDamageMult;
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.grid[y][x] !== TILE.FLOOR) continue;
        // ✅ FIX: 严格检查位置占用：怪物、物品、或者任何已存在的对象（包括可破坏物体）
        if (this.getMonsterAt(x, y) || this.getItemAt(x, y) || this.objects.some(o => o.x === x && o.y === y)) continue;
        // Avoid start and stairs
        if ((x === start.cx && y === start.cy) || (x === endRoom.cx && y === endRoom.cy)) continue;
        if (this._random() < trapChance) {
          const trapDamage = Math.floor(OBJ_TRAP.damage * trapDamageMultiplier);
          this.objects.push({ 
            type: 'OBJ_TRAP', 
            x, y, 
            visualX: x * TILE_SIZE, 
            visualY: y * TILE_SIZE + 4, 
            triggered: false, 
            triggerCount: 0, 
            resetTimer: 0,
            damage: trapDamage // 存储计算后的陷阱伤害
          });
        }
      }
    }

    // Generate Shrines: 1-2 Shrines in dead ends or corners
    const deadEnds = [];
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.grid[y][x] !== TILE.FLOOR) continue;
        // ✅ FIX: Use direct check to ensure traps and other objects are properly detected
        if (this.getMonsterAt(x, y) || this.getItemAt(x, y) || this.objects.some(o => o.x === x && o.y === y)) continue;
        // Count walls around this tile (dead end = 3 walls)
        let wallCount = 0;
        if (this.grid[y-1][x] === TILE.WALL) wallCount++;
        if (this.grid[y+1][x] === TILE.WALL) wallCount++;
        if (this.grid[y][x-1] === TILE.WALL) wallCount++;
        if (this.grid[y][x+1] === TILE.WALL) wallCount++;
        if (wallCount >= 3) {
          deadEnds.push({ x, y });
        }
      }
    }
    // Shuffle and pick 1-2 shrines
    for (let i = deadEnds.length - 1; i > 0; i--) {
      const j = this._randomInt(0, i);
      [deadEnds[i], deadEnds[j]] = [deadEnds[j], deadEnds[i]];
    }
    const shrineCount = Math.min(2, Math.max(1, deadEnds.length));
    for (let i = 0; i < shrineCount && i < deadEnds.length; i++) {
      const pos = deadEnds[i];
      const shrineType = this._random() < 0.5 ? 'OBJ_SHRINE_HEAL' : 'OBJ_SHRINE_POWER';
      this.objects.push({ type: shrineType, x: pos.x, y: pos.y, visualX: pos.x * TILE_SIZE, visualY: pos.y * TILE_SIZE + 4, active: true });
    }

    // Generate Cursed Altar: 应用guaranteedCurseAltar修饰符
    // Altar is 2 tiles wide, so we need to ensure (x, y) and (x+1, y) are both valid floor tiles
    const shouldSpawnAltar = ascConfig.guaranteedCurseAltar || (this._random() < 0.3 && floor >= 2);
    if (shouldSpawnAltar) {
      let altarPlaced = false;
      let altarAttempts = 0;
      const maxAttempts = 100; // 增加最大尝试次数，防止死循环
      
      // 收集所有可能的位置（用于强制放置）
      const candidatePositions = [];
      for (let y = 1; y < this.height - 1; y++) {
        for (let x = 1; x < this.width - 3; x++) {
          // Check if both (x, y) and (x+1, y) are valid floor tiles
          if (this.grid[y][x] === TILE.FLOOR && this.grid[y][x + 1] === TILE.FLOOR) {
            // Avoid start and stairs
            if ((x === start.cx && y === start.cy) || (x === endRoom.cx && y === endRoom.cy)) continue;
            if ((x + 1 === start.cx && y === start.cy) || (x + 1 === endRoom.cx && y === endRoom.cy)) continue;
            candidatePositions.push({ x, y });
          }
        }
      }
      
      while (!altarPlaced && altarAttempts < maxAttempts) {
        altarAttempts++;
        
        // 随机选择一个候选位置
        if (candidatePositions.length === 0) break;
        const randomIndex = this._randomInt(0, candidatePositions.length - 1);
        const { x: ax, y: ay } = candidatePositions[randomIndex];
        
        // ✅ FIX: 增强MapSystem健壮性 - 检查边界，防止x+1超出地图宽度
        if (ax + 1 >= this.width) continue; // 确保祭坛的第二格不超出地图边界
        
        // 检查该位置是否仍然可用
        if (this.getMonsterAt(ax, ay) || this.getMonsterAt(ax + 1, ay)) continue;
        if (this.getItemAt(ax, ay) || this.getItemAt(ax + 1, ay)) continue;
        // ✅ FIX: Use direct check to ensure traps and other objects are properly detected
        if (this.objects.some(o => (o.x === ax && o.y === ay) || (o.x === ax + 1 && o.y === ay))) continue;
        
        // Place the Altar at (ax, ay) - it will visually span to (ax+1, ay)
        this.objects.push({
          type: 'OBJ_ALTAR_CURSED',
          config: OBJ_ALTAR_CURSED,
          x: ax,
          y: ay,
          visualX: ax * TILE_SIZE,
          visualY: ay * TILE_SIZE,
          width: 2,
          active: true,
          activated: false
        });
        
        // Mark (ax+1, ay) as occupied by placing a placeholder object
        this.objects.push({
          type: 'OBJ_ALTAR_PLACEHOLDER',
          x: ax + 1,
          y: ay,
          visualX: (ax + 1) * TILE_SIZE,
          visualY: ay * TILE_SIZE,
          parentAltar: { x: ax, y: ay }
        });
        
        altarPlaced = true;
      }
      
      // 如果guaranteedCurseAltar为true但放置失败，强制在第一个可用位置放置
      if (!altarPlaced && ascConfig.guaranteedCurseAltar) {
        // 强制放置：选择第一个候选位置（即使可能有怪物或物品，也要放置）
        if (candidatePositions.length > 0) {
          const { x: ax, y: ay } = candidatePositions[0];
          
          // 清除该位置的怪物和物品（强制放置）
          const monster1 = this.getMonsterAt(ax, ay);
          const monster2 = this.getMonsterAt(ax + 1, ay);
          if (monster1) this.monsters = this.monsters.filter(m => m !== monster1);
          if (monster2) this.monsters = this.monsters.filter(m => m !== monster2);
          
          const item1 = this.getItemAt(ax, ay);
          const item2 = this.getItemAt(ax + 1, ay);
          if (item1) this.items = this.items.filter(i => i !== item1);
          if (item2) this.items = this.items.filter(i => i !== item2);
          
          // 移除该位置的物体
          this.objects = this.objects.filter(obj => !(obj.x === ax && obj.y === ay) && !(obj.x === ax + 1 && obj.y === ay));
          
          // 强制放置祭坛
          this.objects.push({
            type: 'OBJ_ALTAR_CURSED',
            config: OBJ_ALTAR_CURSED,
            x: ax,
            y: ay,
            visualX: ax * TILE_SIZE,
            visualY: ay * TILE_SIZE,
            width: 2,
            active: true,
            activated: false
          });
          
          this.objects.push({
            type: 'OBJ_ALTAR_PLACEHOLDER',
            x: ax + 1,
            y: ay,
            visualX: (ax + 1) * TILE_SIZE,
            visualY: ay * TILE_SIZE,
            parentAltar: { x: ax, y: ay }
          });
          
          console.warn(`[MapGen] ⚠️ 强制放置诅咒祭坛在 (${ax}, ${ay}) - 尝试${altarAttempts}次后未找到完全空的位置（Lv25必须生成）`);
        } else {
          console.error(`[MapGen] ❌ 无法放置诅咒祭坛 - 地图中没有足够的2格宽空地（Lv25必须生成）`);
        }
      } else if (!altarPlaced) {
        // 非强制生成失败，仅记录警告
        console.warn(`[MapGen] ⚠️ 无法放置诅咒祭坛（尝试${altarAttempts}次后仍未找到合适位置）`);
      }
    }
    
    // Generate fog particles for every tile (after all level generation is complete)
    // BUT: Only generate if enableFog is true in game config
    // Also: Don't generate fog around player starting position (5 tile radius)
    // 注意：game 变量已在前面声明，这里直接使用
    if (game && game.config && game.config.enableFog) {
      const fogDensity = 2; // 1 = every tile, 2 = every 2nd tile
      const playerStartX = start.cx;
      const playerStartY = start.cy;
      const fogFreeRadius = 5; // No fog within this radius of player start
      
      for (let y = 0; y < this.height; y += fogDensity) {
        for (let x = 0; x < this.width; x += fogDensity) {
          // Skip fog generation near player starting position
          const dx = x - playerStartX;
          const dy = y - playerStartY;
          const distToStart = Math.sqrt(dx * dx + dy * dy);
          if (distToStart < fogFreeRadius) continue;
          
          const worldX = x * TILE_SIZE + TILE_SIZE / 2;
          const worldY = y * TILE_SIZE + TILE_SIZE / 2;
          // 使用对象池创建迷雾粒子
          if (game.fogParticlePool) {
            const particle = game.fogParticlePool.create(worldX, worldY, x, y);
            this.fogParticles.push(particle);
          } else {
            // 降级：如果对象池不可用，使用直接创建（不应该发生）
            this.fogParticles.push(new FogParticle(worldX, worldY, x, y));
          }
        }
      }
      // 登场爆发：在关卡开始时瞬间驱散大范围迷雾
      const startWorldX = start.cx * TILE_SIZE + TILE_SIZE / 2;
      const startWorldY = start.cy * TILE_SIZE + TILE_SIZE / 2;
      this.triggerInitialClear(startWorldX, startWorldY);
    }
    
    // 清理 RNG 引用（生成完成后）
    this._currentRng = null;
  }
  
  carve(x, y) {
    const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];
    // ✅ CRITICAL FIX: 使用 RNG 打乱方向（确保地图生成的确定性）
    // 在 generateLevel 期间，_currentRng 应该总是存在（如果是每日挑战模式）
    if (this._currentRng) {
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = this._currentRng.nextInt(0, i);
        [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
      }
    } else {
      // 如果 _currentRng 不存在，使用代理方法（将回退到 Math.random()，但确保一致性）
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = this._randomInt(0, i);
        [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
      }
    }
    this.grid[y][x] = TILE.FLOOR;
    for (let d of dirs) { const nx = x + d[0], ny = y + d[1]; if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1 && this.grid[ny][nx] === TILE.WALL) { this.grid[y + d[1] / 2][x + d[0] / 2] = TILE.FLOOR; this.carve(nx, ny); } }
  }
  
  countFloors(x, y) {
    let c = 0; if (this.grid[y - 1]?.[x] === 0) c++; if (this.grid[y + 1]?.[x] === 0) c++; if (this.grid[y]?.[x - 1] === 0) c++; if (this.grid[y]?.[x + 1] === 0) c++; return c;
  }
  
  addItem(t, x, y) {
    let dropX = x, dropY = y; if (this.getItemAt(dropX, dropY)) { const offsets = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]]; for (let o of offsets) { const nx = x + o[0], ny = y + o[1]; if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1 && this.grid[ny][nx] === TILE.FLOOR && !this.getItemAt(nx, ny)) { dropX = nx; dropY = ny; break; } } }
    this.items.push({ type: t, x: dropX, y: dropY, visualX: dropX * TILE_SIZE, visualY: dropY * TILE_SIZE, sprite: new Sprite({ assetKey: t, loader: this.loader, isStatic: true }) });
  }
  
  addEquipAt(itemIdOrObject, x, y) {
    // ✅ 支持两种模式：字符串ID（旧系统）或物品对象（新生成系统）
    let def, itemId;
    
    if (typeof itemIdOrObject === 'string') {
      // 旧系统：字符串ID
      itemId = itemIdOrObject;
      def = EQUIPMENT_DB[itemId];
      if (!def) return;
    } else if (typeof itemIdOrObject === 'object' && itemIdOrObject !== null) {
      // 新系统：程序化生成的物品对象
      def = itemIdOrObject;
      itemId = def.uid || def.id;
      
      // 将动态生成的装备存储到全局池中（供拾取和背包使用）
      if (!window.__dynamicItems) {
        window.__dynamicItems = new Map();
      }
      window.__dynamicItems.set(itemId, def);
    } else {
      return;
    }
    
    // 寻找空闲位置
    let dropX = x, dropY = y;
    if (this.getItemAt(dropX, dropY)) {
      const offsets = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]];
      for (let o of offsets) {
        const nx = x + o[0], ny = y + o[1];
        if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1 && 
            this.grid[ny][nx] === TILE.FLOOR && !this.getItemAt(nx, ny)) {
          dropX = nx;
          dropY = ny;
          break;
        }
      }
    }
    
    // Determine sprite config based on item type
    const isGem = def && def.type === 'GEM';
    const assetKey = isGem ? 'ICONS_GEMS' : 'ICONS_EQUIP';
    const cols = isGem ? 5 : 4;
    const rows = isGem ? 4 : 4;

    // 添加到物品列表
    this.items.push({
      type: 'ITEM_EQUIP',
      itemId,
      x: dropX,
      y: dropY,
      visualX: dropX * TILE_SIZE,
      visualY: dropY * TILE_SIZE,
      sprite: new Sprite({
        assetKey: assetKey,
        loader: this.loader,
        isStatic: true,
        iconIndex: def.iconIndex,
        cols: cols,
        rows: rows
      })
    });
  }
  
  addConsumableAt(itemOrId, x, y) {
    let def, itemId;

    // 1. 处理动态物品对象
    if (typeof itemOrId === 'object' && itemOrId !== null) {
      def = itemOrId;
      itemId = def.uid || def.id || def.itemId;

      // 存入全局动态物品池，以便拾取时获取完整数据
      if (!window.__dynamicItems) {
        window.__dynamicItems = new Map();
      }
      window.__dynamicItems.set(itemId, def);
    } 
    // 2. 处理旧版字符串ID
    else {
      itemId = itemOrId;
      def = EQUIPMENT_DB[itemId];
    }

    if (!def || def.type !== 'CONSUMABLE') return;

    // 3. 寻找空位
    let dropX = x, dropY = y;
    if (this.getItemAt(dropX, dropY)) {
      const offsets = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]];
      for (let o of offsets) {
        const nx = x + o[0], ny = y + o[1];
        if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1 && this.grid[ny][nx] === TILE.FLOOR && !this.getItemAt(nx, ny)) {
          dropX = nx;
          dropY = ny;
          break;
        }
      }
    }

    // 4. 创建地图物品
    const iconIndex = def.iconIndex !== undefined ? def.iconIndex : 0;
    // Heuristic: Support larger grids for new items (like Drill at index 20)
    // If index >= 16 (standard 4x4), assume 5x5 grid
    const cols = iconIndex >= 16 ? 5 : 4;
    const rows = iconIndex >= 16 ? 5 : 4;

    this.items.push({
      type: 'ITEM_CONSUMABLE',
      itemId: itemId, // 存储 UID 或 模板ID
      x: dropX,
      y: dropY,
      visualX: dropX * TILE_SIZE,
      visualY: dropY * TILE_SIZE,
      sprite: new Sprite({
        assetKey: 'ICONS_CONSUMABLES',
        loader: this.loader,
        isStatic: true,
        iconIndex: iconIndex,
        cols: cols,
        rows: rows
      })
    });
  }
  
  // BFS 寻路：返回从 (sx,sy) 到 (ex,ey) 的路径数组 [{x,y},...], 若不可达返回 null
  _bfsPath(sx, sy, ex, ey, gridOverride = null) {
    const grid = gridOverride || this.grid;
    const h = this.height, w = this.width;
    const walkable = new Set([TILE.FLOOR, TILE.DOOR, TILE.STAIRS_UP, TILE.STAIRS_DOWN]);
    const key = (x, y) => `${x},${y}`;
    if (sx === ex && sy === ey) return [{ x: sx, y: sy }];
    const q = [];
    const parent = new Map();
    const seen = new Set();
    q.push({ x: sx, y: sy });
    seen.add(key(sx, sy));
    while (q.length > 0) {
      const cur = q.shift();
      const dirs = [ [0,-1],[0,1],[-1,0],[1,0] ];
      for (const d of dirs) {
        const nx = cur.x + d[0], ny = cur.y + d[1];
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const k = key(nx, ny);
        if (seen.has(k)) continue;
        const t = grid[ny][nx];
        if (!walkable.has(t)) continue;
        parent.set(k, cur);
        if (nx === ex && ny === ey) {
          // reconstruct
          const path = [{ x: ex, y: ey }];
          let p = cur;
          while (p) {
            path.push({ x: p.x, y: p.y });
            const pk = key(p.x, p.y);
            p = parent.get(pk);
          }
          return path.reverse();
        }
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
    return null;
  }
  
  // 计算顶点不相交路径（通过找到一条路径后把路径中间格子在临时网格中堵塞），最多寻找 maxCount 条
  _countVertexDisjointPaths(sx, sy, ex, ey, maxCount = 3) {
    const tempGrid = this.grid.map(row => row.slice());
    const found = [];
    for (let i = 0; i < maxCount; i++) {
      const p = this._bfsPath(sx, sy, ex, ey, tempGrid);
      if (!p) break;
      found.push(p);
      // 阻塞中间节点（不包括起点和终点），使下一次寻找不同路径
      for (let j = 1; j < p.length - 1; j++) {
        const pt = p[j];
        tempGrid[pt.y][pt.x] = TILE.WALL;
      }
    }
    return found;
  }
  
  // 尝试通过增加房间连接口或打开墙体的方式保证至少 minPaths 条从 start 到 end 的路径
  ensureMultiplePaths(minPaths = 3, start, end, rooms) {
    if (!start || !end) return;
    const sx = start.cx, sy = start.cy, ex = end.cx, ey = end.cy;
    let paths = this._countVertexDisjointPaths(sx, sy, ex, ey, minPaths);
    if (paths.length >= minPaths) return;
    // 优先尝试给房间额外创建连接口（非 secure 房间）
    let attempts = 0;
    const maxAttempts = 30;
    while (paths.length < minPaths && attempts < maxAttempts) {
      attempts++;
      let created = false;
      for (const r of rooms) {
        if (!r || r.isSecure) continue;
        const cons = this.getRoomConnectorCandidates(r);
        // 找到还被墙阻挡的 candidate 并打开它
        for (const c of cons) {
          if (this.grid[c.y][c.x] === TILE.WALL) {
            this.grid[c.y][c.x] = TILE.FLOOR;
            // 也把外侧格子设为地板以确保连通（forceCreateConnector 已有类似逻辑，但这里是保守处理）
            const ox = c.x + (c.side === 'left' ? -1 : c.side === 'right' ? 1 : 0);
            const oy = c.y + (c.side === 'top' ? -1 : c.side === 'bottom' ? 1 : 0);
            if (ox >= 0 && ox < this.width && oy >= 0 && oy < this.height) {
              if (this.grid[oy][ox] === TILE.WALL) this.grid[oy][ox] = TILE.FLOOR;
            }
            created = true;
            break;
          }
        }
        if (created) break;
      }
      if (!created) break;
      paths = this._countVertexDisjointPaths(sx, sy, ex, ey, minPaths);
    }
    // 如果仍然不足，尝试随机打开一些能连接多条路径的墙（墙体两侧至少有一个地板）
    attempts = 0;
    const maxWallOpens = 50;
    while (paths.length < minPaths && attempts < maxWallOpens) {
      attempts++;
      // 找到一个墙，周围至少有两个地板格（生成分叉）
      const candidates = [];
      for (let y = 1; y < this.height - 1; y++) {
        for (let x = 1; x < this.width - 1; x++) {
          if (this.grid[y][x] !== TILE.WALL) continue;
          let neighFloors = 0;
          const nbrs = [ [0,-1],[0,1],[-1,0],[1,0] ];
          for (const d of nbrs) {
            const nx = x + d[0], ny = y + d[1];
            if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
            if (this.grid[ny][nx] === TILE.FLOOR || this.grid[ny][nx] === TILE.DOOR) neighFloors++;
          }
          if (neighFloors >= 2) candidates.push({ x, y });
        }
      }
      if (candidates.length === 0) break;
      const pick = candidates[this._randomInt(0, candidates.length - 1)];
      this.grid[pick.y][pick.x] = TILE.FLOOR;
      paths = this._countVertexDisjointPaths(sx, sy, ex, ey, minPaths);
    }
    if (paths.length < minPaths) {
      // 静默处理：在某些地图配置下可能无法生成足够的独立路径，这是可接受的
      // 仅在调试模式下输出详细信息
      if (window.DEBUG_MODE) {
        console.log(`[MapSystem] ensureMultiplePaths: 生成了 ${paths.length}/${minPaths} 条独立路径`);
      }
    }
  }
  
  getMonsterAt(x, y) { return this.monsters.find(m => m.x === x && m.y === y); }
  getItemAt(x, y) { return this.items.find(i => i.x === x && i.y === y); }
  getNpcAt(x, y) { return this.npcs?.find(n => n.x === x && n.y === y); }
  getObjectAt(x, y) { return this.objects?.find(o => o.x === x && o.y === y); }
  removeItem(it) { this.items = this.items.filter(i => i !== it); }
  
  /**
   * 检查位置是否可通行
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {boolean} ignoreEntities - 是否忽略实体（怪物、玩家等）
   * @param {Entity} excludeEntity - 排除的实体（用于检查自身位置）
   * @returns {boolean} 是否可通行
   */
  isWalkable(x, y, ignoreEntities = false, excludeEntity = null) {
    // 1. 边界检查
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    
    // 2. 检查地形（墙、门、楼梯）
    // ✅ FIX: 增强MapSystem健壮性 - 检查this.grid[y]是否存在（防止y越界）
    if (!this.grid || !this.grid[y]) {
      return false; // y越界或grid未初始化
    }
    const tile = this.grid[y][x];
    if (tile === TILE.WALL || tile === TILE.DOOR || tile === TILE.STAIRS_DOWN || tile === TILE.STAIRS_UP) {
      return false;
    }
    
    // 3. 检查对象（箱子、祭坛、铁匠铺等阻挡性物体）
    const obj = this.getObjectAt(x, y);
    if (obj) {
      // 陷阱不阻挡
      if (obj.type === OBJ_TRAP.id) {
        // 陷阱不阻挡，继续检查
      } else {
        // 其他对象（箱子、祭坛、铁匠铺等）均阻挡
        // 检查对象是否已被破坏（箱子、木桶等）
        if (obj.broken) {
          // 已破坏的对象不阻挡
        } else {
          // 未破坏的对象阻挡
          return false;
        }
      }
    }
    
    // 4. 检查实体（如果不忽略）
    if (!ignoreEntities) {
      // 检查怪物（排除自身）
      const monster = this.getMonsterAt(x, y);
      if (monster && monster !== excludeEntity) {
        return false;
      }
      
      // 检查NPC（排除自身）
      const npc = this.getNpcAt(x, y);
      if (npc && npc !== excludeEntity) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 移除怪物并处理灵魂水晶掉落
   */
  removeMonster(m) {
    // ✅ FIX: 清除所有活动状态效果定时器（防止"僵尸状态效果"崩溃）
    // ✅ FIX: clearAllIntervals已被移除，activeIntervals已废弃
    // 不再需要清理intervals，DoT效果通过activeDoTs数组管理
    
    // 掉落灵魂水晶
    this.dropSoulCrystals(m);
    
    // 从数组中移除
    this.monsters = this.monsters.filter(x => x !== m);
  }
  
  /**
   * 怪物死亡时掉落灵魂水晶
   */
  dropSoulCrystals(monster) {
    const game = window.game;
    if (!game || !game.metaSaveSystem) return;
    
    // 确定怪物类型
    let dropConfig;
    const isBoss = monster.stats.isBoss || false; // 需要在Monster定义中标记Boss
    
    if (isBoss) {
      dropConfig = SOUL_CRYSTAL_CONFIG.DROP_RATES.BOSS;
    } else if (monster.isElite) {
      dropConfig = SOUL_CRYSTAL_CONFIG.DROP_RATES.ELITE;
    } else {
      dropConfig = SOUL_CRYSTAL_CONFIG.DROP_RATES.NORMAL;
    }
    
    // ✅ FIX: 使用 RNG（如果存在，每日挑战模式需要确定性）
    const rng = (game.isDailyMode && game.rng) ? game.rng : null;
    const randomValue = rng ? rng.next() : Math.random();
    
    // 随机掉落判定
    if (randomValue > dropConfig.chance) return;
    
    // 计算掉落数量
    const amountRandom = rng ? rng.next() : Math.random();
    const amount = Math.floor(
      amountRandom * (dropConfig.max - dropConfig.min + 1) + dropConfig.min
    );
    
    if (amount <= 0) return;
    
    // 添加到元进度存档
    game.metaSaveSystem.addSoulCrystals(amount);
    
    // 移除灵魂水晶飘字显示，保持画面整洁
    
    // 记录到日志
    if (game.ui) {
      game.ui.logMessage(`获得 ${amount} 灵魂水晶！`, 'reward');
    }
    
    // TODO: 播放水晶飞向UI的动画（可选）
  }
  
  removeObject(obj) { this.objects = this.objects.filter(o => o !== obj); }
  
  // Shadowcasting FOV Algorithm (or simple distance-based if dynamic lighting is disabled)
  computeFOV(px, py, radius) {
    // Check if dynamic lighting is enabled
    const game = window.game;
    const useShadowcasting = game && game.config && game.config.enableLighting;
    
    // Clear current visibility
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.visible[y][x] = false;
      }
    }
    
    // Player's tile is always visible
    if (py >= 0 && py < this.height && px >= 0 && px < this.width) {
      this.visible[py][px] = true;
      this.explored[py][px] = true;
    }
    
    if (useShadowcasting) {
      // ===== DYNAMIC LIGHTING ENABLED: Use Shadowcasting =====
      // Cast shadows in 8 octants (walls block light)
      for (let octant = 0; octant < 8; octant++) {
        this._castLight(px, py, 1, 1.0, 0.0, radius, 
          this._mult[0][octant], this._mult[1][octant],
          this._mult[2][octant], this._mult[3][octant]);
      }
    } else {
      // ===== DYNAMIC LIGHTING DISABLED: Use Simple Distance-Based Visibility =====
      // Mark tiles within radius as visible (walls do NOT block)
      for (let ty = 0; ty < this.height; ty++) {
        for (let tx = 0; tx < this.width; tx++) {
          const dx = tx - px;
          const dy = ty - py;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            this.visible[ty][tx] = true;
            this.explored[ty][tx] = true;
          }
        }
      }
    }
    
    // ===== 智能迷雾驱散逻辑 =====
    // 保持原有的 visible 和 explored 数组逻辑不变（这控制战斗视野）
    // 只更新迷雾粒子的驱散逻辑，让玩家更容易驱散迷雾，但保持对怪物的视野限制
    
    const playerWorldX = px * TILE_SIZE + TILE_SIZE / 2;
    const playerWorldY = py * TILE_SIZE + TILE_SIZE / 2;
    const visionRadius = radius; // 使用传入的半径参数
    const sightRadiusPixels = (visionRadius + 3.5) * TILE_SIZE; // 光环半径：视野半径 + 3.5格（广域光环）
    
    // 逻辑A：检查玩家是否在房间内
    let playerRoom = null;
    if (this.rooms && this.rooms.length > 0) {
      for (const room of this.rooms) {
        // 检查玩家坐标是否在房间内（使用瓦片坐标）
        if (px >= room.x && px < room.x + room.w && py >= room.y && py < room.y + room.h) {
          playerRoom = room;
          break;
        }
      }
    }
    
    // 逻辑B：双层半径判断 - 遍历所有迷雾粒子
    this.fogParticles.forEach(particle => {
      if (!particle.isDispersing) {
        // 判断1 (光环)：计算粒子与玩家的世界坐标距离
        const dx = particle.x - playerWorldX;
        const dy = particle.y - playerWorldY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let shouldDisperse = false;
        
        // 如果距离小于光环半径，触发驱散
        if (distance < sightRadiusPixels) {
          shouldDisperse = true;
        }
        
        // 判断2 (房间感知)：如果玩家在房间内，且粒子位于该房间的矩形范围内
        if (!shouldDisperse && playerRoom) {
          // 比较粒子的 tileX, tileY 与房间的 x, y, w, h
          if (particle.tileX >= playerRoom.x && particle.tileX < playerRoom.x + playerRoom.w &&
              particle.tileY >= playerRoom.y && particle.tileY < playerRoom.y + playerRoom.h) {
            shouldDisperse = true;
          }
        }
        
        if (shouldDisperse) {
          particle.triggerDispersal(playerWorldX, playerWorldY);
        }
      }
    });
  }
  
  /**
   * 登场爆发：在关卡开始时瞬间驱散大范围迷雾
   * @param {number} startX - 起始位置的世界坐标X（像素）
   * @param {number} startY - 起始位置的世界坐标Y（像素）
   */
  triggerInitialClear(startX, startY) {
    const clearRadius = 8 * TILE_SIZE; // 8格超大半径
    
    this.fogParticles.forEach(particle => {
      if (!particle.isDispersing) {
        const dx = particle.x - startX;
        const dy = particle.y - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < clearRadius) {
          particle.triggerDispersal(startX, startY);
        }
      }
    });
  }
  
  // Recursive shadowcasting helper
  _castLight(cx, cy, row, start, end, radius, xx, xy, yx, yy) {
    if (start < end) return;
    
    let radiusSquared = radius * radius;
    
    for (let j = row; j <= radius; j++) {
      let dx = -j - 1;
      let dy = -j;
      let blocked = false;
      
      while (dx <= 0) {
        dx += 1;
        
        // Compute map coordinates
        let mx = cx + dx * xx + dy * xy;
        let my = cy + dx * yx + dy * yy;
        
        // Compute slopes
        let lSlope = (dx - 0.5) / (dy + 0.5);
        let rSlope = (dx + 0.5) / (dy - 0.5);
        
        if (start < rSlope) {
          continue;
        } else if (end > lSlope) {
          break;
        }
        
        // Check if in bounds
        if (mx < 0 || mx >= this.width || my < 0 || my >= this.height) {
          continue;
        }
        
        // Check if in radius
        let distSq = dx * dx + dy * dy;
        if (distSq <= radiusSquared) {
          // Mark as visible and explored
          this.visible[my][mx] = true;
          this.explored[my][mx] = true;
        }
        
        if (blocked) {
          // Previous cell was blocking
          if (this._isBlocking(mx, my)) {
            continue;
          } else {
            blocked = false;
            start = rSlope;
          }
        } else {
          if (this._isBlocking(mx, my) && j < radius) {
            // Hit a wall
            blocked = true;
            this._castLight(cx, cy, j + 1, start, lSlope, radius, xx, xy, yx, yy);
          }
        }
      }
      
      if (blocked) break;
    }
  }
  
  // Check if a tile blocks light
  _isBlocking(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    
    const tile = this.grid[y][x];
    
    // Walls and doors block light
    if (tile === TILE.WALL) return true;
    
    // Check for blocking objects (crates, barrels)
    const obj = this.getObjectAt(x, y);
    if (obj && (obj.type === 'OBJ_CRATE' || obj.type === 'OBJ_BARREL') && !obj.destroyed) {
      return true;
    }
    
    return false;
  }
  
  // Check if a tile is currently visible
  isTileVisible(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.visible[y] && this.visible[y][x];
  }
  
  // Check if a tile has been explored
  isTileExplored(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.explored[y] && this.explored[y][x];
  }
  
  // Multipliers for transforming coordinates to other octants
  _mult = [
    [1,  0,  0, -1, -1,  0,  0,  1],
    [0,  1, -1,  0,  0, -1,  1,  0],
    [0,  1,  1,  0,  0, -1, -1,  0],
    [1,  0,  0,  1, -1,  0,  0, -1]
  ];
  
  // Legacy method for compatibility (now calls computeFOV)
  revealAround(x, y, radius) {
    this.computeFOV(x, y, radius);
  }
  
  draw(ctx, player, camera) {
    const startX = Math.floor(camera.x / TILE_SIZE);
    // Calculate visible tiles based on actual camera dimensions
    const tilesVisibleX = Math.ceil(camera.width / TILE_SIZE) + 2; // +2 for safety margin
    const tilesVisibleY = Math.ceil(camera.height / TILE_SIZE) + 2; // +2 for safety margin
    const endX = startX + tilesVisibleX;
    const startY = Math.floor(camera.y / TILE_SIZE);
    const endY = startY + tilesVisibleY;
    
    // 缓存图片引用，减少重复查找
    const floorImg = this.loader.getImage('TILE_FLOOR');
    const wallImg = this.loader.getImage('TILE_WALL');
    const doorImg = this.loader.getImage('OBJ_DOOR');
    const stairUp = this.loader.getImage('TILE_STAIRS_UP');
    const stairDown = this.loader.getImage('TILE_STAIRS_DOWN');
    
    // 计算可见范围边界（像素坐标）
    const cameraLeft = camera.x;
    const cameraRight = camera.x + camera.width;
    const cameraTop = camera.y;
    const cameraBottom = camera.y + camera.height;
    
    // ===== LAYER 0: 地板背景 (BACKGROUND) =====
    // 绘制所有地板和楼梯，确保背景完整显示
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (y < 0 || y >= this.height || x < 0 || x >= this.width) continue;
        
        const t = this.grid[y][x];
        
        // 性能优化：只绘制非墙壁瓦片的地板
        if (t !== TILE.WALL && floorImg) {
          this._drawTile32(ctx, floorImg, x, y);
        }
        
        // 绘制楼梯（覆盖地板）
        if (t === TILE.STAIRS_UP && stairUp) {
          this._draw64(ctx, stairUp, x, y);
        }
        if (t === TILE.STAIRS_DOWN && stairDown) {
          this._draw64(ctx, stairDown, x, y);
        }
      }
    }
    
    // ===== LAYER 1: 物体和实体（按Y坐标排序） =====
    // 构建渲染列表，包含所有需要按Y坐标排序的元素
    // 关键：对于有sprite的实体，使用其实际绘制底部Y坐标进行排序
    // drawY = visualY - (destHeight - TILE_SIZE)
    // 底部Y = drawY + destHeight = visualY + TILE_SIZE
    const list = [];
    
    // 性能优化：使用精确的相机边界进行视口裁剪
    const margin = 64; // 边界缓冲区，允许精灵部分超出屏幕
    
    // 添加陷阱（最底层）
    this.objects.forEach(o => {
      if (o.type === 'OBJ_TRAP' && 
          o.visualX > cameraLeft - margin && o.visualX < cameraRight + margin &&
          o.visualY > cameraTop - margin && o.visualY < cameraBottom + margin) {
        list.push({ y: o.visualY, obj: o, type: 'object', z: 0 });
      }
    });
    
    // 添加可破坏物体（箱子、桶）
    this.objects.forEach(o => {
      if ((o.type === 'OBJ_CRATE' || o.type === 'OBJ_BARREL') && 
          o.visualX > cameraLeft - margin && o.visualX < cameraRight + margin &&
          o.visualY > cameraTop - margin && o.visualY < cameraBottom + margin) {
        // 使用visualY + TILE_SIZE作为底部Y坐标，确保与实体正确排序
        list.push({ y: o.visualY + TILE_SIZE, obj: o, type: 'destructible', z: 1 });
      }
    });
    
    // 添加祭坛（2瓦片宽）
    this.objects.forEach(o => {
      if (o.type === 'OBJ_ALTAR_CURSED' && 
          o.visualX > cameraLeft - margin && o.visualX < cameraRight + margin &&
          o.visualY > cameraTop - margin && o.visualY < cameraBottom + margin) {
        // 祭坛底部Y坐标
        list.push({ y: o.visualY + TILE_SIZE, obj: o, type: 'altar', z: 1 });
      }
    });
    
    // 添加玩家
    // 玩家精灵底部 = visualY + TILE_SIZE
    const playerSpriteBottomY = player.visualY + TILE_SIZE;
    list.push({ y: playerSpriteBottomY, obj: player, type: 'ent', z: 1 });
    
    // 添加怪物
    // 怪物精灵底部 = visualY + TILE_SIZE
    this.monsters.forEach(m => {
      if (m.visualX > cameraLeft - margin && m.visualX < cameraRight + margin &&
          m.visualY > cameraTop - margin && m.visualY < cameraBottom + margin) {
        const monsterSpriteBottomY = m.visualY + TILE_SIZE;
        list.push({ y: monsterSpriteBottomY, obj: m, type: 'ent', z: 1 });
      }
    });
    
    // 添加NPC
    // NPC精灵底部 = visualY + TILE_SIZE
    if (this.npcs) {
      this.npcs.forEach(n => {
        if (n.visualX > cameraLeft - margin && n.visualX < cameraRight + margin &&
            n.visualY > cameraTop - margin && n.visualY < cameraBottom + margin) {
          const npcSpriteBottomY = n.visualY + TILE_SIZE;
          list.push({ y: npcSpriteBottomY, obj: n, type: 'ent', z: 1 });
        }
      });
    }
    
    // 添加物品
    this.items.forEach(i => {
      if (i.visualX > cameraLeft - margin && i.visualX < cameraRight + margin &&
          i.visualY > cameraTop - margin && i.visualY < cameraBottom + margin) {
        list.push({ y: i.visualY, obj: i, type: 'item', z: 0.5 });
      }
    });
    
    // 添加非陷阱物体（圣殿等）
    this.objects.forEach(o => {
      if (o.type !== 'OBJ_TRAP' && 
          o.visualX > cameraLeft - margin && o.visualX < cameraRight + margin &&
          o.visualY > cameraTop - margin && o.visualY < cameraBottom + margin) {
        list.push({ y: o.visualY, obj: o, type: 'object', z: 1 });
      }
    });
    
    // ===== LAYER 2: 墙壁和门（按Y坐标排序） =====
    // 关键修复：墙壁使用 z=1（与实体相同）
    // 这样排序完全基于Y坐标，而不是z值
    // 
    // 墙壁占据的像素范围：y*TILE_SIZE 到 (y+1)*TILE_SIZE
    // 实体精灵底部：entity.visualY + TILE_SIZE = (entity.y + 1)*TILE_SIZE
    // 
    // 排序策略：使用 (y + 0.5)*TILE_SIZE 作为墙壁排序Y坐标
    // 这样：
    // - 实体底部 (y+1)*TILE_SIZE > 墙壁排序Y → 实体先绘制，墙壁后绘制（墙壁遮挡实体脚部）✓
    // - 实体底部 (y)*TILE_SIZE < 墙壁排序Y → 墙壁先绘制，实体后绘制（实体头部不被遮挡）✓
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (y < 0 || y >= this.height || x < 0 || x >= this.width) continue;
        
        if (this.grid[y][x] === TILE.WALL) {
          // 使用墙壁中点作为排序Y坐标，z值改为1（与实体相同）
          const wallMidY = (y + 0.5) * TILE_SIZE;
          list.push({ y: wallMidY, type: 'wall', x: x * TILE_SIZE, gx: x, gy: y, z: 1 });
        }
        if (this.grid[y][x] === TILE.DOOR) {
          const doorMidY = (y + 0.5) * TILE_SIZE;
          // 添加 gy: y 以记录真实网格位置
          list.push({ y: doorMidY, type: 'door', x: x * TILE_SIZE, gy: y, z: 1 });
        }
      }
    }
    
    // 按z值和y坐标排序（z值优先，然后按y坐标）
    // 由于墙壁使用中点Y坐标，实体底部Y坐标会自然地在墙壁之前或之后
    list.sort((a, b) => {
      const zDiff = (a.z ?? 1) - (b.z ?? 1);
      if (zDiff !== 0) return zDiff;
      return (a.y - b.y);
    });
    
    // Check if fog of war is enabled
    const game = window.game;
    const fogEnabled = game && game.config && game.config.enableFog;
    
    // ===== 绘制排序后的列表 =====
    list.forEach(e => {
      if (e.type === 'ent') {
        // 绘制实体（只在可见区域绘制，除非是玩家）
        const isPlayer = e.obj === player;
        const isVisible = this.visible[e.obj.y] && this.visible[e.obj.y][e.obj.x];
        
        // Stealth mechanic: Monsters with STEALTH trait are only visible in direct line of sight
        let shouldDraw = isPlayer || !fogEnabled || isVisible;
        
        // If this is a monster with STEALTH trait, ONLY render if tile is visible (ignore explored)
        if (!isPlayer && e.obj.hasTrait && e.obj.hasTrait('STEALTH')) {
          shouldDraw = isVisible;
        }
        
        if (shouldDraw) {
          // ✅ 防御性检查：确保dodgeOffset存在（Entity基类已初始化，但双重检查更安全）
          // 所有Entity子类（Player, Monster, Merchant, Gambler）都继承自Entity，都有dodgeOffset
          const dodgeOffsetX = (e.obj.dodgeOffset && typeof e.obj.dodgeOffset.x === 'number') ? e.obj.dodgeOffset.x : 0;
          const drawX = e.obj.visualX + dodgeOffsetX;
          const drawY = e.obj.visualY;
          
          // Check if this is a Fallen Adventurer (Ghost) - apply grayscale filter
          if (e.obj.type === 'FALLEN_ADVENTURER' || e.obj.isFallenAdventurer) {
            ctx.save();
            // 应用灰色滤镜和透明度
            ctx.filter = 'grayscale(100%) opacity(0.8)';
            e.obj.sprite.draw(ctx, drawX, drawY);
            ctx.restore(); // 重置 filter
          } else if (e.obj.isElite && e.obj.affixes && e.obj.affixes.length > 0) {
            // Check if this is an elite monster and apply visual effects
            this._drawEliteMonster(ctx, e.obj, drawX);
          } else {
            e.obj.sprite.draw(ctx, drawX, drawY);
          }
          
          // 绘制状态图标（在实体上方）
          if (e.obj.drawStatusIcons) {
            e.obj.drawStatusIcons(ctx, camera.x, camera.y);
          }
          
          // 绘制连击UI（仅玩家）
          if (e.obj === player && e.obj.drawComboUI) {
            e.obj.drawComboUI(ctx, camera.x, camera.y);
          }
        }
      }
      else if (e.type === 'item') {
        // 绘制物品（只在已探索区域绘制）
        const isExplored = this.explored[e.obj.y] && this.explored[e.obj.y][e.obj.x];
        const shouldDraw = !fogEnabled || isExplored;
        if (shouldDraw) {
          e.obj.sprite.draw(ctx, e.obj.visualX, e.obj.visualY);
        }
      }
      else if (e.type === 'destructible') {
        // 绘制可破坏物体（箱子、桶）- 只在已探索区域
        const isExplored = this.explored[e.obj.y] && this.explored[e.obj.y][e.obj.x];
        const shouldDraw = !fogEnabled || isExplored;
        if (shouldDraw) {
          const assetKey = e.obj.destroyed ? e.obj.config.brokenAsset : e.obj.type;
          const img = this.loader.getImage(assetKey);
          if (img) {
            // 绘制为单个瓦片大小
            ctx.drawImage(img, e.obj.visualX, e.obj.visualY, TILE_SIZE, TILE_SIZE);
          }
        }
      }
      else if (e.type === 'altar') {
        // 绘制祭坛（2瓦片宽）- 只在已探索区域
        const isExplored = this.explored[e.obj.y] && this.explored[e.obj.y][e.obj.x];
        const shouldDraw = !fogEnabled || isExplored;
        if (shouldDraw) {
          const img = this.loader.getImage('OBJ_ALTAR_CURSED');
          if (img) {
            // 绘制为2瓦片宽，1瓦片高
            const width = TILE_SIZE * 2;
            const height = TILE_SIZE;
            ctx.drawImage(img, e.obj.visualX, e.obj.visualY, width, height);
          }
        }
      }
      else if (e.type === 'object') {
        // 绘制物体（陷阱、圣殿等）- 只在已探索区域
        const isExplored = this.explored[e.obj.y] && this.explored[e.obj.y][e.obj.x];
        const shouldDraw = !fogEnabled || isExplored;
        if (shouldDraw) {
          const envImg = this.loader.getImage('TILES_ENV');
          if (envImg) {
            let iconIndex = 0;
            if (e.obj.type === 'OBJ_TRAP') {
              // 陷阱状态：0=正常，1=触发（尖刺），2=血腥尖刺
              if (e.obj.triggerCount === 0) iconIndex = 0;
              else if (e.obj.triggerCount === 1) iconIndex = 1;
              else iconIndex = 2;
            } else if (e.obj.type === 'OBJ_SHRINE_HEAL') {
              iconIndex = 4;
            } else if (e.obj.type === 'OBJ_SHRINE_POWER') {
              iconIndex = 5;
            }
            const cols = 4, rows = 4;
            const cellW = envImg.naturalWidth / cols;
            const cellH = envImg.naturalHeight / rows;
            const col = iconIndex % cols;
            const row = Math.floor(iconIndex / cols);
            const sx = col * cellW;
            const sy = row * cellH;
            ctx.drawImage(envImg, sx, sy, cellW, cellH, e.obj.visualX, e.obj.visualY, TILE_SIZE, TILE_SIZE);
          }
        }
      }
      else if (e.type === 'wall') {
        // 绘制墙壁
        if (wallImg) {
          this._drawWall(ctx, wallImg, e.gx, e.gy);
        } else {
          ctx.fillStyle = '#444';
          ctx.fillRect(e.x, e.y, TILE_SIZE, TILE_SIZE);
        }
      }
      else if (e.type === 'door') {
        // 绘制门
        if (doorImg) {
          // 修复：使用保存的网格坐标 gy，并向上微调 8 像素(-0.25格)以修正视觉位置
          const yOffset = -8;
          const drawX = e.x;
          const drawY = e.gy * TILE_SIZE + yOffset;
          
          // 绘制为标准 TILE_SIZE 大小 (32x32)
          ctx.drawImage(doorImg, drawX, drawY, TILE_SIZE, TILE_SIZE);
        }
      }
    });
    
    // ===== LAYER 3: 黑暗叠加层（光照系统） =====
    // Apply darkness overlay based on tile visibility
    // 三种状态：Visible（可见）、Explored（已探索）、Unexplored（未探索）
    // Only apply if dynamic lighting is enabled
    const lightingEnabled = game && game.config && game.config.enableLighting;
    
    if (lightingEnabled) {
      ctx.save();
      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          if (y < 0 || y >= this.height || x < 0 || x >= this.width) continue;
          
          const isVisible = this.visible[y] && this.visible[y][x];
          const isExplored = this.explored[y] && this.explored[y][x];
          
          let alpha = 1.0; // Default: Unexplored (pitch black)
          
          if (isVisible) {
            // Visible: No darkness (fully bright)
            alpha = 0.0;
          } else if (isExplored) {
            // Explored: Dim (60% darkness)
            alpha = 0.6;
          }
          
          if (alpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }
      ctx.restore();
    }
    
    // ===== LAYER 4: 彩色光照渲染层 =====
    // Render colored lighting effects (player and elemental states)
    if (lightingEnabled && player) {
      ctx.save();
      
      // 收集光源
      this.lightSources = [];
      
      // 玩家默认微弱暖光
      const playerWorldX = player.visualX + TILE_SIZE / 2;
      const playerWorldY = player.visualY + TILE_SIZE / 2;
      this.lightSources.push({
        x: playerWorldX,
        y: playerWorldY,
        radius: 2.5 * TILE_SIZE,
        color: 'rgba(255, 200, 150, 0.3)', // 微弱暖光
        intensity: 0.3
      });
      
      // 检查玩家技能预备状态
      if (player.states) {
        // scorchPrimed (火) - 橙红色强光
        if (player.states.scorchPrimed) {
          this.lightSources.push({
            x: playerWorldX,
            y: playerWorldY,
            radius: 4 * TILE_SIZE,
            color: 'rgba(255, 100, 50, 0.6)', // 橙红色强光
            intensity: 0.6
          });
        }
        
        // freezePrimed (冰) - 冰蓝色强光
        if (player.states.freezePrimed) {
          this.lightSources.push({
            x: playerWorldX,
            y: playerWorldY,
            radius: 4 * TILE_SIZE,
            color: 'rgba(100, 200, 255, 0.6)', // 冰蓝色强光
            intensity: 0.6
          });
        }
      }
      
      // 增强怪物光源逻辑
      this.monsters.forEach(monster => {
        if (!monster || !monster.visualX || !monster.visualY) return;
        
        const monsterWorldX = monster.visualX + TILE_SIZE / 2;
        const monsterWorldY = monster.visualY + TILE_SIZE / 2;
        
        // 1. 精英怪物：微弱红色光源
        if (monster.isElite) {
          this.lightSources.push({
            x: monsterWorldX,
            y: monsterWorldY,
            radius: 2.5 * TILE_SIZE,
            color: 'rgba(255, 50, 50, 0.3)', // 微弱红色光源
            intensity: 0.3
          });
        }
        
        // 2. 检查是否有燃烧状态（BURN）
        let hasBurn = false;
        if (monster.statuses && monster.statuses.length > 0) {
          hasBurn = monster.statuses.some(s => s.type === 'BURN');
        }
        if (!hasBurn && monster.activeDoTs && monster.activeDoTs.length > 0) {
          hasBurn = monster.activeDoTs.some(dot => dot.type === 'BURN');
        }
        
        if (hasBurn) {
          this.lightSources.push({
            x: monsterWorldX,
            y: monsterWorldY,
            radius: 2 * TILE_SIZE,
            color: 'rgba(255, 150, 50, 0.4)', // 微弱橙色光源
            intensity: 0.4
          });
        }
        
        // 3. 检查是否有感电状态（SHOCK）或感电DoT（ELECTRO_CHARGED）
        let hasElectro = false;
        if (monster.statuses && monster.statuses.length > 0) {
          hasElectro = monster.statuses.some(s => s.type === 'SHOCK');
        }
        if (!hasElectro && monster.activeDoTs && monster.activeDoTs.length > 0) {
          hasElectro = monster.activeDoTs.some(dot => dot.type === 'ELECTRO_CHARGED');
        }
        
        if (hasElectro) {
          this.lightSources.push({
            x: monsterWorldX,
            y: monsterWorldY,
            radius: 2 * TILE_SIZE,
            color: 'rgba(200, 100, 255, 0.4)', // 微弱紫色光源
            intensity: 0.4
          });
        }
      });
      
      // 使用 lighter 混合模式渲染光源
      ctx.globalCompositeOperation = 'lighter';
      
      // 遍历光源，绘制光晕
      this.lightSources.forEach(light => {
        // 检查光源是否在可见范围内
        if (light.x < cameraLeft - light.radius || light.x > cameraRight + light.radius ||
            light.y < cameraTop - light.radius || light.y > cameraBottom + light.radius) {
          return; // 跳过屏幕外的光源
        }
        
        // 创建径向渐变
        const gradient = ctx.createRadialGradient(
          light.x, light.y, 0,                    // 内圆（中心）
          light.x, light.y, light.radius          // 外圆（边缘）
        );
        
        // 解析颜色和强度
        const colorMatch = light.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!colorMatch) return;
        
        const r = parseInt(colorMatch[1]);
        const g = parseInt(colorMatch[2]);
        const b = parseInt(colorMatch[3]);
        const baseAlpha = colorMatch[4] ? parseFloat(colorMatch[4]) : 1.0;
        
        // 中心最亮，边缘渐隐
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${baseAlpha})`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.6})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        // 绘制光晕
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.restore();
    }
    
    // ===== LAYER 5: 光照闪烁效果（可选） =====
    // Optional: Add subtle light flicker effect
    if (game && game.config && game.config.enableLightFlicker) {
      const flickerAmount = Math.sin(Date.now() * 0.002) * 0.05; // ±0.05 alpha variation
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.abs(flickerAmount)})`;
      
      // Only flicker visible tiles
      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          if (y < 0 || y >= this.height || x < 0 || x >= this.width) continue;
          
          const isVisible = this.visible[y] && this.visible[y][x];
          if (isVisible) {
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }
      ctx.restore();
    }
    
    // ===== LAYER 6: 战争迷雾粒子（最顶层） =====
    // 绘制战争迷雾粒子（在所有其他元素之后）
    if (game && game.config && game.config.enableFog) {
      const fogImage = this.loader.getImage('TEX_FOG');
      if (fogImage) {
        // 性能优化：只绘制可见范围内的雾粒子
        const fogMargin = 200; // 雾粒子的绘制缓冲区（考虑粒子的大尺寸）
        this.fogParticles.forEach(particle => {
          if (particle.x > cameraLeft - fogMargin && particle.x < cameraRight + fogMargin &&
              particle.y > cameraTop - fogMargin && particle.y < cameraBottom + fogMargin) {
            particle.draw(ctx, fogImage, TILE_SIZE);
          }
        });
      } else {
        // 调试：如果战争迷雾图像未加载
        if (this.fogParticles.length > 0 && !window.fogDebugLogged) {
          console.warn('TEX_FOG image not loaded yet. Particles:', this.fogParticles.length);
          window.fogDebugLogged = true;
        }
      }
    }
  }
  
  _drawTile32(ctx, img, gx, gy) {
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    const x = gx * TILE_SIZE;
    const y = gy * TILE_SIZE;
    
    // 直接绘制，不旋转
    ctx.drawImage(img, 0, 0, natW, natH, x, y, TILE_SIZE, TILE_SIZE);
  }
  
  _drawWall(ctx, img, gx, gy) {
    const x = gx * TILE_SIZE;
    const y = gy * TILE_SIZE;

    // 墙壁已在加载阶段被预旋转 90 度，直接绘制
    ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);
  }
  
  _draw64(ctx, img, gx, gy) {
    // 绘制正方形素材（2000×2000）的完整内容
    // 显示完整的正方形素材，不进行裁剪
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    const destX = gx * TILE_SIZE;
    const destY = gy * TILE_SIZE; // 素材显示在该格子位置
    
    // 如果是正方形素材，显示完整内容
    // 计算缩放比例以保持宽高比
    const scale = TILE_SIZE / Math.min(natW, natH);
    const displayW = natW * scale;
    const displayH = natH * scale;
    
    // 居中显示（在单格高度范围内垂直居中）
    const offsetX = (TILE_SIZE - displayW) / 2;
    const offsetY = (TILE_SIZE - displayH) / 2; // 在单格范围内居中
    
    ctx.drawImage(img, 0, 0, natW, natH, destX + offsetX, destY + offsetY, displayW, displayH);
  }
  
  // Draw elite monster with SUBTLE visual effects (hardcore mode)
  _drawEliteMonster(ctx, monster, drawX = null) {
    const ELITE_AFFIXES = window.ELITE_AFFIXES || {};
    if (!ELITE_AFFIXES.VAMPIRIC) {
      // Import ELITE_AFFIXES dynamically if not available
      import('../constants.js').then(module => {
        window.ELITE_AFFIXES = module.ELITE_AFFIXES;
      });
    }
    
    ctx.save();
    
    // ✅ 防御性检查：应用闪避偏移（如果提供了drawX则使用，否则安全计算）
    const dodgeOffsetX = (monster.dodgeOffset && typeof monster.dodgeOffset.x === 'number') ? monster.dodgeOffset.x : 0;
    const x = drawX !== null ? drawX : (monster.visualX + dodgeOffsetX);
    const y = monster.visualY;
    
    // Elite monsters are 1.2x larger (primary indicator)
    const eliteScale = 1.2;
    const centerX = x + TILE_SIZE / 2;
    const centerY = y + TILE_SIZE / 2;
    
    // Apply scale transform
    ctx.translate(centerX, centerY);
    ctx.scale(eliteScale, eliteScale);
    ctx.translate(-centerX, -centerY);
    
    // ===== SUBTLE VISUAL EFFECTS (player must observe carefully) =====
    monster.affixes.forEach(affixKey => {
      const config = ELITE_AFFIXES[affixKey];
      if (!config) return;
      
      switch (config.visualEffect) {
        case 'flash_green':
          // VAMPIRIC - Very subtle red tint ONLY on attack frame
          if (monster.eliteVisualEffects && monster.eliteVisualEffects.vampiricTintTimer > 0) {
            ctx.fillStyle = 'rgba(255, 50, 50, 0.2)'; // Very subtle red tint
            ctx.fillRect(x - 2, y - 2, TILE_SIZE + 4, TILE_SIZE + 4);
          }
          break;
          
        case 'spike_shield':
          // THORNS - Permanent very faint metallic/grey tint
          ctx.fillStyle = 'rgba(128, 128, 128, 0.15)'; // Very faint grey overlay
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          break;
          
        case 'red_pulse':
          // VOLATILE - Vibrate/shake during pre-explosion
          if (monster.eliteVisualEffects && monster.eliteVisualEffects.volatileExploding) {
            // Apply random offset for shake effect
            const shakeX = (Math.random() - 0.5) * 3;
            const shakeY = (Math.random() - 0.5) * 3;
            ctx.translate(shakeX, shakeY);
            
            // Optional: Very faint smoke particles (simple implementation)
            if (Math.random() < 0.1) {
              ctx.fillStyle = 'rgba(80, 80, 80, 0.3)';
              const particleX = centerX + (Math.random() - 0.5) * 20;
              const particleY = centerY + (Math.random() - 0.5) * 20;
              ctx.fillRect(particleX, particleY, 2, 2);
            }
          }
          break;
          
        case 'healing_plus':
          // REGENERATOR - Subtle pulsing opacity
          if (monster.hasAffix && monster.hasAffix('REGENERATOR')) {
            const pulsePhase = monster.eliteVisualEffects?.regenPulsePhase || 0;
            const opacity = 0.9 + Math.sin(pulsePhase) * 0.1; // Pulse between 0.8 and 1.0
            ctx.globalAlpha = opacity;
          }
          break;
          
        case 'blue_circle':
          // FROST_AURA - Spawn 1-2 tiny blue particles drifting downward
          if (Math.random() < 0.05) { // Spawn particles occasionally
            ctx.fillStyle = 'rgba(100, 180, 255, 0.6)';
            const particleX = centerX + (Math.random() - 0.5) * 20;
            const particleY = centerY - 10 + (Math.random() * 15);
            ctx.fillRect(particleX, particleY, 1, 1);
          }
          break;
          
        case 'fade_blink':
          // TELEPORTER - Subtle fade effect before teleport
          const hitCount = monster.eliteVisualEffects?.teleportHitCount || 0;
          const threshold = ELITE_AFFIXES.TELEPORTER?.hitThreshold || 3;
          if (hitCount > 0) {
            ctx.globalAlpha = 1.0 - (hitCount / threshold) * 0.25; // Subtle fade
          }
          break;
      }
    });
    
    // Draw the monster sprite
    monster.sprite.draw(ctx, x, y);
    
    ctx.restore();
    
    // NO NAME LABEL - player should not know it's elite from text
    // NO HEALTH BAR - player should watch the combat numbers instead
  }
}

