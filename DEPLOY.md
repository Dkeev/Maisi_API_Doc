# Modex API Doc - 部署文档

## 项目结构

```
├── .github/workflows/
│   └── docker-publish.yml    # GitHub Actions 自动构建镜像
├── src/
│   ├── .vitepress/
│   │   ├── config.mts         # VitePress 配置（导航、侧边栏、外部链接）
│   │   └── theme/
│   │       ├── index.ts       # 主题入口
│   │       └── style.css      # 自定义样式（品牌色、背景色）
│   ├── public/image/          # 静态图片资源
│   ├── docs/                  # 文档内容
│   ├── integration/           # 集成教程
│   └── index.md               # 首页
├── Dockerfile                 # 多阶段构建（Node构建 + Nginx部署）
├── docker-compose.yml         # Docker Compose 部署配置
├── nginx.conf                 # Nginx 配置
├── .env.example               # 环境变量模板
└── package.json
```

---

## 配置说明

### 外部链接配置

编辑 `src/.vitepress/config.mts`，修改 `nav` 中的链接：

```ts
nav: [
  { text: '使用文档', link: '/docs/about/introduction' },
  { text: '集成教程', link: '/integration/' },
  {
    text: 'API 文档',
    link: 'https://api-docs.modex-ai.com/',  // ← 改为你的 Apifox 文档地址
    target: '_blank',
  },
  { text: '官网', link: 'https://modex-ai.com/', target: '_blank' },
],
```

### 首页链接配置

编辑 `src/index.md` 中的 frontmatter：

```yaml
hero:
  actions:
    - theme: brand
      text: 官网
      link: https://modex-ai.com/         # ← 官网地址
    - theme: alt
      text: API 开发文档
      link: https://api-docs.modex-ai.com/ # ← Apifox 文档地址
```

### API 地址配置

文档内容中引用的 API 地址分布在多个 md 文件中，批量替换：

```bash
# 如需更换 API 域名，在 src 目录下执行：
find src -name "*.md" -exec sed -i 's|modex-ai.com|your-new-api.com|g' {} \;
```

当前使用的 API 地址：
- 主站节点：`https://modex-ai.com`
- 大陆优化：`https://api.modex-ai.com`

### Logo 配置

将 logo 文件放到 `src/public/logo.svg`，config.mts 已配置引用该路径。

---

## 本地开发

```bash
npm install
npm run dev       # 启动开发服务器 http://localhost:5173
npm run build     # 构建生产版本
npm run preview   # 预览构建结果
```

---

## Docker 部署

### 方式一：使用 GitHub 自动构建的镜像

1. 将代码推送到 GitHub 仓库，Actions 会自动构建镜像并推送到 GHCR

2. 在服务器上创建部署目录：

```bash
mkdir -p /opt/Modex-docs && cd /opt/Modex-docs
```

3. 创建 `.env` 文件：

```bash
# GitHub 仓库名（小写），格式: owner/repo
GITHUB_REPO=your-org/Modex-api-doc

# 镜像标签
IMAGE_TAG=latest

# 文档站点端口
DOCS_PORT=3000
```

4. 创建 `docker-compose.yml`：

```yaml
services:
  docs:
    image: ghcr.io/${GITHUB_REPO}:${IMAGE_TAG}
    container_name: Modex-docs
    restart: unless-stopped
    ports:
      - "${DOCS_PORT}:80"
```

5. 登录 GHCR 并启动：

```bash
# 登录 GitHub Container Registry（需要 PAT，勾选 read:packages 权限）
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# 拉取并启动
docker compose up -d

# 查看日志
docker compose logs -f
```

6. 访问 `http://your-server:3000`

### 方式二：本地构建镜像

```bash
# 在项目根目录
docker build -t Modex-docs .
docker run -d --name Modex-docs -p 3000:80 Modex-docs
```

---

## GitHub Actions 说明

工作流文件：`.github/workflows/docker-publish.yml`

### 触发条件

| 事件 | 触发条件 | 镜像标签 |
|------|----------|----------|
| Push to main | 推送到 main 分支 | `latest`, `main` |
| Tag (v*) | 创建 `v1.0.0` 格式的 tag | `1.0.0`, `1.0`, `latest` |
| 手动触发 | Actions 页面手动运行 | 按分支名 |

### 前置配置

1. **仓库设置**：Settings → Actions → General → Workflow permissions → 选择 "Read and write permissions"
2. **包可见性**：推送后在 Settings → Packages 中设置镜像为 Public（如需公开访问）

### 镜像地址

```
ghcr.io/<owner>/<repo>:latest
ghcr.io/<owner>/<repo>:<version>
```

---

## 更新流程

1. 修改文档内容（`src/` 目录下的 md 文件）
2. 推送到 main 分支
3. GitHub Actions 自动构建新镜像
4. 服务器上更新：

```bash
cd /opt/Modex-docs
docker compose pull
docker compose up -d
```

---

## 反向代理（可选）

如果需要通过域名访问，配置 Nginx 反向代理：

```nginx
server {
    listen 443 ssl;
    server_name docs.modex-ai.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
