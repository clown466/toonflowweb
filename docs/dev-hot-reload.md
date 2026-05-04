# Toonflow 快速开发模式

这个模式用于频繁改前端和后端时快速看到效果，不替代正式发布流程。

## 前端热更新，连接当前后端

当前 Docker 后端服务仍使用 `10588`：

```bash
cd /srv/cc-connect-workspaces/codex-discord/toonflowweb
npm run dev:hot
```

访问：

```text
http://服务器IP:50188/#/studio
```

前端代码保存后会由 Vite 热更新，不需要重新 `build-only`。

如果外部浏览器打不开 `50188`，先确认服务器防火墙和云安全组已放行 `50188/tcp`。当前服务器 UFW 已放行该端口。

## 前端热更新，连接开发后端

先启动开发后端：

```bash
cd /srv/cc-connect-workspaces/codex-discord/toonflowback
docker compose -f docker-compose.dev.yml up --build
```

再启动前端：

```bash
cd /srv/cc-connect-workspaces/codex-discord/toonflowweb
npm run dev:hot:backend
```

访问：

```text
http://服务器IP:50188/#/studio
```

开发后端使用 `10589`，不会占用当前 `10588`。

## 正式预览/发布

确认修改正确后，再构建前端并同步到当前 Docker 服务的 `data/web`：

```bash
cd /srv/cc-connect-workspaces/codex-discord/toonflowweb
npm run build-only
rsync -a --delete dist/ /proc/200988/root/app/data/web/
```

## Git 记录

前端和后端是两个独立 git 仓库，分别提交：

```bash
cd /srv/cc-connect-workspaces/codex-discord/toonflowweb
git status
git add <files>
git commit -m "描述前端改动"

cd /srv/cc-connect-workspaces/codex-discord/toonflowback
git status
git add <files>
git commit -m "描述后端改动"
```
