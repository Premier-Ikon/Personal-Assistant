"use client";

export default function WorkOverlay({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="work-overlay" aria-live="polite" role="status">
      <div className="work-overlay-card">
        <span className="spinner" />
        {title}
        <span>{detail}</span>
      </div>
    </div>
  );
}
