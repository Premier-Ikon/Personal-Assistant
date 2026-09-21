"use client";

import Link from "next/link";

type Crumb = {
  href?: string;
  label: string;
};

export default function MailNav({
  backHref,
  backLabel,
  crumbs,
}: {
  backHref: string;
  backLabel: string;
  crumbs: Crumb[];
}) {
  return (
    <div className="mail-nav">
      <Link className="back-link" href={backHref}>
        <span className="back-chevron" aria-hidden>
          ←
        </span>
        {backLabel}
      </Link>
      <nav className="crumb-bar" aria-label="Breadcrumb">
        {crumbs.map((crumb, index) => (
          <span className="crumb-item" key={`${crumb.label}-${index}`}>
            {index > 0 ? (
              <span className="crumb-sep" aria-hidden>
                /
              </span>
            ) : null}
            {crumb.href ? (
              <Link href={crumb.href}>{crumb.label}</Link>
            ) : (
              <span className="crumb-current">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}
