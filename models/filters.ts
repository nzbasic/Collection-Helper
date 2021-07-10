export interface CustomFilter {
  name: string,
  filter: string,
  description: string,
  getHitObjects: boolean,
  isCached: boolean,
  numberCached: number,
  cache?: string[]
}
