# research-radar

`research-radar` 是一个面向科研主题追踪的增量文献雷达系统。它不试图替代论文搜索引擎，而是专注解决一个更具体的问题：给定 topic 和 baseline papers，持续发现“新出现的、值得看”的论文，并把结果以仓库文件、Markdown 日报、JSON 数据和 GitHub Pages 静态站点的方式沉淀下来。

这个仓库当前提供的是一个可运行、可发布、可维护的 MVP，主链路已经打通：

- topic 配置
- baseline 配置
- OpenAlex 主题检索
- Semantic Scholar baseline citation 补强
- 规则化相关性打分
- 去重与增量状态管理
- Markdown 日报生成
- GitHub Pages 静态站点生成
- 浏览器端 Config Studio：可视化编辑 topic / baseline、自动校验、导出 YAML、可选直接提交回 GitHub
- GitHub Actions 定时运行

## 为什么采用这个架构

本项目刻意采用 `GitHub Actions + GitHub Pages + 仓库文件持久化` 的组合，而不是服务器 + 数据库：

- 不需要长期运行的后端服务
- 不需要 PostgreSQL / MySQL / Redis / MongoDB
- 所有状态都保存在仓库内，便于版本控制、回溯和审查
- GitHub Actions 负责定时抓取和生成内容
- GitHub Pages 负责发布静态站点
- fork / clone / 复用门槛低，适合个人研究组和开源协作

## 功能特性

- 支持多个 topic，每个 topic 可以配置多条 queries、排除词、偏好 venue、偏好作者和最低分阈值
- 支持多个 baseline paper，分别追踪：
  - 新增 citing papers
  - 与 baseline 高相关但不一定直接引用的新增论文
- 只保留新增结果，避免每天重复推送历史论文
- 多源归一化与去重，优先使用 DOI / arXiv / OpenAlex / Semantic Scholar id
- 基于关键词、标题、摘要、venue、作者、baseline 关系的可解释规则打分
- 生成：
  - `reports/daily/*.md` 日报
  - `data/site_data/*.json` 前端/自动化可消费 JSON
  - `docs/*.html` GitHub Pages 静态页面
- API 失败时优雅降级，并把失败信息写入报告

## 架构图

```text
config/*.yaml
    |
    v
python -m src.main run
    |
    +--> OpenAlex topic search
    |
    +--> Semantic Scholar baseline resolve / citations
    |
    v
normalize -> dedup -> score -> delta(state JSON)
    |
    +--> data/state/*.json
    +--> reports/daily/YYYY-MM-DD.md
    +--> data/site_data/*.json
    +--> docs/*.html + docs/data/*.json + docs/reports/*
                               |
                               v
                         GitHub Pages
```

## 目录结构

```text
research-radar/
├─ .github/workflows/
├─ config/
├─ src/
│  ├─ clients/
│  ├─ core/
│  ├─ models/
│  ├─ templates/
│  └─ utils/
├─ data/
│  ├─ state/
│  ├─ cache/
│  └─ site_data/
├─ reports/
│  ├─ daily/
│  └─ weekly/
├─ docs/
├─ tests/
├─ README.md
├─ requirements.txt
└─ LICENSE
```

目录职责简述：

- `config/`: topic / baseline / settings 配置
- `src/clients/`: OpenAlex 与 Semantic Scholar API client
- `src/core/`: 配置加载、归一化、去重、打分、增量检测、报告与站点构建
- `data/state/`: 仓库内持久化状态
- `data/site_data/`: 站点/自动化用 JSON
- `reports/daily/`: Markdown 日报归档
- `docs/`: GitHub Pages 静态站点输出
- `tests/`: 基础测试

## 安装说明

推荐 Python `3.11+`，优先 `3.12`。

```bash
git clone <your-repo-url>
cd research-radar
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 配置说明

仓库已经附带一套可直接运行的默认配置：

- `config/topics.yaml`
- `config/baselines.yaml`
- `config/settings.yaml`

同时也提供镜像模板：

- `config/topics.example.yaml`
- `config/baselines.example.yaml`
- `config/settings.example.yaml`

如果你想从示例模板重新开始，可以复制：

```bash
cp config/topics.example.yaml config/topics.yaml
cp config/baselines.example.yaml config/baselines.yaml
cp config/settings.example.yaml config/settings.yaml
```

### topics 配置

每个 topic 至少包含：

- `id`
- `name`
- `queries`
- `exclude`
- `preferred_venues`
- `preferred_authors`
- `min_score`
- `enabled`

默认示例包含两个方向：

- `uav-ris`
- `vln`

### 前端配置工作台

站点中的 `Config` 页面提供了一套纯前端配置工作台，专门编辑：

- `topics.yaml`
- `baselines.yaml`

它现在采用更适合非技术用户的“搜索式配置”：

- Topic 先填名称和 queries，其他字段放在高级选项里
- Baseline 不要求你手动填写 DOI / OpenAlex / Semantic Scholar id
- 页面会联动搜索 OpenAlex、Semantic Scholar 和 Crossref
- 你可以从搜索结果中直接选择论文，一键导入 baseline 元数据
- 草稿会保存在当前浏览器的 `localStorage`
- 页面会实时校验重复 id、缺失 query、baseline topic_id 不存在等问题
- 你可以下载新的 `topics.yaml` / `baselines.yaml`
- 也可以在浏览器中提供 GitHub Personal Access Token，直接把两个文件提交回仓库

说明：

- 为避免把敏感字段暴露到公开 Pages 站点，当前前端只编辑 `topics.yaml` 和 `baselines.yaml`
- `settings.yaml` 仍建议在本地仓库中维护
- GitHub token 不会写入 `localStorage`，只在当前浏览器会话中使用
- 页面中的论文搜索属于前端直连公开 API；如果外部源限流或临时不可用，导入功能会降级为局部失败提示

### baselines 配置

每个 baseline 至少包含：

- `id`
- `title`
- `topic_id`
- `doi` / `arxiv_id` / `openalex_id` / `semanticscholar_id`（均可选）
- `track_new_citations`
- `track_related`
- `enabled`

如果没有明确 id，系统会先尝试标题解析；这能跑通主链路，但生产使用时仍建议尽量填写可靠 id。

### settings 配置

关键字段：

- `lookback_days`
- `timezone`
- `output_dir`
- `site_dir`
- `reports_dir`
- `log_level`
- `openalex_email`
- `semanticscholar_api_key_env`
- `max_results_per_topic`
- `request_timeout_seconds`

## 本地运行

校验配置：

```bash
python -m src.main validate-config
```

执行一次增量更新：

```bash
python -m src.main run
```

执行 dry-run，不写入状态/报告/站点：

```bash
python -m src.main run --dry-run
```

只重建静态站点：

```bash
python -m src.main build-site
```

按日期重建日报：

```bash
python -m src.main build-report --date 2026-04-06
```

### 本地运行说明

- 在无网络环境下，命令仍会成功返回，但会把数据源失败记录到输出和报告中
- `run` 会更新 `data/state/`、生成 `reports/daily/*.md`，并重建 `docs/`
- `build-site` 只依赖本地保存的状态与报告
- `build-site` 生成的 `docs/config.html` 可直接作为配置工作台使用

## GitHub Actions 配置

仓库包含两个工作流：

### 1. `daily-update.yml`

功能：

- 支持定时运行
- 支持手动触发
- 安装 Python 与依赖
- 校验配置
- 运行 `python -m src.main run`
- 将 `data/`、`reports/`、`docs/` 的变更提交回仓库
- 无变化时不提交空 commit

当前 schedule 是：

- `0 1 * * *`，即 UTC `01:00`
- 对于 `Asia/Shanghai`，对应北京时间 `09:00`

### 2. `deploy-pages.yml`

功能：

- 在 `main` / `master` 分支中 `docs/` 变化后触发
- 使用官方 Pages actions 上传并部署 `docs/`

如果你的默认分支不是 `main` 或 `master`，请同步修改该 workflow 的 `branches` 配置。

### 建议配置的 Secrets

- `SEMANTIC_SCHOLAR_API_KEY`

说明：

- 这个 secret 不是强制必需；没有它时，系统仍会尝试运行
- 但配置后，Semantic Scholar baseline 相关能力会更稳定

### OpenAlex polite pool

`settings.yaml` 中支持：

- `openalex_email`

建议填写真实邮箱，以便使用 OpenAlex polite pool。

## GitHub Pages 发布方式

1. 将仓库推送到 GitHub
2. 打开仓库 `Settings > Pages`
3. Source 选择 `GitHub Actions`
4. 确保 `deploy-pages.yml` 已启用
5. 触发一次：
   - 手动运行 `Daily Update`
   - 或本地先执行 `python -m src.main build-site` 并 push

部署完成后，站点中的 `Config` 页面可以直接创建 topic，并通过搜索论文来导入 baseline。如果你希望从前端直接提交回 GitHub，需要准备一个具有仓库内容写权限的 Personal Access Token。

## 数据源说明

### OpenAlex

当前主要用于：

- topic 关键词检索
- 按时间窗口抓取近期 works
- 提供标题、作者、日期、venue、abstract 等基础元数据

### Semantic Scholar

当前主要用于：

- baseline 解析
- baseline citing papers 抓取
- baseline 元数据补强

为减少限流影响，项目会把 baseline 解析结果缓存到 `data/cache/baseline_seeds.json`。当 Semantic Scholar 出现 `429` 时，系统会短期冷却该 baseline 的标题解析，并尝试回退到 OpenAlex 标题搜索。

## 去重策略

去重优先级如下：

1. DOI
2. arXiv ID
3. OpenAlex ID
4. Semantic Scholar ID
5. 规范化标题 hash

当缺少统一 id 时，会使用保守的弱匹配策略：

- 标题相似度
- 作者重叠
- 年份接近

## 相关性打分说明

当前是可解释的规则打分，不依赖 LLM。得分来自：

- topic query 在标题中的命中
- topic query 在摘要中的命中
- preferred venue 加分
- preferred author 加分
- exclude 词惩罚
- baseline 直接 citation 加分
- baseline 标题相似度加分
- baseline 作者重叠加分

分类输出：

- `high_confidence`
- `candidate`
- `filtered_out`

## 已知局限

- OpenAlex 与 Semantic Scholar 的公开 API 可用性会影响结果覆盖率
- 缺少明确 id 的 baseline 依赖标题解析，可能会漏召回或误匹配
- 目前 related detection 主要基于标题/作者/主题邻近关系，属于保守 MVP
- 当前只实现了日报主链路，`weekly digest` 目录已预留但尚未启用
- 静态站点以预生成内容为主，前端交互保持轻量
- 浏览器端直写 GitHub 依赖用户手动提供 Token，更适合个人仓库或小团队受控使用
- Baseline 搜索依赖公开论文 API 的 CORS、可用性和限流策略，因此搜索体验会受外部源状态影响

## 后续可扩展方向

- weekly digest
- topic 趋势统计
- 更细的 failure report
- richer JSON schema for downstream analytics
- baseline graph expansion（references / co-citation / recommendation）
- 更丰富的前端筛选与对比视图

## 工程假设

- baseline id 缺失时允许标题回退解析
- API 失败时优先降级并保留失败说明，而不是整轮崩溃
- 仓库默认提交一份可运行配置，便于 clone 后立即执行命令
- `docs/` 作为 Pages 发布目录，日报 markdown 会复制到 `docs/reports/` 供站点直接访问

## 基础测试

```bash
python -m pytest -q
```

当前测试覆盖：

- 配置加载
- 论文归一化
- 去重
- 增量检测
- 基础打分器

## 首次推送到 GitHub 的建议步骤

```bash
git init
git add .
git commit -m "feat: bootstrap research-radar"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

然后：

1. 在 GitHub 仓库里配置 `SEMANTIC_SCHOLAR_API_KEY`（可选但推荐）
2. 开启 GitHub Actions
3. 在 Pages 设置中选择 `GitHub Actions`
4. 手动触发一次 `Daily Update`
