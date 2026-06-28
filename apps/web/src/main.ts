import { ContinuumClient } from "@continuum/sdk-js"
import "./styles.css"

type Tab =
  | "overview"
  | "memories"
  | "candidates"
  | "artifacts"
  | "handoffs"
  | "governance"
  | "llm"
  | "tools"

type State = {
  tab: Tab
  apiUrl: string
  projectId: string
  query: string
  notice: string
  error: string
  loading: boolean
  data: Record<string, unknown>
}

const initialApiUrl =
  localStorage.getItem("continuum.apiUrl") ??
  import.meta.env.VITE_CONTINUUM_API_URL ??
  "http://localhost:3030"
const initialProjectId = localStorage.getItem("continuum.projectId") ?? ""

const state: State = {
  tab: "overview",
  apiUrl: initialApiUrl,
  projectId: initialProjectId,
  query: "",
  notice: "",
  error: "",
  loading: false,
  data: {},
}

const app = document.querySelector<HTMLDivElement>("#app")
if (!app) throw new Error("Missing #app")
const appRoot = app

function client() {
  return new ContinuumClient(state.apiUrl.replace(/\/$/, ""))
}

function projectInput() {
  return state.projectId.trim() ? { projectId: state.projectId.trim() } : {}
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function fmtDate(value: unknown) {
  if (!value) return ""
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(String(value)),
    )
  } catch {
    return String(value)
  }
}

function truncate(value: unknown, length = 220) {
  const text = String(value ?? "")
  return text.length > length ? `${text.slice(0, length)}…` : text
}

function listItems(items: unknown, render: (item: any) => string) {
  const arr = Array.isArray(items) ? items : []
  if (!arr.length) return `<div class="empty">No records found.</div>`
  return `<div class="list">${arr.map((item) => `<div class="item">${render(item)}</div>`).join("")}</div>`
}

function badge(text: unknown, kind: "normal" | "warn" | "danger" = "normal") {
  const cls = kind === "normal" ? "badge" : `badge ${kind}`
  return `<span class="${cls}">${escapeHtml(text)}</span>`
}

function navButton(tab: Tab, label: string) {
  return `<button data-tab="${tab}" class="${state.tab === tab ? "active" : ""}">${label}</button>`
}

function shell(content: string) {
  appRoot.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">Continuum</div>
        <div class="subtitle">Admin UI for durable memory, context packs, handoffs, artifacts, provider audits, and governance state.</div>
        <label class="field"><span>API URL</span><input id="api-url" value="${escapeHtml(state.apiUrl)}" /></label>
        <label class="field"><span>Project ID filter</span><input id="project-id" value="${escapeHtml(state.projectId)}" placeholder="optional" /></label>
        <button class="primary" id="save-settings">Save Settings</button>
        <nav class="nav">
          ${navButton("overview", "Overview")}
          ${navButton("memories", "Memories")}
          ${navButton("candidates", "Candidates")}
          ${navButton("artifacts", "Artifacts")}
          ${navButton("handoffs", "Handoffs")}
          ${navButton("governance", "Governance / Evals")}
          ${navButton("llm", "LLM Gateway")}
          ${navButton("tools", "Tools")}
        </nav>
      </aside>
      <main class="main">
        ${state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : ""}
        ${state.notice ? `<div class="success">${escapeHtml(state.notice)}</div>` : ""}
        ${content}
      </main>
    </div>`

  document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tab = button.dataset.tab as Tab
      state.query = ""
      loadCurrentTab()
    })
  })

  document.querySelector<HTMLButtonElement>("#save-settings")?.addEventListener("click", () => {
    state.apiUrl = (
      document.querySelector<HTMLInputElement>("#api-url")?.value ?? state.apiUrl
    ).trim()
    state.projectId = (document.querySelector<HTMLInputElement>("#project-id")?.value ?? "").trim()
    localStorage.setItem("continuum.apiUrl", state.apiUrl)
    localStorage.setItem("continuum.projectId", state.projectId)
    state.notice = "Settings saved."
    loadCurrentTab()
  })
}

function header(title: string, description: string, actions = "") {
  return `<div class="header"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div><div class="actions">${actions}</div></div>`
}

function searchbar(placeholder = "Search") {
  return `<div class="searchbar"><input id="search" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(state.query)}" /><button class="secondary" id="run-search">Search</button></div>`
}

function wireSearch(load: () => void) {
  document.querySelector<HTMLButtonElement>("#run-search")?.addEventListener("click", () => {
    state.query = document.querySelector<HTMLInputElement>("#search")?.value ?? ""
    load()
  })
  document.querySelector<HTMLInputElement>("#search")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      state.query = (event.target as HTMLInputElement).value
      load()
    }
  })
}

async function withLoad(fn: () => Promise<void>) {
  state.loading = true
  state.error = ""
  state.notice = ""
  try {
    await fn()
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Unknown error"
  } finally {
    state.loading = false
    renderCurrentTab()
  }
}

function renderOverview() {
  const overview: any = state.data.overview ?? {}
  const counts = overview.counts ?? {}
  shell(`
    ${header("Overview", "Current health and recent memory-control-plane activity.", `<button class="primary" id="refresh">Refresh</button>`)}
    <div class="grid">
      ${metric("Active memories", counts.activeMemories ?? 0)}
      ${metric("Proposed candidates", counts.proposedCandidates ?? 0)}
      ${metric("Artifacts", counts.recentArtifacts ?? 0)}
      ${metric("Handoffs", counts.recentHandoffs ?? 0)}
      ${metric("Policy decisions", counts.recentPolicyDecisions ?? 0)}
      ${metric("Evaluations", counts.recentEvaluations ?? 0)}
      ${metric("LLM audits", counts.recentLlmAudits ?? 0)}
      ${metric("Providers", counts.providers ?? 0)}
    </div>
    <div class="panel"><h2>Store health</h2><pre>${escapeHtml(JSON.stringify(overview.health ?? {}, null, 2))}</pre></div>
    <div class="panel"><h2>Recent memories</h2>${listItems(overview.recent?.memories, renderMemory)}</div>
    <div class="panel"><h2>Recent handoffs</h2>${listItems(overview.recent?.handoffs, renderHandoff)}</div>
    <div class="panel"><h2>Recent governance decisions</h2>${listItems(overview.recent?.policyDecisions, renderPolicy)}</div>
  `)
  document.querySelector("#refresh")?.addEventListener("click", loadCurrentTab)
}

function metric(label: string, value: unknown) {
  return `<div class="card"><div class="metric">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div></div>`
}

function renderMemory(memory: any) {
  return `<div class="item-title">${escapeHtml(truncate(memory.content, 140))}</div>
  <div class="item-meta">${badge(memory.memoryType)} ${badge(memory.status)} <span>${escapeHtml(memory.namespace)}</span> <span>${fmtDate(memory.updatedAt)}</span></div>
  <div class="item-body">confidence ${escapeHtml(memory.confidence)} · sensitivity ${escapeHtml(memory.sensitivity)}</div>`
}

function renderCandidate(candidate: any) {
  return `<div class="item-title">${escapeHtml(truncate(candidate.content, 150))}</div>
  <div class="item-meta">${badge(candidate.candidateType)} ${badge(candidate.status, candidate.status === "proposed" ? "warn" : "normal")} <span>${escapeHtml(candidate.namespace)}</span> <span>${fmtDate(candidate.updatedAt)}</span></div>
  <div class="item-body">${escapeHtml(truncate(candidate.rationale, 180))}</div>`
}

function renderArtifact(artifact: any) {
  return `<div class="item-title">${escapeHtml(artifact.path ?? artifact.name)}</div>
  <div class="item-meta">${badge(artifact.artifactKind)} ${badge(artifact.status)} <span>${escapeHtml(artifact.namespace)}</span> <span>${escapeHtml(artifact.checksum ?? "no checksum")}</span></div>
  <div class="item-body">${escapeHtml(truncate(artifact.contentPreview, 260))}</div>`
}

function renderHandoff(handoff: any) {
  return `<div class="item-title">${escapeHtml(handoff.title)}</div>
  <div class="item-meta">${badge("handoff")} <span>${escapeHtml(handoff.projectId ?? "no project")}</span> <span>${fmtDate(handoff.createdAt)}</span></div>
  <div class="item-body">${escapeHtml(truncate(handoff.objective, 260))}</div>`
}

function renderPolicy(policy: any) {
  const kind =
    policy.decision === "deny" ? "danger" : policy.decision === "review" ? "warn" : "normal"
  return `<div class="item-title">${escapeHtml(policy.action)}</div>
  <div class="item-meta">${badge(policy.decision, kind)} ${badge(policy.sensitivity)} <span>${escapeHtml(policy.targetType ?? "")}</span> <span>${fmtDate(policy.createdAt)}</span></div>
  <div class="item-body">${escapeHtml((policy.reasons ?? []).join("; "))}</div>`
}

function renderEvaluation(evaluation: any) {
  return `<div class="item-title">${escapeHtml(evaluation.evaluationKind)} → ${escapeHtml(evaluation.targetType)}</div>
  <div class="item-meta">${badge(evaluation.passed ? "passed" : "failed", evaluation.passed ? "normal" : "danger")} <span>score ${escapeHtml(evaluation.score)}</span> <span>${fmtDate(evaluation.createdAt)}</span></div>
  <div class="item-body">${escapeHtml((evaluation.findings ?? []).map((f: any) => `${f.severity}: ${f.message}`).join("\n"))}</div>`
}

function renderLlmAudit(audit: any) {
  return `<div class="item-title">${escapeHtml(audit.requestKind)} ${audit.providerId ? `via ${escapeHtml(audit.providerId)}` : ""}</div>
  <div class="item-meta">${badge(audit.status, audit.status === "failed" ? "danger" : "normal")} <span>${escapeHtml(audit.model ?? "")}</span> <span>${fmtDate(audit.createdAt)}</span></div>
  <div class="item-body">${escapeHtml(truncate(audit.inputSummary, 260))}</div>`
}

async function loadOverview() {
  await withLoad(async () => {
    state.data.overview = await client().adminOverview(projectInput())
  })
}

function renderListTab(
  title: string,
  description: string,
  items: unknown,
  itemRenderer: (item: any) => string,
  load: () => void,
  placeholder = "Search",
) {
  shell(
    `${header(title, description, `<button class="primary" id="refresh">Refresh</button>`)}${searchbar(placeholder)}<div class="panel">${listItems(items, itemRenderer)}</div>`,
  )
  document.querySelector("#refresh")?.addEventListener("click", load)
  wireSearch(load)
}

async function loadMemories() {
  await withLoad(async () => {
    state.data.memories = await client().searchMemory({
      ...projectInput(),
      query: state.query || undefined,
      limit: 100,
      includeSuperseded: false,
    })
  })
}

async function loadCandidates() {
  await withLoad(async () => {
    state.data.candidates = await client().searchCandidates({
      ...projectInput(),
      query: state.query || undefined,
      limit: 100,
    })
  })
}

async function loadArtifacts() {
  await withLoad(async () => {
    state.data.artifacts = await client().searchArtifacts({
      ...projectInput(),
      query: state.query || undefined,
      limit: 100,
    })
  })
}

async function loadHandoffs() {
  await withLoad(async () => {
    state.data.handoffs = await client().listAdminHandoffs({ ...projectInput(), limit: 50 })
  })
}

async function loadGovernance() {
  await withLoad(async () => {
    const [policy, evaluations] = await Promise.all([
      client().listPolicyDecisions({ ...projectInput(), limit: 50 }),
      client().listEvaluations({ ...projectInput(), limit: 50 }),
    ])
    state.data.governance = { policy, evaluations }
  })
}

async function loadLlm() {
  await withLoad(async () => {
    const [providers, audits] = await Promise.all([
      client().listLlmProviders(),
      client().listLlmAudits({ ...projectInput(), limit: 50 }),
    ])
    state.data.llm = { providers, audits }
  })
}

function renderGovernance() {
  const governance: any = state.data.governance ?? {}
  shell(`${header("Governance / Evals", "Recent policy decisions and memory-quality evaluations.", `<button class="primary" id="refresh">Refresh</button>`)}
    <div class="panel"><h2>Policy decisions</h2>${listItems(governance.policy?.results, renderPolicy)}</div>
    <div class="panel"><h2>Evaluations</h2>${listItems(governance.evaluations?.results, renderEvaluation)}</div>`)
  document.querySelector("#refresh")?.addEventListener("click", loadCurrentTab)
}

function renderLlm() {
  const llm: any = state.data.llm ?? {}
  shell(`${header("LLM Gateway", "Configured providers and recent provider-neutral call audits.", `<button class="primary" id="refresh">Refresh</button>`)}
    <div class="panel"><h2>Providers</h2>${listItems(llm.providers?.providers, (provider) => `<div class="item-title">${escapeHtml(provider.displayName)}</div><div class="item-meta">${badge(provider.providerKind)} ${badge(provider.enabled ? "enabled" : "disabled", provider.enabled ? "normal" : "warn")} <span>${escapeHtml(provider.defaultModel ?? "")}</span></div><pre>${escapeHtml(JSON.stringify(provider.capabilities, null, 2))}</pre>`)}</div>
    <div class="panel"><h2>Recent audits</h2>${listItems(llm.audits?.results, renderLlmAudit)}</div>`)
  document.querySelector("#refresh")?.addEventListener("click", loadCurrentTab)
}

function renderTools() {
  shell(`${header("Tools", "Convenience actions for local development and manual inspection.")}
    <div class="panel">
      <h2>Compile handoff</h2>
      <label class="field"><span>Objective</span><textarea id="handoff-objective">Resume software development from the current durable memory state.</textarea></label>
      <button class="primary" id="compile-handoff">Compile Handoff</button>
      <div id="tool-output"></div>
    </div>
    <div class="panel">
      <h2>Build context</h2>
      <label class="field"><span>Task</span><textarea id="context-task">Continue the current implementation task.</textarea></label>
      <button class="primary" id="build-context">Build Context</button>
    </div>`)
  document.querySelector("#compile-handoff")?.addEventListener("click", async () => {
    await toolRun(async () =>
      client().compileHandoff({
        ...projectInput(),
        objective: value("handoff-objective"),
        title: "Admin UI Handoff",
        query: "decisions constraints next actions verification",
      }),
    )
  })
  document.querySelector("#build-context")?.addEventListener("click", async () => {
    await toolRun(async () =>
      client().buildContext({
        ...projectInput(),
        task: value("context-task"),
        query: "decisions constraints next actions verification",
      }),
    )
  })
}

function value(id: string) {
  return document.querySelector<HTMLTextAreaElement | HTMLInputElement>(`#${id}`)?.value ?? ""
}

async function toolRun(fn: () => Promise<unknown>) {
  const output = document.querySelector<HTMLDivElement>("#tool-output")
  if (!output) return
  output.innerHTML = `<div class="empty">Running…</div>`
  try {
    const result = await fn()
    output.innerHTML = `<pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>`
  } catch (error) {
    output.innerHTML = `<div class="error">${escapeHtml(error instanceof Error ? error.message : "Unknown error")}</div>`
  }
}

function renderCurrentTab() {
  if (state.loading) {
    shell(`${header("Loading", "Fetching Continuum state.")}<div class="empty">Loading…</div>`)
    return
  }
  switch (state.tab) {
    case "overview":
      renderOverview()
      break
    case "memories":
      renderListTab(
        "Memories",
        "Search durable promoted memory records.",
        (state.data.memories as any)?.results,
        renderMemory,
        loadMemories,
        "Search memory content",
      )
      break
    case "candidates":
      renderListTab(
        "Candidates",
        "Review proposed, promoted, and rejected memory candidates.",
        (state.data.candidates as any)?.results,
        renderCandidate,
        loadCandidates,
        "Search candidate content",
      )
      break
    case "artifacts":
      renderListTab(
        "Artifacts",
        "Browse repository/file artifact memory and generated outputs.",
        (state.data.artifacts as any)?.results,
        renderArtifact,
        loadArtifacts,
        "Search paths, names, previews",
      )
      break
    case "handoffs":
      renderListTab(
        "Handoffs",
        "Browse compiled and manually-created handoff packs.",
        (state.data.handoffs as any)?.results,
        renderHandoff,
        loadHandoffs,
      )
      break
    case "governance":
      renderGovernance()
      break
    case "llm":
      renderLlm()
      break
    case "tools":
      renderTools()
      break
  }
}

function loadCurrentTab() {
  switch (state.tab) {
    case "overview":
      return loadOverview()
    case "memories":
      return loadMemories()
    case "candidates":
      return loadCandidates()
    case "artifacts":
      return loadArtifacts()
    case "handoffs":
      return loadHandoffs()
    case "governance":
      return loadGovernance()
    case "llm":
      return loadLlm()
    case "tools":
      renderTools()
      return Promise.resolve()
  }
}

loadCurrentTab()
