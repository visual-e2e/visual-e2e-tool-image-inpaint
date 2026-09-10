export function stripDataUrl(input: string): { mime?: string; base64: string } {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(input);
  if (match) {
    return { mime: match[1], base64: match[2] };
  }
  return { base64: input };
}

export function decodeBase64Image(input: string): Buffer {
  const { base64 } = stripDataUrl(input);
  return Buffer.from(base64, "base64");
}
