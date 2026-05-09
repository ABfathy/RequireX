// Shell — three-pane application frame: title bar, sidebar, main, inspector, status bar.
const { useState: useStateSh, useEffect: useEffectSh } = React;

const TitleBar = ({ onTogglePalette }) => (
  <div className="tt">
    <div className="tt-traffic">
      <span /><span /><span />
    </div>
    <div className="tt-grow tt-search" onClick={onTogglePalette}>
      <Icon.Search size={12} />
      <span className="tt-search-text">Search Axiom — payments-v2</span>
      <Kbd>⌘K</Kbd>
    </div>
    <div className="tt-tools">
      <IconBtn title="Sidebar"><Icon.Sidebar /></IconBtn>
      <IconBtn title="Inspector" active><Icon.Inspector /></IconBtn>
    </div>
  </div>
);

const StatusBar = ({ extracting, count }) => (
  <div className="sts">
    <span className={"sts-dot " + (extracting ? "is-busy" : "")} />
    <span>{extracting ? "extracting…" : "extract: idle"}</span>
    <span className="sts-sep">·</span>
    <Icon.Check size={11} />
    <span>{count} / {count} linked</span>
    <span className="sts-grow" />
    <span>main</span>
    <span className="sts-sep">·</span>
    <span>UTF-8</span>
    <span className="sts-sep">·</span>
    <span>Ln 412, Col 24</span>
    <span className="sts-sep">·</span>
    <span>spec/v2.1</span>
  </div>
);

const FlatSources = SOURCES.flatMap((g) => g.items.map((i) => ({ ...i, kind: g.label })));

const Shell = () => {
  const [activeSourceId, setActiveSourceId] = useStateSh("s6");
  const [activeReqId, setActiveReqId] = useStateSh("REQ-0142");
  const [palOpen, setPalOpen] = useStateSh(false);
  const [extracting, setExtracting] = useStateSh(false);

  const activeSource = FlatSources.find((s) => s.id === activeSourceId);
  const activeReq = REQS.find((r) => r.id === activeReqId);

  useEffectSh(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalOpen((p) => !p);
      } else if (e.key === "Escape") {
        setPalOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const runExtract = () => {
    setExtracting(true);
    setTimeout(() => setExtracting(false), 1400);
  };

  return (
    <div className="app">
      <TitleBar onTogglePalette={() => setPalOpen(true)} />
      <div className="app-body">
        <Sidebar
          activeId={activeSourceId}
          onSelect={setActiveSourceId}
          onAddSource={() => setPalOpen(true)}
        />
        <Editor
          source={activeSource}
          activeReq={activeReqId}
          onSelectReq={setActiveReqId}
          onRunExtract={runExtract}
          extracting={extracting}
        />
        <Inspector req={activeReq} />
      </div>
      <StatusBar extracting={extracting} count={REQS.length} />
      {palOpen && <CommandPalette onClose={() => setPalOpen(false)} />}
    </div>
  );
};

window.Shell = Shell;
