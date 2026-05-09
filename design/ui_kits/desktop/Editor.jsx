// Editor — requirements list. Shows the structured output of an extraction.
const REQS = [
  { id: "REQ-0140", title: "Idempotency key required on all POST /payments",
    body: "Every POST to /payments MUST include an Idempotency-Key header. Duplicate keys within a 24-hour window return the original response without re-executing the side effect.",
    tags: ["functional", "api", "duplication"], status: "approved", trace: 4 },
  { id: "REQ-0141", title: "Failed payment retries follow exponential backoff",
    body: "Retries on transient gateway errors (5xx, network) follow exponential backoff with full jitter, capped at 30 s and 6 attempts.",
    tags: ["functional", "retry"], status: "approved", trace: 2 },
  { id: "REQ-0142", title: "Payment latency under 200 ms p99",
    body: "The payments handler must respond within 200 ms at the 99th percentile under nominal load. Breaches escalate to the on-call within one minute.",
    tags: ["non-functional", "latency", "slo"], status: "approved", trace: 3,
    activeHighlight: "200 ms at the 99th percentile",
    selected: true },
  { id: "REQ-0143", title: "Audit log retains 7 years",
    body: "All payment events are persisted to the audit log for 7 years (regulatory). Deletion is denied for retention-locked rows.",
    tags: ["compliance", "audit"], status: "review", trace: 2 },
  { id: "REQ-0144", title: "Settlement reconciliation runs daily at 03:00 UTC",
    body: "A nightly job reconciles processor statements against the ledger. Discrepancies above $0.01 raise a Sev-3.",
    tags: ["functional", "ops"], status: "draft", trace: 1 },
  { id: "REQ-0145", title: "PII fields encrypted at rest with KMS-managed keys",
    body: "Cardholder name and last-4 are encrypted using customer-managed KMS keys. Logs MUST scrub PAN entirely.",
    tags: ["security", "compliance"], status: "conflict", trace: 2 },
];

const STATUS_TONE = { approved: "success", review: "info", draft: "neutral", stale: "warning", conflict: "danger" };
const STATUS_LABEL = { approved: "Approved", review: "In review", draft: "Draft", stale: "Stale", conflict: "Conflict" };

const HighlightedBody = ({ text, highlight }) => {
  if (!highlight) return <span>{text}</span>;
  const i = text.indexOf(highlight);
  if (i < 0) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, i)}
      <em className="hl">{highlight}</em>
      {text.slice(i + highlight.length)}
    </span>
  );
};

const ReqRow = ({ r, selected, onSelect }) => (
  <div className={"req" + (selected ? " is-selected" : "")} onClick={() => onSelect(r.id)}>
    <div className="req-head">
      <span className="req-id mono">{r.id}</span>
      <Pill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Pill>
      <span className="req-spread" />
      <span className="req-trace">
        <Icon.Link size={12} />
        <span>{r.trace}</span>
      </span>
    </div>
    <div className="req-title">{r.title}</div>
    <div className="req-body">
      <HighlightedBody text={r.body} highlight={r.activeHighlight} />
    </div>
    <div className="req-foot">
      {r.tags.map((t) => <Tag key={t}>{t}</Tag>)}
    </div>
  </div>
);

const Editor = ({ source, activeReq, onSelectReq, onRunExtract, extracting }) => (
  <main className="ed">
    <div className="ed-head">
      <div className="ed-crumbs">
        <Crumb>payments-v2</Crumb>
        <Crumb>{source?.kind || "Documents"}</Crumb>
        <Crumb last>{source?.name || "payments-spec.pdf"}</Crumb>
      </div>
      <div className="ed-actions">
        <Btn kind="ghost" size="sm" leading={<Icon.Filter size={13} />}>Filter</Btn>
        <Btn kind="ghost" size="sm" leading={<Icon.Trace size={13} />}>Trace view</Btn>
        <Btn kind="primary" size="sm" leading={<Icon.ArrowRight size={13} />} onClick={onRunExtract}>
          {extracting ? "Extracting…" : "Re-extract"}
        </Btn>
      </div>
    </div>

    <div className="ed-meta">
      <span className="eyebrow">Source</span>
      <span className="ed-source">
        <Icon.DocLines size={14} />
        <span>{source?.name || "payments-spec.pdf"}</span>
        <span className="ed-source-meta">42 pages · 6.2 MB · ingested 12m ago</span>
      </span>
      <span className="ed-counts">
        <span><b>{REQS.length}</b> extracted</span>
        <span className="dot">·</span>
        <span><b>{REQS.filter(r => r.status === "approved").length}</b> approved</span>
        <span className="dot">·</span>
        <span><b>{REQS.filter(r => r.status === "review").length}</b> in review</span>
      </span>
    </div>

    <div className="ed-list">
      {REQS.map((r) => (
        <ReqRow key={r.id} r={r} selected={r.id === activeReq} onSelect={onSelectReq} />
      ))}
    </div>
  </main>
);

window.Editor = Editor;
window.REQS = REQS;
