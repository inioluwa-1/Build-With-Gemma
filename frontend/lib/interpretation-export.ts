import type { InterpretationSections } from "./schemas/explain";

/**
 * Export helpers for the interpretation report: a short spoken summary for
 * read-aloud, and a print-to-PDF of the full report.
 *
 * Print-to-PDF (rather than a PDF library) is deliberate: the browser's own
 * renderer is the only thing that lays out Yorùbá tone marks, Hausa/Igbo
 * diacritics and Arabic right-to-left correctly without shipping font files.
 */

/**
 * The gist, the ask, and the caution — not the full clause list, which can run
 * to a minute of speech. Built from the prose fields the model already wrote, so
 * there is no second model call and it works offline.
 */
export function spokenSummary(sections: InterpretationSections): string {
  return [sections.overview, sections.whatItAsks, sections.watchOut]
    .map((part) => part.replace(/\*\*/g, "").trim())
    .filter(Boolean)
    .join("\n\n");
}

export interface PrintFacts {
  issuer: string | null;
  subject: string | null;
  /** Pre-formatted for display, e.g. "₦450,000". */
  amounts: { label: string; value: string }[];
  dates: { label: string; value: string }[];
}

export interface PrintReportParams {
  sections: InterpretationSections;
  /** Chrome strings, already resolved in the app language. */
  labels: {
    subtitle: string;
    badge: string;
    whatThisIs: string;
    whatItSays: string;
    whatItAsks: string;
    watchOut: string;
    amounts: string;
    amountsNote: string;
    sentBy: string;
    about: string;
    trust: string;
  };
  facts: PrintFacts | null;
  /** BCP-47 tag for the report language, and whether it reads right-to-left. */
  langTag: string;
  rtl: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Mirror the on-screen ClauseText: newlines split lines, **bold** marks
 *  sub-labels, and a leading "MISSING DATA:" is flagged amber. */
function clauseHtml(detail: string): string {
  return detail
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let html = escapeHtml(line).replace(
        /\*\*([^*]+)\*\*/g,
        (_match, inner: string) => `<strong>${inner}</strong>`,
      );
      html = html.replace(
        /^(MISSING DATA:)/i,
        (_match, label: string) => `<span class="missing">${label}</span>`,
      );
      return `<p>${html}</p>`;
    })
    .join("");
}

function metaRows(rows: { label: string; value: string }[]): string {
  return rows
    .map(
      (row) =>
        `<div class="row"><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`,
    )
    .join("");
}

function buildReportHtml(params: PrintReportParams): string {
  const { sections, labels, facts, langTag, rtl } = params;

  const factRows = facts
    ? [
        ...(facts.issuer ? [{ label: labels.sentBy, value: facts.issuer }] : []),
        ...(facts.subject ? [{ label: labels.about, value: facts.subject }] : []),
      ]
    : [];
  const amountRows = facts ? [...facts.amounts, ...facts.dates] : [];

  const clauses = sections.clauses
    .map(
      (clause, index) => `
        <li>
          <span class="num">${String(index + 1).padStart(2, "0")}</span>
          <div>
            <h3>${escapeHtml(clause.heading)}</h3>
            ${clauseHtml(clause.detail)}
          </div>
        </li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="${escapeHtml(langTag)}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(sections.title)}</title>
<style>
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0; padding: 32px 40px; color: #1a1a1a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.5; font-size: 12pt;
  }
  header { border-bottom: 1px solid rgba(0,0,0,.25); padding-bottom: 20px; margin-bottom: 28px; }
  h1 { font-family: Georgia, "Times New Roman", serif; font-size: 26pt; margin: 0 0 4px; line-height: 1.15; }
  .subtitle { color: rgba(0,0,0,.55); margin: 0; font-size: 11pt; }
  .badge {
    display: inline-block; margin-top: 12px; background: #1a1a1a; color: #fff;
    padding: 5px 14px; font-size: 9pt; letter-spacing: .12em; text-transform: uppercase;
  }
  .kicker {
    font-size: 9pt; letter-spacing: .14em; text-transform: uppercase;
    color: #b45309; margin: 0 0 6px;
  }
  section { margin-bottom: 24px; page-break-inside: avoid; }
  .whatthisis { border: 1px solid rgba(0,0,0,.15); background: rgba(0,0,0,.02); padding: 16px 18px; }
  .whatthisis p { font-family: Georgia, serif; margin: 0; }
  dl { margin: 12px 0 0; }
  .row { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid rgba(0,0,0,.12); padding: 6px 0; }
  .row:last-child { border-bottom: 0; }
  dt { color: rgba(0,0,0,.55); text-transform: uppercase; font-size: 9pt; }
  dd { margin: 0; text-align: ${rtl ? "left" : "right"}; }
  h2 { font-family: Georgia, serif; font-size: 16pt; margin: 0 0 8px; }
  .overview { color: rgba(0,0,0,.7); margin: 0 0 4px; }
  ol { list-style: none; margin: 0; padding: 0; }
  ol li { display: flex; gap: 16px; border-top: 1px solid rgba(0,0,0,.12); padding: 16px 0; page-break-inside: avoid; }
  .num { font-family: Georgia, serif; font-weight: 700; font-size: 13pt; min-width: 34px; }
  ol h3 { font-size: 9pt; letter-spacing: .12em; text-transform: uppercase; color: #b45309; margin: 0 0 4px; }
  ol p, .callout p { margin: 0 0 6px; }
  .missing { color: #b45309; font-weight: 700; }
  .callout { border-inline-start: 4px solid rgba(0,0,0,.4); padding: 8px 14px; background: rgba(0,0,0,.02); margin-bottom: 12px; }
  .callout.amber { border-inline-start-color: #b45309; }
  .callout h3 { font-size: 9pt; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 4px; }
  .trust { color: rgba(0,0,0,.55); font-size: 9pt; border-top: 1px solid rgba(0,0,0,.15); padding-top: 12px; margin-top: 28px; }
</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(sections.title)}</h1>
    <p class="subtitle">${escapeHtml(labels.subtitle)}</p>
    <span class="badge">${escapeHtml(labels.badge)}</span>
  </header>

  <section class="whatthisis">
    <p class="kicker">${escapeHtml(labels.whatThisIs)}</p>
    <p>${escapeHtml(sections.whatThisIs)}</p>
    ${factRows.length ? `<dl>${metaRows(factRows)}</dl>` : ""}
  </section>

  ${
    amountRows.length
      ? `<section>
      <p class="kicker">${escapeHtml(labels.amounts)} ${escapeHtml(labels.amountsNote)}</p>
      <dl>${metaRows(amountRows)}</dl>
    </section>`
      : ""
  }

  <section>
    <h2>${escapeHtml(labels.whatItSays)}</h2>
    <p class="overview">${escapeHtml(sections.overview)}</p>
    <ol>${clauses}</ol>
  </section>

  <section>
    <div class="callout"><h3>${escapeHtml(labels.whatItAsks)}</h3>${clauseHtml(sections.whatItAsks)}</div>
    <div class="callout amber"><h3>${escapeHtml(labels.watchOut)}</h3>${clauseHtml(sections.watchOut)}</div>
  </section>

  <p class="trust">${escapeHtml(labels.trust)}</p>
</body>
</html>`;
}

/**
 * Render the report into a hidden iframe and open the print dialog, where the
 * user chooses "Save as PDF". An iframe (not a popup) sidesteps popup blockers;
 * the document title seeds the suggested filename.
 */
export function printReport(params: PrintReportParams): void {
  if (typeof window === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  const remove = () => {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
  };

  const frameDoc = iframe.contentWindow?.document;
  const frameWin = iframe.contentWindow;
  if (!frameDoc || !frameWin) {
    remove();
    return;
  }

  frameDoc.open();
  frameDoc.write(buildReportHtml(params));
  frameDoc.close();

  const trigger = () => {
    frameWin.focus();
    frameWin.print();
  };

  frameWin.onafterprint = () => setTimeout(remove, 300);
  // Print once the frame has laid out; the small delay lets fonts settle.
  if (frameDoc.readyState === "complete") {
    setTimeout(trigger, 80);
  } else {
    frameWin.onload = () => setTimeout(trigger, 80);
  }
  // Safety net: some engines never fire onafterprint.
  setTimeout(remove, 60000);
}
