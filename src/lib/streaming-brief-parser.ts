import type { DocLineData } from "@/components/editor/doc-view";

type ParseState =
  | "outer"
  | "in-key"
  | "escape-key"
  | "wait-section-colon"
  | "wait-section-bracket"
  | "after-content-key"
  | "after-other-key"
  | "in-content"
  | "in-skip"
  | "escape-content"
  | "escape-skip";

type SectionKey = "summary" | "goals" | "ambiguities" | "followUpQuestions";

const SECTION_DISPLAY: Record<
  SectionKey,
  { label: string; reqType: "claim" | "question" }
> = {
  summary: { label: "Summary", reqType: "claim" },
  goals: { label: "Goals", reqType: "claim" },
  ambiguities: { label: "Ambiguities", reqType: "question" },
  followUpQuestions: { label: "Follow-up Questions", reqType: "question" },
};

const SECTION_KEYS = new Set<string>([
  "summary",
  "goals",
  "ambiguities",
  "followUpQuestions",
]);
const CONTENT_KEYS = new Set<string>(["text", "reason"]);

/**
 * Incrementally parses streaming JSON from Gemini's structured brief output
 * and builds DocLineData[] in the same visual format as snapshotToDocLines().
 *
 * Critical: when transitioning from a key-waiting state (after-other-key,
 * after-content-key) back to "outer" on a non-string value start character,
 * that character MUST be re-processed via handleOuter() so bracket depth
 * stays correct. Without this, evidence arrays ([...]) consume a depth
 * increment without registering it, breaking all items after the first.
 */
export class StreamingBriefParser {
  private state: ParseState = "outer";
  private depth = 0;
  private keyBuf = "";
  private pendingSectionKey: SectionKey | null = null;
  private currentSection: SectionKey | null = null;
  private currentField: "text" | "reason" | null = null;
  private currentText = "";
  private lineNum = 1;
  private completedLines: DocLineData[] = [];

  reset() {
    this.state = "outer";
    this.depth = 0;
    this.keyBuf = "";
    this.pendingSectionKey = null;
    this.currentSection = null;
    this.currentField = null;
    this.currentText = "";
    this.lineNum = 1;
    this.completedLines = [];
  }

  feed(chunk: string): void {
    for (const ch of chunk) {
      this.step(ch);
    }
  }

  getSnapshot(): DocLineData[] {
    const result = [...this.completedLines];
    if (
      this.currentField &&
      this.currentSection &&
      this.currentText.length > 0
    ) {
      const info = SECTION_DISPLAY[this.currentSection];
      result.push({
        lineNum: this.lineNum,
        type: "body",
        text: this.currentText,
        reqType: info.reqType,
        small: this.currentField === "reason",
        streaming: true,
      });
    }
    return result;
  }

  private step(ch: string): void {
    switch (this.state) {
      case "outer":
        this.handleOuter(ch);
        return;

      case "in-key":
        if (ch === "\\") {
          this.state = "escape-key";
          return;
        }
        if (ch === '"') {
          this.endKey();
          return;
        }
        this.keyBuf += ch;
        return;

      case "escape-key":
        this.keyBuf += ch;
        this.state = "in-key";
        return;

      case "wait-section-colon":
        if (ch === ":") this.state = "wait-section-bracket";
        return;

      case "wait-section-bracket":
        if (ch === "[") {
          this.depth++;
          this.emitSectionHeader();
          this.state = "outer";
          return;
        }
        // Non-array value for a section key — bail and re-process
        if (ch !== " " && ch !== "\t" && ch !== "\n") {
          this.state = "outer";
          this.handleOuter(ch);
        }
        return;

      case "after-content-key":
        if (ch === ":") return;
        if (ch === '"') {
          this.state = "in-content";
          this.currentText = "";
          return;
        }
        // Non-string value (shouldn't happen for text/reason but guard anyway).
        // Re-process through handleOuter so depth stays correct.
        if (ch !== " " && ch !== "\t" && ch !== "\n") {
          this.state = "outer";
          this.currentField = null;
          this.handleOuter(ch);
        }
        return;

      case "after-other-key":
        if (ch === ":") return;
        if (ch === '"') {
          this.state = "in-skip";
          return;
        }
        // Non-string value (array, object, number, bool, null).
        // Re-process through handleOuter so depth stays correct —
        // this is the fix for evidence arrays breaking depth tracking.
        if (ch !== " " && ch !== "\t" && ch !== "\n") {
          this.state = "outer";
          this.handleOuter(ch);
        }
        return;

      case "in-content":
        if (ch === "\\") {
          this.state = "escape-content";
          return;
        }
        if (ch === '"') {
          this.completeField();
          this.state = "outer";
          return;
        }
        this.currentText += ch;
        return;

      case "escape-content":
        this.state = "in-content";
        if (ch === "n") this.currentText += "\n";
        else if (ch === "t") this.currentText += "\t";
        else this.currentText += ch;
        return;

      case "in-skip":
        if (ch === "\\") {
          this.state = "escape-skip";
          return;
        }
        if (ch === '"') this.state = "outer";
        return;

      case "escape-skip":
        this.state = "in-skip";
        return;
    }
  }

  private handleOuter(ch: string): void {
    if (ch === "{") {
      this.depth++;
      if (this.depth === 3) {
        // New section item starting — reset in-progress state
        this.currentField = null;
        this.currentText = "";
      }
    } else if (ch === "}") {
      if (this.depth === 3) this.completeItem();
      this.depth--;
    } else if (ch === "[") {
      this.depth++;
    } else if (ch === "]") {
      this.depth--;
    } else if (ch === '"') {
      this.state = "in-key";
      this.keyBuf = "";
    }
    // All other characters (commas, colons outside key-wait states, whitespace) are ignored
  }

  private endKey(): void {
    const key = this.keyBuf;
    this.keyBuf = "";

    if (this.depth === 1 && SECTION_KEYS.has(key)) {
      this.pendingSectionKey = key as SectionKey;
      this.state = "wait-section-colon";
    } else if (this.depth === 3 && CONTENT_KEYS.has(key)) {
      this.currentField = key as "text" | "reason";
      this.state = "after-content-key";
    } else {
      this.state = "after-other-key";
    }
  }

  private emitSectionHeader(): void {
    if (!this.pendingSectionKey) return;
    const info = SECTION_DISPLAY[this.pendingSectionKey];
    this.currentSection = this.pendingSectionKey;
    this.pendingSectionKey = null;

    if (this.completedLines.length > 0) {
      this.completedLines.push({ lineNum: 0, type: "blank" });
    }
    this.completedLines.push({
      lineNum: this.lineNum++,
      type: "h2",
      text: info.label,
    });
  }

  private completeField(): void {
    if (
      !this.currentField ||
      !this.currentSection ||
      !this.currentText.trim()
    ) {
      this.currentField = null;
      this.currentText = "";
      return;
    }
    const info = SECTION_DISPLAY[this.currentSection];
    this.completedLines.push({
      lineNum: this.lineNum++,
      type: "body",
      text: this.currentText,
      reqType: info.reqType,
      small: this.currentField === "reason",
    });
    this.currentField = null;
    this.currentText = "";
  }

  private completeItem(): void {
    // Flush any in-progress field when the item object closes
    if (this.currentField && this.currentText.trim()) {
      this.completeField();
    } else {
      this.currentField = null;
      this.currentText = "";
    }
  }
}
