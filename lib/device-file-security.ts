export function safeDeviceFileContentDisposition(filename: string, contentType: string) {
  const normalizedType = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  const safeInlineType =
    /^(?:audio|video)\//.test(normalizedType) ||
    /^(?:image\/(?:png|jpeg|gif|webp|avif)|application\/pdf|text\/plain)$/.test(
      normalizedType,
    );
  const disposition = safeInlineType ? "inline" : "attachment";
  return `${disposition}; filename="${headerFilename(filename)}"`;
}

function headerFilename(filename: string) {
  return filename.replace(/["\\\r\n]/g, "_");
}
