/* global React, Icon */
const { useState: _useState } = React;

const Btn = ({ kind = "secondary", size = "md", children, leading, trailing, onClick, active, disabled }) => {
  const cls = ["btn", `btn-${kind}`, size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "", active ? "btn-active" : ""].filter(Boolean).join(" ");
  return (
    <button className={cls} onClick={onClick} disabled={disabled}>
      {leading}{children}{trailing}
    </button>
  );
};

const IconBtn = ({ children, active, onClick, title, size = 14 }) => (
  <button className={"icon-btn" + (active ? " is-active" : "")} onClick={onClick} title={title}>
    {React.cloneElement(children, { size })}
  </button>
);

const Pill = ({ tone = "neutral", dot = true, children }) => (
  <span className={`pill pill-${tone}`}>
    {dot && <span className="pill-d" />}
    {children}
  </span>
);

const Tag = ({ children }) => <span className="tag">{children}</span>;

const Kbd = ({ children }) => <span className="kbd">{children}</span>;

const Divider = () => <div style={{ height: 1, background: "var(--border-1)", margin: "4px 0" }} />;

Object.assign(window, { Btn, IconBtn, Pill, Tag, Kbd, Divider });
