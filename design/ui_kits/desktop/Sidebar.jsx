// Sidebar — source tree with collapsible groups, status dots, accent rail.
const { useState: useStateSb } = React;

const SOURCES = [
  { kind: "group", label: "Documents", id: "g1", items: [
    { id: "s1", name: "payments-spec.pdf",       icon: "DocLines", count: 42, status: "ok" },
    { id: "s2", name: "compliance-iso26262.pdf", icon: "DocLines", count: 128, status: "ok" },
    { id: "s3", name: "rfp-v2.docx",             icon: "Doc",      count: 17, status: "warn" },
  ]},
  { kind: "group", label: "Transcripts", id: "g2", items: [
    { id: "s4", name: "kickoff-call.vtt",  icon: "Mic", count: 9,  status: "ok" },
    { id: "s5", name: "user-research.vtt", icon: "Mic", count: 23, status: "ok" },
  ]},
  { kind: "group", label: "Tickets", id: "g3", items: [
    { id: "s6", name: "JIRA-2491 — Reduce p99",      icon: "Ticket", count: 3, status: "active" },
    { id: "s7", name: "JIRA-2502 — Idempotency key", icon: "Ticket", count: 2, status: "ok" },
  ]},
  { kind: "group", label: "Code", id: "g4", items: [
    { id: "s8", name: "repo/payments/handler.ts", icon: "Code", count: 6, status: "warn" },
    { id: "s9", name: "repo/payments/sla.test.ts", icon: "Code", count: 4, status: "ok" },
  ]},
];

const StatusDot = ({ status }) => {
  if (!status || status === "active") return null;
  return <span className={`s-dot s-${status}`} />;
};

const Sidebar = ({ activeId, onSelect, onAddSource }) => {
  const [open, setOpen] = useStateSb({ g1: true, g2: true, g3: true, g4: true });
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  return (
    <aside className="sb">
      <div className="sb-head">
        <div className="sb-brand">
          <span className="sb-brand-mark"><Icon.Logo size={18} /></span>
          <span className="sb-brand-name">Axiom</span>
          <span className="sb-brand-proj">payments-v2</span>
        </div>
        <IconBtn title="Settings"><Icon.Cog /></IconBtn>
      </div>

      <div className="sb-search">
        <Icon.Search size={13} />
        <input placeholder="Find source or requirement…" />
        <Kbd>⌘K</Kbd>
      </div>

      <div className="sb-scroll">
        {SOURCES.map((g) => (
          <div className="sb-group" key={g.id}>
            <button className="sb-grouphead" onClick={() => toggle(g.id)}>
              <span className={"sb-chev" + (open[g.id] ? " is-open" : "")}>
                <Icon.ChevronRight size={11} />
              </span>
              <span className="sb-grouplabel">{g.label}</span>
              <span className="sb-groupcount">{g.items.length}</span>
            </button>
            {open[g.id] && g.items.map((s) => {
              const isActive = s.id === activeId;
              const I = Icon[s.icon];
              return (
                <button
                  key={s.id}
                  className={"sb-row" + (isActive ? " is-active" : "")}
                  onClick={() => onSelect(s.id)}
                >
                  <span className="sb-rail" />
                  <I size={14} />
                  <span className="sb-name">{s.name}</span>
                  {s.status && s.status !== "active" ? (
                    <StatusDot status={s.status} />
                  ) : (
                    <span className="sb-count">{s.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <button className="sb-foot" onClick={onAddSource}>
        <Icon.Plus size={13} />
        <span>Add source</span>
      </button>
    </aside>
  );
};

window.Sidebar = Sidebar;
window.SOURCES = SOURCES;
