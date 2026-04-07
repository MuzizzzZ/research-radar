const STORAGE_KEY = "research-radar-lang";

const translations = {
  en: {
    "header.eyebrow": "Research Intel Radar",
    "header.subtitle": "Incremental literature tracking for topics, baseline citations, and related work.",
    "header.latest_report": "Latest report",
    "header.no_runs_yet": "No runs yet",
    "nav.home": "Home",
    "nav.topics": "Topics",
    "nav.baselines": "Baselines",
    "nav.config": "Config",
    "nav.reports": "Reports",
    "nav.about": "About",
    "footer.generated": "Generated from repository state and published with GitHub Pages.",
    "footer.data_sources": "Data: OpenAlex + Semantic Scholar",
    "common.topic": "Topic",
    "common.queries": "Queries",
    "common.tracked": "tracked",
    "common.citations": "citations",
    "common.related": "related",
    "common.new_today": "new today",
    "common.total_tracked_papers": "total tracked papers.",
    "common.new_citations": "new citations",
    "common.new_related_today": "new related papers today.",
    "paper.unknown_authors": "Unknown authors",
    "paper.unknown_date": "Unknown date",
    "paper.reason_unavailable": "Reason unavailable.",
    "paper.open_paper": "Open paper",
    "paper_label.high_confidence": "High confidence",
    "paper_label.candidate": "Candidate",
    "paper_label.filtered_out": "Filtered out",
    "index.new_scope_discoveries": "Today's new scope discoveries",
    "index.first_seen_globally": "papers were first seen globally.",
    "index.tracked_topics": "Tracked topics",
    "index.tracked_topics_desc": "Across multi-query topic monitors and baseline anchors.",
    "index.tracked_baselines": "Tracked baselines",
    "index.tracked_baselines_desc": "Citation and related-work deltas are grouped separately.",
    "index.topic_overview": "Topic Overview",
    "index.topic_overview_desc": "Counts are based on incremental discoveries retained in repository state.",
    "index.baseline_snapshot": "Baseline Snapshot",
    "index.baseline_snapshot_desc": "Baseline deltas distinguish direct citing papers from high-similarity related work.",
    "index.recent_papers": "Recent Papers",
    "index.recent_papers_desc": "A compact view of the latest accepted papers from the most recent run.",
    "index.empty_state": "Run `python -m src.main run` to generate the first report and site snapshot.",
    "index.latest_issues": "Latest Run Issues",
    "index.latest_issues_desc": "Source failures are recorded so the run can degrade gracefully instead of crashing.",
    "topics.title": "Topics",
    "topics.description": "Browse historical incremental discoveries grouped by topic.",
    "topics.filter_placeholder": "Filter papers by title or author",
    "topics.empty_state": "No topic-level papers have been recorded yet.",
    "baselines.title": "Baselines",
    "baselines.description": "Each baseline tracks direct citations and nearby related work separately.",
    "baselines.filter_placeholder": "Filter baseline papers",
    "baselines.new_citing_papers": "New Citing Papers",
    "baselines.new_related_papers": "New Related Papers",
    "baselines.empty_citing": "No citing papers have been recorded yet.",
    "baselines.empty_related": "No related papers have been recorded yet.",
    "reports.title": "Reports",
    "reports.description": "Daily markdown reports are committed to the repository and linked here.",
    "reports.archive_entry": "Daily report archive entry.",
    "reports.open_report": "Open markdown report",
    "reports.empty_state": "No reports have been generated yet.",
    "about.title": "About",
    "about.description": "research-radar is an incremental literature tracking system designed for repository-only deployment.",
    "about.architecture_title": "Architecture",
    "about.architecture_value": "GitHub Actions + repository-backed JSON/Markdown state + GitHub Pages static site",
    "about.architecture_note": "The project avoids long-running servers, online databases, and custom backend hosting.",
    "about.data_sources_title": "Data Sources",
    "about.limitations_title": "Limitations",
    "about.limitations.0": "The system relies on public metadata availability and API uptime.",
    "about.limitations.1": "Title-based fallback resolution can miss or over-match some baseline papers.",
    "about.limitations.2": "Rule-based relevance scoring is intentionally transparent but not exhaustive.",
    "config.title": "Config Studio",
    "config.description": "Set up topics and baseline papers with a search-first workflow designed for non-technical users.",
    "config.quickstart_title": "Quick Start",
    "config.quickstart_desc": "You only need to decide what to track. The page can search papers and fill most identifiers for you.",
    "config.step_topics": "Create one or more topics with a name and a few search phrases.",
    "config.step_search": "Search for a baseline paper by title, DOI, arXiv id, or author keywords.",
    "config.step_import": "Pick a search result to import it as a baseline automatically.",
    "config.step_publish": "When everything looks right, download YAML or commit the config back to GitHub in the advanced section.",
    "config.local_title": "Local Editing",
    "config.local_desc": "Drafts are autosaved in this browser. You can reset back to the repository snapshot at any time.",
    "config.reset_button": "Reset to repository snapshot",
    "config.download_topics": "Download topics.yaml",
    "config.download_baselines": "Download baselines.yaml",
    "config.github_title": "Commit Back to GitHub",
    "config.github_desc": "Optional: use a Personal Access Token in this browser session to commit both config files back to the repository.",
    "config.owner": "Repository owner",
    "config.repo": "Repository name",
    "config.branch": "Branch",
    "config.commit_message": "Commit message",
    "config.token": "GitHub token",
    "config.token_hint": "The token is only used in this tab and is never stored in localStorage.",
    "config.push_button": "Commit topics.yaml and baselines.yaml",
    "config.validation_title": "Validation",
    "config.topics_title": "Topics",
    "config.topics_desc": "Keep this simple: a topic name and a few queries are enough to start.",
    "config.add_topic": "Add topic",
    "config.baselines_title": "Baselines",
    "config.baselines_desc": "Imported papers land here. You can still tweak tracking options and advanced identifiers if needed.",
    "config.add_baseline": "Add baseline",
    "config.search_title": "Search Baseline Papers",
    "config.search_desc": "Search OpenAlex, Semantic Scholar, and Crossref, then import a paper instead of typing identifiers by hand.",
    "config.search_topic": "Attach to topic",
    "config.search_query_label": "Paper search",
    "config.search_placeholder": "Search by paper title, DOI, arXiv id, or author keywords",
    "config.search_button": "Search papers",
    "config.search_loading": "Searching paper sources...",
    "config.search_need_topic": "Create at least one topic before searching for baseline papers.",
    "config.search_choose_topic": "Choose a topic before importing a baseline paper.",
    "config.search_empty_query": "Enter a paper title, DOI, arXiv id, or author keywords first.",
    "config.search_no_hits": "No matching papers were found yet. Try a more specific title or identifier.",
    "config.search_use_result": "Use as baseline",
    "config.search_added": "Already added",
    "config.search_untitled": "Untitled paper",
    "config.empty_search_waiting_topic": "Add a topic first, then search for papers here.",
    "config.empty_search_results": "Search results will appear here.",
    "config.no_topics_available": "Create a topic first",
    "config.advanced_title": "Advanced Export and Publish",
    "config.advanced_desc": "Use this section when you want raw YAML files or want to commit the updated config back to GitHub.",
    "config.yaml_title": "YAML Preview",
    "config.topics_yaml": "topics.yaml preview",
    "config.baselines_yaml": "baselines.yaml preview",
    "config.field.id": "ID",
    "config.field.name": "Name",
    "config.field.queries": "Queries",
    "config.field.queries_hint": "One line per query, for example: vision language navigation",
    "config.field.exclude": "Exclude terms",
    "config.field.preferred_venues": "Preferred venues",
    "config.field.preferred_authors": "Preferred authors",
    "config.field.min_score": "Minimum score",
    "config.field.enabled": "Enabled",
    "config.field.title": "Title",
    "config.field.topic_id": "Topic ID",
    "config.field.doi": "DOI",
    "config.field.arxiv_id": "arXiv ID",
    "config.field.openalex_id": "OpenAlex ID",
    "config.field.semanticscholar_id": "Semantic Scholar ID",
    "config.field.track_new_citations": "Track new citations",
    "config.field.track_related": "Track related papers",
    "config.field.list_hint": "One item per line",
    "config.field.topic_placeholder": "Select a topic",
    "config.topic_card": "Topic",
    "config.baseline_card": "Baseline",
    "config.imported_from": "Imported from",
    "config.advanced_topic": "Advanced topic options",
    "config.advanced_baseline": "Advanced baseline options",
    "config.action.remove": "Remove",
    "config.empty_topics": "No topics yet. Add your first topic to start tracking.",
    "config.empty_baselines": "No baselines yet. Search for a paper and import it here.",
    "config.status.repo_loaded": "Loaded current repository config.",
    "config.status.draft_restored": "Restored an unsaved local draft from this browser.",
    "config.status.draft_saved": "Draft saved locally in this browser.",
    "config.status.reset_done": "Draft reset to the repository snapshot.",
    "config.status.baseline_imported": "Baseline imported:",
    "config.status.push_success": "Committed both config files back to GitHub successfully.",
    "config.status.push_pending": "Committing changes to GitHub...",
    "config.status.validation_ok": "Config is ready. No validation errors.",
    "config.status.validation_errors": "Validation errors must be fixed before exporting or committing.",
    "config.error.fetch": "Unable to load config payload for the site.",
    "config.error.owner_required": "Repository owner is required.",
    "config.error.repo_required": "Repository name is required.",
    "config.error.branch_required": "Branch is required.",
    "config.error.message_required": "Commit message is required.",
    "config.error.token_required": "A GitHub token is required to push config changes.",
    "config.error.github_push": "GitHub commit failed.",
    "title.index": "Research Radar | Home",
    "title.topics": "Research Radar | Topics",
    "title.baselines": "Research Radar | Baselines",
    "title.config": "Research Radar | Config",
    "title.reports": "Research Radar | Reports",
    "title.about": "Research Radar | About"
  },
  zh: {
    "header.eyebrow": "科研情报雷达",
    "header.subtitle": "面向科研主题、baseline 引文与相关工作的增量文献追踪系统。",
    "header.latest_report": "最新报告",
    "header.no_runs_yet": "尚未运行",
    "nav.home": "首页",
    "nav.topics": "主题",
    "nav.baselines": "基线论文",
    "nav.config": "配置",
    "nav.reports": "报告",
    "nav.about": "关于",
    "footer.generated": "站点由仓库状态生成，并通过 GitHub Pages 发布。",
    "footer.data_sources": "数据源：OpenAlex + Semantic Scholar",
    "common.topic": "主题",
    "common.queries": "检索词",
    "common.tracked": "已追踪",
    "common.citations": "引用论文",
    "common.related": "相关论文",
    "common.new_today": "今日新增",
    "common.total_tracked_papers": "篇累计追踪论文。",
    "common.new_citations": "篇新增引用论文",
    "common.new_related_today": "篇今日新增相关论文。",
    "paper.unknown_authors": "作者未知",
    "paper.unknown_date": "日期未知",
    "paper.reason_unavailable": "暂无入选原因。",
    "paper.open_paper": "打开论文",
    "paper_label.high_confidence": "高置信",
    "paper_label.candidate": "候选",
    "paper_label.filtered_out": "已过滤",
    "index.new_scope_discoveries": "今日新增发现",
    "index.first_seen_globally": "篇论文为首次全局发现。",
    "index.tracked_topics": "追踪主题",
    "index.tracked_topics_desc": "覆盖多查询 topic 监控与 baseline 锚点。",
    "index.tracked_baselines": "追踪基线",
    "index.tracked_baselines_desc": "将直接引用与高相关工作分别归档展示。",
    "index.topic_overview": "主题概览",
    "index.topic_overview_desc": "统计基于仓库中保存的增量发现结果。",
    "index.baseline_snapshot": "Baseline 快照",
    "index.baseline_snapshot_desc": "区分直接引用 baseline 的论文与高相似相关论文。",
    "index.recent_papers": "最近论文",
    "index.recent_papers_desc": "展示最近一次运行中入选的重点论文。",
    "index.empty_state": "运行 `python -m src.main run` 后即可生成首份报告和站点快照。",
    "index.latest_issues": "最近运行问题",
    "index.latest_issues_desc": "数据源失败会被记录下来，以便系统降级运行而不是直接崩溃。",
    "topics.title": "主题",
    "topics.description": "按 topic 浏览历史增量发现结果。",
    "topics.filter_placeholder": "按标题或作者筛选论文",
    "topics.empty_state": "当前还没有记录到主题级新增论文。",
    "baselines.title": "基线论文",
    "baselines.description": "每篇 baseline 分别追踪直接引用与邻近相关工作。",
    "baselines.filter_placeholder": "筛选 baseline 相关论文",
    "baselines.new_citing_papers": "新增引用论文",
    "baselines.new_related_papers": "新增相关论文",
    "baselines.empty_citing": "当前还没有记录到新增引用论文。",
    "baselines.empty_related": "当前还没有记录到新增相关论文。",
    "reports.title": "报告",
    "reports.description": "每日 Markdown 报告会提交到仓库，并在这里归档展示。",
    "reports.archive_entry": "日报归档条目。",
    "reports.open_report": "打开 Markdown 报告",
    "reports.empty_state": "当前还没有生成任何报告。",
    "about.title": "关于",
    "about.description": "research-radar 是一个面向纯仓库部署场景的增量文献追踪系统。",
    "about.architecture_title": "架构",
    "about.architecture_value": "GitHub Actions + 仓库内 JSON/Markdown 状态持久化 + GitHub Pages 静态站点",
    "about.architecture_note": "项目不依赖长期运行服务器、在线数据库或自定义后端托管。",
    "about.data_sources_title": "数据源",
    "about.limitations_title": "局限性",
    "about.limitations.0": "系统依赖公开元数据的可用性以及外部 API 的稳定性。",
    "about.limitations.1": "基于标题的回退解析可能漏召回，或把部分 baseline 论文匹配得过宽。",
    "about.limitations.2": "当前相关性评分强调可解释性，因此覆盖面不是无限扩张的。",
    "config.title": "配置工作台",
    "config.description": "用更适合非技术用户的搜索式流程来设置 topic 和 baseline 论文。",
    "config.quickstart_title": "快速开始",
    "config.quickstart_desc": "你只需要决定要追踪什么。页面会帮你搜索论文并自动补全大部分标识字段。",
    "config.step_topics": "先创建一个或多个 topic，填写名称和几条检索短语即可。",
    "config.step_search": "再用论文标题、DOI、arXiv id 或作者关键词搜索 baseline 论文。",
    "config.step_import": "从搜索结果中选择一篇论文，一键导入为 baseline。",
    "config.step_publish": "确认无误后，再到高级区域下载 YAML 或直接提交回 GitHub。",
    "config.local_title": "本地编辑",
    "config.local_desc": "草稿会自动保存在当前浏览器里，你可以随时恢复为仓库中的当前配置。",
    "config.reset_button": "恢复为仓库当前配置",
    "config.download_topics": "下载 topics.yaml",
    "config.download_baselines": "下载 baselines.yaml",
    "config.github_title": "提交回 GitHub",
    "config.github_desc": "可选：在当前浏览器会话中提供 Personal Access Token，把两个配置文件直接提交回仓库。",
    "config.owner": "仓库所有者",
    "config.repo": "仓库名",
    "config.branch": "分支",
    "config.commit_message": "提交信息",
    "config.token": "GitHub Token",
    "config.token_hint": "Token 只在当前页面内使用，不会写入 localStorage。",
    "config.push_button": "提交 topics.yaml 和 baselines.yaml",
    "config.validation_title": "校验结果",
    "config.topics_title": "Topics 配置",
    "config.topics_desc": "这里尽量保持简单，先写 topic 名称和几条 queries 就可以开始。",
    "config.add_topic": "新增 topic",
    "config.baselines_title": "Baseline 配置",
    "config.baselines_desc": "导入后的论文会出现在这里，你仍然可以调整追踪选项和高级标识字段。",
    "config.add_baseline": "新增 baseline",
    "config.search_title": "搜索 Baseline 论文",
    "config.search_desc": "联合搜索 OpenAlex、Semantic Scholar 和 Crossref，然后直接导入论文，而不是手动填写标识符。",
    "config.search_topic": "挂载到 topic",
    "config.search_query_label": "论文搜索",
    "config.search_placeholder": "按论文标题、DOI、arXiv id 或作者关键词搜索",
    "config.search_button": "搜索论文",
    "config.search_loading": "正在搜索论文数据源...",
    "config.search_need_topic": "请先创建至少一个 topic，再搜索 baseline 论文。",
    "config.search_choose_topic": "导入 baseline 前请先选择一个 topic。",
    "config.search_empty_query": "请先输入论文标题、DOI、arXiv id 或作者关键词。",
    "config.search_no_hits": "暂时没有找到匹配论文，可以尝试更完整的标题或更明确的标识。",
    "config.search_use_result": "设为 baseline",
    "config.search_added": "已添加",
    "config.search_untitled": "未命名论文",
    "config.empty_search_waiting_topic": "请先新增 topic，然后在这里搜索论文。",
    "config.empty_search_results": "搜索结果会显示在这里。",
    "config.no_topics_available": "请先创建 topic",
    "config.advanced_title": "高级导出与发布",
    "config.advanced_desc": "需要原始 YAML 或想直接提交回 GitHub 时，再使用这个区域。",
    "config.yaml_title": "YAML 预览",
    "config.topics_yaml": "topics.yaml 预览",
    "config.baselines_yaml": "baselines.yaml 预览",
    "config.field.id": "ID",
    "config.field.name": "名称",
    "config.field.queries": "Queries",
    "config.field.queries_hint": "每行一条 query，例如：vision language navigation",
    "config.field.exclude": "排除词",
    "config.field.preferred_venues": "偏好期刊/会议",
    "config.field.preferred_authors": "偏好作者",
    "config.field.min_score": "最低分数",
    "config.field.enabled": "是否启用",
    "config.field.title": "标题",
    "config.field.topic_id": "Topic ID",
    "config.field.doi": "DOI",
    "config.field.arxiv_id": "arXiv ID",
    "config.field.openalex_id": "OpenAlex ID",
    "config.field.semanticscholar_id": "Semantic Scholar ID",
    "config.field.track_new_citations": "追踪新增引用",
    "config.field.track_related": "追踪相关论文",
    "config.field.list_hint": "每行一个条目",
    "config.field.topic_placeholder": "选择所属 topic",
    "config.topic_card": "Topic",
    "config.baseline_card": "Baseline",
    "config.imported_from": "导入来源",
    "config.advanced_topic": "Topic 高级选项",
    "config.advanced_baseline": "Baseline 高级选项",
    "config.action.remove": "删除",
    "config.empty_topics": "当前还没有 topic，先新增一个开始追踪。",
    "config.empty_baselines": "当前还没有 baseline，可先搜索论文并导入到这里。",
    "config.status.repo_loaded": "已载入仓库中的当前配置。",
    "config.status.draft_restored": "已恢复当前浏览器中的未保存草稿。",
    "config.status.draft_saved": "草稿已保存在当前浏览器。",
    "config.status.reset_done": "已恢复为仓库中的当前配置。",
    "config.status.baseline_imported": "已导入 baseline：",
    "config.status.push_success": "两个配置文件已经成功提交回 GitHub。",
    "config.status.push_pending": "正在把配置提交到 GitHub...",
    "config.status.validation_ok": "配置校验通过，可以导出或提交。",
    "config.status.validation_errors": "存在校验错误，修复后才能导出或提交。",
    "config.error.fetch": "无法加载站点配置数据。",
    "config.error.owner_required": "请填写仓库所有者。",
    "config.error.repo_required": "请填写仓库名。",
    "config.error.branch_required": "请填写分支名。",
    "config.error.message_required": "请填写提交信息。",
    "config.error.token_required": "提交到 GitHub 需要提供 Token。",
    "config.error.github_push": "提交到 GitHub 失败。",
    "title.index": "Research Radar | 首页",
    "title.topics": "Research Radar | 主题",
    "title.baselines": "Research Radar | 基线论文",
    "title.config": "Research Radar | 配置",
    "title.reports": "Research Radar | 报告",
    "title.about": "Research Radar | 关于"
  }
};

function preferredLanguage() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "zh") {
    return saved;
  }
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function translate(key, language) {
  return translations[language]?.[key] || translations.en[key] || key;
}

function translateReasonText(reason, language) {
  if (!reason || language === "en") {
    return reason;
  }

  return reason
    .split(", ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      let match = part.match(/^title hit x(\d+)$/);
      if (match) {
        return `标题命中 x${match[1]}`;
      }
      match = part.match(/^abstract hit x(\d+)$/);
      if (match) {
        return `摘要命中 x${match[1]}`;
      }
      match = part.match(/^preferred author x(\d+)$/);
      if (match) {
        return `偏好作者命中 x${match[1]}`;
      }
      match = part.match(/^exclude penalty x(\d+)$/);
      if (match) {
        return `排除词惩罚 x${match[1]}`;
      }
      match = part.match(/^title similarity (\d+)$/);
      if (match) {
        return `标题相似度 ${match[1]}`;
      }
      match = part.match(/^matched topic query '(.+)'$/);
      if (match) {
        return `命中主题检索词 '${match[1]}'`;
      }
      match = part.match(/^new citing paper for '(.+)'$/);
      if (match) {
        return `该论文为 '${match[1]}' 的新增引用论文`;
      }
      match = part.match(/^baseline related paper for '(.+)'$/);
      if (match) {
        return `该论文与 baseline '${match[1]}' 高相关`;
      }
      match = part.match(/^linked to baseline (.+)$/);
      if (match) {
        return `关联到 baseline ${match[1]}`;
      }
      if (part === "preferred venue") {
        return "命中偏好期刊/会议";
      }
      if (part === "direct citation to baseline") {
        return "直接引用了 baseline";
      }
      if (part === "shared author") {
        return "存在共同作者";
      }
      if (part === "related to baseline topic cluster") {
        return "与 baseline 所在主题簇高度相关";
      }
      if (part === "weak topical signal") {
        return "主题信号较弱";
      }
      return part;
    })
    .join("，");
}

function translateIssueText(issue, language) {
  if (!issue || language === "en") {
    return issue;
  }

  let match = issue.match(/^Semantic Scholar citation fetch failed for baseline ([^:]+): (.+)$/);
  if (match) {
    return `Semantic Scholar 抓取 baseline ${match[1]} 的引用论文失败：${translateIssueDetail(match[2], language)}`;
  }

  match = issue.match(/^Baseline ([^ ]+) could not be resolved to a citation-capable identifier\.$/);
  if (match) {
    return `Baseline ${match[1]} 目前无法解析到可用于引用追踪的稳定标识。`;
  }

  match = issue.match(/^OpenAlex topic fetch failed for ([^/]+) \/ '(.+)': (.+)$/);
  if (match) {
    return `OpenAlex 抓取主题 ${match[1].trim()} 的检索词 '${match[2]}' 失败：${translateIssueDetail(match[3], language)}`;
  }

  match = issue.match(/^Historical report reconstructed from saved state; collection-time errors are not available\.$/);
  if (match) {
    return "该历史报告由已保存状态重建，因此无法恢复采集当时的错误信息。";
  }

  return translateIssueDetail(issue, language);
}

function translateIssueDetail(detail, language) {
  if (!detail || language === "en") {
    return detail;
  }
  return detail
    .replace("Semantic Scholar API rate limit exceeded.", "Semantic Scholar API 达到限流。")
    .replace("rate limited", "已被限流")
    .replace("HTTPSConnectionPool", "HTTPS 连接池")
    .replace("Failed to resolve", "无法解析");
}

function translateReportPreview(preview, language) {
  if (!preview || language === "en") {
    return preview;
  }
  return preview
    .replace("## Summary", "## 摘要")
    .replace("## Topic-Level New Papers", "## Topic 级新增论文")
    .replace("## Baseline Tracking", "## Baseline 追踪")
    .replace("## Data Sources", "## 数据源")
    .replace("## Failures / Known Limitations", "## 失败情况 / 已知限制")
    .replace("Daily report archive entry.", "日报归档条目。");
}

function pageTitleKey() {
  const filename = window.location.pathname.split("/").pop() || "index.html";
  const mapping = {
    "": "title.index",
    "index.html": "title.index",
    "topics.html": "title.topics",
    "baselines.html": "title.baselines",
    "config.html": "title.config",
    "reports.html": "title.reports",
    "about.html": "title.about"
  };
  return mapping[filename] || "title.index";
}

function applyLanguage(language) {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.documentElement.dataset.lang = language;
  window.localStorage.setItem(STORAGE_KEY, language);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = translate(element.dataset.i18n, language);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", translate(element.dataset.i18nPlaceholder, language));
  });

  document.querySelectorAll("[data-paper-label]").forEach((element) => {
    element.textContent = translate(`paper_label.${element.dataset.paperLabel}`, language);
  });

  document.querySelectorAll("[data-paper-reason]").forEach((element) => {
    element.textContent = translateReasonText(element.dataset.paperReason, language);
  });

  document.querySelectorAll("[data-issue-text]").forEach((element) => {
    element.textContent = translateIssueText(element.dataset.issueText, language);
  });

  document.querySelectorAll("[data-report-preview]").forEach((element) => {
    element.textContent = translateReportPreview(element.dataset.reportPreview, language);
  });

  document.querySelectorAll("[data-lang-switch]").forEach((button) => {
    const isActive = button.dataset.langSwitch === language;
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  document.title = translate(pageTitleKey(), language);
  window.dispatchEvent(new CustomEvent("research-radar:language-changed", { detail: { language } }));
}

document.querySelectorAll("[data-lang-switch]").forEach((button) => {
  button.addEventListener("click", () => {
    applyLanguage(button.dataset.langSwitch);
  });
});

document.querySelectorAll("[data-filter-input]").forEach((input) => {
  input.addEventListener("input", (event) => {
    const term = event.target.value.trim().toLowerCase();
    const groupName = event.target.getAttribute("data-filter-input");
    document.querySelectorAll(`[data-filter-group="${groupName}"] .paper-card`).forEach((card) => {
      const haystack = (card.getAttribute("data-search") || "").toLowerCase();
      card.style.display = !term || haystack.includes(term) ? "" : "none";
    });
  });
});

applyLanguage(preferredLanguage());

window.researchRadarI18n = {
  translate,
  applyLanguage,
  preferredLanguage,
  getLanguage: () => document.documentElement.dataset.lang || preferredLanguage()
};
