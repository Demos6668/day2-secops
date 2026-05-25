import { FileText, ExternalLink, Upload, Folder } from "lucide-react";
import { PageHeader } from "@/components/Common/PageHeader";
import { Card, CardContent } from "@/components/ui/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EvidenceDoc {
  id: string;
  title: string;
  framework: string;
  control: string;
  uploadedBy: string;
  uploadedAt: string;
  bytes: number;
}

const DEMO_DOCS: EvidenceDoc[] = [
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
];

function bytesLabel(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function AuditDocs() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit — Documentation"
        icon={FileText}
        description="Evidence locker. Per-control attestation documents, exports, sign-offs. Maps each artifact back to its framework + control."
        breadcrumb={[{ label: "Audit" }, { label: "Documentation" }]}
        meta={`${DEMO_DOCS.length} artifacts`}
        actions={
          <Button size="sm" disabled>
            <Upload className="h-3 w-3 mr-1.5" />
            Upload
          </Button>
        }
      />

      <Card className="glass-panel">
        <CardContent className="p-0">
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
              {DEMO_DOCS.map((d) => (
                <tr key={d.id} className="border-b hairline-b last:border-0 hover:bg-white/[0.02]">
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
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]" disabled>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
