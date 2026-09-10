import type { CategorizedRow } from "@/lib/auditPipeline";

export interface AuditRunState {
  status: "idle" | "error" | "success";
  error?: string;
  rowCount?: number;
  parseWarnings?: string[];
  results?: CategorizedRow[];
  /** The same results as a ready-to-download .xlsx workbook (3 sheets), base64-encoded. */
  workbookBase64?: string;
}

export const INITIAL_AUDIT_STATE: AuditRunState = { status: "idle" };
