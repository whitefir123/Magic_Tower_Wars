/**
 * 环境配置 - 区分开发环境和生产环境
 */

// 检测是否为生产环境
export const isProduction = () => {
  // Netlify 会自动设置 window.location.hostname
  const hostname = window.location.hostname;
  
  // 如果是 localhost 或 127.0.0.1，则为开发环境
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return false;
  }
  
  // 其他情况都视为生产环境
  return true;
};

// 是否启用开发者模式功能
export const enableDevMode = () => {
  return !isProduction();
};

// 环境配置
export const ENV_CONFIG = {
  isProduction: isProduction(),
  enableDevMode: enableDevMode(),
  appName: '魔法塔 RPG',
  version: '1.0.0'
};

console.log('[Environment]', ENV_CONFIG.isProduction ? '生产环境' : '开发环境');
