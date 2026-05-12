import { deflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { extractTextFromPdfBytes } from "@/server/services/pdf-text";

function makePdfWithTextStream(text: string) {
  const stream = deflateSync(Buffer.from(`BT (${text}) Tj ET`, "latin1"));
  return Buffer.concat([
    Buffer.from("%PDF-1.7\n1 0 obj\n", "latin1"),
    Buffer.from(
      `<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`,
      "latin1",
    ),
    stream,
    Buffer.from("\nendstream\nendobj\n%%EOF", "latin1"),
  ]);
}

describe("extractTextFromPdfBytes", () => {
  it("extracts text from a flate-compressed PDF content stream", () => {
    const text = extractTextFromPdfBytes(
      makePdfWithTextStream("Client needs a portal and approval workflow."),
    );

    expect(text).toContain("Client needs a portal");
    expect(text).toContain("approval workflow");
  });

  it("decodes escaped PDF string characters", () => {
    const text = extractTextFromPdfBytes(
      makePdfWithTextStream("Use \\(admin\\) role"),
    );

    expect(text).toBe("Use (admin) role");
  });
});
