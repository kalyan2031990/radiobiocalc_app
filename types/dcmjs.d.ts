declare module "dcmjs" {
  export const data: {
    DicomMessage: { readFile: (ab: ArrayBuffer) => { dict: Record<string, unknown> } };
    DicomMetaDictionary: { naturalizeDataset: (d: Record<string, unknown>) => Record<string, unknown> };
  };
}
