import { useMemo, useState } from "react";
import { FileText, Download, Upload, Folder, Search, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadEvidencePlaceholder } from "@/lib/audit/exports";

interface EvidenceDoc {
  id: string;
  title: string;
  framework: string;
  control: string;
  uploadedBy: string;
  uploadedAt: string;
  bytes: number;
}

const DOCUMENTS: EvidenceDoc[] = [
  {
    id: "doc-1",
    title: "MFA enrollment report — Q1 2026",
    framework: "ISO 27001",
    control: "A.5.15",
    uploadedBy: "iam.ops",
    uploadedAt: "2026-04-04",
    bytes: 142 * 1024,
  },
  {
    id: "doc-2",
    title: "Disk encryption attestation — endpoint fleet",
    framework: "NIST CSF",
    control: "PR.DS-01",
    uploadedBy: "endpoint.ops",
    uploadedAt: "2026-04-18",
    bytes: 88 * 1024,
  },
  {
    id: "doc-3",
    title: "Forescout posture-policy export",
    framework: "RBI CSF",
    control: "RBI-3",
    uploadedBy: "net.ops",
    uploadedAt: "2026-05-02",
    bytes: 311 * 1024,
  },
  {
    id: "doc-4",
    title: "WAF block-mode coverage matrix",
    framework: "ISO 27001",
    control: "A.8.23",
    uploadedBy: "app.sec",
    uploadedAt: "2026-05-08",
    bytes: 56 * 1024,
  },
  {
    id: "doc-5",
    title: "RBI CSF mid-year evidence pack (signed)",
    framework: "RBI CSF",
    control: "RBI-10",
    uploadedBy: "audit.team",
    uploadedAt: "2026-05-15",
    bytes: 1024 * 1024 * 2,
  },
  {
    id: "doc-6",
    title: "Privileged session sampling — Q1 2026",
    framework: "ISO 27001",
    control: "A.5.15",
    uploadedBy: "iam.ops",
    uploadedAt: "2026-04-10",
    bytes: 482 * 1024,
  },
];

function bytesLabel(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function AuditDocs() {
  const [query, setQuery] = useState("");
  const [pickedFrameworks, setPickedFrameworks] = useState<string[]>([]);

  const allFrameworks = useMemo(
    () => Array.from(new Set(DOCUMENTS.map((d) => d.framework))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    return DOCUMENTS.filter((d) => {
      if (pickedFrameworks.length && !pickedFrameworks.includes(d.framework)) return false;
      if (!needle) return true;
      return (
        d.title.toLowerCase().includes(needle) ||
        d.framework.toLowerCase().includes(needle) ||
        d.control.toLowerCase().includes(needle) ||
        d.uploadedBy.toLowerCase().includes(needle)
      );
    });
  }, [query, pickedFrameworks]);

  const filtersActive = query.length > 0 || pickedFrameworks.length > 0;

  const toggleFramework = (f: string) =>
    setPickedFrameworks((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const clearFilters = () => {
    setQuery("");
    setPickedFrameworks([]);
  };

  const handleDownload = (d: EvidenceDoc) => {
    try {
      downloadEvidencePlaceholder(d);
      toast.success(`Downloading ${d.title}`);
    } catch (e) {
      toast.error("Download failed", { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit — Documentation"
        icon={FileText}
        description="Evidence locker. Per-control attestation documents, exports, sign-offs. Maps each artifact back to its framework + control."
        breadcrumb={[{ label: "Audit" }, { label: "Documentation" }]}
        meta={`${filtered.length}/${DOCUMENTS.length} artifacts`}
        actions={
          <Button size="sm" disabled>
            <Upload className="h-3 w-3 mr-1.5" />
            Upload
          </Button>
        }
      />

      <Card className="glass-panel">
        <CardContent className="p-3 flex items-center gap-2 flex-wrap">
          <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by title, control, or owner…"
            className="h-8 max-w-md text-xs"
            aria-label="Filter evidence documents"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                Framework
                {pickedFrameworks.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {pickedFrameworks.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Framework
              </DropdownMenuLabel>
              {allFrameworks.map((f) => (
                <DropdownMenuCheckboxItem
                  key={f}
                  checked={pickedFrameworks.includes(f)}
                  onCheckedChange={() => toggleFramework(f)}
                  onSelect={(e) => e.preventDefault()}
                  className="text-xs"
                >
                  {f}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[10px]"
              onClick={clearFilters}
              aria-label="Clear filters"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-4 py-6 text-center">
              No documents match the current filter.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b hairline-b text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                <tr>
                  <th scope="col" className="text-left px-3 py-2">
                    Title
                  </th>
                  <th scope="col" className="text-left px-3 py-2">
                    Framework
                  </th>
                  <th scope="col" className="text-left px-3 py-2">
                    Control
                  </th>
                  <th scope="col" className="text-left px-3 py-2">
                    Uploaded by
                  </th>
                  <th scope="col" className="text-right px-3 py-2">
                    Size
                  </th>
                  <th scope="col" className="text-right px-3 py-2">
                    Date
                  </th>
                  <th scope="col" className="px-3 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b hairline-b last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Folder className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        <span className="font-medium text-xs">{d.title}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {d.framework}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-[11px] font-mono">{d.control}</td>
                    <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground">
                      {d.uploadedBy}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] font-mono tabular-nums">
                      {bytesLabel(d.bytes)}
                    </td>
                    <td className="px-3 py-2 text-right text-[10px] font-mono text-muted-foreground">
                      {d.uploadedAt}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px]"
                        onClick={() => handleDownload(d)}
                        aria-label={`Download ${d.title}`}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
