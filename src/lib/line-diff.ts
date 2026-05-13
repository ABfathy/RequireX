export type LineDiffKind = "unchanged" | "added" | "removed";

export interface LineDiffRow {
  kind: LineDiffKind;
  text: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

export function diffLines(
  oldLines: string[],
  newLines: string[],
): LineDiffRow[] {
  const dp = Array.from({ length: oldLines.length + 1 }, () =>
    Array<number>(newLines.length + 1).fill(0),
  );

  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      dp[oldIndex]![newIndex] =
        oldLines[oldIndex] === newLines[newIndex]
          ? dp[oldIndex + 1]![newIndex + 1]! + 1
          : Math.max(
              dp[oldIndex + 1]![newIndex]!,
              dp[oldIndex]![newIndex + 1]!,
            );
    }
  }

  const rows: LineDiffRow[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldLines.length && newIndex < newLines.length) {
    const oldText = oldLines[oldIndex]!;
    const newText = newLines[newIndex]!;

    if (oldText === newText) {
      rows.push({
        kind: "unchanged",
        text: oldText,
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1,
      });
      oldIndex += 1;
      newIndex += 1;
      continue;
    }

    if (dp[oldIndex + 1]![newIndex]! >= dp[oldIndex]![newIndex + 1]!) {
      rows.push({
        kind: "removed",
        text: oldText,
        oldLineNumber: oldIndex + 1,
        newLineNumber: null,
      });
      oldIndex += 1;
    } else {
      rows.push({
        kind: "added",
        text: newText,
        oldLineNumber: null,
        newLineNumber: newIndex + 1,
      });
      newIndex += 1;
    }
  }

  while (oldIndex < oldLines.length) {
    rows.push({
      kind: "removed",
      text: oldLines[oldIndex]!,
      oldLineNumber: oldIndex + 1,
      newLineNumber: null,
    });
    oldIndex += 1;
  }

  while (newIndex < newLines.length) {
    rows.push({
      kind: "added",
      text: newLines[newIndex]!,
      oldLineNumber: null,
      newLineNumber: newIndex + 1,
    });
    newIndex += 1;
  }

  return rows;
}
