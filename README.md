# DSH Archive Manager 插件 (Codex-style 归档管理)

为 DeepSeek Harness (DSH) Web 界面提供与 Codex 1:1 一致的**会话归档管理**功能，支持在设置页中直观查看、按项目筛选/排序、一键取消归档以及彻底删除归档会话。

---

## 🌟 核心特性

1. **Codex 1:1 视觉与交互规范**：
   - 卡片外观保持 DSH 官方卡片统一规范（深灰背景、12px 圆角、矢量箭头旋转动效），仅在**设置 -> 插件**选项中加载；
   - 展开后提供顶层搜索栏（`搜索已归档聊天`）、排序筛选（`全部聊天` / `最早优先`）与项目筛选（`所有项目` / 各具体项目）。
2. **按项目分组与批量管理**：
   - 会话按所属工作区/项目自动分组展示，带有项目文件夹图标及对话计数；
   - 每个项目组支持 `···` 更多操作菜单，可一键「**删除项目中的全部内容**」。
3. **真实内容解析与还原**：
   - 自动解析底层会话流，精确展示会话标题与首条消息内容，日期格式与 Codex 一致（如 `2026年8月15日, 1:34`）；
   - **取消归档**：点击「取消归档」按钮，会话立即还原回原所属工作区列表，并通过 SSE 实时广播同步侧边栏；
   - **彻底删除**：点击垃圾桶图标彻底删除会话元数据及磁盘数据文件，释放存储空间。
4. **实时双向同步（Live Sync）**：
   - 卡片展开时自动监听侧边栏归档变动，在工作区侧边栏归档或恢复会话时，归档管理列表自动无感同步更新。

---

## 📦 如何安装与配置到 DSH

DSH 采用 Cordis 模块化微内核架构，你可以通过以下两种方式之一安装该插件：

### 推荐方法：使用 DSH 官方 CLI 命令（一键安装）

在终端中执行以下命令（将 `<插件所在绝对路径>` 替换为你本地实际存放 `dsh-archive-manager` 的绝对路径）：

```bash
# 将插件以 link 方式添加至 web profile 的依赖中
dsh plugin --profile web add -w "link:<插件所在绝对路径>"
```

例如插件存放在统一插件目录下时：
```bash
dsh plugin --profile web add -w "link:/path/to/dsh/plugin/dsh-archive-manager"
```

> **注意**：如果执行 `add` 后启动报错提示子包重复声明，请检查 `~/.dsh/profiles/web/package.json` 中的 `dsh.profile.bundles` 数组，确保其中仅包含根包（如 `dsh-archive-manager`、`@linxin666/dsh-web-ui-all` 等），避免包含子组件包。

---

### 手动安装配置方法

如果你希望手动配置文件：

#### 1. 编辑 `~/.dsh/profiles/web/package.json`

在 `dependencies` 中添加软链接依赖，并在 `dsh.profile.bundles` 列表中注册该插件：

```json
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": {
    "dsh-archive-manager": "link:/path/to/dsh/plugin/dsh-archive-manager"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-archive-manager"
      ]
    }
  }
}
```

#### 2. 在 Profile 目录下安装链接

```bash
cd ~/.dsh/profiles/web
pnpm install
```

---

## 🚀 启动与体验

启动 DSH Web 服务：

```bash
dsh --profile web
# 或者
dsh web
```

打开浏览器访问 [http://127.0.0.1:3080/](http://127.0.0.1:3080/)，点击侧边栏底部的齿轮图标进入**设置 -> 插件**，即可看到「归档管理」卡片。

---

## 📂 项目结构

```text
dsh-archive-manager/
├── cordis.patch.yml   # Cordis 插件 Profile 声明补丁
├── package.json       # 模块清单与依赖声明
├── README.md          # 插件说明文档
└── lib/
    ├── index.js       # Host 端（提供 /api/dsh-archive-manager/* 接口与 workspaceRegistry 交互）
    └── client.js      # Client 端（Codex 风格卡片交互、项目分组、搜索筛选、删除与还原逻辑）
```
