import type { ActionType } from "./types";

// Hebrew labels observed in real "מהות פעולה" values from Ashed's monthly
// export, mapped to the internal ActionType the commission engine expects.
const LABEL_TO_ACTION_TYPE: Record<string, ActionType> = {
  "שינוי חיוב": "LEVY_CHANGE",
  "בניה חדשה": "NEW_CONSTRUCTION",
  "נכס חדש": "NEW_PROPERTY",
  "הערכת נכס": "ASSESSMENT",
  "איתור מחזיקים": "OCCUPANT_LOCATE",
};

export function mapActionTypeLabel(label: string): ActionType | null {
  return LABEL_TO_ACTION_TYPE[label.trim()] ?? null;
}
