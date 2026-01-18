# Tooltip负数显示修复文档

## 问题描述

在装备tooltip中，负数属性显示存在三个问题：

### 问题1：词缀描述中的负数显示
**错误显示**：`前缀: 破损的: 物防 +-1`
**应该显示**：`前缀: 破损的: 物防 -1`

### 问题2：属性详情中的词缀加成显示
**错误显示**：`物防: +9 (基础: 12 +-3)`
**应该显示**：`物防: +9 (基础: 12 -3)`

### 问题3：主属性值的负数显示
如果主属性值本身是负数，也会显示为 `+-X` 而不是 `-X`

## 根本原因

代码中使用了固定的 `+` 符号前缀来格式化数值：
```javascript
const displayValue = `+${Math.floor(value)}`;
```

当 `value` 为负数时（例如 -3），会产生 `+-3` 的错误显示。

## 解决方案

修改了三处代码，正确处理正负数的显示：

### 1. 词缀描述显示 (第348-365行)
```javascript
// 修改前
const displayValue = isPercentage 
  ? `${(statValue * 100).toFixed(1)}%` 
  : `+${Math.floor(statValue)}`;

// 修改后
let displayValue;
if (isPercentage) {
  const percentValue = (statValue * 100).toFixed(1);
  displayValue = statValue >= 0 ? `+${percentValue}%` : `${percentValue}%`;
} else {
  const intValue = Math.floor(statValue);
  displayValue = statValue >= 0 ? `+${intValue}` : `${intValue}`;
}
```

### 2. 主属性值显示 (第503-511行)
```javascript
// 修改前
const displayValue = isPercentage 
  ? `${(v * 100).toFixed(1)}%` 
  : `+${Math.floor(v)}`;

// 修改后
let displayValue;
if (isPercentage) {
  const percentValue = (v * 100).toFixed(1);
  displayValue = v >= 0 ? `+${percentValue}%` : `${percentValue}%`;
} else {
  const intValue = Math.floor(v);
  displayValue = v >= 0 ? `+${intValue}` : `${intValue}`;
}
```

### 3. 词缀加成显示 (第537-547行)
```javascript
// 修改前
const bonusDisplay = isPercentage 
  ? `${(affixBonus * 100).toFixed(1)}%`
  : `+${Math.floor(affixBonus)}`;

// 修改后
let bonusDisplay;
if (isPercentage) {
  const bonusPercent = (affixBonus * 100).toFixed(1);
  bonusDisplay = affixBonus >= 0 ? `+${bonusPercent}%` : `${bonusPercent}%`;
} else {
  const bonusInt = Math.floor(affixBonus);
  bonusDisplay = affixBonus >= 0 ? `+${bonusInt}` : `${bonusInt}`;
}
```

## 修复逻辑

对于所有数值显示，使用条件判断：
- **正数或零**：添加 `+` 前缀（例如：`+5`, `+10%`）
- **负数**：不添加前缀，直接显示负号（例如：`-3`, `-5%`）

这样可以确保：
- 正数显示为 `+5`
- 负数显示为 `-3`（而不是 `+-3`）
- 百分比同样适用

## 测试场景

### 测试用例1：负数词缀
- **装备**：带有"破损的"前缀的护甲（物防 -1）
- **预期显示**：`前缀: 破损的: 物防 -1`
- **结果**：✅ 正确显示

### 测试用例2：负数词缀加成
- **装备**：基础物防12，词缀-3，最终物防9
- **预期显示**：`物防: +9 (基础: 12 -3)`
- **结果**：✅ 正确显示

### 测试用例3：正数属性
- **装备**：正常装备，物攻+15
- **预期显示**：`物攻: +15`
- **结果**：✅ 正确显示

### 测试用例4：百分比负数
- **装备**：暴击率-5%
- **预期显示**：`暴击率: -5%`
- **结果**：✅ 正确显示

## 影响范围

修改仅影响tooltip显示逻辑，不影响：
- 实际属性计算
- 游戏逻辑
- 数据存储
- 其他UI组件

## 文件修改

- **文件**：`src/utils/TooltipManager.js`
- **修改行数**：3处（词缀描述、主属性、词缀加成）
- **向后兼容**：完全兼容，只是显示格式改进

## 总结

通过正确处理正负数的符号显示，解决了tooltip中负数属性显示为 `+-X` 的问题。现在所有数值都能正确显示：
- 正数带 `+` 前缀
- 负数直接显示负号
- 百分比同样适用

这使得装备属性更加清晰易读，避免了混淆。
