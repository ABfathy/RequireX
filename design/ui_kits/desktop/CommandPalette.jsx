// Command palette — ⌘K. Sectioned, with active row and kbd hints.
const { useEffect: useEffectCp, useState: useStateCp, useRef: useRefCp } = React;

const PAL_ITEMS = [
  { section: "Actions", items: [
    { id: "extract",   icon: "ArrowRight", label: "Extract requirements from selected source", kbd: "⏎" },
    { id: "addsrc",    icon: "Plus",       label: "Add new source…",                            kbd: "⌘N" },
    { id: "reextract", icon: "Refresh",    label: "Re-extract all sources" },
    { id: "trace",     icon: "Trace",      label: "Open trace graph",                            kbd: "⌘T" },
    { id: "filter",    icon: "Filter",     label: "Filter requirements…",                        kbd: "⌘F" },
  ]},
  { section: "Recent", items: [
    { id: "r1", icon: "Clock", label: <>Extracted 23 reqs from <span className="mono mono-em">payments-spec.pdf</span></> },
    { id: "r2", icon: "Clock", label: <>Approved <span className="mono mono-em">REQ-0142</span></> },
    { id: "r3", icon: "Clock", label: <>Linked <span className="mono mono-em">JIRA-2491</span> to 2 requirements</> },
  ]},
];

const CommandPalette = ({ onClose }) => {
  const [q, setQ] = useStateCp("");
  const [active, setActive] = useStateCp(0);
  const inputRef = useRefCp(null);
  useEffectCp(() => { inputRef.current?.focus(); }, []);

  // flatten for keyboard nav
  const flat = PAL_ITEMS.flatMap((s) => s.items.map((i) => ({ ...i, section: s.section })));

  const filtered = q
    ? flat.filter((i) => (typeof i.label === "string" ? i.label : "").toLowerCase().includes(q.toLowerCase()))
    : flat;

  const handleKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); onClose(); }
  };

  return (
    <div className="pal-scrim" onClick={onClose}>
      <div className="pal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKey}>
        <div className="pal-search">
          <Icon.Search size={14} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            placeholder="Type a command, source, or requirement ID…"
          />
          <Kbd>esc</Kbd>
        </div>
        <div className="pal-body">
          {PAL_ITEMS.map((s) => {
            const items = s.items.filter((i) =>
              !q || (typeof i.label === "string" && i.label.toLowerCase().includes(q.toLowerCase())));
            if (!items.length) return null;
            return (
              <div className="pal-section" key={s.section}>
                <div className="pal-heading">{s.section}</div>
                {items.map((i) => {
                  const idx = filtered.findIndex((f) => f.id === i.id);
                  const isActive = idx === active;
                  const I = Icon[i.icon];
                  return (
                    <button
                      key={i.id}
                      className={"pal-row" + (isActive ? " is-active" : "")}
                      onMouseEnter={() => setActive(idx)}
                      onClick={onClose}
                    >
                      <I size={14} />
                      <span className="pal-label">{i.label}</span>
                      {i.kbd && <Kbd>{i.kbd}</Kbd>}
                    </button>
                  );
                })}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="pal-empty">No matches.</div>}
        </div>
      </div>
    </div>
  );
};

window.CommandPalette = CommandPalette;
