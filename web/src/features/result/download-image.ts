export function downloadObjectUrl(url: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
}

export function buildResultFileName(original: string): string {
  const idx = original.lastIndexOf(".");
  if (idx < 0) return `${original}-no-watermark.png`;
  return `${original.slice(0, idx)}-no-watermark${original.slice(idx)}`;
}

export async function downloadAllResults(
  items: Array<{ fileName: string; resultObjectUrl?: string }>,
): Promise<number> {
  let count = 0;
  for (const item of items) {
    if (!item.resultObjectUrl) continue;
    downloadObjectUrl(item.resultObjectUrl, buildResultFileName(item.fileName));
    count += 1;
    await new Promise((r) => setTimeout(r, 120));
  }
  return count;
}
