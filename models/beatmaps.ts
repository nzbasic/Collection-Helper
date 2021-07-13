import { Beatmap } from "./cache";
import { CustomFilter } from "./filters";

export interface FilterDetail {
	type?:        string
  filtering?:   string
	valueString?: string
	valueNumber?: number
	operator?:    string
}

export interface Filter {
	text?:    string
	filters?: FilterDetail[]
}

export interface Sorting {
  header?: string
  order?: string
}

export interface PageResponse {
	beatmaps:      Beatmap[]
	numberResults: number
}

export interface SetCount {
  setId: string
  count: number
}

export interface GetBeatmapsReq {
  page: number
  filter: Filter
  name: string
  force: boolean
  order: Sorting
  getCollection: boolean
  customFilters?: string[]
}

export interface GetSelectedReq {
  name: string
  filter: Filter
  customFilters?: string[]
  force: boolean
}
