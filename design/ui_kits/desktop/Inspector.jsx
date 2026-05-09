// Inspector — right-side detail panel for the selected requirement.
const Inspector = ({ req }) => {
  if (!req) {
    return (
      <aside className="ins">
        <div className="ins-empty">
          <Icon.Trace size={20} />
          <span>Select a requirement to inspect.</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="ins">
      <div className="ins-head">
        <div>
          <span className="eyebrow">Requirement</span>
          <div className="ins-id mono">{req.id}</div>
        </div>
        <IconBtn title="More"><Icon.More /></IconBtn>
      </div>

      <div className="ins-section">
        <div className="ins-title">{req.title}</div>
        <div className="ins-body">{req.body}</div>
      </div>

      <div className="ins-section">
        <div className="eyebrow">Metadata</div>
        <dl className="ins-kv">
          <div><dt>Status</dt><dd><Pill tone="success">Approved</Pill></dd></div>
          <div><dt>Owner</dt><dd>e.lin@axiom</dd></div>
          <div><dt>Reviewer</dt><dd>m.foster@axiom</dd></div>
          <div><dt>Updated</dt><dd>2m ago</dd></div>
          <div><dt>Version</dt><dd className="mono">v2.1.0</dd></div>
        </dl>
      </div>

      <div className="ins-section">
        <div className="ins-section-head">
          <span className="eyebrow">Traced sources</span>
          <span className="ins-count">3</span>
        </div>

        <div className="trace-card">
          <div className="trace-card-head">
            <Icon.DocLines size={13} />
            <span className="mono">payments-spec.pdf</span>
            <span className="trace-loc mono">§3.4 · p.12</span>
          </div>
          <blockquote className="trace-quote">
            "The payment handler shall respond within <em>200&nbsp;ms at the 99th percentile</em> under nominal load (1k RPS, p50 cards-on-file)."
          </blockquote>
        </div>

        <div className="trace-card">
          <div className="trace-card-head">
            <Icon.Ticket size={13} />
            <span className="mono">JIRA-2491</span>
            <span className="trace-loc mono">comment · 4d ago</span>
          </div>
          <blockquote className="trace-quote">
            "We've been seeing tail-latency spikes — agreed to commit to <em>200&nbsp;ms p99</em> as the formal SLO."
          </blockquote>
        </div>

        <div className="trace-card">
          <div className="trace-card-head">
            <Icon.Code size={13} />
            <span className="mono">repo/payments/handler.ts</span>
            <span className="trace-loc mono">L412</span>
          </div>
          <pre className="trace-code"><code>
<span className="c">// REQ-0142 — enforce SLO</span>{"\n"}
<span className="k">const</span> threshold = <span className="n">200</span>; <span className="c">// p99 ms</span>{"\n"}
<span className="k">if</span> (req.elapsed {">"} threshold)
  <span className="k">throw new</span> <span className="t">SLOError</span>(<span className="s">"breach"</span>);
          </code></pre>
        </div>
      </div>
    </aside>
  );
};

window.Inspector = Inspector;
