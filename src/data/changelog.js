// changelog.js - 更新公告数据
// 这是用户唯一需要经常修改的地方

/**
 * 更新公告数据
 * 每个版本对象包含：
 * - version: 版本号（字符串）
 * - date: 发布日期（字符串，格式：YYYY-MM-DD）
 * - title: 版本标题（字符串）
 * - lines: 更新条目数组（字符串数组）
 * 
 * 条目格式说明：
 * - "TYPE: Content" - 带类型的条目（NEW, FIX, BALANCE, INFO）
 * - "Content" - 不带类型的条目，默认为 INFO
 */
export const CHANGELOG = [
  {
    version: "1.1.1",
    date: "2026-01-07",
    title: "测试公告功能",
    lines: [
      "test1",
      "测试完毕"
    ]
  },
  {
    version: "1.1.0",
    date: "2025-01-07",
    title: "铁匠与深渊更新",
    lines: [
      "NEW: 新增铁匠铺系统，现在可以强化和重铸装备了",
      "NEW: 赌徒 NPC 登场，准备好你的金币了吗？",
      "BALANCE: 降低了 1-5 层怪物的攻击力",
      "FIX: 修复了部分音效在快速点击时丢失的问题"
    ]
  },
  {
    version: "1.0.0",
    date: "2025-01-01",
    title: "初始版本",
    lines: [
      "NEW: 游戏正式上线",
      "NEW: 基础战斗系统",
      "NEW: 角色选择系统",
      "NEW: 装备系统",
      "INFO: 欢迎来到 CursorMota！"
    ]
  }
  // 更多历史版本可以在这里添加...
];

/**
 * 当前版本号（自动获取最新版本）
 */
export const CURRENT_VERSION = CHANGELOG[0]?.version || "1.0.0";

