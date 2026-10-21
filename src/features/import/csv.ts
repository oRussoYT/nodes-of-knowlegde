// Turns a pasted or uploaded CSV of graduates into upload rows for
// steward_create_import_batch. Pure; unit-tested. Accepts the column names
// institutions actually use (English and Portuguese, any case/spacing), and
// comma or semicolon separators (spreadsheets saved in pt-BR use ";").

export interface ImportUploadRow {
  givenName: string;
  familyName: string;
  degree?: string;
  programme?: string;
  graduationYear?: string;
  externalRef?: string;
}

export interface CsvParseResult {
  rows: ImportUploadRow[];
  /** Problems found, with the spreadsheet line number (header = line 1). */
  problems: string[];
}

type Field = keyof ImportUploadRow | "fullName";

const HEADER_ALIASES: Record<string, Field> = {
  "given name": "givenName",
  "first name": "givenName",
  "given": "givenName",
  "first": "givenName",
  "nome": "givenName",
  "primeiro nome": "givenName",
  "family name": "familyName",
  "last name": "familyName",
  "surname": "familyName",
  "family": "familyName",
  "last": "familyName",
  "sobrenome": "familyName",
  "name": "fullName",
  "full name": "fullName",
  "nome completo": "fullName",
  "degree": "degree",
  "grau": "degree",
  "titulo": "degree",
  "título": "degree",
  "programme": "programme",
  "program": "programme",
  "department": "programme",
  "programa": "programme",
  "curso": "programme",
  "graduation year": "graduationYear",
  "year": "graduationYear",
  "grad year": "graduationYear",
  "ano": "graduationYear",
  "ano de conclusao": "graduationYear",
  "ano de conclusão": "graduationYear",
  "id": "externalRef",
  "student id": "externalRef",
  "external ref": "externalRef",
  "matricula": "externalRef",
  "matrícula": "externalRef",
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ");
}

function detectSeparator(headerLine: string): "," | ";" | "\t" {
  const counts = { ",": 0, ";": 0, "\t": 0 } as Record<"," | ";" | "\t", number>;
  let inQuotes = false;
  for (const ch of headerLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === "," || ch === ";" || ch === "\t")) counts[ch] += 1;
  }
  if (counts["\t"] > counts[","] && counts["\t"] > counts[";"]) return "\t";
  return counts[";"] > counts[","] ? ";" : ",";
}

/** Splits CSV text into records, honouring quoted fields with separators,
 * doubled quotes and line breaks inside quotes. */
export function splitCsv(text: string, separator: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === separator) {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

function splitFullName(full: string): { givenName: string; familyName: string } | null {
  const trimmed = full.trim().replace(/\s+/g, " ");
  if (trimmed.includes(",")) {
    // "Family, Given"
    const [family, ...rest] = trimmed.split(",");
    const given = rest.join(",").trim();
    return family.trim() && given ? { givenName: given, familyName: family.trim() } : null;
  }
  const parts = trimmed.split(" ");
  if (parts.length < 2) return null;
  return { givenName: parts.slice(0, -1).join(" "), familyName: parts[parts.length - 1] };
}

export const MAX_IMPORT_ROWS = 5000;

export function parseGraduateCsv(text: string): CsvParseResult {
  const problems: string[] = [];
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  const records = splitCsv(text, detectSeparator(firstLine)).filter((r) => r.some((cell) => cell.trim() !== ""));

  if (records.length === 0) {
    return { rows: [], problems: ["The file is empty."] };
  }

  const header = records[0].map((h) => HEADER_ALIASES[normalizeHeader(h)] ?? null);
  const has = (f: Field) => header.includes(f);
  // A lone "nome"/"name"-like given-name column with no family-name column is
  // really a full-name column (pt-BR "Nome" usually means the whole name).
  if (has("givenName") && !has("familyName") && !has("fullName")) {
    header[header.indexOf("givenName")] = "fullName";
  }
  if (!(has("givenName") && has("familyName")) && !has("fullName")) {
    return {
      rows: [],
      problems: ["The first line must name the columns: either \"given name\" and \"family name\", or \"name\"."],
    };
  }

  const rows: ImportUploadRow[] = [];
  records.slice(1).forEach((record, index) => {
    const line = index + 2;
    const value = (f: Field) => {
      const col = header.indexOf(f);
      return col >= 0 ? (record[col] ?? "").trim() : "";
    };

    let givenName = value("givenName");
    let familyName = value("familyName");
    if ((!givenName || !familyName) && value("fullName")) {
      const split = splitFullName(value("fullName"));
      if (split) {
        givenName = givenName || split.givenName;
        familyName = familyName || split.familyName;
      }
    }
    if (!givenName || !familyName) {
      problems.push(`Line ${line}: a given name and a family name are needed.`);
      return;
    }

    const year = value("graduationYear");
    if (year && !/^\d{4}$/.test(year)) {
      problems.push(`Line ${line}: the year "${year}" is not a four-digit year.`);
      return;
    }

    const row: ImportUploadRow = { givenName, familyName };
    const degree = value("degree");
    const programme = value("programme");
    const externalRef = value("externalRef");
    if (degree) row.degree = degree;
    if (programme) row.programme = programme;
    if (year) row.graduationYear = year;
    if (externalRef) row.externalRef = externalRef;
    rows.push(row);
  });

  if (rows.length > MAX_IMPORT_ROWS) {
    problems.push(`At most ${MAX_IMPORT_ROWS} people per upload; this file has ${rows.length}.`);
  }
  if (rows.length === 0 && problems.length === 0) {
    problems.push("The file has a header but no people.");
  }

  return { rows, problems };
}
