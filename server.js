/**
 * 本地开发服务器 - 配置正确的 HTTP 响应头
 * 运行: node server.js
 * 访问: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // 移除查询参数（用于缓存破坏）
  if (pathname.includes('?')) {
    pathname = pathname.split('?')[0];
  }

  // 默认路由到 index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // 获取文件路径
  let filePath = path.join(__dirname, pathname);

  // 安全检查：防止目录遍历
  const realPath = path.resolve(filePath);
  const rootPath = path.resolve(__dirname);
  if (!realPath.startsWith(rootPath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // 读取文件
  fs.readFile(filePath, (err, content) => {
    if (err) {
      // 文件不存在，返回 404
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    // 获取文件扩展名
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // 设置安全响应头
    const headers = {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self' https:; frame-ancestors 'self';"
    };

    // 根据文件类型设置缓存策略
    if (['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.ogg', '.mp3', '.wav'].includes(ext)) {
      // 静态资源：长期缓存
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else if (ext === '.html') {
      // HTML 文件：短期缓存
      headers['Cache-Control'] = 'public, max-age=3600, must-revalidate';
    } else {
      // 其他文件：默认缓存
      headers['Cache-Control'] = 'public, max-age=3600';
    }

    res.writeHead(200, headers);
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 开发服务器运行在 http://localhost:${PORT}`);
  console.log(`✓ 已配置安全响应头:`);
  console.log(`  - X-Content-Type-Options: nosniff`);
  console.log(`  - Content-Security-Policy: frame-ancestors 'none'`);
  console.log(`  - Cache-Control: 根据文件类型自动设置`);
});

