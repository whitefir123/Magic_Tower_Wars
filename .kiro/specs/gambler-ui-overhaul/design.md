# 设计文档：赌徒界面全面优化

## 概述

本设计文档规定了将现有赌徒界面转变为高级 CSGO2 风格抽奖体验的技术实现。优化重点关注四个关键领域：带有华丽老虎机框架的视觉呈现、具有渐进减速和基于品质效果的复杂动画系统、通过交互功能和心理反馈机制增强玩家参与度，以及全面的无障碍支持。

实现将建立在现有的 `GamblerUI.js` 类之上，同时保持与当前奖励逻辑、保底系统和大奖机制的向后兼容性。所有新功能将作为渐进增强实现，在低性能设备上优雅降级。

## 架构

### 组件结构

赌徒 UI 系统遵循模块化架构，具有明确的关注点分离：

```
GamblerUI (主控制器)
├── AnimationController (管理所有动画状态和转换)
│   ├── ReelAnimator (处理滚轮条滚动和物理)
│   ├── QualityPreviewSystem (管理期待效果)
│   └── ResultEffectRenderer (协调结果庆祝效果)
├── ParticleSystem (管理粒子效果和对象池)
│   ├── ParticleEmitter (创建和更新粒子)
│   └── ParticlePool (重用粒子实例)
├── HistoryTracker (管理旋转历史和差一点检测)
├── GamblerNPC (处理对话和上下文响应)
├── SoundController (协调音频反馈)
└── AccessibilityManager (处理减少动画和屏幕阅读器支持)
```

### 数据流

1. **用户交互** → GamblerUI 接收旋转请求
2. **奖励确定** → 后端逻辑计算结果（现有系统）
3. **动画编排** → AnimationController 排序视觉效果
4. **粒子效果** → ParticleSystem 渲染与品质相适应的效果
5. **音频反馈** → SoundController 播放分层音效
6. **结果显示** → UI 更新最终奖励和历史
7. **状态更新** → 玩家统计、保底计数器和大奖池更新

### 集成点

- **现有系统**：保持与当前 `GAMBLER_CONFIG`、`GAMBLE_TIERS`、保底系统和大奖机制的兼容性
- **音频系统**：与 `AudioManager` 集成以实现分层音效设计
- **成就系统**：触发与赌博相关的里程碑成就检查
- **元存档系统**：与灵魂水晶奖励接口
- **UI 系统**：更新玩家统计显示和消息日志

## 组件和接口

### AnimationController

管理从旋转启动到结果显示的完整动画生命周期。

```javascript
class AnimationController {
  constructor(gamblerUI) {
    this.gamblerUI = gamblerUI;
    this.reelAnimator = new ReelAnimator(this);
    this.qualityPreview = new QualityPreviewSystem(this);
    this.resultEffects = new ResultEffectRenderer(this);
    this.currentAnimation = null;
    this.skipRequested = false;
  }

  async playSpinAnimation(finalReward) {
    // 返回动画完成时解析的 Promise
    // 协调：滚轮动画 → 品质预告 → 结果效果
  }

  requestSkip() {
    // 设置跳过标志，播放缩略动画
  }

  cleanup() {
    // 取消正在进行的动画，重置状态
  }
}
```

### ReelAnimator

处理基于物理的滚轮滚动和渐进减速。

```javascript
class ReelAnimator {
  constructor(controller) {
    this.controller = controller;
    this.reelStrip = null;
    this.animationFrame = null;
  }

  async animate(items, winnerIndex, duration = 4000) {
    // 阶段 1：加速 (0-0.3s) - cubic-bezier(0.4, 0, 0.2, 1)
    // 阶段 2：恒速 (0.3-2.3s) - linear
    // 阶段 3：减速 (2.3-3.8s) - cubic-bezier(0.1, 0.9, 0.3, 1)
    // 阶段 4：顿挫效果 (3.8-4.0s) - 4 步阶梯缓动
    
    // 在高速时应用运动模糊 (CSS filter: blur(2px))
    // 计算最终位置以居中获胜卡片
    // 返回完成时解析的 Promise
  }

  applyBlur(intensity) {
    // 对滚轮条应用 CSS 模糊滤镜
  }

  calculateFinalPosition(winnerIndex, containerWidth) {
    // 返回 translateX 值以居中获胜卡片
    // 添加随机偏移 (±20px) 以获得自然感觉
  }
}
```

### QualityPreviewSystem

在不透露结果的情况下提供关于即将到来的稀有物品的视觉提示。

```javascript
class QualityPreviewSystem {
  constructor(controller) {
    this.controller = controller;
    this.previewActive = false;
  }

  async showPreview(quality, duration = 2000) {
    if (quality === 'COMMON' || quality === 'UNCOMMON') return;
    
    // RARE：滚轮容器上的蓝色渐变背景
    // EPIC：紫色渐变 + 边缘发光效果
    // LEGENDARY：橙色渐变 + 强烈边缘发光 + 屏幕脉冲
    
    // 播放营造紧张感的音效
    // 在 0.5s 内动画渐变淡入
    // 保持持续时间
    // 返回 Promise
  }

  clearPreview() {
    // 移除所有预告效果
  }
}
```

### ResultEffectRenderer

在显示结果时渲染与品质相适应的庆祝效果。

```javascript
class ResultEffectRenderer {
  constructor(controller) {
    this.controller = controller;
    this.particleSystem = controller.gamblerUI.particleSystem;
  }

  async playResultEffect(quality) {
    switch(quality) {
      case 'COMMON':
      case 'UNCOMMON':
        return this.playSimpleFade();
      case 'RARE':
        return this.playBluePulse();
      case 'EPIC':
        return this.playPurpleExplosion();
      case 'LEGENDARY':
        return this.playLegendaryEffect();
      case 'JACKPOT':
        return this.playJackpotEffect();
    }
  }

  playSimpleFade() {
    // 在 0.3s 内淡入结果显示
  }

  playBluePulse() {
    // 蓝色发光脉冲动画（1s 持续时间）
    // CSS 动画：scale(1.0 → 1.1 → 1.0) + box-shadow 发光
  }

  playPurpleExplosion() {
    // 从中心发射 20-30 个紫色粒子
    // 径向爆发模式，随机速度
    // 粒子生命周期：1.5s
  }

  playLegendaryEffect() {
    // 橙色屏幕闪光（0.2s）
    // 发射 50-80 个闪光粒子
    // 结果显示周围的金色发光
    // 持续时间：总共 2s
  }

  playJackpotEffect() {
    // 全屏金色覆盖闪光（0.3s）
    // 屏幕震动效果（振幅：10px，持续时间：0.5s）
    // 金币雨：100+ 粒子从顶部落下
    // 慢动作回放：以 0.5x 速度显示滚轮的最后 0.5s
    // 持续时间：总共 4s
  }
}
```


### ParticleSystem

使用对象池实现性能优化的轻量级粒子系统。

```javascript
class ParticleSystem {
  constructor(containerElement) {
    this.container = containerElement;
    this.particles = [];
    this.pool = [];
    this.maxParticles = 100;
    this.animationFrame = null;
    this.isRunning = false;
  }

  emit(config) {
    // config: { x, y, count, type, velocity, lifetime, color }
    // 从池中检索粒子或创建新粒子
    // 初始化粒子属性
    // 如果未运行则启动更新循环
  }

  update(deltaTime) {
    // 更新所有活动粒子
    // 应用物理（重力、速度、摩擦）
    // 移除死亡粒子，返回池
    // 将粒子渲染到 DOM（CSS 变换）
  }

  createParticle(type) {
    // 返回粒子的 DOM 元素
    // 类型：'dust'、'explosion'、'coin'、'sparkle'
  }

  returnToPool(particle) {
    // 隐藏粒子，添加到池以供重用
  }

  clear() {
    // 停止动画，清除所有粒子
  }
}
```

### HistoryTracker

管理旋转历史显示和差一点检测以实现心理参与。

```javascript
class HistoryTracker {
  constructor(maxHistory = 5) {
    this.history = [];
    this.maxHistory = maxHistory;
  }

  addResult(reward) {
    // 将结果添加到历史
    // 如果超过 maxHistory 则删除最旧的
    // 返回更新的历史数组
  }

  detectNearMiss(finalIndex, items) {
    // 检查传说物品是否在 2 个位置内
    // 返回 { isNearMiss: boolean, missedItem: object }
  }

  renderHistory(containerElement) {
    // 将最近 5 个结果渲染为迷你卡片
    // 显示品质颜色边框和图标
    // 动画新条目滑入
  }

  clear() {
    // 清除历史数组
  }
}
```

### GamblerNPC

根据游戏状态和旋转结果提供上下文对话。

```javascript
class GamblerNPC {
  constructor() {
    this.dialogueElement = null;
    this.currentDialogue = null;
    this.dialogueTimeout = null;
  }

  say(message, duration = 3000) {
    // 在对话气泡中显示消息
    // 在 0.3s 内淡入
    // 持续时间后自动关闭
    // 在 0.3s 内淡出
  }

  getContextualDialogue(context) {
    // context: { result, pityCount, isNearMiss, consecutiveRare }
    // 返回适当的对话字符串
    
    // 示例：
    // 差一点："哎呀，差一点！"
    // 传说："天选之人！"
    // 高保底："运气正在积聚..."
    // 大奖："不可思议！命运女神眷顾着你！"
  }

  hide() {
    // 隐藏对话气泡
  }
}
```

### SoundController

协调分层音频反馈以实现沉浸式体验。

```javascript
class SoundController {
  constructor(audioManager) {
    this.audio = audioManager;
    this.spinLoopSound = null;
    this.ambienceSound = null;
  }

  playSpinStart() {
    // 播放机械齿轮循环（循环）
    // 在 0.2s 内淡入
  }

  playDeceleration(progress) {
    // progress: 0.0 到 1.0
    // 播放节奏递减的咔哒声
    // 节奏与视觉减速匹配
  }

  playStop(quality) {
    // 停止旋转循环
    // 播放与品质相适应的"叮"声
    // 音调根据品质变化（COMMON：低，LEGENDARY：高）
  }

  playJackpot() {
    // 播放人群欢呼声
    // 播放金币级联音频（循环 3s）
  }

  playAmbience() {
    // 播放微妙的赌场氛围（循环，低音量）
  }

  stopAll() {
    // 停止所有与赌博相关的声音
  }
}
```

### AccessibilityManager

确保赌博界面对所有玩家都是无障碍的。

```javascript
class AccessibilityManager {
  constructor(gamblerUI) {
    this.gamblerUI = gamblerUI;
    this.reducedMotion = this.detectReducedMotion();
    this.keyboardNavigation = true;
  }

  detectReducedMotion() {
    // 检查 prefers-reduced-motion 媒体查询
    // 返回布尔值
  }

  announceResult(reward) {
    // 创建屏幕阅读器公告
    // 格式："[品质] [物品名称] 已获得"
    // 使用 aria-live 区域
  }

  setupKeyboardNavigation() {
    // 启用按钮的 Tab 导航
    // Enter 键激活按钮
    // Escape 键关闭面板
    // 添加可见的焦点指示器
  }

  getAnimationDuration() {
    // 如果启用减少动画则返回 0
    // 否则返回正常持续时间
  }
}
```

## 数据模型

### 奖励对象

```javascript
{
  type: 'equipment' | 'consumable' | 'gold' | 'soul_crystal' | 'buff' | 'trash' | 'jackpot',
  name: string,           // 显示名称（本地化）
  nameEn: string,         // 英文名称
  quality: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'JACKPOT',
  icon: string,           // 表情符号或图标标识符
  value: number,          // 金币数量或数量
  itemId: string,         // 用于装备/消耗品
  data: object            // 来自数据库的完整物品数据
}
```

### 动画状态

```javascript
{
  phase: 'idle' | 'spinning' | 'decelerating' | 'stuttering' | 'revealing' | 'celebrating',
  progress: number,       // 0.0 到 1.0
  startTime: number,      // Performance.now() 时间戳
  duration: number,       // 总动画持续时间（毫秒）
  skipRequested: boolean,
  currentReward: Reward
}
```

### 粒子配置

```javascript
{
  x: number,              // 生成位置 X
  y: number,              // 生成位置 Y
  count: number,          // 要发射的粒子数量
  type: 'dust' | 'explosion' | 'coin' | 'sparkle',
  velocity: { x: number, y: number },  // 初始速度
  velocityVariance: number,            // 随机方差 (±)
  lifetime: number,       // 持续时间（毫秒）
  color: string,          // CSS 颜色
  size: number,           // 粒子大小（像素）
  gravity: number         // 重力加速度
}
```

### 历史条目

```javascript
{
  reward: Reward,
  timestamp: number,      // Date.now()
  wasNearMiss: boolean,
  missedQuality: string   // 如果差一点，错过了什么品质
}
```

### NPC 对话上下文

```javascript
{
  result: Reward,
  pityCount: number,
  isNearMiss: boolean,
  consecutiveRare: number,  // 连续史诗+ 结果
  playerGold: number
}
```

## 正确性属性

属性是应该在系统的所有有效执行中保持为真的特征或行为——本质上，是关于系统应该做什么的正式陈述。属性充当人类可读规范和机器可验证正确性保证之间的桥梁。

### 属性 1：纵横比保持

*对于任何*从 320px 到 1920px 的屏幕宽度，老虎机背景应保持其原始纵横比而不失真。

**验证：需求 1.4**

### 属性 2：品质预告激活

*对于任何*品质为稀有或更高的旋转结果，品质预告系统应在动画的最后 2 秒内激活，并显示与品质相适应的视觉效果，而不透露具体物品。

**验证：需求 3.1、3.2、3.3、3.4**

### 属性 3：结果效果映射

*对于任何*旋转结果，系统应显示与其品质等级相对应的效果（普通/优秀淡入，稀有蓝色脉冲，史诗紫色爆炸，传说橙色闪光加闪光，大奖完整大奖庆祝）。

**验证：需求 4.1、4.2、4.3、4.4、4.5**

### 属性 4：稀有结果的粒子发射

*对于任何*品质为稀有或更高的旋转结果，粒子系统应发射与品质相适应的粒子（史诗爆炸粒子，传说闪光，大奖金币雨）。

**验证：需求 5.2、5.3**

### 属性 5：快速跳过功能

*对于任何*不在其最后 0.3 秒的旋转动画，点击任何地方应立即停止动画，显示结果，并播放最多持续 0.5 秒的缩略效果。

**验证：需求 6.2、6.3、6.4**

### 属性 6：历史 FIFO 行为

*对于任何*旋转结果序列，历史显示应使用先进先出排序维护恰好 5 个条目，每个条目显示正确的品质彩色边框、物品图标和品质指示器。

**验证：需求 7.2、7.3、7.4**

### 属性 7：批量抽取金币扣除

*对于任何*批量抽取激活，系统应从玩家余额中恰好扣除 450 金币。

**验证：需求 8.2**

### 属性 8：批量抽取结果计数

*对于任何*批量抽取执行，系统应生成恰好 10 个旋转结果，并在摘要屏幕中显示所有 10 个。

**验证：需求 8.3、8.4**

### 属性 9：批量抽取稀有暂停

*对于任何*包含一个或多个史诗或更高品质结果的批量抽取，系统应在每个此类结果上短暂暂停并播放适当的庆祝效果。

**验证：需求 8.5**

### 属性 10：保底显示同步

*对于任何*保底系统计数的更改，显示的保底进度条和概率百分比应更新以反映新值。

**验证：需求 9.3**

### 属性 11：NPC 上下文对话

*对于任何*游戏状态（差一点、传说胜利、高保底计数），赌徒 NPC 应显示与当前情况匹配的上下文适当对话。

**验证：需求 10.2、10.3、10.4**

### 属性 12：欧皇成就

*对于任何*连续 3 个旋转结果，其中所有结果都是史诗或更高品质，系统应授予"欧皇"成就。

**验证：需求 11.1**

### 属性 13：非酋成就

*对于任何*总共触发保底系统 10 次或更多次的玩家，系统应授予"非酋"成就。

**验证：需求 11.2**

### 属性 14：梭哈王成就

*对于任何*导致传说品质奖励的豪赌旋转，系统应授予"梭哈王"成就。

**验证：需求 11.3**

### 属性 15：破产边缘成就

*对于任何*玩家金币余额少于 100 时的旋转激活，系统应授予"破产边缘"成就。

**验证：需求 11.4**

### 属性 16：旋转声音激活

*对于任何*旋转动画开始，系统应播放机械齿轮循环声音。

**验证：需求 12.1**

### 属性 17：减速声音节奏

*对于任何*处于减速阶段的旋转动画，系统应播放节奏与视觉减速率成比例递减的咔哒声。

**验证：需求 12.2**

### 属性 18：品质音调停止声音

*对于任何*旋转动画完成，系统应播放音调根据结果品质等级变化的"叮"声（普通音调较低，传说音调较高）。

**验证：需求 12.3**

### 属性 19：大奖音频序列

*对于任何*大奖结果，系统应按顺序播放人群欢呼声，然后是金币级联音频。

**验证：需求 12.4**

### 属性 20：滑动跳过

*对于任何*动画期间在滚轮条上的滑动手势，系统应触发快速跳过功能。

**验证：需求 14.2**

### 属性 21：减少动画绕过

*对于任何*启用减少动画模式时的旋转，系统应跳过所有动画，立即显示结果，用简单的颜色闪光替换粒子效果，并在 0.5 秒内完成。

**验证：需求 15.1、15.2**

### 属性 22：屏幕阅读器公告

*对于任何*旋转结果，系统应使用格式"[品质] [物品名称] 已获得"向屏幕阅读器公告。

**验证：需求 15.3**

## 错误处理

### 动画错误

**场景**：动画帧丢失或 CSS 过渡失败
- **处理**：回退到带有缩略效果的立即结果显示
- **用户反馈**：将警告记录到控制台，继续游戏
- **恢复**：重置动画状态，允许下一次旋转

**场景**：粒子系统超出性能预算（降至 30fps 以下）
- **处理**：自动将粒子数量减少 50%
- **用户反馈**：无可见指示（优雅降级）
- **恢复**：监控性能，稳定时恢复完整粒子数量

### 音频错误

**场景**：音频文件加载失败
- **处理**：继续而不播放音频，记录错误
- **用户反馈**：视觉效果正常继续
- **恢复**：在下一次旋转尝试时重试加载

**场景**：音频上下文被浏览器自动播放策略阻止
- **处理**：在用户交互后排队播放音频
- **用户反馈**：显示微妙的"点击启用声音"提示
- **恢复**：在下一次用户点击时恢复音频上下文

### 资源错误

**场景**：老虎机背景图像加载失败
- **处理**：显示回退渐变背景
- **用户反馈**：功能正常继续
- **恢复**：5 秒后重试加载图像

**场景**：检测到内存压力（粒子池耗尽）
- **处理**：清除非活动粒子，减少新粒子发射
- **用户反馈**：视觉效果略有减少
- **恢复**：内存可用时恢复完整粒子数量

### 输入错误

**场景**：玩家尝试在没有足够金币的情况下旋转
- **处理**：禁用旋转按钮，显示金币要求
- **用户反馈**：按钮显示为禁用，带有工具提示
- **恢复**：满足金币要求时启用按钮

**场景**：动画期间多次快速点击
- **处理**：去抖点击，仅处理第一次点击以跳过
- **用户反馈**：第一次点击时激活跳过
- **恢复**：动画完成后重置点击处理程序

### 状态错误

**场景**：保底计数或大奖池变为负数或 NaN
- **处理**：重置为安全默认值（保底：0，大奖：BASE_POOL）
- **用户反馈**：记录错误，继续游戏
- **恢复**：在每次更新时验证和清理值

**场景**：历史追踪器超过最大大小
- **处理**：强制执行最旧条目的 FIFO 删除
- **用户反馈**：无可见指示
- **恢复**：自动维护大小限制

## 测试策略

### 双重测试方法

赌徒 UI 优化将采用单元测试和基于属性的测试，以确保全面覆盖：

**单元测试**：专注于特定示例、边缘情况和集成点
- 特定动画时间值（0.3s 加速，2s 恒速）
- 边缘情况（空历史、零金币、最大保底计数）
- 与现有系统的集成（AudioManager、成就系统）
- DOM 操作和 CSS 类应用
- 错误处理场景

**基于属性的测试**：验证所有输入的通用属性
- 品质到效果映射对所有品质等级都成立
- 历史对任何结果序列都保持 FIFO 行为
- 保底显示对任何保底计数值都同步
- 成就触发对任何符合条件的游戏状态都有效
- 减少动画模式对任何旋转配置都有效

### 基于属性的测试配置

**库**：fast-check（JavaScript 基于属性的测试库）

**测试配置**：
- 每个属性测试最少 100 次迭代
- 每个测试都标记有功能名称和属性引用
- 标记格式：`// Feature: gambler-ui-overhaul, Property N: [属性文本]`

**示例属性测试结构**：

```javascript
// Feature: gambler-ui-overhaul, Property 3: 结果效果映射
test('结果效果正确映射到品质等级', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'JACKPOT'),
      (quality) => {
        const reward = { quality, name: '测试物品', icon: '⚔️' };
        const effect = resultEffectRenderer.getEffectForQuality(quality);
        
        // 验证品质的正确效果类型
        if (quality === 'COMMON' || quality === 'UNCOMMON') {
          return effect.type === 'fade';
        } else if (quality === 'RARE') {
          return effect.type === 'pulse' && effect.color === 'blue';
        } else if (quality === 'EPIC') {
          return effect.type === 'explosion' && effect.color === 'purple';
        } else if (quality === 'LEGENDARY') {
          return effect.type === 'flash' && effect.particles === 'sparkle';
        } else if (quality === 'JACKPOT') {
          return effect.type === 'jackpot' && effect.includes('coinRain', 'shake', 'slowMotion');
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

### 测试覆盖目标

- **单元测试覆盖率**：最低 80% 代码覆盖率
- **属性测试覆盖率**：实现所有 22 个正确性属性
- **集成测试覆盖率**：测试所有外部系统集成
- **无障碍覆盖率**：验证 WCAG 2.1 AA 合规性
- **性能覆盖率**：在 95% 的测试运行中保持 60fps
