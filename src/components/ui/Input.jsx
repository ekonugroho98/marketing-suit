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
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`input-field ${error ? "border-danger-500 focus:ring-danger-500" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger-600">
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
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`input-field resize-none ${error ? "border-danger-500" : ""}`}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger-600">
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
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={`input-field ${error ? "border-danger-500" : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
