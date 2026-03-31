export interface ParseResult {
  text: string;
  pageCount?: number;
}

/** PDF 바이너리 → 텍스트 (pdf-parse v2) */
export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const textResult = await parser.getText();
  const info = await parser.getInfo();
  await parser.destroy();
  return { text: textResult.text, pageCount: info?.total };
}

/** DOCX 바이너리 → 텍스트 */
export async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value };
}

/** PPTX/기타 Office → 텍스트 */
export async function parsePptx(buffer: Buffer): Promise<ParseResult> {
  const { parseOffice } = await import('officeparser');
  const result = await parseOffice(buffer);
  return { text: String(result) };
}

/** 파일 타입에 따라 적절한 파서 선택 */
export async function parseDocument(buffer: Buffer, fileType: string): Promise<ParseResult> {
  const type = fileType.toLowerCase();

  if (type === 'application/pdf' || type.endsWith('.pdf')) {
    return parsePdf(buffer);
  }
  if (type.includes('wordprocessingml') || type.endsWith('.docx')) {
    return parseDocx(buffer);
  }
  if (type.includes('presentationml') || type.endsWith('.pptx')) {
    return parsePptx(buffer);
  }
  if (type.startsWith('text/') || type.endsWith('.txt') || type.endsWith('.md')) {
    return { text: buffer.toString('utf-8') };
  }

  throw new Error(`지원하지 않는 파일 형식: ${fileType}`);
}
