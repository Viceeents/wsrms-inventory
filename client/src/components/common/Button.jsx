export default function Button({
  variant = "primary",
  className = "",
  children,
  loading = false,
  ...props
}) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      {...props}
      disabled={loading || props.disabled}
    >
      {loading ? <span className="spinner small" /> : null}
      {children}
    </button>
  );
}
