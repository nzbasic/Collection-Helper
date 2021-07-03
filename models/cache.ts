export interface Beatmap {
  artist: string;
  artistUnicode?: string;
  song: string;
  songUnicode?: string;
  creator: string;
  difficulty: string;
  audioFile?: string;
  md5: string;
  fileName: string;
  status: number;
  circleNumber: number;
  sliderNumber: number;
  spinnerNumber: number;
  modified?: bigint;
  ar: number;
  cs: number;
  hp: number;
  od: number;
  sr?: number;
  bpm?: number;
  sliderVelocity?: number;
  standardDiffs?: IntDoublePair[];
  taikoDiffs?: IntDoublePair[];
  catchDiffs?: IntDoublePair[];
  maniaDiffs?: IntDoublePair[];
  drain: number;
  time?: number;
  previewTime?: number;
  timingPoints: TimingPoint[];
  id: number;
  setId: number;
  threadId?: number;
  standardRank?: number;
  taikoRank?: number;
  catchRank?: number;
  maniaRank?: number;
  localOffset?: number;
  stackLeniency?: number;
  mode: number;
  songSource?: string;
  songTags: string;
  onlineOffset?: number;
  font?: string;
  unplayed: boolean;
  timeLastPlayed?: bigint;
  osz2?: boolean;
  folderName: string;
  timeChecked?: bigint;
  ignoreSound?: boolean;
  ignoreSkin?: boolean;
  disableStory?: boolean;
  disableVideo?: boolean;
  visualOverride?: boolean;
  lastModified?: number;
  scrollSpeed?: number;
  hitObjects?: HitObject[];
}

export interface IntDoublePair {
  mods: number;
  stars: number;
}

export interface TimingPoint {
  bpm: number;
  offset: number;
  inherited: boolean;
}

export interface HitObject {
  x: number;
  y: number;
  time: number;
  type: number;
}
