import type { Finding } from "@/lib/auditPipeline";

export interface AuditRunState {
  status: "idle" | "error" | "success";
  error?: string;
  rowCount?: number;
  parseWarnings?: string[];
  findings?: Finding[];
}

export const INITIAL_AUDIT_STATE: AuditRunState = { status: "idle" };
