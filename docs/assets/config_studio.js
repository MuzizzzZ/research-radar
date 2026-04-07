const CONFIG_DRAFT_KEY = "research-radar-config-draft";
const CONFIG_REPO_KEY = "research-radar-config-repo";

const state = {
  repoSnapshot: null,
  topics: [],
  baselines: [],
  validation: { errors: [], warnings: [] },
  busy: false,
  status: { kind: "info", key: "", detail: "" },
  search: {
    query: "",
    topicId: "",
    loading: false,
    results: [],
    issues: [],
    summary: ""
  }
};

let draftSaveTimer = null;

function configRootPresent() {
  return Boolean(document.getElementById("topics-editor"));
}

function i18n() {
  return window.researchRadarI18n || {
    translate: (key) => key,
    getLanguage: () => "en"
  };
}

function currentLanguage() {
  return i18n().getLanguage();
}

function t(key) {
  return i18n().translate(key, currentLanguage());
}

function isZh() {
  return currentLanguage() === "zh";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value, fallback = "item") {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return normalized || fallback;
}

function uniqueSlug(base, existingIds, fallback) {
  const seed = slugify(base, fallback);
  if (!existingIds.has(seed)) {
    return seed;
  }
  let index = 2;
  while (existingIds.has(`${seed}-${index}`)) {
    index += 1;
  }
  return `${seed}-${index}`;
}

function normalizeDoi(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:/i, "")
    .toLowerCase();
}

function normalizeArxiv(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/arxiv\.org\/abs\//i, "")
    .replace(/^arxiv:/i, "")
    .toLowerCase();
}

function normalizeOpenAlex(value) {
  return String(value || "").trim();
}

function defaultTopic() {
  const used = new Set(sanitizedTopics().map((topic) => topic.id).filter(Boolean));
  return {
    id: uniqueSlug("new-topic", used, "topic"),
    name: "",
    queries: [],
    exclude: [],
    preferred_venues: [],
    preferred_authors: [],
    min_score: null,
    enabled: true
  };
}

function defaultBaseline(topicId = "") {
  const topicIds = sanitizedTopics().map((topic) => topic.id).filter(Boolean);
  return {
    id: uniqueSlug("new-baseline", new Set(sanitizedBaselines().map((baseline) => baseline.id).filter(Boolean)), "baseline"),
    title: "",
    topic_id: topicId || topicIds[0] || "",
    doi: "",
    arxiv_id: "",
    openalex_id: "",
    semanticscholar_id: "",
    authors: [],
    year: null,
    venue: "",
    publication_date: "",
    best_url: "",
    imported_from: [],
    track_new_citations: true,
    track_related: true,
    enabled: true
  };
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function bootstrapPayload() {
  const node = document.getElementById("config-bootstrap");
  if (!node || !node.textContent.trim()) {
    return null;
  }
  try {
    return JSON.parse(node.textContent);
  } catch (error) {
    console.warn("Failed to parse config bootstrap payload", error);
    return null;
  }
}

async function loadConfigPayload() {
  const inline = bootstrapPayload();
  if (inline) {
    return inline;
  }
  const response = await fetch("data/config.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${t("config.error.fetch")} (${response.status})`);
  }
  return response.json();
}

function hydrateTopic(topic) {
  const merged = { ...defaultTopic(), ...topic };
  return {
    ...merged,
    id: String(merged.id || "").trim(),
    name: String(merged.name || "").trim(),
    queries: Array.isArray(merged.queries) ? merged.queries.map((item) => String(item).trim()).filter(Boolean) : [],
    exclude: Array.isArray(merged.exclude) ? merged.exclude.map((item) => String(item).trim()).filter(Boolean) : [],
    preferred_venues: Array.isArray(merged.preferred_venues)
      ? merged.preferred_venues.map((item) => String(item).trim()).filter(Boolean)
      : [],
    preferred_authors: Array.isArray(merged.preferred_authors)
      ? merged.preferred_authors.map((item) => String(item).trim()).filter(Boolean)
      : [],
    min_score: Number.isFinite(Number(merged.min_score)) ? Number(merged.min_score) : null,
    enabled: merged.enabled !== false
  };
}

function hydrateBaseline(baseline) {
  const merged = { ...defaultBaseline(baseline.topic_id || ""), ...baseline };
  return {
    ...merged,
    id: String(merged.id || "").trim(),
    title: String(merged.title || "").trim(),
    topic_id: String(merged.topic_id || "").trim(),
    doi: normalizeDoi(merged.doi),
    arxiv_id: normalizeArxiv(merged.arxiv_id),
    openalex_id: normalizeOpenAlex(merged.openalex_id),
    semanticscholar_id: String(merged.semanticscholar_id || "").trim(),
    authors: Array.isArray(merged.authors) ? merged.authors.map((item) => String(item).trim()).filter(Boolean) : [],
    year: Number.isFinite(Number(merged.year)) ? Number(merged.year) : null,
    venue: String(merged.venue || "").trim(),
    publication_date: String(merged.publication_date || "").trim(),
    best_url: String(merged.best_url || "").trim(),
    imported_from: Array.isArray(merged.imported_from) ? merged.imported_from.map((item) => String(item).trim()).filter(Boolean) : [],
    track_new_citations: merged.track_new_citations !== false,
    track_related: merged.track_related !== false,
    enabled: merged.enabled !== false
  };
}

function sanitizeTopic(topic) {
  const hydrated = hydrateTopic(topic);
  return {
    id: hydrated.id,
    name: hydrated.name,
    queries: hydrated.queries,
    exclude: hydrated.exclude,
    preferred_venues: hydrated.preferred_venues,
    preferred_authors: hydrated.preferred_authors,
    min_score: hydrated.min_score,
    enabled: hydrated.enabled
  };
}

function sanitizeBaseline(baseline) {
  const hydrated = hydrateBaseline(baseline);
  return {
    id: hydrated.id,
    title: hydrated.title,
    topic_id: hydrated.topic_id,
    ...(hydrated.doi ? { doi: hydrated.doi } : {}),
    ...(hydrated.arxiv_id ? { arxiv_id: hydrated.arxiv_id } : {}),
    ...(hydrated.openalex_id ? { openalex_id: hydrated.openalex_id } : {}),
    ...(hydrated.semanticscholar_id ? { semanticscholar_id: hydrated.semanticscholar_id } : {}),
    track_new_citations: hydrated.track_new_citations,
    track_related: hydrated.track_related,
    enabled: hydrated.enabled
  };
}

function sanitizedTopics() {
  return state.topics.map(sanitizeTopic);
}

function sanitizedBaselines() {
  return state.baselines.map(sanitizeBaseline);
}

function yamlQuote(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

function appendYamlList(lines, indent, key, items) {
  if (!items.length) {
    lines.push(`${indent}${key}: []`);
    return;
  }
  lines.push(`${indent}${key}:`);
  items.forEach((item) => lines.push(`${indent}  - ${yamlQuote(item)}`));
}

function serializeTopicsYaml(topics) {
  if (!topics.length) {
    return "topics: []\n";
  }
  const lines = ["topics:"];
  topics.forEach((topic) => {
    lines.push(`  - id: ${yamlQuote(topic.id)}`);
    lines.push(`    name: ${yamlQuote(topic.name)}`);
    appendYamlList(lines, "    ", "queries", topic.queries);
    appendYamlList(lines, "    ", "exclude", topic.exclude);
    appendYamlList(lines, "    ", "preferred_venues", topic.preferred_venues);
    appendYamlList(lines, "    ", "preferred_authors", topic.preferred_authors);
    lines.push(`    min_score: ${topic.min_score == null ? "null" : String(topic.min_score)}`);
    lines.push(`    enabled: ${topic.enabled ? "true" : "false"}`);
  });
  return `${lines.join("\n")}\n`;
}

function serializeBaselinesYaml(baselines) {
  if (!baselines.length) {
    return "baselines: []\n";
  }
  const lines = ["baselines:"];
  baselines.forEach((baseline) => {
    lines.push(`  - id: ${yamlQuote(baseline.id)}`);
    lines.push(`    title: ${yamlQuote(baseline.title)}`);
    lines.push(`    topic_id: ${yamlQuote(baseline.topic_id)}`);
    if (baseline.doi) {
      lines.push(`    doi: ${yamlQuote(baseline.doi)}`);
    }
    if (baseline.arxiv_id) {
      lines.push(`    arxiv_id: ${yamlQuote(baseline.arxiv_id)}`);
    }
    if (baseline.openalex_id) {
      lines.push(`    openalex_id: ${yamlQuote(baseline.openalex_id)}`);
    }
    if (baseline.semanticscholar_id) {
      lines.push(`    semanticscholar_id: ${yamlQuote(baseline.semanticscholar_id)}`);
    }
    lines.push(`    track_new_citations: ${baseline.track_new_citations ? "true" : "false"}`);
    lines.push(`    track_related: ${baseline.track_related ? "true" : "false"}`);
    lines.push(`    enabled: ${baseline.enabled ? "true" : "false"}`);
  });
  return `${lines.join("\n")}\n`;
}

function validationMessage(en, zh) {
  return isZh() ? zh : en;
}

function computeValidation(topics, baselines) {
  const errors = [];
  const warnings = [];
  const topicIds = new Map();
  const baselineIds = new Map();

  topics.forEach((topic, index) => {
    if (!topic.id) {
      errors.push(validationMessage(`Topic #${index + 1} is missing an id.`, `Topic #${index + 1} 缺少 id。`));
    } else if (topicIds.has(topic.id)) {
      errors.push(validationMessage(`Topic id '${topic.id}' is duplicated.`, `Topic id '${topic.id}' 重复。`));
    } else {
      topicIds.set(topic.id, true);
    }
    if (!topic.name) {
      errors.push(validationMessage(`Topic '${topic.id || `#${index + 1}`}' is missing a name.`, `Topic '${topic.id || `#${index + 1}`}' 缺少名称。`));
    }
    if (!topic.queries.length) {
      errors.push(validationMessage(`Topic '${topic.id || `#${index + 1}`}' needs at least one query.`, `Topic '${topic.id || `#${index + 1}`}' 至少需要一个 query。`));
    }
  });

  baselines.forEach((baseline, index) => {
    if (!baseline.id) {
      errors.push(validationMessage(`Baseline #${index + 1} is missing an id.`, `Baseline #${index + 1} 缺少 id。`));
    } else if (baselineIds.has(baseline.id)) {
      errors.push(validationMessage(`Baseline id '${baseline.id}' is duplicated.`, `Baseline id '${baseline.id}' 重复。`));
    } else {
      baselineIds.set(baseline.id, true);
    }
    if (!baseline.title) {
      errors.push(validationMessage(`Baseline '${baseline.id || `#${index + 1}`}' is missing a title.`, `Baseline '${baseline.id || `#${index + 1}`}' 缺少标题。`));
    }
    if (!baseline.topic_id) {
      errors.push(validationMessage(`Baseline '${baseline.id || `#${index + 1}`}' is missing topic_id.`, `Baseline '${baseline.id || `#${index + 1}`}' 缺少 topic_id。`));
    } else if (!topicIds.has(baseline.topic_id)) {
      errors.push(
        validationMessage(
          `Baseline '${baseline.id || `#${index + 1}`}' references unknown topic_id '${baseline.topic_id}'.`,
          `Baseline '${baseline.id || `#${index + 1}`}' 引用了不存在的 topic_id '${baseline.topic_id}'。`
        )
      );
    }
    if (!baseline.doi && !baseline.arxiv_id && !baseline.openalex_id && !baseline.semanticscholar_id) {
      warnings.push(
        validationMessage(
          `Baseline '${baseline.id || `#${index + 1}`}' still has no stable identifier.`,
          `Baseline '${baseline.id || `#${index + 1}`}' 目前仍然没有稳定标识。`
        )
      );
    }
  });

  return { errors, warnings };
}

function setStatus(kind, key, detail = "") {
  state.status = { kind, key, detail };
  renderRuntimeStatus();
}

function renderRuntimeStatus() {
  const node = document.getElementById("config-runtime-status");
  if (!node) {
    return;
  }
  const { kind, key, detail } = state.status;
  const message = key ? `${t(key)}${detail ? ` ${detail}` : ""}` : detail;
  node.className = `status-banner ${kind || "info"}`;
  node.textContent = message;
  node.hidden = !message;
}

function renderValidation() {
  const summaryNode = document.getElementById("config-validation-summary");
  const listNode = document.getElementById("config-validation-list");
  if (!summaryNode || !listNode) {
    return;
  }

  const { errors, warnings } = state.validation;
  if (!errors.length) {
    summaryNode.textContent = warnings.length
      ? `${t("config.status.validation_ok")} ${validationMessage("Warnings are listed below.", "下方仍有提示信息。")}`
      : t("config.status.validation_ok");
    summaryNode.className = "validation-summary success";
  } else {
    summaryNode.textContent = `${t("config.status.validation_errors")} (${errors.length})`;
    summaryNode.className = "validation-summary error";
  }

  const items = [
    ...errors.map((text) => ({ kind: "error", text })),
    ...warnings.map((text) => ({ kind: "warning", text }))
  ];
  listNode.innerHTML = items.length
    ? items
        .map(
          (item) =>
            `<li class="validation-item ${item.kind}"><strong>${escapeHtml(
              item.kind === "error" ? validationMessage("ERROR", "错误") : validationMessage("WARNING", "提示")
            )}</strong><span>${escapeHtml(item.text)}</span></li>`
        )
        .join("")
    : `<li class="validation-item success"><strong>OK</strong><span>${escapeHtml(t("config.status.validation_ok"))}</span></li>`;
}

function renderYamlPreviews() {
  const topicsPreview = document.getElementById("topics-yaml-preview");
  const baselinesPreview = document.getElementById("baselines-yaml-preview");
  if (!topicsPreview || !baselinesPreview) {
    return;
  }
  topicsPreview.textContent = serializeTopicsYaml(sanitizedTopics());
  baselinesPreview.textContent = serializeBaselinesYaml(sanitizedBaselines());
}

function detailsOpenAttr(open) {
  return open ? " open" : "";
}

function checkboxField(name, checked, kind, labelKey) {
  return `
    <label class="toggle-field">
      <input type="checkbox" data-${kind}-field="${name}" ${checked ? "checked" : ""}>
      <span>${escapeHtml(t(labelKey))}</span>
    </label>
  `;
}

function topicCardHtml(topic, index) {
  const title = topic.name || `${t("config.topic_card")} ${index + 1}`;
  return `
    <article class="config-card" data-topic-index="${index}">
      <div class="panel-head">
        <div>
          <h4>${escapeHtml(title)}</h4>
          <p class="muted">${escapeHtml(t("config.field.id"))}: ${escapeHtml(topic.id || "-")}</p>
        </div>
        <button type="button" class="secondary-button compact" data-remove-topic="${index}">${escapeHtml(t("config.action.remove"))}</button>
      </div>
      <div class="config-form-grid simple-grid">
        <label class="field">
          <span>${escapeHtml(t("config.field.name"))}</span>
          <input type="text" data-topic-field="name" value="${escapeHtml(topic.name)}" autocomplete="off">
        </label>
        <div class="field toggle-group">
          ${checkboxField("enabled", topic.enabled, "topic", "config.field.enabled")}
        </div>
        <label class="field span-2">
          <span>${escapeHtml(t("config.field.queries"))}</span>
          <textarea rows="4" data-topic-field="queries" placeholder="${escapeHtml(t("config.field.queries_hint"))}">${escapeHtml(topic.queries.join("\n"))}</textarea>
          <small class="muted">${escapeHtml(t("config.field.list_hint"))}</small>
        </label>
      </div>
      <details class="mini-details"${detailsOpenAttr(Boolean(topic.exclude.length || topic.preferred_venues.length || topic.preferred_authors.length || topic.min_score != null))}>
        <summary>${escapeHtml(t("config.advanced_topic"))}</summary>
        <div class="config-form-grid">
          <label class="field">
            <span>${escapeHtml(t("config.field.id"))}</span>
            <input type="text" data-topic-field="id" value="${escapeHtml(topic.id)}" autocomplete="off">
          </label>
          <label class="field">
            <span>${escapeHtml(t("config.field.min_score"))}</span>
            <input type="number" step="0.1" data-topic-field="min_score" value="${topic.min_score == null ? "" : escapeHtml(String(topic.min_score))}">
          </label>
          <label class="field span-2">
            <span>${escapeHtml(t("config.field.exclude"))}</span>
            <textarea rows="3" data-topic-field="exclude">${escapeHtml(topic.exclude.join("\n"))}</textarea>
            <small class="muted">${escapeHtml(t("config.field.list_hint"))}</small>
          </label>
          <label class="field span-2">
            <span>${escapeHtml(t("config.field.preferred_venues"))}</span>
            <textarea rows="3" data-topic-field="preferred_venues">${escapeHtml(topic.preferred_venues.join("\n"))}</textarea>
            <small class="muted">${escapeHtml(t("config.field.list_hint"))}</small>
          </label>
          <label class="field span-2">
            <span>${escapeHtml(t("config.field.preferred_authors"))}</span>
            <textarea rows="3" data-topic-field="preferred_authors">${escapeHtml(topic.preferred_authors.join("\n"))}</textarea>
            <small class="muted">${escapeHtml(t("config.field.list_hint"))}</small>
          </label>
        </div>
      </details>
    </article>
  `;
}

function baselineTopicOptions(selectedValue) {
  const options = [`<option value="">${escapeHtml(t("config.field.topic_placeholder"))}</option>`];
  const topicIds = sanitizedTopics().map((topic) => topic.id).filter(Boolean);
  if (selectedValue && !topicIds.includes(selectedValue)) {
    const missingLabel = isZh() ? `${selectedValue}（不存在）` : `${selectedValue} (missing)`;
    options.push(`<option value="${escapeHtml(selectedValue)}" selected>${escapeHtml(missingLabel)}</option>`);
  }
  topicIds.forEach((topicId) => {
    options.push(`<option value="${escapeHtml(topicId)}" ${topicId === selectedValue ? "selected" : ""}>${escapeHtml(topicId)}</option>`);
  });
  return options.join("");
}

function importedFromLine(baseline) {
  if (!baseline.imported_from.length) {
    return "";
  }
  return `${t("config.imported_from")}: ${baseline.imported_from.join(" + ")}`;
}

function baselineCardHtml(baseline, index) {
  const title = baseline.title || `${t("config.baseline_card")} ${index + 1}`;
  const metadata = [baseline.year || "", baseline.venue || ""].filter(Boolean).join(" · ");
  return `
    <article class="config-card" data-baseline-index="${index}">
      <div class="panel-head">
        <div>
          <h4>${escapeHtml(title)}</h4>
          <p class="muted">${escapeHtml(metadata || importedFromLine(baseline) || baseline.topic_id || "-")}</p>
          ${baseline.authors.length ? `<p class="muted">${escapeHtml(baseline.authors.slice(0, 5).join(", "))}</p>` : ""}
        </div>
        <button type="button" class="secondary-button compact" data-remove-baseline="${index}">${escapeHtml(t("config.action.remove"))}</button>
      </div>
      <div class="config-form-grid simple-grid">
        <label class="field">
          <span>${escapeHtml(t("config.field.topic_id"))}</span>
          <select data-baseline-field="topic_id">${baselineTopicOptions(baseline.topic_id)}</select>
        </label>
        <div class="field toggle-group span-2">
          ${checkboxField("track_new_citations", baseline.track_new_citations, "baseline", "config.field.track_new_citations")}
          ${checkboxField("track_related", baseline.track_related, "baseline", "config.field.track_related")}
          ${checkboxField("enabled", baseline.enabled, "baseline", "config.field.enabled")}
        </div>
      </div>
      <details class="mini-details"${detailsOpenAttr(Boolean(baseline.doi || baseline.arxiv_id || baseline.openalex_id || baseline.semanticscholar_id))}>
        <summary>${escapeHtml(t("config.advanced_baseline"))}</summary>
        <div class="config-form-grid">
          <label class="field span-2">
            <span>${escapeHtml(t("config.field.title"))}</span>
            <input type="text" data-baseline-field="title" value="${escapeHtml(baseline.title)}" autocomplete="off">
          </label>
          <label class="field">
            <span>${escapeHtml(t("config.field.id"))}</span>
            <input type="text" data-baseline-field="id" value="${escapeHtml(baseline.id)}" autocomplete="off">
          </label>
          <label class="field">
            <span>${escapeHtml(t("config.field.doi"))}</span>
            <input type="text" data-baseline-field="doi" value="${escapeHtml(baseline.doi)}" autocomplete="off">
          </label>
          <label class="field">
            <span>${escapeHtml(t("config.field.arxiv_id"))}</span>
            <input type="text" data-baseline-field="arxiv_id" value="${escapeHtml(baseline.arxiv_id)}" autocomplete="off">
          </label>
          <label class="field">
            <span>${escapeHtml(t("config.field.openalex_id"))}</span>
            <input type="text" data-baseline-field="openalex_id" value="${escapeHtml(baseline.openalex_id)}" autocomplete="off">
          </label>
          <label class="field">
            <span>${escapeHtml(t("config.field.semanticscholar_id"))}</span>
            <input type="text" data-baseline-field="semanticscholar_id" value="${escapeHtml(baseline.semanticscholar_id)}" autocomplete="off">
          </label>
        </div>
      </details>
    </article>
  `;
}

function topicSelectionOptions(selectedValue = "") {
  const topics = sanitizedTopics();
  if (!topics.length) {
    return `<option value="">${escapeHtml(t("config.no_topics_available"))}</option>`;
  }
  return topics
    .map((topic) => `<option value="${escapeHtml(topic.id)}" ${topic.id === selectedValue ? "selected" : ""}>${escapeHtml(topic.name || topic.id)}</option>`)
    .join("");
}

function sourceBadge(source) {
  return `<span class="pill source-pill">${escapeHtml(source)}</span>`;
}

function candidateMetadata(candidate) {
  const parts = [];
  if (candidate.year) {
    parts.push(String(candidate.year));
  }
  if (candidate.venue) {
    parts.push(candidate.venue);
  }
  if (candidate.doi) {
    parts.push(`DOI ${candidate.doi}`);
  } else if (candidate.arxiv_id) {
    parts.push(`arXiv ${candidate.arxiv_id}`);
  }
  return parts.join(" · ");
}

function baselineAlreadyImported(candidate) {
  const titleKey = normalizeText(candidate.title);
  return state.baselines.some((baseline) => {
    const item = hydrateBaseline(baseline);
    if (item.doi && candidate.doi && item.doi === candidate.doi) {
      return true;
    }
    if (item.openalex_id && candidate.openalex_id && item.openalex_id === candidate.openalex_id) {
      return true;
    }
    if (item.semanticscholar_id && candidate.semanticscholar_id && item.semanticscholar_id === candidate.semanticscholar_id) {
      return true;
    }
    return normalizeText(item.title) === titleKey;
  });
}

function searchResultCardHtml(candidate, index) {
  const disabled = baselineAlreadyImported(candidate);
  const metadata = candidateMetadata(candidate);
  return `
    <article class="config-card search-result-card">
      <div class="panel-head">
        <div>
          <h4>${escapeHtml(candidate.title || t("config.search_untitled"))}</h4>
          <p class="muted">${escapeHtml(candidate.authors.slice(0, 5).join(", ") || t("paper.unknown_authors"))}</p>
          ${metadata ? `<p class="muted">${escapeHtml(metadata)}</p>` : ""}
        </div>
        <div class="search-result-actions">
          <div class="source-pill-row">${candidate.sources.map(sourceBadge).join("")}</div>
          <button type="button" class="primary-button compact" data-import-candidate="${index}" ${disabled ? "disabled" : ""}>
            ${escapeHtml(disabled ? t("config.search_added") : t("config.search_use_result"))}
          </button>
        </div>
      </div>
      ${candidate.best_url ? `<p><a href="${escapeHtml(candidate.best_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("paper.open_paper"))}</a></p>` : ""}
    </article>
  `;
}

function renderTopicEditor() {
  const node = document.getElementById("topics-editor");
  if (!node) {
    return;
  }
  node.innerHTML = state.topics.length
    ? state.topics.map((topic, index) => topicCardHtml(hydrateTopic(topic), index)).join("")
    : `<article class="empty-state">${escapeHtml(t("config.empty_topics"))}</article>`;
}

function renderBaselineEditor() {
  const node = document.getElementById("baselines-editor");
  if (!node) {
    return;
  }
  node.innerHTML = state.baselines.length
    ? state.baselines.map((baseline, index) => baselineCardHtml(hydrateBaseline(baseline), index)).join("")
    : `<article class="empty-state">${escapeHtml(t("config.empty_baselines"))}</article>`;
}

function renderSearchTopicOptions() {
  const select = document.getElementById("config-search-topic");
  if (!select) {
    return;
  }
  const currentValue = state.search.topicId;
  const firstTopicId = sanitizedTopics()[0]?.id || "";
  state.search.topicId = currentValue || firstTopicId;
  select.innerHTML = topicSelectionOptions(state.search.topicId);
}

function renderSearchState() {
  const statusNode = document.getElementById("config-search-status");
  const issuesNode = document.getElementById("config-search-issues");
  const resultsNode = document.getElementById("config-search-results");
  const button = document.getElementById("config-search-button");
  const input = document.getElementById("config-search-query");
  const noTopics = sanitizedTopics().length === 0;

  if (button) {
    button.disabled = state.search.loading || noTopics;
  }
  if (input) {
    input.disabled = noTopics;
  }

  if (statusNode) {
    if (noTopics) {
      statusNode.textContent = t("config.search_need_topic");
    } else if (state.search.loading) {
      statusNode.textContent = t("config.search_loading");
    } else {
      statusNode.textContent = state.search.summary;
    }
  }

  if (issuesNode) {
    issuesNode.innerHTML = state.search.issues.length
      ? state.search.issues.map((issue) => `<li class="validation-item warning"><strong>${escapeHtml(validationMessage("SOURCE", "来源"))}</strong><span>${escapeHtml(issue)}</span></li>`).join("")
      : "";
  }

  if (resultsNode) {
    resultsNode.innerHTML = state.search.results.length
      ? state.search.results.map((candidate, index) => searchResultCardHtml(candidate, index)).join("")
      : state.search.loading
        ? ""
        : `<article class="empty-state">${escapeHtml(noTopics ? t("config.empty_search_waiting_topic") : t("config.empty_search_results"))}</article>`;
  }
}

function renderActionState() {
  const invalid = state.validation.errors.length > 0;
  const disabled = invalid || state.busy;
  ["config-download-topics", "config-download-baselines", "config-push"].forEach((id) => {
    const button = document.getElementById(id);
    if (button) {
      button.disabled = disabled;
    }
  });
  const resetButton = document.getElementById("config-reset");
  if (resetButton) {
    resetButton.disabled = state.busy;
  }
}

function recompute({ rerenderTopics = false, rerenderBaselines = false, rerenderSearch = false, saveDraft = true } = {}) {
  state.validation = computeValidation(sanitizedTopics(), sanitizedBaselines());
  if (rerenderTopics) {
    renderTopicEditor();
  }
  if (rerenderBaselines) {
    renderBaselineEditor();
  }
  if (rerenderTopics || rerenderBaselines || rerenderSearch) {
    renderSearchTopicOptions();
    renderSearchState();
  }
  renderValidation();
  renderYamlPreviews();
  renderActionState();
  if (saveDraft) {
    scheduleDraftSave();
  }
}

function saveDraft() {
  const payload = {
    topics: sanitizedTopics(),
    baselines: sanitizedBaselines()
  };
  window.localStorage.setItem(CONFIG_DRAFT_KEY, JSON.stringify(payload));
  setStatus("info", "config.status.draft_saved");
}

function scheduleDraftSave() {
  if (draftSaveTimer) {
    window.clearTimeout(draftSaveTimer);
  }
  draftSaveTimer = window.setTimeout(() => {
    saveDraft();
  }, 250);
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/yaml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function repoSettingsDefaults() {
  const inferred = {
    owner: "",
    repo: "",
    branch: "main",
    commitMessage: "chore: update research radar config"
  };
  if (window.location.hostname.endsWith(".github.io")) {
    inferred.owner = window.location.hostname.split(".")[0];
    const segments = window.location.pathname.split("/").filter(Boolean);
    if (segments.length) {
      inferred.repo = segments[0];
    }
  }
  return inferred;
}

function loadRepoSettings() {
  const defaults = repoSettingsDefaults();
  try {
    const saved = JSON.parse(window.localStorage.getItem(CONFIG_REPO_KEY) || "{}");
    return { ...defaults, ...saved };
  } catch (error) {
    console.warn("Failed to parse saved repo settings", error);
    return defaults;
  }
}

function saveRepoSettings() {
  const payload = {
    owner: document.getElementById("config-repo-owner")?.value.trim() || "",
    repo: document.getElementById("config-repo-name")?.value.trim() || "",
    branch: document.getElementById("config-repo-branch")?.value.trim() || "main",
    commitMessage: document.getElementById("config-commit-message")?.value.trim() || "chore: update research radar config"
  };
  window.localStorage.setItem(CONFIG_REPO_KEY, JSON.stringify(payload));
}

function fillRepoForm() {
  const settings = loadRepoSettings();
  const owner = document.getElementById("config-repo-owner");
  const repo = document.getElementById("config-repo-name");
  const branch = document.getElementById("config-repo-branch");
  const message = document.getElementById("config-commit-message");
  if (owner) owner.value = settings.owner;
  if (repo) repo.value = settings.repo;
  if (branch) branch.value = settings.branch;
  if (message) message.value = settings.commitMessage;
}

function setBusy(busy) {
  state.busy = busy;
  renderActionState();
}

async function githubRequest(path, token, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    let detail = response.statusText;
    const text = await response.text();
    if (text) {
      try {
        const payload = JSON.parse(text);
        detail = payload.message || payload.error || detail;
      } catch (error) {
        detail = text;
      }
    }
    throw new Error(detail || `HTTP ${response.status}`);
  }
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function encodeBranchPath(branch) {
  return branch
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function commitConfigToGitHub({ owner, repo, branch, token, message, topicsYaml, baselinesYaml }) {
  const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const branchPath = encodeBranchPath(branch);
  const ref = await githubRequest(`${repoPath}/git/ref/heads/${branchPath}`, token);
  const headSha = ref.object.sha;
  const headCommit = await githubRequest(`${repoPath}/git/commits/${headSha}`, token);
  const baseTreeSha = headCommit.tree.sha;

  const topicsBlob = await githubRequest(`${repoPath}/git/blobs`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: topicsYaml, encoding: "utf-8" })
  });
  const baselinesBlob = await githubRequest(`${repoPath}/git/blobs`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: baselinesYaml, encoding: "utf-8" })
  });

  const tree = await githubRequest(`${repoPath}/git/trees`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: [
        { path: "config/topics.yaml", mode: "100644", type: "blob", sha: topicsBlob.sha },
        { path: "config/baselines.yaml", mode: "100644", type: "blob", sha: baselinesBlob.sha }
      ]
    })
  });

  const commit = await githubRequest(`${repoPath}/git/commits`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [headSha]
    })
  });

  await githubRequest(`${repoPath}/git/refs/heads/${branchPath}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha: commit.sha, force: false })
  });
}

function candidateFromOpenAlex(item) {
  const ids = item.ids || {};
  return {
    title: String(item.display_name || "").trim(),
    authors: Array.isArray(item.authorships)
      ? item.authorships.map((authorship) => authorship.author?.display_name).filter(Boolean).slice(0, 5)
      : [],
    year: item.publication_year || null,
    publication_date: item.publication_date || "",
    venue: item.primary_location?.source?.display_name || "",
    doi: normalizeDoi(ids.doi),
    arxiv_id: normalizeArxiv(ids.arxiv),
    openalex_id: normalizeOpenAlex(item.id),
    semanticscholar_id: "",
    best_url: item.primary_location?.landing_page_url || item.id || "",
    sources: ["OpenAlex"]
  };
}

function candidateFromSemanticScholar(item) {
  const externalIds = item.externalIds || {};
  return {
    title: String(item.title || "").trim(),
    authors: Array.isArray(item.authors) ? item.authors.map((author) => author.name).filter(Boolean).slice(0, 5) : [],
    year: item.year || null,
    publication_date: item.publicationDate || "",
    venue: item.venue || "",
    doi: normalizeDoi(externalIds.DOI),
    arxiv_id: normalizeArxiv(externalIds.ArXiv),
    openalex_id: "",
    semanticscholar_id: String(item.paperId || "").trim(),
    best_url: item.url || "",
    sources: ["Semantic Scholar"]
  };
}

function candidateFromCrossref(item) {
  const authors = Array.isArray(item.author)
    ? item.author
        .map((author) => [author.given, author.family].filter(Boolean).join(" ").trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];
  const dateParts = item.published?.["date-parts"] || item["published-print"]?.["date-parts"] || item.created?.["date-parts"] || [];
  const year = Array.isArray(dateParts[0]) && dateParts[0].length ? dateParts[0][0] : null;
  return {
    title: Array.isArray(item.title) ? String(item.title[0] || "").trim() : String(item.title || "").trim(),
    authors,
    year: Number.isFinite(Number(year)) ? Number(year) : null,
    publication_date: "",
    venue: Array.isArray(item["container-title"]) ? String(item["container-title"][0] || "").trim() : "",
    doi: normalizeDoi(item.DOI),
    arxiv_id: "",
    openalex_id: "",
    semanticscholar_id: "",
    best_url: String(item.URL || "").trim(),
    sources: ["Crossref"]
  };
}

function candidateKey(candidate) {
  if (candidate.doi) {
    return `doi:${candidate.doi}`;
  }
  if (candidate.openalex_id) {
    return `openalex:${candidate.openalex_id}`;
  }
  if (candidate.semanticscholar_id) {
    return `s2:${candidate.semanticscholar_id}`;
  }
  if (candidate.arxiv_id) {
    return `arxiv:${candidate.arxiv_id}`;
  }
  return `title:${normalizeText(candidate.title)}`;
}

function mergeCandidates(existing, incoming) {
  return {
    ...existing,
    title: existing.title || incoming.title,
    authors: existing.authors.length ? existing.authors : incoming.authors,
    year: existing.year || incoming.year,
    publication_date: existing.publication_date || incoming.publication_date,
    venue: existing.venue || incoming.venue,
    doi: existing.doi || incoming.doi,
    arxiv_id: existing.arxiv_id || incoming.arxiv_id,
    openalex_id: existing.openalex_id || incoming.openalex_id,
    semanticscholar_id: existing.semanticscholar_id || incoming.semanticscholar_id,
    best_url: existing.best_url || incoming.best_url,
    sources: Array.from(new Set([...(existing.sources || []), ...(incoming.sources || [])]))
  };
}

function scoreCandidate(candidate, query) {
  const normalizedQuery = normalizeText(query);
  const normalizedTitle = normalizeText(candidate.title);
  let score = 0;
  if (candidate.doi && normalizeDoi(query) === candidate.doi) {
    score += 100;
  }
  if (candidate.arxiv_id && normalizeArxiv(query) === candidate.arxiv_id) {
    score += 90;
  }
  if (normalizedTitle === normalizedQuery) {
    score += 70;
  }
  if (normalizedTitle.includes(normalizedQuery)) {
    score += 30;
  }
  score += (candidate.sources || []).length * 6;
  if (candidate.year) {
    score += 1;
  }
  if (candidate.venue) {
    score += 1;
  }
  return score;
}

async function searchOpenAlex(query) {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per-page", "6");
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`OpenAlex HTTP ${response.status}`);
  }
  const payload = await response.json();
  return Array.isArray(payload.results) ? payload.results.map(candidateFromOpenAlex).filter((item) => item.title) : [];
}

async function searchSemanticScholar(query) {
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("fields", "title,authors,year,venue,publicationDate,externalIds,url,paperId");
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Semantic Scholar HTTP ${response.status}`);
  }
  const payload = await response.json();
  return Array.isArray(payload.data) ? payload.data.map(candidateFromSemanticScholar).filter((item) => item.title) : [];
}

async function searchCrossref(query) {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query.bibliographic", query);
  url.searchParams.set("rows", "6");
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Crossref HTTP ${response.status}`);
  }
  const payload = await response.json();
  const items = payload?.message?.items;
  return Array.isArray(items) ? items.map(candidateFromCrossref).filter((item) => item.title) : [];
}

async function runBaselineSearch(query) {
  const searches = [
    { label: "OpenAlex", fn: searchOpenAlex },
    { label: "Semantic Scholar", fn: searchSemanticScholar },
    { label: "Crossref", fn: searchCrossref }
  ];
  const settled = await Promise.allSettled(searches.map((item) => item.fn(query)));
  const issues = [];
  const merged = new Map();

  settled.forEach((result, index) => {
    const label = searches[index].label;
    if (result.status === "fulfilled") {
      result.value.forEach((candidate) => {
        const key = candidateKey(candidate);
        const existing = merged.get(key);
        merged.set(key, existing ? mergeCandidates(existing, candidate) : candidate);
      });
      return;
    }
    issues.push(validationMessage(`${label} search failed: ${result.reason?.message || result.reason || "unknown error"}.`, `${label} 搜索失败：${result.reason?.message || result.reason || "未知错误"}。`));
  });

  return {
    results: Array.from(merged.values()).sort((left, right) => scoreCandidate(right, query) - scoreCandidate(left, query)).slice(0, 10),
    issues
  };
}

function baselineFromCandidate(candidate, topicId) {
  const usedIds = new Set(sanitizedBaselines().map((baseline) => baseline.id).filter(Boolean));
  return {
    ...defaultBaseline(topicId),
    id: uniqueSlug(candidate.title || "baseline", usedIds, "baseline"),
    title: candidate.title || "",
    topic_id: topicId,
    doi: candidate.doi || "",
    arxiv_id: candidate.arxiv_id || "",
    openalex_id: candidate.openalex_id || "",
    semanticscholar_id: candidate.semanticscholar_id || "",
    authors: candidate.authors || [],
    year: candidate.year || null,
    venue: candidate.venue || "",
    publication_date: candidate.publication_date || "",
    best_url: candidate.best_url || "",
    imported_from: candidate.sources || [],
    track_new_citations: true,
    track_related: true,
    enabled: true
  };
}

function readTopicFieldValue(target) {
  const field = target.dataset.topicField;
  if (field === "queries" || field === "exclude" || field === "preferred_venues" || field === "preferred_authors") {
    return splitLines(target.value);
  }
  if (field === "min_score") {
    return target.value.trim() === "" ? null : Number(target.value);
  }
  if (field === "enabled") {
    return target.checked;
  }
  return target.value;
}

function readBaselineFieldValue(target) {
  const field = target.dataset.baselineField;
  if (field === "track_new_citations" || field === "track_related" || field === "enabled") {
    return target.checked;
  }
  return target.value;
}

function maybeAutoFillTopicId(topic, previousName) {
  const previousSlug = slugify(previousName, "");
  if (!topic.id || topic.id === previousSlug) {
    const used = new Set(sanitizedTopics().map((item) => item.id).filter(Boolean));
    used.delete(topic.id);
    topic.id = uniqueSlug(topic.name || "topic", used, "topic");
  }
}

function resetToRepositorySnapshot() {
  if (!state.repoSnapshot) {
    return;
  }
  state.topics = clone(state.repoSnapshot.topics).map(hydrateTopic);
  state.baselines = clone(state.repoSnapshot.baselines).map(hydrateBaseline);
  state.search.results = [];
  state.search.issues = [];
  state.search.summary = "";
  window.localStorage.removeItem(CONFIG_DRAFT_KEY);
  setStatus("success", "config.status.reset_done");
  recompute({ rerenderTopics: true, rerenderBaselines: true, rerenderSearch: true, saveDraft: false });
}

function restoreDraftOrSnapshot(payload) {
  state.repoSnapshot = {
    topics: clone(payload.topics || []).map(hydrateTopic),
    baselines: clone(payload.baselines || []).map(hydrateBaseline)
  };

  try {
    const draft = JSON.parse(window.localStorage.getItem(CONFIG_DRAFT_KEY) || "null");
    if (draft?.topics || draft?.baselines) {
      state.topics = clone(draft.topics || []).map(hydrateTopic);
      state.baselines = clone(draft.baselines || []).map(hydrateBaseline);
      setStatus("info", "config.status.draft_restored");
      return;
    }
  } catch (error) {
    console.warn("Failed to restore config draft", error);
  }

  state.topics = clone(state.repoSnapshot.topics);
  state.baselines = clone(state.repoSnapshot.baselines);
  setStatus("info", "config.status.repo_loaded");
}

async function handlePush() {
  if (state.validation.errors.length) {
    setStatus("error", "config.status.validation_errors");
    return;
  }

  const owner = document.getElementById("config-repo-owner")?.value.trim() || "";
  const repo = document.getElementById("config-repo-name")?.value.trim() || "";
  const branch = document.getElementById("config-repo-branch")?.value.trim() || "";
  const message = document.getElementById("config-commit-message")?.value.trim() || "";
  const token = document.getElementById("config-repo-token")?.value.trim() || "";

  if (!owner) {
    setStatus("error", "config.error.owner_required");
    return;
  }
  if (!repo) {
    setStatus("error", "config.error.repo_required");
    return;
  }
  if (!branch) {
    setStatus("error", "config.error.branch_required");
    return;
  }
  if (!message) {
    setStatus("error", "config.error.message_required");
    return;
  }
  if (!token) {
    setStatus("error", "config.error.token_required");
    return;
  }

  saveRepoSettings();
  setBusy(true);
  setStatus("info", "config.status.push_pending");
  try {
    const topicsYaml = serializeTopicsYaml(sanitizedTopics());
    const baselinesYaml = serializeBaselinesYaml(sanitizedBaselines());
    await commitConfigToGitHub({ owner, repo, branch, token, message, topicsYaml, baselinesYaml });
    state.repoSnapshot = {
      topics: clone(sanitizedTopics()).map(hydrateTopic),
      baselines: clone(sanitizedBaselines()).map(hydrateBaseline)
    };
    window.localStorage.removeItem(CONFIG_DRAFT_KEY);
    const tokenField = document.getElementById("config-repo-token");
    if (tokenField) {
      tokenField.value = "";
    }
    setStatus("success", "config.status.push_success");
  } catch (error) {
    setStatus("error", "config.error.github_push", error.message);
  } finally {
    setBusy(false);
  }
}

async function handleSearch() {
  const query = document.getElementById("config-search-query")?.value.trim() || "";
  const topicId = document.getElementById("config-search-topic")?.value.trim() || "";
  if (!sanitizedTopics().length) {
    state.search.summary = t("config.search_need_topic");
    renderSearchState();
    return;
  }
  if (!topicId) {
    state.search.summary = t("config.search_choose_topic");
    renderSearchState();
    return;
  }
  if (!query) {
    state.search.summary = t("config.search_empty_query");
    renderSearchState();
    return;
  }

  state.search.query = query;
  state.search.topicId = topicId;
  state.search.loading = true;
  state.search.results = [];
  state.search.issues = [];
  state.search.summary = "";
  renderSearchState();
  try {
    const payload = await runBaselineSearch(query);
    state.search.results = payload.results;
    state.search.issues = payload.issues;
    if (payload.results.length) {
      state.search.summary = validationMessage(
        `Found ${payload.results.length} candidate papers.`,
        `找到 ${payload.results.length} 篇候选论文。`
      );
    } else {
      state.search.summary = t("config.search_no_hits");
    }
  } catch (error) {
    state.search.issues = [validationMessage(`Search failed: ${error.message || error}.`, `搜索失败：${error.message || error}。`)];
    state.search.summary = t("config.search_no_hits");
  } finally {
    state.search.loading = false;
    renderSearchState();
  }
}

function bindStaticEvents() {
  document.getElementById("config-add-topic")?.addEventListener("click", () => {
    state.topics.push(defaultTopic());
    recompute({ rerenderTopics: true, rerenderSearch: true });
  });

  document.getElementById("config-reset")?.addEventListener("click", () => {
    resetToRepositorySnapshot();
  });

  document.getElementById("config-download-topics")?.addEventListener("click", () => {
    if (state.validation.errors.length) {
      setStatus("error", "config.status.validation_errors");
      return;
    }
    downloadText("topics.yaml", serializeTopicsYaml(sanitizedTopics()));
  });

  document.getElementById("config-download-baselines")?.addEventListener("click", () => {
    if (state.validation.errors.length) {
      setStatus("error", "config.status.validation_errors");
      return;
    }
    downloadText("baselines.yaml", serializeBaselinesYaml(sanitizedBaselines()));
  });

  document.getElementById("config-push")?.addEventListener("click", () => {
    void handlePush();
  });

  document.getElementById("config-search-button")?.addEventListener("click", () => {
    void handleSearch();
  });

  document.getElementById("config-search-query")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSearch();
    }
  });

  document.getElementById("config-search-topic")?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    state.search.topicId = target.value;
  });

  ["config-repo-owner", "config-repo-name", "config-repo-branch", "config-commit-message"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      saveRepoSettings();
    });
  });

  document.getElementById("topics-editor")?.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.dataset.topicField) {
      return;
    }
    const card = target.closest("[data-topic-index]");
    if (!(card instanceof HTMLElement)) {
      return;
    }
    const index = Number(card.dataset.topicIndex);
    const topic = state.topics[index];
    const previousName = topic.name;
    topic[target.dataset.topicField] = readTopicFieldValue(target);
    if (target.dataset.topicField === "name") {
      maybeAutoFillTopicId(topic, previousName);
    }
    recompute({ rerenderTopics: target.dataset.topicField === "name", rerenderSearch: target.dataset.topicField === "name" || target.dataset.topicField === "id" });
  });

  document.getElementById("topics-editor")?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.dataset.topicField) {
      return;
    }
    const card = target.closest("[data-topic-index]");
    if (!(card instanceof HTMLElement)) {
      return;
    }
    const index = Number(card.dataset.topicIndex);
    state.topics[index][target.dataset.topicField] = readTopicFieldValue(target);
    recompute({ rerenderSearch: target.dataset.topicField === "id" });
  });

  document.getElementById("topics-editor")?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.dataset.removeTopic) {
      return;
    }
    state.topics.splice(Number(target.dataset.removeTopic), 1);
    recompute({ rerenderTopics: true, rerenderBaselines: true, rerenderSearch: true });
  });

  document.getElementById("baselines-editor")?.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.dataset.baselineField) {
      return;
    }
    const card = target.closest("[data-baseline-index]");
    if (!(card instanceof HTMLElement)) {
      return;
    }
    const index = Number(card.dataset.baselineIndex);
    state.baselines[index][target.dataset.baselineField] = readBaselineFieldValue(target);
    recompute();
  });

  document.getElementById("baselines-editor")?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.dataset.baselineField) {
      return;
    }
    const card = target.closest("[data-baseline-index]");
    if (!(card instanceof HTMLElement)) {
      return;
    }
    const index = Number(card.dataset.baselineIndex);
    state.baselines[index][target.dataset.baselineField] = readBaselineFieldValue(target);
    recompute();
  });

  document.getElementById("baselines-editor")?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.dataset.removeBaseline) {
      return;
    }
    state.baselines.splice(Number(target.dataset.removeBaseline), 1);
    recompute({ rerenderBaselines: true, rerenderSearch: true });
  });

  document.getElementById("config-search-results")?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.dataset.importCandidate) {
      return;
    }
    const index = Number(target.dataset.importCandidate);
    const candidate = state.search.results[index];
    if (!candidate) {
      return;
    }
    const topicId = state.search.topicId || document.getElementById("config-search-topic")?.value.trim() || "";
    state.baselines.unshift(baselineFromCandidate(candidate, topicId));
    setStatus("success", "config.status.baseline_imported", candidate.title);
    recompute({ rerenderBaselines: true, rerenderSearch: true });
  });

  window.addEventListener("research-radar:language-changed", () => {
    renderTopicEditor();
    renderBaselineEditor();
    renderSearchTopicOptions();
    renderSearchState();
    renderValidation();
    renderYamlPreviews();
    renderRuntimeStatus();
    renderActionState();
  });
}

async function initConfigStudio() {
  if (!configRootPresent()) {
    return;
  }
  fillRepoForm();
  bindStaticEvents();
  try {
    const payload = await loadConfigPayload();
    restoreDraftOrSnapshot(payload);
    renderTopicEditor();
    renderBaselineEditor();
    renderSearchTopicOptions();
    recompute({ rerenderSearch: true, saveDraft: false });
  } catch (error) {
    setStatus("error", "", `${t("config.error.fetch")} ${error.message || ""}`.trim());
  }
}

void initConfigStudio();
