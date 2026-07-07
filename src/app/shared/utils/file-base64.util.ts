import { ProjectDocument } from '../../core/models/project.model';

export function formatBase64Image(base64: unknown): string {
  const s = base64 as string;
  if (!s) return '';
  return s.startsWith('data:image') ? s : `data:image/png;base64,${s}`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function filesToBase64(files: FileList | File[]): Promise<string[]> {
  return Promise.all(Array.from(files).map(fileToBase64));
}

export interface PdfFile {
  fileName: string;
  fileBase64: string;
  fileType: string;
}

export async function pdfToBase64(file: File): Promise<PdfFile> {
  return {
    fileName:  file.name,
    fileBase64: await fileToBase64(file),
    fileType:  file.type || 'application/pdf',
  };
}

export function filesToProjectDocuments(files: FileList | File[]): Promise<ProjectDocument[]> {
  return Promise.all(
    Array.from(files).map(async (file, index) => {
      const fileBase64 = await fileToBase64(file);
      return {
        fileName:  file.name,
        fileBase64,
        fileType:  file.type || 'application/pdf',
        fileOrder: index,
      } as ProjectDocument;
    }),
  );
}
