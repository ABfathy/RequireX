import { inflateSync } from "node:zlib";

const STREAM_START_PATTERN = /<<(?:.|\n|\r)*?>>\s*stream\r?\n?/g;
const TEXT_OBJECT_PATTERN = /BT(?:.|\n|\r)*?ET/g;

function trimStreamBytes(bytes: Buffer) {
  let start = 0;
  let end = bytes.length;

  if (bytes[start] === 0x0d && bytes[start + 1] === 0x0a) start += 2;
  else if (bytes[start] === 0x0a) start += 1;

  if (bytes[end - 2] === 0x0d && bytes[end - 1] === 0x0a) end -= 2;
  else if (bytes[end - 1] === 0x0a || bytes[end - 1] === 0x0d) end -= 1;

  return bytes.subarray(start, end);
}

function decodePdfString(raw: string) {
  let output = "";

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char !== "\\") {
      output += char;
      continue;
    }

    const next = raw[++i];
    if (!next) break;

    if (next === "n") output += "\n";
    else if (next === "r") output += "\r";
    else if (next === "t") output += "\t";
    else if (next === "b") output += "\b";
    else if (next === "f") output += "\f";
    else if (next === "(" || next === ")" || next === "\\") output += next;
    else if (/[0-7]/.test(next)) {
      let octal = next;
      for (let j = 0; j < 2 && /[0-7]/.test(raw[i + 1] ?? ""); j++) {
        octal += raw[++i];
      }
      output += String.fromCharCode(Number.parseInt(octal, 8));
    } else if (next === "\r" && raw[i + 1] === "\n") {
      i += 1;
    } else if (next !== "\n" && next !== "\r") {
      output += next;
    }
  }

  return output.replace(/\0/g, "");
}

function extractLiteralStrings(input: string) {
  const strings: string[] = [];

  for (let i = 0; i < input.length; i++) {
    if (input[i] !== "(") continue;

    let depth = 1;
    let raw = "";
    i += 1;

    for (; i < input.length; i++) {
      const char = input[i];
      if (char === "\\") {
        raw += char;
        if (i + 1 < input.length) raw += input[++i];
        continue;
      }
      if (char === "(") {
        depth += 1;
        raw += char;
        continue;
      }
      if (char === ")") {
        depth -= 1;
        if (depth === 0) break;
        raw += char;
        continue;
      }
      raw += char;
    }

    if (depth === 0) {
      const decoded = decodePdfString(raw).trim();
      if (decoded) strings.push(decoded);
    }
  }

  return strings;
}

function decodeStream(dict: string, stream: Buffer) {
  const bytes = trimStreamBytes(stream);
  if (!dict.includes("/FlateDecode")) {
    return bytes.toString("latin1");
  }

  try {
    return inflateSync(bytes).toString("latin1");
  } catch {
    return "";
  }
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split(/\n|\s{2,}/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function extractTextFromPdfBytes(pdfBytes: Buffer) {
  const pdf = pdfBytes.toString("latin1");
  const extracted: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = STREAM_START_PATTERN.exec(pdf))) {
    const streamStart = match.index + match[0].length;
    const streamEnd = pdf.indexOf("endstream", streamStart);
    if (streamEnd < 0) break;

    const decoded = decodeStream(
      match[0],
      pdfBytes.subarray(streamStart, streamEnd),
    );
    const textObjects = decoded.match(TEXT_OBJECT_PATTERN) ?? [];
    const blocks = textObjects.length > 0 ? textObjects : [decoded];

    for (const block of blocks) {
      extracted.push(...extractLiteralStrings(block));
    }

    STREAM_START_PATTERN.lastIndex = streamEnd + "endstream".length;
  }

  if (extracted.length === 0) {
    extracted.push(...extractLiteralStrings(pdf));
  }

  return normalizeExtractedText(extracted.join("\n"));
}
