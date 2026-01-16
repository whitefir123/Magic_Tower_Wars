// Asset Configuration - 资源配置

// Asset registry - 分为关键资源和游戏内资源
// 关键资源：主菜单 UI、加载界面、角色选择界面所需资源
export const CRITICAL_ASSETS = {
  // 加载界面资源
  LOAD_SKELETON: { url: "https://i.postimg.cc/MGft6mWh/xiaokuloujiazai1.png" },
  LOAD_BUTTERFLY: { url: "https://i.postimg.cc/kXKPYW3B/hudie1.png" },
  
  // 主菜单 UI
  UI_BG_MENU: { url: "https://i.postimg.cc/Wb4YCpkb/maincaidan.png" },
  UI_MASCOT: { url: "https://i.postimg.cc/cH633z0B/xiaokulou1.png" },
  
  // 角色选择界面
  BG_CHAR_SELECT: { url: "https://i.postimg.cc/9MMMcygx/chooseherobackground1.png" },
  UI_PORTRAITS: { url: "https://i.postimg.cc/gkXswY1V/jueselihui1.png" },
  UI_ICONS_CLASS: { url: "https://i.postimg.cc/XqGvNS3k/yingxiongtubiao1.png" },
  ICONS_SKILLS: { url: "https://i.postimg.cc/pLKsSmNP/yingxiongjinengtubiao1.png" },
  UI_DIAL: { url: "https://i.postimg.cc/YqqY1jRQ/nanduxuanzelunpan1.png" },
  UI_FRAME_CHAR: { url: "https://i.postimg.cc/fbKtpKq9/herokuang2.png" },
  UI_PANEL_INFO: { url: "https://i.postimg.cc/sgyGfqh0/background1.png" },
  UI_BTN_READY: { url: "https://i.postimg.cc/P551FVmq/anniu2.png" },
  
  // 通用 UI 资源
  UI_BG_BESTIARY: { url: "https://i.postimg.cc/ncJBncyb/bookbackground1.png" },
  UI_BTN_BESTIARY: { url: "https://i.postimg.cc/zXZS3kRx/anniu4.png" },
  UI_ICONS_STATS: { url: "https://i.postimg.cc/pLd9d9kZ/shuxingtubiao1.png" },
  
  // 状态效果图标（占位符）
  ICON_STATUS_BURN: { url: "", color: '#ff6b00' },
  ICON_STATUS_WET: { url: "", color: '#4da6ff' },
  ICON_STATUS_FROZEN: { url: "", color: '#00bfff' },
  ICON_STATUS_SHOCK: { url: "", color: '#ffff00' },
  ICON_STATUS_POISON: { url: "", color: '#00ff00' },
  
  // 灵魂结晶图标
  ICON_SOUL_CRYSTAL: { url: "https://i.postimg.cc/CKS2nRQG/linghunjiejing1.png" }
};

// 游戏内资源：进入游戏后才需要加载的资源
export const GAMEPLAY_ASSETS = {
  // 玩家和怪物
  PLAYER: { url: "https://i.postimg.cc/9fw34ZLg/zhanshi1.png" },
  PLAYER_WARRIOR: { url: "https://i.postimg.cc/9fw34ZLg/zhanshi1.png" },
  PLAYER_MAGE: { url: "https://i.postimg.cc/9MKs2226/fashi1.png" },
  PLAYER_ROGUE: { url: "https://i.postimg.cc/wMFfvdY6/daozei1.png" },
  MONSTER_SLIME: { url: "https://i.postimg.cc/2jnmns7W/shilaimu1.png" },
  MONSTER_BAT: { url: "https://i.postimg.cc/6QwP5MMp/bat1.png" },
  MONSTER_SKELETON: { url: "https://i.postimg.cc/J7SCZMPH/kuloubing.png" },
  MONSTER_BOSS: { url: "https://i.postimg.cc/mr6sJ8D2/boss1.png" },
  MONSTER_VOID: { url: "https://i.postimg.cc/PJ36KLMv/jintizhe.png" },
  MONSTER_CLOCKWORK: { url: "https://i.postimg.cc/rFQ1RqNj/fatiaoqishi-(1).png" },
  MONSTER_REAPER: { url: "https://i.postimg.cc/PrScyK5F/redxiaogui.png" },
  MONSTER_SWAMP: { url: "https://i.postimg.cc/4dCPQtNz/shenqianzhe.png" },
  MONSTER_GOLEM: { url: "https://i.postimg.cc/3NNkyf5f/rongyanjuren.png" },
  MONSTER_GHOST: { url: "https://i.postimg.cc/Bbp4n3zZ/youling1.png" },
  
  // 地图图块
  TILE_FLOOR: { url: "https://i.postimg.cc/Gtz39zNg/floor1.png" },
  TILE_WALL: { url: "https://i.postimg.cc/pTvpTsk4/wall2.png", fallback: "https://i.postimg.cc/cL8yj0PH/environment-wall-brick-3158.png" },
  TILE_STAIRS_UP: { url: "https://i.postimg.cc/yd24dVMr/upstairs1.png" },
  TILE_STAIRS_DOWN: { url: "https://i.postimg.cc/NfCHNZwj/downstairs1.png" },
  TEX_FOG: { url: "https://i.postimg.cc/sfBR1JdX/miwu1.png" },
  
  // 交互对象
  OBJ_DOOR: { url: "https://i.postimg.cc/vBD3CKz7/door1.png" },
  OBJ_CHEST: { url: "https://i.postimg.cc/vT2Zz1NF/treasure2.png" },
  OBJ_CRATE: { url: "https://i.postimg.cc/KzZ6vs9c/box1.png" },
  OBJ_CRATE_BROKEN: { url: "https://i.postimg.cc/Vk0rDKWk/boxbreak1.png" },
  OBJ_BARREL: { url: "https://i.postimg.cc/9QvBXRQ1/tong1.png" },
  OBJ_BARREL_BROKEN: { url: "https://i.postimg.cc/Twj04dGR/tongbreak1.png" },
  OBJ_ALTAR_CURSED: { url: "https://i.postimg.cc/DfPhh70s/zuzhoujitan1.png" },
  OBJ_FORGE: { url: "https://i.postimg.cc/6Q9yfM8P/duanzaotai1.png" },
  
  // NPC
  NPC_MERCHANT: { url: "https://i.postimg.cc/yNPJSxsv/dijingshangren1.png" },
  NPC_GAMBLER: { url: "https://i.postimg.cc/g0ZLJx60/dutu1.png" },
  
  // 物品和图标
  ITEM_KEY_BRONZE: { url: "https://i.postimg.cc/3RL9y79T/key1.png" },
  ITEM_LANTERN: { url: "https://i.postimg.cc/XJBV9vM1/light1.png" },
  ICONS_EQUIP: { url: "https://i.postimg.cc/9M03yy1Z/zhuangbei1.png" },
  ICONS_CONSUMABLES: { url: "https://i.postimg.cc/x8bCRDXW/wupin1.png" },
  TILES_ENV: { url: "https://i.postimg.cc/90pW1mmm/wupin2.png" },
  
  // 宝石系统资源
  ICONS_GEMS: { url: "https://i.postimg.cc/B6V9Cf24/baoshi1.png" }, // 宝石图集，5列x4行
  UI_SOCKET: { url: "https://i.postimg.cc/DwCyWHmG/baoshicao1.png" }, // 镶嵌槽背景
  UI_BTN_SOCKET: { url: "https://i.postimg.cc/yYp8x2Ds/xiangqian1.png" }, // 镶嵌按钮
  UI_BTN_UNSOCKET: { url: "https://i.postimg.cc/QM17pj7n/chaichu1.png" }, // 拆除按钮
  
  // 状态图标精灵图
  // 3x3 网格布局的状态图标精灵图，包含9个游戏状态图标
  // 网格布局说明（从左到右，从上到下）：
  // 第0行（顶部）：
  //   - (0,0) PYRO (火): 火焰图标
  //   - (0,1) HYDRO (水): 水滴图标
  //   - (0,2) CRYO (冰): 雪花或冰晶图标
  // 第1行（中间）：
  //   - (1,0) ELECTRO (雷): 闪电图标
  //   - (1,1) POISON (毒): 毒气泡图标
  //   - (1,2) STUN (晕眩): 旋转的星星图标
  // 第2行（底部）：
  //   - (2,0) CRIT (暴击): 暴击图标（参考英雄联盟的暴击图标）
  //   - (2,1) SLOW (减速): 红色的朝下的箭头图标
  //   - (2,2) DEFUP (防御/护盾): 盾牌图标
  // 索引计算：index = row * 3 + col (0-8)
  SPRITE_STATUS_ICONS: { url: "https://i.postimg.cc/jqB3BxsY/smalltubiao1.png" },
  
  // 特效资源
  TEX_VFX_SLASH: { url: "https://i.postimg.cc/zvmXqRkS/daopin-A1.png" } // 横向排列的序列图，包含5帧挥砍动作
};

// 合并所有资源（向后兼容）
export const ASSETS = {
  ...CRITICAL_ASSETS,
  ...GAMEPLAY_ASSETS
};

// ========================================
// 天赋树（Talent Tree）视觉资产配置
// ========================================
export const TALENT_VISUALS = {
  // 精灵图配置
  SPRITE_SHEET_URL: 'https://i.postimg.cc/rwS1XKmB/jiedian1.png', // 单个精灵图URL，替换为实际路径
  GRID_SIZE: 128, // 精灵图中每个图块的尺寸（像素）
  
  // 精灵图映射 - 定义每个节点类型和状态在精灵图中的位置
  // 状态: LOCKED (锁定), AVAILABLE (可解锁), ALLOCATED (已解锁)
  MAPPING: {
    SMALL: {
      LOCKED:    { col: 0, row: 0 }, // 第1行第1列
      AVAILABLE: { col: 1, row: 0 }, // 第1行第2列
      ALLOCATED: { col: 2, row: 0 }  // 第1行第3列
    },
    MEDIUM: {
      LOCKED:    { col: 0, row: 1 }, // 第2行第1列
      AVAILABLE: { col: 1, row: 1 }, // 第2行第2列
      ALLOCATED: { col: 2, row: 1 }  // 第2行第3列
    },
    KEYSTONE: {
      LOCKED:    { col: 0, row: 2 }, // 第3行第1列
      AVAILABLE: { col: 1, row: 2 }, // 第3行第2列
      ALLOCATED: { col: 2, row: 2 }  // 第3行第3列
    }
  }
};

export const TALENT_ASSETS = {
  // 背景配置
  BACKGROUND: {
    color: '#0a0a15',           // 深色星空背景
    imageUrl: 'https://i.postimg.cc/2jwf0wrt/startpanel1.png', // 背景图片URL
    starField: true             // 是否显示星星粒子效果
  },
  
  // 节点视觉配置（用于尺寸和效果，不再使用颜色）
  NODES: {
    ROOT: {
      size: 50,
      glowColor: 'rgba(255, 215, 0, 0.8)'
    },
    SMALL: {
      size: 48,  // 根据精灵图实际需要调整显示尺寸
      glowColor: 'rgba(106, 106, 128, 0.5)'
    },
    MEDIUM: {
      size: 64,  // 根据精灵图实际需要调整显示尺寸
      glowColor: 'rgba(138, 138, 160, 0.6)'
    },
    KEYSTONE: {
      size: 80,  // 根据精灵图实际需要调整显示尺寸
      glowColor: 'rgba(255, 170, 0, 0.9)',
      shape: 'hexagon'  // 用于特殊形状提示
    }
  },
  
  // 连接线配置
  CONNECTIONS: {
    lockedColor: '#3a3a50',
    lockedWidth: 2,
    unlockedColor: '#ffd700',
    unlockedWidth: 3,
    glowEnabled: true,
    glowColor: 'rgba(255, 215, 0, 0.4)',
    glowBlur: 8
  },
  
  // 交互配置
  INTERACTION: {
    hoverScale: 1.1,
    hoverGlowIntensity: 1.5,
    clickScale: 0.95,
    tooltipDelay: 200,          // 毫秒
    panSpeed: 1.0,
    zoomMin: 0.5,
    zoomMax: 2.0,
    zoomSpeed: 0.1
  }
};

