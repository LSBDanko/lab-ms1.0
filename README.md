# 实验室管理系统 · LAB MS

五邑大学实验室管理系统：试剂台账、耗材记录、仪器使用、负责人管理、全流程溯源、实时通知、预约、附件与危化品双人复核。

## 项目结构

```text
lab-ms/
├─ index.html              # GitHub Pages 入口，跳转到 frontend/index.html
├─ frontend/
│  ├─ index.html           # 单页前端
│  ├─ config.js            # 后端 API 地址配置
│  └─ assets/              # 校园图片、实验室图片、Logo
├─ backend/
│  ├─ main.py              # FastAPI + SQLite
│  ├─ requirements.txt
│  └─ lab.db               # 本地数据，不提交到 Git
└─ render.yaml             # Render 后端部署示例
```

## 本地运行

### 1. 启动后端

Windows PowerShell：

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\pip.exe install -r requirements.txt
.\.venv\Scripts\python.exe main.py
```

macOS / Linux：

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

后端默认地址：

```text
http://127.0.0.1:8000
```

接口文档：

```text
http://127.0.0.1:8000/docs
```

### 2. 打开前端

直接打开：

```text
frontend/index.html
```

或使用根目录入口：

```text
index.html
```

`frontend/config.js` 默认留空，因此前端会访问本机 `8000` 端口。

## GitHub Pages 部署

### 1. 开启 Pages

仓库 → **Settings** → **Pages**：

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

保存后等待 1～3 分钟。

访问：

```text
https://你的用户名.github.io/仓库名/
```

根目录的 `index.html` 会自动跳转到：

```text
https://你的用户名.github.io/仓库名/frontend/index.html
```

### 2. 如果仍然 404

按顺序检查：

1. 仓库是 Public，或当前账号套餐支持私有仓库 Pages
2. Pages 设置的分支和目录是否正确
3. Actions 中 Pages 部署是否成功
4. 文件名必须是 `index.html`，不是 `Index.html`
5. 网址是否包含正确的仓库名
6. 是否刚部署完还没生效，等待 1～3 分钟并强制刷新

## 重要：GitHub Pages 不能运行后端

GitHub Pages 只能托管 HTML/CSS/JS，不能运行 FastAPI、Python 或 SQLite。

所以正确架构是：

```text
GitHub Pages  →  frontend/index.html
Render/Railway/云服务器  →  backend/main.py
```

### 1. 部署后端

可以直接使用根目录的 `render.yaml` 在 Render 创建 Blueprint，也可以手动配置：

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

建议设置环境变量：

```text
LAB_SECRET=一串足够长的随机字符串
```

后端已允许跨域，前端和后端可以分开部署。

### 2. 配置前端 API 地址

部署好后端后，编辑 `frontend/config.js`：

```js
window.LAB_API_BASE = 'https://你的后端域名';
```

提交后等待 GitHub Pages 重新部署。

### 3. SQLite 数据持久化

免费平台的文件系统通常是临时的，重新部署后 `lab.db` 可能被重置。

如果需要长期保存数据，建议：

- 使用带持久化磁盘的云服务器，或
- 将 SQLite 换成 PostgreSQL

## 安全提醒

不要把以下文件提交到公开仓库：

```text
backend/.venv/
backend/lab.db
backend/lab.db.bak-*
backend/__pycache__/
```

`.gitignore` 已经包含这些规则。

如果数据库已经被提交过，需要从 Git 索引中移除：

```bash
git rm --cached backend/lab.db
git rm -r --cached backend/.venv
git commit -m "chore: stop tracking local database and venv"
```

如果数据库里包含真实账号或敏感数据，建议更换测试账号密码，必要时重写 Git 历史。

## 启动后的演示账号

```text
admin / 123456
liyan / 123456
wangbo / 123456
```

首次部署后请立即修改密码。

## 配置优先级

前端 API 地址按以下顺序读取：

```text
URL 参数 ?api=...
→ frontend/config.js 中的 window.LAB_API_BASE
→ localStorage.lab_api_base
→ http://127.0.0.1:8000
```

例如临时测试：

```text
https://你的用户名.github.io/lab-ms/?api=https://lab-ms-api.onrender.com
```
