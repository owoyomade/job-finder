import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

/** Pull plain text out of an uploaded resume (PDF, DOCX or TXT). */
export async function fileToText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }
  if (name.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return value;
  }
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return new TextDecoder().decode(bytes);
  }
  throw new Error("Unsupported file type. Upload a PDF, DOCX or TXT resume.");
}
