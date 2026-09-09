import { describe, expect, it, vi } from "vitest";
import {
  EXTRACTION_MODELS,
  ExtractionError,
  extractSurveyForm,
  parseExtractedForm,
  type MessagesCreatingClient,
} from "../documentExtraction";

function fakeClient(responseText: string): MessagesCreatingClient {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: responseText }],
      }),
    },
  };
}

const VALID_RESPONSE = JSON.stringify({
  documentType: "SURVEY_FORM",
  gush: "30074",
  chelka: "009",
  subChelka: "000-1203",
  netAreaSqm: 109.2,
  propertyTypeCode: 9,
  isNewProperty: true,
  confidence: "high",
  uncertainFields: [],
  rawNotes: "",
});

describe("parseExtractedForm", () => {
  it("parses a well-formed response", () => {
    const result = parseExtractedForm(VALID_RESPONSE);
    expect(result.documentType).toBe("SURVEY_FORM");
    expect(result.gush).toBe("30074");
    expect(result.netAreaSqm).toBe(109.2);
    expect(result.isNewProperty).toBe(true);
  });

  it("strips a markdown code fence around the JSON", () => {
    const result = parseExtractedForm("```json\n" + VALID_RESPONSE + "\n```");
    expect(result.gush).toBe("30074");
  });

  it("keeps illegible fields as null with an explanation, never a guess", () => {
    const response = JSON.stringify({
      documentType: "MEASUREMENT_PLAN",
      gush: "30074",
      chelka: null,
      subChelka: null,
      netAreaSqm: null,
      propertyTypeCode: null,
      isNewProperty: null,
      confidence: "low",
      uncertainFields: ["chelka", "netAreaSqm"],
      rawNotes: "כתב יד לא קריא באזור החלקה והשטח",
    });
    const result = parseExtractedForm(response);
    expect(result.chelka).toBeNull();
    expect(result.netAreaSqm).toBeNull();
    expect(result.uncertainFields).toEqual(["chelka", "netAreaSqm"]);
    expect(result.confidence).toBe("low");
  });

  it("throws ExtractionError (not a silent default) on invalid JSON", () => {
    expect(() => parseExtractedForm("not json at all")).toThrow(ExtractionError);
  });

  it("throws ExtractionError when documentType is missing or unrecognised", () => {
    const response = JSON.stringify({ confidence: "high", documentType: "NOT_A_REAL_TYPE" });
    expect(() => parseExtractedForm(response)).toThrow(ExtractionError);
  });

  it("attaches the raw model text to the thrown error for debugging", () => {
    try {
      parseExtractedForm("garbage");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ExtractionError);
      expect((err as ExtractionError).rawResponseText).toBe("garbage");
    }
  });
});

describe("extractSurveyForm", () => {
  it("defaults to the accurate (most expensive) model tier", async () => {
    const client = fakeClient(VALID_RESPONSE);
    await extractSurveyForm({ imageBase64: "abc", mediaType: "image/png" }, client);
    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: EXTRACTION_MODELS.accurate }),
    );
  });

  it("lets the caller pick a cheaper tier by name", async () => {
    const client = fakeClient(VALID_RESPONSE);
    await extractSurveyForm({ imageBase64: "abc", mediaType: "image/png", model: "fast" }, client);
    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: EXTRACTION_MODELS.fast }),
    );
  });

  it("passes through an explicit raw model id unchanged", async () => {
    const client = fakeClient(VALID_RESPONSE);
    await extractSurveyForm({ imageBase64: "abc", mediaType: "image/png", model: "claude-sonnet-4-6" }, client);
    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-sonnet-4-6" }),
    );
  });

  it("respects the EXTRACTION_MODEL_ID env var when no explicit model is passed", async () => {
    const client = fakeClient(VALID_RESPONSE);
    vi.stubEnv("EXTRACTION_MODEL_ID", "balanced");
    await extractSurveyForm({ imageBase64: "abc", mediaType: "image/png" }, client);
    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: EXTRACTION_MODELS.balanced }),
    );
    vi.unstubAllEnvs();
  });

  it("sends the image as a base64 content block", async () => {
    const client = fakeClient(VALID_RESPONSE);
    await extractSurveyForm({ imageBase64: "abc123", mediaType: "image/jpeg" }, client);
    const [args] = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0];
    const content = (args.messages as Array<{ content: unknown }>)[0].content as Array<Record<string, unknown>>;
    expect(content[0]).toMatchObject({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: "abc123" },
    });
  });

  it("raises ExtractionError when the model returns no text block (e.g. a refusal)", async () => {
    const client: MessagesCreatingClient = {
      messages: { create: vi.fn().mockResolvedValue({ content: [] }) },
    };
    await expect(extractSurveyForm({ imageBase64: "abc", mediaType: "image/png" }, client)).rejects.toThrow(
      ExtractionError,
    );
  });
});
