# 部署指南 - 三角圆圈棋盘游戏

本游戏可以免费部署到多个云平台。以下是详细的部署步骤。

## 准备工作

### 1. 初始化 Git 仓库
```bash
git init
git add .
git commit -m "Initial commit"
```

### 2. 创建 GitHub 仓库
1. 访问 https://github.com/new
2. 创建新仓库（如：chess-game）
3. 推送代码：
```bash
git remote add origin https://github.com/你的用户名/chess-game.git
git branch -M main
git push -u origin main
```

## 部署选项

### 选项 1：Render（推荐 - 最简单）

**优点**：完全免费，支持 WebSocket，自动 HTTPS

1. 访问 https://render.com
2. 使用 GitHub 账号登录
3. 点击 "New +" → "Web Service"
4. 选择你的 GitHub 仓库
5. 填写信息：
   - Name: chess-game
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
6. 点击 "Create Web Service"
7. 等待部署完成（约2-3分钟）
8. 访问提供的 URL（如：https://chess-game-xxxx.onrender.com）

### 选项 2：Railway

**优点**：部署快，界面友好，每月 $5 免费额度

1. 访问 https://railway.app
2. 点击 "Start a New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的仓库
5. Railway 会自动检测并部署
6. 点击 "Settings" → "Generate Domain"
7. 访问生成的域名

### 选项 3：Vercel

**优点**：部署极快，全球 CDN

**注意**：Vercel 对 WebSocket 支持有限制，可能需要额外配置

1. 安装 Vercel CLI：
```bash
npm i -g vercel
```

2. 在项目目录运行：
```bash
vercel
```

3. 按提示操作：
   - 登录/注册 Vercel 账号
   - 确认项目设置
   - 等待部署

### 选项 4：Glitch

**优点**：在线编辑器，即时预览

1. 访问 https://glitch.com
2. 点击 "New Project" → "Import from GitHub"
3. 输入仓库 URL
4. Glitch 会自动部署
5. 点击 "Show" → "In a New Window"

### 选项 5：Heroku（需要信用卡验证）

**注意**：Heroku 不再提供完全免费套餐，但有免费试用

1. 安装 Heroku CLI
2. 创建 Procfile：
```
web: node server.js
```

3. 部署：
```bash
heroku create your-app-name
git push heroku main
heroku open
```

## 部署后配置

### 环境变量
大多数平台都支持设置环境变量：
- `NODE_ENV`: production
- `PORT`: (通常自动设置)

### 自定义域名
1. 在平台设置中添加自定义域名
2. 在域名提供商处添加 CNAME 记录
3. 等待 DNS 生效（通常 24-48 小时）

## 本地测试生产环境

```bash
NODE_ENV=production npm start
```

## 监控和日志

各平台都提供日志查看功能：
- Render: Dashboard → Logs
- Railway: Project → Deployments → View Logs
- Vercel: Functions → Logs
- Glitch: Tools → Logs

## 常见问题

### WebSocket 连接失败
- 确保平台支持 WebSocket
- 检查 CORS 设置
- 查看浏览器控制台错误

### 部署失败
- 检查 package.json 中的依赖
- 确保 Node.js 版本兼容
- 查看部署日志

### 性能优化
- 使用 CDN 加载静态资源
- 启用 Gzip 压缩
- 考虑使用 Redis 存储游戏状态（用于多服务器部署）

## 推荐配置

对于这个游戏，我推荐使用 **Render**：
1. 完全免费
2. 支持 WebSocket
3. 自动 HTTPS
4. 简单易用
5. 自动部署（Git push 后自动更新）

## 分享你的游戏

部署成功后，你可以：
1. 分享链接给朋友
2. 在社交媒体发布
3. 提交到游戏网站
4. 加入到你的作品集

## 需要帮助？

如果遇到问题，可以：
1. 查看平台的官方文档
2. 在 GitHub Issues 提问
3. 查看部署日志定位问题