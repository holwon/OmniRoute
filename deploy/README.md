# OmniRoute 服务器部署（GHCR 拉取式）

从 GitHub Container Registry 拉取预构建镜像部署，服务器上无需源码、无需构建。

## 文件说明

| 文件 | 用途 |
| --- | --- |
| `docker-compose.yml` | 主服务编排（OmniRoute + Redis），拉取 `ghcr.io/holwon/omniroute` 镜像 |
| `.env.prod.example` | 生产环境变量模板 |

## 服务器步骤

```bash
# 1. 进入部署目录
cd deploy

# 2. 复制并编辑环境变量（重点：JWT_SECRET / API_KEY_SECRET / INITIAL_PASSWORD）
cp .env.prod.example .env
nano .env

# 3. 生成 secrets（在本地或服务器上执行）
openssl rand -base64 48   # → JWT_SECRET
openssl rand -hex 32      # → API_KEY_SECRET

# 4. 启动（首次会自动拉取镜像）
docker compose up -d

# 5. 查看状态 / 日志
docker compose ps
docker compose logs -f omniroute
```

启动后访问：

- 仪表盘：`http://<服务器IP>:20128`
- OpenAI 兼容 API：`http://<服务器IP>:20129/v1`

## 镜像选择

| 镜像 | 说明 | 何时用 |
| --- | --- | --- |
| `ghcr.io/holwon/omniroute:next` | 精简版（无浏览器，约 500 MB） | 默认，绝大多数 provider |
| `ghcr.io/holwon/omniroute:next-web` | 含 Chromium/Playwright（约 800 MB） | 需要 gemini-web / claude-web / claude-turnstile |

在 `.env` 里设置切换：

```bash
OMNIROUTE_IMAGE=ghcr.io/holwon/omniroute:next-web
```

## 更新

```bash
docker compose pull
docker compose up -d
```

## 三个密钥是干嘛的

`deploy/.env` 里已生成好真实值，无需手动处理，了解用途便于维护：

| 变量 | 作用 | 不设会怎样 |
| --- | --- | --- |
| `JWT_SECRET` | Dashboard 登录后签发会话令牌（JWT），每次访问仪表盘验证会话真实性 | **登录认证直接禁用**（登录接口返回 500），登不进仪表盘 |
| `API_KEY_SECRET` | 加密/校验数据库中存储的 API key（CRC + HMAC），也用于 9router 生成 API key | 启动时自动生成一份并持久化；全新部署时会得到不同密钥，旧的已加密数据会解不开 |
| `OMNIROUTE_WS_BRIDGE_SECRET` | Codex Responses 内部 WebSocket 桥接的鉴权密钥（`x-omniroute-ws-bridge-secret` 头，timing-safe 比对） | 只有用到 Codex 的 WebSocket 中继（通常关联 Electron 桌面版）才需要；纯 API 代理不设也能跑 |

> **重要**：OmniRoute 启动时会自动把这些密钥持久化到数据目录。只要数据卷 `omniroute-data` 不丢，即使 `.env` 里删除这些变量，重启后也会恢复同一份密钥，会话和已加密数据保持有效；反之删掉数据卷重来，密钥会重新生成、旧会话全部失效。因此 **密钥写入 `.env`（gitignore 保护）+ 数据卷持久化** 是双保险。

## HTTPS（推荐）

生产环境请前置反向代理（Caddy / nginx / Cloudflare Tunnel），并设置：

```bash
AUTH_COOKIE_SECURE=true
NEXT_PUBLIC_BASE_URL=https://你的域名
```

## 低内存服务器（1.5GB 及以下）

1.5GB 很紧张但可运行，前提是**只跑 OmniRoute + Redis，别用 `-web` 镜像，并加 swap**。

在 `.env` 里设置：

```bash
# 把 Node 堆上限压到 512MB（进程实际 RSS 约 700–900MB）
OMNIROUTE_MEMORY_MB=512
# 容器内存硬上限，必须高于堆（默认 1g）
OMNIROUTE_MEM_LIMIT=1g
```

强烈建议再加 swap（否则高峰请求容易 OOM 被杀）：

```bash
# 创建 2GB swap（在服务器上执行）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**不要做的事**：不要用 `next-web` 镜像（Chromium 额外 +200–500MB）；不要在同一台机器上再跑别的常驻服务；不要开 `fusion` 大面板 combo（会缓冲多模型响应）。

## 数据持久化

- SQLite 数据存放在命名卷 `omniroute-data`（挂载到容器内 `/app/data`）
- Redis 数据在 `omniroute-redis-data`
- 卷不会随 `docker compose down` 删除；如需彻底清理：`docker compose down -v`

## 端口映射

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `PORT` / `DASHBOARD_PORT` | `20128` | 仪表盘 |
| `API_PORT` | `20129` | OpenAI 兼容 API |
| `LIVE_WS_PORT` | `20132` | 实时 WebSocket 仪表盘 |
