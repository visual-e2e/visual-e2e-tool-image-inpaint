import { isImageFile, isZipFile } from "./image-validators";

type FileSystemEntryLike = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
};

type FileSystemFileEntryLike = FileSystemEntryLike & {
  file: (
    successCallback: (file: File) => void,
    errorCallback?: (err: DOMException) => void,
  ) => void;
};

type FileSystemDirectoryReaderLike = {
  readEntries: (
    successCallback: (entries: FileSystemEntryLike[]) => void,
    errorCallback?: (err: DOMException) => void,
  ) => void;
};

type FileSystemDirectoryEntryLike = FileSystemEntryLike & {
  createReader: () => FileSystemDirectoryReaderLike;
};

function readAllDirectoryEntries(
  reader: FileSystemDirectoryReaderLike,
): Promise<FileSystemEntryLike[]> {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntryLike[] = [];
    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (!batch.length) {
            resolve(entries);
            return;
          }
          entries.push(...batch);
          readBatch();
        },
        reject,
      );
    };
    readBatch();
  });
}

async function walkEntry(entry: FileSystemEntryLike): Promise<File[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntryLike).file(resolve, reject);
    });
    return [file];
  }

  if (!entry.isDirectory) return [];

  const reader = (entry as FileSystemDirectoryEntryLike).createReader();
  const children = await readAllDirectoryEntries(reader);
  const nested = await Promise.all(children.map((child) => walkEntry(child)));
  return nested.flat();
}

/** Recursively collect files from a drag-drop DataTransfer (supports folders). */
export async function collectFilesFromDataTransfer(
  dataTransfer: DataTransfer,
): Promise<{ files: File[]; fromDirectory: boolean }> {
  const items = Array.from(dataTransfer.items ?? []);
  if (!items.length) {
    return { files: Array.from(dataTransfer.files ?? []), fromDirectory: false };
  }

  let fromDirectory = false;
  const collected: File[] = [];

  for (const item of items) {
    const entry =
      typeof item.webkitGetAsEntry === "function"
        ? item.webkitGetAsEntry()
        : null;

    if (entry) {
      if (entry.isDirectory) fromDirectory = true;
      collected.push(...(await walkEntry(entry as FileSystemEntryLike)));
      continue;
    }

    const file = item.getAsFile();
    if (file) collected.push(file);
  }

  if (!collected.length) {
    return { files: Array.from(dataTransfer.files ?? []), fromDirectory };
  }

  return { files: collected, fromDirectory };
}

/** Keep only supported images; skip hidden / junk files quietly. */
export function filterFolderImages(files: File[]): File[] {
  return files.filter((file) => {
    const name = file.name;
    if (!name || name.startsWith(".")) return false;
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    if (rel?.split("/").some((part) => part.startsWith("."))) return false;
    return isImageFile(file);
  });
}

export function partitionUploads(files: File[]): {
  images: File[];
  zips: File[];
  others: File[];
} {
  const images: File[] = [];
  const zips: File[] = [];
  const others: File[] = [];
  for (const file of files) {
    if (isZipFile(file)) zips.push(file);
    else if (isImageFile(file)) images.push(file);
    else others.push(file);
  }
  return { images, zips, others };
}
