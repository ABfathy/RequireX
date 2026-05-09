// Atoms used across the kit.
const { useState } = React;

const Btn = ({ kind = "secondary", children, leading, trailing, size = "md", onClick, active }) => {
  const cls = [
    "btn",
    `btn-${kind}`,
    size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "",
    active ? "btn-active" : "",
  ].filter(Boolean).join(" ");
  return (
    <button className={cls} onClick={onClick}>
      {leading}
      <span>{children}</span>
      {trailing}
    </button>
  );
};

const IconBtn = ({ children, active, onClick, title, size = 14 }) => (
  <button className={"icon-btn" + (active ? " is-active" : "")} onClick={onClick} title={title}>
    {React.cloneElement(children, { size })}
  </button>
);

const Pill = ({ tone = "neutral", children, dot = true }) => (
  <span className={`pill pill-${tone}`}>
    {dot && <span className="pill-d" />}
    {children}
  </span>
);

const Tag = ({ children }) => <span className="tag">{children}</span>;

const Kbd = ({ children }) => <span className="kbd">{children}</span>;

const Crumb = ({ children, last }) => (
  <>
    <span className={last ? "crumb-last" : "crumb"}>{children}</span>
    {!last && <Icon.ChevronRight size={10} />}
  </>
);

const Field = ({ label, children, hint, error }) => (
  <label className="field">
    {label && <span className="field-label">{label}</span>}
    {children}
    {hint && <span className={"field-hint" + (error ? " is-error" : "")}>{hint}</span>}
  </label>
);

Object.assign(window, { Btn, IconBtn, Pill, Tag, Kbd, Crumb, Field });
