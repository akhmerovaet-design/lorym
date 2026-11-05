export type Kind = "meeting" | "note" | "file";

export type SourceFile = {
  name: string;
  url: string;
  type: string;
};

export type Material = {
  id: number;
  kind: Kind;
  title: string;
  detail: string;
  date: string;
  createdAt?: number;
  topic: string;
  space: string;
  folderId?: string | null;
  searchText?: string;
  sourceFiles?: SourceFile[];
  deletedRecordingIndexes?: number[];
  sourceIds?: number[];
  templateName?: string;
  summaryFor?: number;
  presentationIncluded?: boolean;
  body?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
};

export type FolderInfo = {
  id: string;
  space: string;
  name: string;
  parentId: string | null;
};

export function folderPath(folders: FolderInfo[], id: string): string {
  const names: string[] = [];
  let current = folders.find((folder) => folder.id === id);
  while (current) {
    names.unshift(current.name);
    current = folders.find((folder) => folder.id === current?.parentId);
  }
  return names.join(" / ");
}

export type TemplateInfo = {
  name: string;
  description: string;
  availableIn?: string[];
};
