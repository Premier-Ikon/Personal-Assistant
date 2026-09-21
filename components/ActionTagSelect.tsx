"use client";

export const ACTION_TAG_OPTIONS = [
  { value: "none", label: "No workflow" },
  { value: "address_change", label: "Address change" },
  { value: "order_status", label: "Order status" },
  { value: "refund", label: "Refund" },
  { value: "return", label: "Return" },
  { value: "cancel_order", label: "Cancel order" },
  { value: "inventory", label: "Inventory" },
  { value: "other", label: "Follow-up work" },
] as const;

export default function ActionTagSelect({
  value,
  disabled,
  compact,
  busy,
  onChange,
}: {
  value?: string | null;
  disabled?: boolean;
  compact?: boolean;
  busy?: boolean;
  onChange: (actionType: string) => void;
}) {
  return (
    <label
      className={`tag-select ${compact ? "compact" : ""} ${value && value !== "none" ? "tagged" : ""} ${busy ? "busy" : ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      <span className="sr-only">Workflow tag</span>
      <select
        className="ops-select tag-select-input"
        value={value || "none"}
        disabled={disabled || busy}
        aria-label="Workflow tag"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.value)}
      >
        {ACTION_TAG_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {busy ? <span className="spinner small select-spinner" aria-hidden="true" /> : null}
    </label>
  );
}
