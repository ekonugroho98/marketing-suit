import { useId } from "react";

export default function Input({
  label,
  error,
  className = "",
  id: externalId,
  ...props
}) {
  const reactId = useId();
  const id = externalId || reactId;
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-text-secondary mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`glass-input ${error ? "border-danger-500/50 focus:border-danger-500 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.1)]" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  error,
  className = "",
  rows = 3,
  id: externalId,
  ...props
}) {
  const reactId = useId();
  const id = externalId || reactId;
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-text-secondary mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`glass-input resize-none ${error ? "border-danger-500/50" : ""}`}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  error,
  options = [],
  className = "",
  id: externalId,
  ...props
}) {
  const reactId = useId();
  const id = externalId || reactId;
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-text-secondary mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={`glass-input ${error ? "border-danger-500/50" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-base-100 text-text-primary">
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
