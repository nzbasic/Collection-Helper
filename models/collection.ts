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

export interface MissingMap {
  setId: number;
  md5: string
}

export interface Override {
  value: number;
  enabled: boolean
}
export interface BpmChangerOptions {
  bpm: Override
  ar: Override
  hp: Override
  cs: Override
  od: Override
}
