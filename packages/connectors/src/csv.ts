export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new SyntaxError("CSV ended inside a quoted field.");
  if (field !== "" || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((value) => value !== "")) rows.push(row);
  }
  return rows;
}

export function csvObjects(text: string): Array<Record<string, string>> {
  const [headers, ...rows] = parseCsv(text);
  if (!headers) return [];
  const normalizedHeaders = headers.map((header, index) =>
    header.trim() === "" ? `column_${index}` : header.trim(),
  );
  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    throw new SyntaxError("CSV contains duplicate column names.");
  }
  return rows.map((row, rowIndex) => {
    if (row.length !== normalizedHeaders.length) {
      throw new SyntaxError(
        `CSV row ${rowIndex + 2} has ${row.length} fields; expected ${normalizedHeaders.length}.`,
      );
    }
    return Object.fromEntries(
      normalizedHeaders.map((header, index) => [header, row[index]]),
    );
  });
}
