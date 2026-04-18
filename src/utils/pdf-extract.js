import * as pdfjsLib from "pdfjs-dist";

// Set the worker source to the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/**
 * Extract text content from a PDF file.
 * @param {File} file — PDF file from file input
 * @param {object} options
 * @param {number} options.maxChars — max characters to extract (default 5000)
 * @param {number} options.maxPages — max pages to process (default 200)
 * @param {function} options.onProgress — callback(progress: {currentPage, totalPages, percent})
 * @returns {Promise<{text: string, pages: number, totalPages: number, truncated: boolean, fileName: string, fileSize: number}>}
 */
export async function extractTextFromPDF(file, options = {}) {
  const { maxChars = 50000, maxPages = 200, onProgress } = options;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const totalPages = pdf.numPages;
  const pagesToProcess = Math.min(totalPages, maxPages);
  let fullText = "";
  let processedPages = 0;
  let truncated = false;

  for (let i = 1; i <= pagesToProcess; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText) {
      fullText += (fullText ? "\n\n" : "") + `[Halaman ${i}]\n${pageText}`;
    }

    processedPages = i;
    onProgress?.({
      currentPage: i,
      totalPages,
      percent: Math.round((i / pagesToProcess) * 100),
    });

    // Stop if we've exceeded maxChars
    if (fullText.length >= maxChars) {
      fullText = fullText.substring(0, maxChars);
      truncated = true;
      break;
    }
  }

  return {
    text: fullText,
    pages: processedPages,
    totalPages,
    truncated: truncated || pagesToProcess < totalPages,
    fileName: file.name,
    fileSize: file.size,
  };
}
