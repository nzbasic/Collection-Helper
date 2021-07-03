export interface Collections {
  version: number;
  numberCollections: number;
  collections: Collection[];
}

export interface Collection {
  name: string;
  numberMaps: number;
  hashes: string[];
}
