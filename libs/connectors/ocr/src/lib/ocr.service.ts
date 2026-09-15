import { createWorker } from 'tesseract.js';

/**
 * Tesseract.js -- a fully free, self-hosted OCR option (ARCHITECTURE.md §17.6/connectors §6),
 * no cloud API key needed. Kept as a thin wrapper so the connector's own parsing logic stays
 * testable against plain strings without spinning up a real OCR worker.
 */
export async function recognizeText(image: Buffer): Promise<string> {
  const worker = await createWorker('eng');
  try {
    const {
      data: { text },
    } = await worker.recognize(image);
    return text;
  } finally {
    await worker.terminate();
  }
}
