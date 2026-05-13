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

function ascii85Encode(input: Buffer) {
  let output = "<~";

  for (let i = 0; i < input.length; i += 4) {
    const chunk = input.subarray(i, i + 4);
    const padded = Buffer.alloc(4);
    chunk.copy(padded);
    const value = padded.readUInt32BE(0);

    if (chunk.length === 4 && value === 0) {
      output += "z";
      continue;
    }

    const encoded = Array.from({ length: 5 }, (_, index) => {
      const divisor = 85 ** (4 - index);
      return String.fromCharCode((Math.floor(value / divisor) % 85) + 33);
    }).join("");
    output += encoded.slice(0, chunk.length + 1);
  }

  return Buffer.from(`${output}~>`, "latin1");
}

function makeReportLabStylePdfWithTextStream(text: string) {
  const compressed = deflateSync(Buffer.from(`BT (${text}) Tj ET`, "latin1"));
  const stream = ascii85Encode(compressed);
  return Buffer.concat([
    Buffer.from("%PDF-1.7\n1 0 obj\n", "latin1"),
    Buffer.from(
      `<< /Length ${stream.length} /Filter [ /ASCII85Decode /FlateDecode ] >>\nstream\n`,
      "latin1",
    ),
    stream,
    Buffer.from(
      "\nendstream\nendobj\n2 0 obj\n<< /Producer (ReportLab PDF Library) >>\nendobj\n%%EOF",
      "latin1",
    ),
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

  it("decodes ReportLab-style ASCII85 plus Flate streams", () => {
    const text = extractTextFromPdfBytes(
      makeReportLabStylePdfWithTextStream("Build an intake dashboard."),
    );

    expect(text).toContain("Build an intake dashboard.");
    expect(text).not.toContain("ReportLab PDF Library");
  });

  it("does not fall back to raw PDF metadata when streams are unreadable", () => {
    const pdf = Buffer.from(
      "%PDF-1.7\n1 0 obj\n<< /Producer (ReportLab PDF Library) >>\nendobj\n%%EOF",
      "latin1",
    );

    expect(extractTextFromPdfBytes(pdf)).toBe("");
  });
});
