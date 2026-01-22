// SpriteManager.test.js - SpriteManager单元测试

import { SpriteManager } from '../../src/ui/forge/SpriteManager.js';

/**
 * SpriteManager单元测试套件
 */
describe('SpriteManager', () => {
  let spriteManager;

  beforeEach(() => {
    spriteManager = new SpriteManager();
  });

  afterEach(() => {
    spriteManager.clearCache();
  });

  describe('初始化', () => {
    test('应该正确初始化', () => {
      expect(spriteManager).toBeDefined();
      expect(spriteManager.spriteSheets).toBeInstanceOf(Map);
      expect(spriteManager.iconCache).toBeInstanceOf(Map);
      expect(spriteManager.loadingPromises).toBeInstanceOf(Map);
    });

    test('应该包含默认精灵图配置', () => {
      expect(spriteManager.spriteConfigs.blacksmith).toBeDefined();
      expect(spriteManager.spriteConfigs.equipment).toBeDefined();
      expect(spriteManager.spriteConfigs.gems).toBeDefined();
      expect(spriteManager.spriteConfigs.materials).toBeDefined();
      expect(spriteManager.spriteConfigs.effects).toBeDefined();
    });
  });

  describe('getSpriteConfig', () => {
    test('应该获取顶层配置', () => {
      const config = spriteManager.getSpriteConfig('blacksmith');
      expect(config).toBeDefined();
      expect(config.frameWidth).toBe(64);
      expect(config.frameHeight).toBe(64);
    });

    test('应该获取嵌套配置', () => {
      const config = spriteManager.getSpriteConfig('effects.success');
      expect(config).toBeDefined();
      expect(config.frameWidth).toBe(64);
    });

    test('不存在的配置应该返回null', () => {
      const config = spriteManager.getSpriteConfig('nonexistent');
      expect(config).toBeNull();
    });
  });

  describe('updateSpriteConfig', () => {
    test('应该更新顶层配置', () => {
      spriteManager.updateSpriteConfig('equipment', {
        url: 'https://example.com/equipment.png'
      });
      
      const config = spriteManager.getSpriteConfig('equipment');
      expect(config.url).toBe('https://example.com/equipment.png');
    });

    test('应该更新嵌套配置', () => {
      spriteManager.updateSpriteConfig('effects.success', {
        url: 'https://example.com/success.png'
      });
      
      const config = spriteManager.getSpriteConfig('effects.success');
      expect(config.url).toBe('https://example.com/success.png');
    });

    test('更新配置应该清除相关缓存', () => {
      spriteManager.iconCache.set('equipment_0_1', document.createElement('canvas'));
      spriteManager.updateSpriteConfig('equipment', { url: 'new-url' });
      
      expect(spriteManager.iconCache.has('equipment_0_1')).toBe(false);
    });
  });

  describe('loadSpriteSheet', () => {
    test('应该拒绝加载没有URL的精灵图', async () => {
      await expect(spriteManager.loadSpriteSheet('equipment'))
        .rejects.toThrow('精灵图配置不存在或URL未设置');
    });

    test('应该缓存已加载的精灵图', async () => {
      // 模拟成功加载
      spriteManager.updateSpriteConfig('test', {
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        frameWidth: 1,
        frameHeight: 1,
        rows: 1,
        cols: 1,
        totalFrames: 1
      });

      const img1 = await spriteManager.loadSpriteSheet('test');
      const img2 = await spriteManager.loadSpriteSheet('test');
      
      expect(img1).toBe(img2);
      expect(spriteManager.spriteSheets.has('test')).toBe(true);
    });

    test('应该处理加载失败', async () => {
      spriteManager.updateSpriteConfig('invalid', {
        url: 'https://invalid-url-that-does-not-exist.com/image.png',
        frameWidth: 32,
        frameHeight: 32,
        rows: 1,
        cols: 1,
        totalFrames: 1
      });

      await expect(spriteManager.loadSpriteSheet('invalid'))
        .rejects.toThrow('精灵图加载失败');
    });
  });

  describe('createFallbackIcon', () => {
    test('应该创建回退图标', () => {
      const canvas = spriteManager.createFallbackIcon(32, 32);
      
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas.width).toBe(32);
      expect(canvas.height).toBe(32);
    });

    test('回退图标应该包含问号', () => {
      const canvas = spriteManager.createFallbackIcon(64, 64);
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // 检查是否有非灰色像素（问号）
      let hasWhitePixels = false;
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 200) { // 检查白色像素
          hasWhitePixels = true;
          break;
        }
      }
      
      expect(hasWhitePixels).toBe(true);
    });
  });

  describe('extractIcon', () => {
    beforeEach(() => {
      // 设置测试用精灵图
      spriteManager.updateSpriteConfig('test', {
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        frameWidth: 1,
        frameHeight: 1,
        rows: 1,
        cols: 1,
        totalFrames: 1
      });
    });

    test('应该提取图标', async () => {
      const canvas = await spriteManager.extractIcon('test', 0);
      
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas.width).toBe(1);
      expect(canvas.height).toBe(1);
    });

    test('应该缓存提取的图标', async () => {
      const canvas1 = await spriteManager.extractIcon('test', 0);
      const canvas2 = await spriteManager.extractIcon('test', 0);
      
      expect(canvas1).toBe(canvas2);
      expect(spriteManager.iconCache.has('test_0_1')).toBe(true);
    });

    test('应该支持缩放', async () => {
      const canvas = await spriteManager.extractIcon('test', 0, { scale: 2 });
      
      expect(canvas.width).toBe(2);
      expect(canvas.height).toBe(2);
    });

    test('帧索引超出范围应该返回回退图标', async () => {
      const canvas = await spriteManager.extractIcon('test', 999);
      
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      // 回退图标应该使用配置的尺寸
      expect(canvas.width).toBe(1);
    });
  });

  describe('extractIcons', () => {
    beforeEach(() => {
      spriteManager.updateSpriteConfig('test', {
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        frameWidth: 1,
        frameHeight: 1,
        rows: 1,
        cols: 1,
        totalFrames: 1
      });
    });

    test('应该批量提取图标', async () => {
      const canvases = await spriteManager.extractIcons('test', [0, 0, 0]);
      
      expect(canvases).toHaveLength(3);
      expect(canvases[0]).toBeInstanceOf(HTMLCanvasElement);
    });
  });

  describe('extractAnimationFrames', () => {
    beforeEach(() => {
      spriteManager.updateSpriteConfig('test', {
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        frameWidth: 1,
        frameHeight: 1,
        rows: 1,
        cols: 1,
        totalFrames: 1
      });
    });

    test('应该提取动画帧序列', async () => {
      const frames = await spriteManager.extractAnimationFrames('test', 0, 0);
      
      expect(frames).toHaveLength(1);
      expect(frames[0]).toBeInstanceOf(HTMLCanvasElement);
    });
  });

  describe('clearCache', () => {
    test('应该清除特定精灵图的缓存', () => {
      spriteManager.spriteSheets.set('test', new Image());
      spriteManager.iconCache.set('test_0_1', document.createElement('canvas'));
      spriteManager.iconCache.set('other_0_1', document.createElement('canvas'));
      
      spriteManager.clearCache('test');
      
      expect(spriteManager.spriteSheets.has('test')).toBe(false);
      expect(spriteManager.iconCache.has('test_0_1')).toBe(false);
      expect(spriteManager.iconCache.has('other_0_1')).toBe(true);
    });

    test('应该清除所有缓存', () => {
      spriteManager.spriteSheets.set('test1', new Image());
      spriteManager.spriteSheets.set('test2', new Image());
      spriteManager.iconCache.set('test1_0_1', document.createElement('canvas'));
      spriteManager.iconCache.set('test2_0_1', document.createElement('canvas'));
      
      spriteManager.clearCache();
      
      expect(spriteManager.spriteSheets.size).toBe(0);
      expect(spriteManager.iconCache.size).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    test('应该返回缓存统计信息', () => {
      spriteManager.spriteSheets.set('test', new Image());
      spriteManager.iconCache.set('test_0_1', document.createElement('canvas'));
      
      const stats = spriteManager.getCacheStats();
      
      expect(stats.spriteSheetsLoaded).toBe(1);
      expect(stats.iconsCached).toBe(1);
      expect(stats.loadingInProgress).toBe(0);
    });
  });
});
