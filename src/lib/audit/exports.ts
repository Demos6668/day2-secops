/**
 * Audit export utilities.
 *
 * Lazy-loaded — `xlsx`, `jspdf`, `jspdf-autotable`, and `jszip` are heavy and
 * never imported at the top of the SPA. Each function `await`s a dynamic
 * `import()` only when the user clicks the export button.
 *
 * Outputs:
 *   - downloadXlsx(): per-framework + combined sheets of the Control Matrix
 *   - downloadPdf():  printable framework report (cover + tables + appendix)
 *   - downloadChecklistCsv(): single checklist → CSV
 *   - downloadChecklistsBundleJson(): all checklists → JSON
 *   - downloadAuditPackZip(): XLSX + PDF + JSON in one zip
 */

import type { Framework, Tool } from "@/types/tool";
import type { AuditChecklist } from "@/types/audit-checklists";
import { rollupControl } from "@/lib/audit/coverage";
import { resolveControlImpact, controlRef } from "@/lib/audit/control-impact";

function timestamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so Safari can read the URL before it disappears.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// -- XLSX (Control Matrix) ----------------------------------------------

interface MatrixRow {
  Framework: string;
  "Control ID": string;
  Title: string;
  "Anchor tools": string;
  "Coverage status": string;
  "Anchor count": number;
  "Healthy anchors": number;
}

function buildMatrixRows(frameworks: Framework[], tools: Tool[]): MatrixRow[] {
  const rows: MatrixRow[] = [];
  for (const f of frameworks) {
    for (const c of f.controls) {
      const impact = resolveControlImpact(f.id, c, tools);
      const roll = rollupControl(c, tools);
      rows.push({
        Framework: f.shortName,
        "Control ID": c.id,
        Title: c.title,
        "Anchor tools": c.anchorTools.join(", "),
        "Coverage status": roll.overall,
        "Anchor count": impact.anchoredTools.length,
        "Healthy anchors": impact.coverage.covered,
      });
    }
  }
  return rows;
}

export async function downloadXlsx(frameworks: Framework[], tools: Tool[]): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // Combined sheet first.
  const combinedRows = buildMatrixRows(frameworks, tools);
  const combined = XLSX.utils.json_to_sheet(combinedRows);
  XLSX.utils.book_append_sheet(wb, combined, "Combined");

  // One sheet per framework.
  for (const f of frameworks) {
    const rows = combinedRows.filter((r) => r.Framework === f.shortName);
    if (rows.length === 0) continue;
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, f.shortName.slice(0, 31));
  }

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  triggerDownload(
    new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `audit-control-matrix-${timestamp()}.xlsx`,
  );
}

// -- PDF (printable audit report) ---------------------------------------

export async function downloadPdf(
  frameworks: Framework[],
  tools: Tool[],
  workspaceName: string,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const autoTableMod = await import("jspdf-autotable");
  const autoTable = autoTableMod.default;

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });

  // Cover.
  doc.setFontSize(22);
  doc.text("Day2 SecOps — Audit Report", 40, 60);
  doc.setFontSize(12);
  doc.setTextColor(120);
  doc.text(`Workspace: ${workspaceName}`, 40, 84);
  doc.text(`Generated: ${new Date().toISOString()}`, 40, 100);
  doc.setTextColor(0);

  let y = 140;
  doc.setFontSize(14);
  doc.text("Frameworks", 40, y);
  y += 14;
  doc.setFontSize(10);
  doc.setTextColor(80);
  for (const f of frameworks) {
    doc.text(`• ${f.shortName} — ${f.name} (${f.controls.length} controls)`, 50, y);
    y += 12;
  }
  doc.setTextColor(0);

  // One framework per page.
  for (const f of frameworks) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text(f.name, 40, 50);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`${f.controls.length} controls · short ID ${f.shortName}`, 40, 66);
    doc.setTextColor(0);

    const tableBody = f.controls.map((c) => {
      const roll = rollupControl(c, tools);
      const impact = resolveControlImpact(f.id, c, tools);
      return [
        c.id,
        c.title,
        roll.overall,
        `${impact.coverage.covered}/${impact.anchoredTools.length}`,
        c.anchorTools.join(", ") || "—",
      ];
    });

    autoTable(doc, {
      startY: 86,
      head: [["Control", "Title", "Status", "Healthy", "Anchors"]],
      body: tableBody,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [13, 17, 23], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 200 },
        2: { cellWidth: 60 },
        3: { cellWidth: 60 },
        4: { cellWidth: "auto" },
      },
    });
  }

  // Appendix: tool inventory.
  doc.addPage();
  doc.setFontSize(16);
  doc.text("Appendix A — Tool Inventory", 40, 50);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`${tools.length} tools observed at generation time`, 40, 66);
  doc.setTextColor(0);
  autoTable(doc, {
    startY: 86,
    head: [["Tool", "OEM", "Tower", "Severity", "Status", "Visibility"]],
    body: tools.map((t) => [
      t.solution,
      t.oem,
      t.tower,
      t.severity,
      t.status,
      `${((t.observed / Math.max(1, t.denominator)) * 100).toFixed(1)}%`,
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [13, 17, 23], textColor: 255 },
  });

  doc.save(`audit-report-${timestamp()}.pdf`);
}

// -- Checklist exports --------------------------------------------------

export function downloadChecklistCsv(list: AuditChecklist): void {
  const rows: string[][] = [["item_id", "title", "description", "status", "owner", "due", "control"]];
  for (const it of list.items) {
    rows.push([
      it.id,
      it.title,
      it.description ?? "",
      it.status,
      it.owner ?? "",
      it.due ?? "",
      it.control ?? "",
    ]);
  }
  const csv = rows
    .map((r) => r.map((cell) => `"${(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  triggerDownload(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `checklist-${list.id}-${timestamp()}.csv`,
  );
}

export function downloadChecklistsBundleJson(checklists: AuditChecklist[]): void {
  const payload = {
    generatedAt: new Date().toISOString(),
    count: checklists.length,
    checklists,
  };
  triggerDownload(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    `audit-checklists-${timestamp()}.json`,
  );
}

// -- Per-control evidence JSON (called by ControlDetail's button too) ---

export function downloadControlEvidenceJson(
  frameworks: Framework[],
  tools: Tool[],
  fwId: string,
  controlId: string,
): void {
  const f = frameworks.find((f) => f.id === fwId);
  if (!f) return;
  const c = f.controls.find((c) => c.id === controlId);
  if (!c) return;
  const impact = resolveControlImpact(fwId, c, tools);
  triggerDownload(
    new Blob(
      [
        JSON.stringify(
          {
            ref: controlRef(fwId, controlId),
            framework: f.name,
            control: c,
            coverage: impact.coverage,
            anchoredTools: impact.anchoredTools.map((t) => ({
              id: t.id,
              solution: t.solution,
              oem: t.oem,
              tower: t.tower,
              status: t.status,
              visibility: t.observed / Math.max(1, t.denominator),
              activeCauses: t.causes,
              activeLossReasons: t.activeLossReasons ?? [],
            })),
            activeCauses: impact.activeCauses,
            recentRiskyChanges: impact.recentRiskyChanges,
            relatedControls: impact.relatedControls.map((r) => ({
              topic: r.correlation.topic,
              refs: r.refs,
            })),
            generatedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    `${fwId}-${controlId}-evidence-${timestamp()}.json`,
  );
}

// -- Audit pack zip -----------------------------------------------------

export async function downloadAuditPackZip(
  frameworks: Framework[],
  tools: Tool[],
  workspaceName: string,
  checklists: AuditChecklist[],
): Promise<void> {
  const [{ default: JSZip }, XLSX, { default: jsPDF }, autoTableMod] = await Promise.all([
    import("jszip"),
    import("xlsx"),
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;

  const zip = new JSZip();
  const stamp = timestamp();

  // 1. XLSX
  {
    const wb = XLSX.utils.book_new();
    const rows = buildMatrixRows(frameworks, tools);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Combined");
    for (const f of frameworks) {
      const slice = rows.filter((r) => r.Framework === f.shortName);
      if (slice.length === 0) continue;
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(slice),
        f.shortName.slice(0, 31),
      );
    }
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    zip.file(`control-matrix-${stamp}.xlsx`, out as ArrayBuffer);
  }

  // 2. PDF
  {
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    doc.setFontSize(22);
    doc.text("Day2 SecOps — Audit Report", 40, 60);
    doc.setFontSize(12);
    doc.setTextColor(120);
    doc.text(`Workspace: ${workspaceName}`, 40, 84);
    doc.text(`Generated: ${new Date().toISOString()}`, 40, 100);
    doc.setTextColor(0);
    for (const f of frameworks) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text(f.name, 40, 50);
      autoTable(doc, {
        startY: 80,
        head: [["Control", "Title", "Status", "Healthy", "Anchors"]],
        body: f.controls.map((c) => {
          const roll = rollupControl(c, tools);
          const impact = resolveControlImpact(f.id, c, tools);
          return [
            c.id,
            c.title,
            roll.overall,
            `${impact.coverage.covered}/${impact.anchoredTools.length}`,
            c.anchorTools.join(", ") || "—",
          ];
        }),
        styles: { fontSize: 8, cellPadding: 4 },
      });
    }
    const pdfArr = doc.output("arraybuffer");
    zip.file(`audit-report-${stamp}.pdf`, pdfArr);
  }

  // 3. Checklists JSON
  zip.file(
    `audit-checklists-${stamp}.json`,
    JSON.stringify({ generatedAt: new Date().toISOString(), checklists }, null, 2),
  );

  // 4. Manifest
  zip.file(
    `manifest.json`,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        workspace: workspaceName,
        frameworks: frameworks.map((f) => ({ id: f.id, name: f.name, controls: f.controls.length })),
        toolCount: tools.length,
        checklistCount: checklists.length,
        contents: [
          `control-matrix-${stamp}.xlsx`,
          `audit-report-${stamp}.pdf`,
          `audit-checklists-${stamp}.json`,
        ],
      },
      null,
      2,
    ),
  );

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `audit-pack-${stamp}.zip`);
}

// -- Evidence document mock-download ------------------------------------

/** Tiny on-the-fly text-blob "download" for AuditDocs Open/Download buttons. */
export function downloadEvidencePlaceholder(doc: {
  id: string;
  title: string;
  framework: string;
  control: string;
  uploadedBy: string;
  uploadedAt: string;
}): void {
  const lines = [
    `Day2 SecOps — Evidence document placeholder`,
    `Document ID:  ${doc.id}`,
    `Title:        ${doc.title}`,
    `Framework:    ${doc.framework}`,
    `Control:      ${doc.control}`,
    `Uploaded by:  ${doc.uploadedBy}`,
    `Uploaded at:  ${doc.uploadedAt}`,
    `Generated:    ${new Date().toISOString()}`,
    ``,
    `In production this blob is the actual evidence artifact (PDF, screenshot,`,
    `signed attestation) fetched from the per-OEM evidence store. The stub here`,
    `is rendered locally so the download workflow stays click-testable.`,
  ];
  triggerDownload(
    new Blob([lines.join("\n")], { type: "text/plain" }),
    `${doc.id}-${doc.framework.replace(/\s+/g, "-")}-${doc.control}.txt`,
  );
}
