import Anthropic from "@anthropic-ai/sdk";

/**
 * Extracts structured data from one scanned page of a survey case file
 * (survey/census form, measurement plan, municipal letter, lease
 * agreement, ...) using a vision-capable Claude model, instead of
 * classic OCR - the forms are largely handwritten Hebrew, which OCR
 * engines like Tesseract read very unreliably (confirmed earlier in this
 * project: Tesseract output on these exact documents was close to
 * unusable, while reading the same scans as images gave exact figures).
 *
 * The model tier is a plain string, resolved at call time from (in order)
 * an explicit argument, an env var, or the accuracy-first default - so
 * swapping to a cheaper/faster model later is a config change, not a code
 * change.
 */

// Model IDs as of the current Claude lineup. Kept as named tiers rather
// than hardcoding one ID through the codebase, so a swap is a one-line
// change here.
export const EXTRACTION_MODELS = {
  // Default. Handwritten forms feeding a financial audit are exactly the
  // case where a mis-read digit matters - pay for the most capable model.
  accurate: "claude-opus-5",
  // Cheaper/faster fallback for high-volume or budget-constrained runs.
  // Re-validate accuracy on a sample before switching a whole pipeline to
  // this tier - handwriting legibility varies a lot across scan batches.
  balanced: "claude-sonnet-5",
  fast: "claude-haiku-4-5",
} as const;

export type ExtractionModelTier = keyof typeof EXTRACTION_MODELS;

export type SurveyDocumentType =
  | "SURVEY_FORM" // טופס סקר נכסים
  | "MEASUREMENT_PLAN" // תוכנית מדידה
  | "MUNICIPAL_LETTER" // מכתב עירייה / מענה להשגה
  | "OBJECTION_FORM" // טופס השגה על חיוב ארנונה
  | "LEASE_AGREEMENT" // הסכם שכירות
  | "OTHER";

export interface ExtractedSurveyForm {
  documentType: SurveyDocumentType;
  gush: string | null;
  chelka: string | null;
  subChelka: string | null;
  netAreaSqm: number | null;
  propertyTypeCode: number | null;
  isNewProperty: boolean | null;
  /** Model's own confidence that the numeric fields above are correct. */
  confidence: "high" | "medium" | "low";
  /** Field names the model could not read confidently - never silently guessed. */
  uncertainFields: string[];
  /** Anything else worth a human's attention (stamps, handwritten margin notes, etc). */
  rawNotes: string;
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly rawResponseText: string,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

const EXTRACTION_PROMPT = `את/ה עוזר/ת לחלץ נתונים מדף אחד מתיק סקר נכסים של עיריית ירושלים.
הדף עשוי להיות: טופס סקר נכסים (עברית/ערבית, עם טבלת שטחים ותיבות סימון),
תוכנית מדידה (שרטוט עם מספרי חדרים ושטחים), מכתב עירייה, טופס השגה, או
הסכם שכירות - או מסמך אחר שלא קשור לסקר בכלל.

תפקידך:
1. לזהות את סוג המסמך.
2. לחלץ, רק אם ברור וקריא: גוש, חלקה, תת-חלקה (מהמזהה בפורמט גוש-חלקה-תת,
   או משדות נפרדים), שטח נטו כולל (מ"ר), קובעי מס/סוג נכס (מספר), והאם
   מסומן "נכס חדש".
3. **חשוב מאוד: אם שדה כלשהו לא קריא בבירור (כתב יד לא ברור, מחוק,
   חלקי) - אל תמלא ניחוש. שים ערך null ורשום את שם השדה ברשימת
   uncertainFields.** עדיף לסמן "לא בטוח" מאשר להחזיר מספר שגוי.

החזר **רק** JSON תקין, בלי טקסט נוסף לפניו או אחריו, בפורמט הזה בדיוק:
{
  "documentType": "SURVEY_FORM" | "MEASUREMENT_PLAN" | "MUNICIPAL_LETTER" | "OBJECTION_FORM" | "LEASE_AGREEMENT" | "OTHER",
  "gush": string | null,
  "chelka": string | null,
  "subChelka": string | null,
  "netAreaSqm": number | null,
  "propertyTypeCode": number | null,
  "isNewProperty": boolean | null,
  "confidence": "high" | "medium" | "low",
  "uncertainFields": string[],
  "rawNotes": string
}`;

// Structural subset of the Anthropic SDK client this module actually
// calls - lets tests inject a fake without pulling in real SDK types.
export interface MessagesCreatingClient {
  messages: {
    create(params: Record<string, unknown>): Promise<{
      content: Array<{ type: string; text?: string }>;
    }>;
  };
}

let cachedDefaultClient: MessagesCreatingClient | undefined;
function getDefaultClient(): MessagesCreatingClient {
  // Constructed lazily so importing this module never requires
  // credentials to be present - only actually calling extractSurveyForm
  // without an injected client does. The real client's `create` takes a
  // far more specific param type than the structural interface below
  // needs for injection; this module only ever calls it with a valid,
  // fully-populated request, so the cast is safe.
  cachedDefaultClient ??= new Anthropic() as unknown as MessagesCreatingClient;
  return cachedDefaultClient;
}

export interface ExtractSurveyFormInput {
  imageBase64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp";
  /** Explicit model ID or tier name; falls back to EXTRACTION_MODEL_ID env var, then the accurate tier. */
  model?: string | ExtractionModelTier;
}

export async function extractSurveyForm(
  input: ExtractSurveyFormInput,
  client: MessagesCreatingClient = getDefaultClient(),
): Promise<ExtractedSurveyForm> {
  const modelId = resolveModelId(input.model);

  const response = await client.messages.create({
    model: modelId,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: input.mediaType, data: input.imageBase64 },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text" && typeof b.text === "string");
  if (!textBlock?.text) {
    throw new ExtractionError(
      "המודל לא החזיר טקסט (בדוק stop_reason - יתכן refusal).",
      JSON.stringify(response),
    );
  }

  return parseExtractedForm(textBlock.text);
}

function resolveModelId(requested?: string): string {
  const candidate = requested ?? process.env.EXTRACTION_MODEL_ID ?? "accurate";
  if (candidate in EXTRACTION_MODELS) {
    return EXTRACTION_MODELS[candidate as ExtractionModelTier];
  }
  return candidate; // an explicit raw model ID, passed straight through
}

const DOCUMENT_TYPES: readonly SurveyDocumentType[] = [
  "SURVEY_FORM",
  "MEASUREMENT_PLAN",
  "MUNICIPAL_LETTER",
  "OBJECTION_FORM",
  "LEASE_AGREEMENT",
  "OTHER",
];

/**
 * Parses and validates the model's JSON response. Deliberately strict:
 * a malformed or incomplete response raises ExtractionError with the raw
 * text attached rather than returning a partially-guessed object - in an
 * audit tool, a silent fallback here is worse than a loud failure.
 */
export function parseExtractedForm(rawText: string): ExtractedSurveyForm {
  const jsonText = stripCodeFence(rawText.trim());

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new ExtractionError("תשובת המודל אינה JSON תקין.", rawText);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new ExtractionError("תשובת המודל אינה אובייקט JSON.", rawText);
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.documentType !== "string" || !DOCUMENT_TYPES.includes(obj.documentType as SurveyDocumentType)) {
    throw new ExtractionError(`documentType חסר או לא תקין: ${String(obj.documentType)}`, rawText);
  }
  if (typeof obj.confidence !== "string" || !["high", "medium", "low"].includes(obj.confidence)) {
    throw new ExtractionError(`confidence חסר או לא תקין: ${String(obj.confidence)}`, rawText);
  }

  return {
    documentType: obj.documentType as SurveyDocumentType,
    gush: nullableString(obj.gush),
    chelka: nullableString(obj.chelka),
    subChelka: nullableString(obj.subChelka),
    netAreaSqm: nullableNumber(obj.netAreaSqm),
    propertyTypeCode: nullableNumber(obj.propertyTypeCode),
    isNewProperty: typeof obj.isNewProperty === "boolean" ? obj.isNewProperty : null,
    confidence: obj.confidence as "high" | "medium" | "low",
    uncertainFields: Array.isArray(obj.uncertainFields) ? obj.uncertainFields.filter((f) => typeof f === "string") : [],
    rawNotes: typeof obj.rawNotes === "string" ? obj.rawNotes : "",
  };
}

function stripCodeFence(text: string): string {
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(text);
  return fenced ? fenced[1] : text;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
