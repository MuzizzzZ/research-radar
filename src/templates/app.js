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
    "title.index": "Research Radar | Home",
    "title.topics": "Research Radar | Topics",
    "title.baselines": "Research Radar | Baselines",
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
    "title.index": "Research Radar | 首页",
    "title.topics": "Research Radar | 主题",
    "title.baselines": "Research Radar | 基线论文",
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
