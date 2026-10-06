import { AlertCircle, PackageOpen, RotateCw } from "lucide-react";
import Button from "./Button";
import { useId, Children, cloneElement, isValidElement } from "react";
export function PageTitle({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow || "WAREHOUSE OPERATIONS"}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Card({
  title,
  description,
  actions,
  children,
  className = "",
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-head">
          <div>
            <h2>{title}</h2>
            {description && <p className="muted text-xs mt-1">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
export function ErrorMessage({ message }) {
  return message ? (
    <div role="alert" className="alert alert-error">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      Loading warehouse records…
    </div>
  );
}
export function Empty({
  title = "No records found",
  description = "Try changing your search or filters.",
  children,
}) {
  return (
    <div className="empty-state">
      <PackageOpen size={36} strokeWidth={1.3} />
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {children}
    </div>
  );
}
export function LoadState({ loading, error, reload }) {
  return error ? (
    <div className="card p-6">
      <ErrorMessage message={error} />
      <Button variant="secondary" onClick={reload}>
        <RotateCw size={16} />
        Try again
      </Button>
    </div>
  ) : loading ? (
    <Loading />
  ) : null;
}
export function Field({ label, children, hint }) {
  const id = useId();
  function associate(nodes) {
    return Children.map(nodes, (child) => {
      if (!isValidElement(child)) return child;
      if (["input", "select", "textarea"].includes(child.type))
        return cloneElement(child, {
          id,
          "aria-describedby": hint ? `${id}-hint` : undefined,
        });
      return child.props.children
        ? cloneElement(child, {}, associate(child.props.children))
        : child;
    });
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {associate(children)}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Progress({ value }) {
  return (
    <div className="progress">
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
