import { unzipSync } from "fflate";

export type CandidateImportRow = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]/g, "");
}

function parseDelimited(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = [";", ",", "\t"].sort(
    (a, b) => firstLine.split(b).length - firstLine.split(a).length,
  )[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function readXml(bytes: Uint8Array) {
  return new DOMParser().parseFromString(new TextDecoder().decode(bytes), "application/xml");
}

function columnIndex(reference: string) {
  const letters = reference.match(/[A-Z]+/i)?.[0]?.toUpperCase() || "A";
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function parseXlsx(buffer: ArrayBuffer) {
  const archive = unzipSync(new Uint8Array(buffer));
  const sharedStrings = archive["xl/sharedStrings.xml"]
    ? Array.from(readXml(archive["xl/sharedStrings.xml"]).getElementsByTagName("si")).map((entry) =>
        Array.from(entry.getElementsByTagName("t")).map((node) => node.textContent || "").join(""),
      )
    : [];
  const worksheetName = Object.keys(archive)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
  if (!worksheetName) throw new Error("Le fichier Excel ne contient aucune feuille lisible.");
  const xml = readXml(archive[worksheetName]);
  return Array.from(xml.getElementsByTagName("row")).map((row) => {
    const values: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName("c"))) {
      const index = columnIndex(cell.getAttribute("r") || "A");
      const type = cell.getAttribute("t");
      const raw = cell.getElementsByTagName("v")[0]?.textContent || "";
      const inline = Array.from(cell.getElementsByTagName("t")).map((node) => node.textContent || "").join("");
      values[index] = type === "s" ? sharedStrings[Number(raw)] || "" : type === "inlineStr" ? inline : raw;
    }
    return values;
  });
}

const aliases = {
  firstName: ["prenom", "firstname", "الاسم", "الاسمالشخصي"],
  lastName: ["nom", "lastname", "familyname", "النسب", "العائلي", "اسمالعائلة"],
  email: ["email", "mail", "courriel", "البريدالالكتروني", "البريدالإلكتروني"],
  phoneNumber: ["telephone", "phone", "phonenumber", "tel", "الهاتف", "رقمالهاتف"],
};

export async function parseCandidateImportFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const rows = extension === "xlsx"
    ? parseXlsx(await file.arrayBuffer())
    : parseDelimited(await file.text());
  if (rows.length < 2) throw new Error("Le fichier doit contenir un en-tête et au moins une ligne.");
  const headers = rows[0].map(normalizeHeader);
  const find = (names: string[]) => {
    const normalizedNames = names.map(normalizeHeader);
    return headers.findIndex((header) => normalizedNames.includes(header));
  };
  const indexes = {
    firstName: find(aliases.firstName),
    lastName: find(aliases.lastName),
    email: find(aliases.email),
    phoneNumber: find(aliases.phoneNumber),
  };
  if (indexes.firstName < 0 || indexes.lastName < 0 || indexes.email < 0) {
    throw new Error("Colonnes obligatoires introuvables : Prénom, Nom et E-mail.");
  }
  const valid: CandidateImportRow[] = [];
  const invalid: Array<{ rowNumber: number; message: string }> = [];
  rows.slice(1).forEach((row, index) => {
    const candidate = {
      firstName: String(row[indexes.firstName] ?? "").trim(),
      lastName: String(row[indexes.lastName] ?? "").trim(),
      email: String(row[indexes.email] ?? "").trim().toLowerCase(),
      phoneNumber: indexes.phoneNumber >= 0 ? String(row[indexes.phoneNumber] ?? "").trim() : "",
    };
    if (!candidate.firstName || !candidate.lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) {
      invalid.push({ rowNumber: index + 2, message: "Prénom, nom ou e-mail invalide." });
    } else valid.push(candidate);
  });
  return { valid, invalid };
}

export function downloadCandidateImportTemplate() {
  const content = "\uFEFFPrénom;Nom;E-mail;Téléphone\r\nAhmed;Alaoui;ahmed@example.com;+212600000000\r\n";
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "modele-candidats-acceptes.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
