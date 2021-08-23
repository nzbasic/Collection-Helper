import { Filter, GetBeatmapsReq, GetSelectedReq, PageResponse } from "../../models/beatmaps";
import { Beatmap, IntDoublePair } from "../../models/cache";
import { CustomFilter } from "../../models/filters";
import { readFilters } from "./database/filters";
import { beatmapMap, parseBpm } from "./parsing/cache";
import { collections } from "./parsing/collections";
import * as log from 'electron-log'
import { convertMods } from './mods'

let cacheInitialized: boolean = false
let beatmapCache: Beatmap[] = []
let previousFilter: Filter;
const yearData = [
  { year: 2008, setId: 540 },
  { year: 2009, setId: 4545 },
  { year: 2010, setId: 11810 },
  { year: 2011, setId: 24313 },
  { year: 2012, setId: 42234 },
  { year: 2013, setId: 71801 },
  { year: 2014, setId: 131682 },
  { year: 2015, setId: 251391 },
  { year: 2016, setId: 398976 },
  { year: 2017, setId: 552667 },
  { year: 2018, setId: 713576 },
  { year: 2019, setId: 903055 },
  { year: 2020, setId: 1086772 },
  { year: 2021, setId: 1336424 },
]

/**
 * Get sorted beatmaps within a given range with an applied filter
 */
 export const getBeatmaps = async (request: GetBeatmapsReq): Promise<PageResponse> => {

  let response: PageResponse = { beatmaps: [], numberResults: 0 }

  if (request.force) {
    cacheInitialized = false;
  }

  let customFilters: string[] = []
  if (request.customFilters) {
    customFilters = request.customFilters
  }

  let matchedLast = (JSON.stringify(request.filter) == JSON.stringify(previousFilter)) && cacheInitialized
  let beatmapList = await filterBeatmaps(request.filter, request.name, request.getCollection, matchedLast, customFilters)

  beatmapList.sort((first, second) => {

    if (first.missing || second.missing) {
      return 1
    }

    if (request.order.order != "asc") {
      let temp = first
      first = second
      second = temp
    }

    if (typeof(first[request.order.header]) == "string") {
      return (first[request.order.header] as string).localeCompare((second[request.order.header] as string))
    } else {
      return (first[request.order.header] as number) - (second[request.order.header] as number)
    }

  })

  response.numberResults = beatmapList.length

  if (beatmapList.length) {

    const lower = (request.page-1) * 10
    const higher = (request.page) * 10

    response.beatmaps = beatmapList.slice(lower, higher)
  }

  return response
}

export const getSelected = async (request: GetSelectedReq): Promise<string[]> => {

  let customFilters: string[] = []
  if (request.customFilters) {
    customFilters = request.customFilters
  }

  let matchedLast = (JSON.stringify(request.filter) == JSON.stringify(previousFilter)) && cacheInitialized

  if (request.force) {
    matchedLast = false
  }

  const getCollection = !!request.name.length
  const beatmapList = await filterBeatmaps(request.filter, request.name, getCollection, matchedLast, customFilters)
  return beatmapList.filter(map => !map.missing).map(map => map.md5)

}

const filterBeatmaps = async (filter: Filter, name: string, getCollection: boolean, matchedLast: boolean, customFilters: string[]): Promise<Beatmap[]> => {

  let noCollection = false

  if (matchedLast) {
    return beatmapCache
  }

  const matchedCollection = collections.collections.filter(collection => collection.name == name)

  if (!matchedCollection.length) {
    noCollection = true
  }

  let toSearch: Beatmap[]
  if (!noCollection) {
    const collection = matchedCollection[0]

    if (getCollection) {
      toSearch = collection.hashes.map(hash => beatmapMap.get(hash))
    } else {
      let beatmapArray = Array.from(beatmapMap.values())
      let collectionHashSet = new Set<string>()
      collection.hashes.map(hash => collectionHashSet.add(hash))
      toSearch = beatmapArray.filter(map => !collectionHashSet.has(map.md5))
    }
  } else {
    toSearch = Array.from(beatmapMap.values())
  }

  let filterIntersection = new Set<string>()

  if (customFilters.length) {

    const filters = await readFilters()
    const allFilters = customFilters.map(name => filters.find(filter => filter.name == name))
    const allHashes = allFilters.map(filter => filter.cache)

    if (allFilters.length) {
      filterIntersection = new Set(allHashes.reduce((a,b) => a.filter(c => b.includes(c))))
    }

  }

  const filtered = toSearch.filter(map => {

    if (!map || map.setId == -1) {
      return false
    }

    if (map.missing) {
      return false
    } else {
      if (filterIntersection.size) {
        if (!filterIntersection.has(map.md5)) {
          return false
        }
      }

      // if there is text in the filter, it must match at least one of these
      if (filter.text.length) {
        let artistMatch = map.artist.toLowerCase().includes(filter.text.toLowerCase())
        let titleMatch = map.song.toLowerCase().includes(filter.text.toLowerCase())
        let creatorMatch = map.creator.toLowerCase().includes(filter.text.toLowerCase())
        let tagMatch = map.songTags.toLowerCase().includes(filter.text.toLowerCase())
        let idMatch = map.id == parseInt(filter.text) || map.setId == parseInt(filter.text)
        let difficultyMatch = map.difficulty.toLowerCase().includes(filter.text.toLowerCase())
        if (!(artistMatch || titleMatch || creatorMatch || tagMatch || idMatch || difficultyMatch)) {
          return false
        }
      }

      // before numeric filters, change the SR of the beatmaps
      const modInt = convertMods(filter.mods)
      let diffs: IntDoublePair[]

      if (map.mode == 0) {
        diffs = map.standardDiffs
      } else if (map.mode == 1) {
        diffs = map.taikoDiffs
      } else if (map.mode == 2) {
        diffs = map.catchDiffs
      } else if (map.mode == 3) {
        diffs = map.maniaDiffs
      }

      // increase difficulty settings according to mods
      if (filter.mods.includes("hr")) {
        map.cs = map.ogCs*1.3 > 10 ? 10 : map.ogCs*1.3
        map.hp = map.ogHp*1.4 > 10 ? 10 : map.ogHp*1.4
        map.ar = map.ogAr*1.4 > 10 ? 10 : map.ogAr*1.4
        map.od = map.ogOd*1.4 > 10 ? 10 : map.ogOd*1.4
      } else if (filter.mods.includes("ez")) {
        map.cs = map.ogCs*0.5 < 0 ? 0 : map.ogCs*0.5
        map.hp = map.ogHp*0.5 < 0 ? 0 : map.ogCs*0.5
        map.ar= map.ogAr*0.5 < 0 ? 0 : map.ogCs*0.5
        map.od = map.ogOd*0.5 < 0 ? 0 : map.ogCs*0.5
      } else {
        map.cs = map.ogCs
        map.hp = map.ogHp
        map.ar = map.ogAr
        map.od = map.ogOd
      }

      if (filter.mods.includes("dt") || filter.mods.includes("nc")) {
        map.bpm = map.ogBpm*1.5
        map.drain = Math.round((map.ogDrain*0.66 + Number.EPSILON) * 100) / 100;
        map.ar = ((map.ar*2)+13)/3
        map.od = ((map.od*2)+13)/3
        map.hp = ((map.hp*2)+13)/3
      } else if (filter.mods.includes("ht")) {
        map.bpm = map.ogBpm*0.75
        map.drain = Math.round((map.ogDrain*1.33 + Number.EPSILON) * 100) / 100;
        map.ar = ((map.ar*3)-13)/2
        map.od = ((map.od*3)-13)/2
        map.hp = ((map.hp*3)-13)/2
      } else {
        map.bpm = map.ogBpm
        map.drain = map.ogDrain
      }

      const hashes = new Map(diffs.map(obj => [obj.mods, obj.stars]));
      map.sr = hashes.get(modInt)??hashes.get(0)??0

      // apply each filter in the filter filters list

      for (const typeFilter of filter.filters) {
        if (typeFilter.type == "Numeric") {
          const toTest = map[typeFilter.filtering.toLowerCase()]
          if (!applyNumberFilter(typeFilter.operator, typeFilter.valueNumber, toTest)) {
            return false
          }
        } else if (typeFilter.type == "Text") {
          const toTest = map[typeFilter.filtering.toLowerCase()]
          if (!applyStringFilter(typeFilter.operator, typeFilter.valueString, toTest)) {
            return false
          }
        } else if (typeFilter.type == "Unplayed") {
          if (!applyUnplayedFilter(typeFilter.operator, map.unplayed)) {
            return false
          }
        } else if (typeFilter.type == "Status") {
          if (!applyStatusFilter(typeFilter.operator, typeFilter.valueString, map.status)) {
            return false
          }
        } else if (typeFilter.type == "Mode") {

          let mapValue: string
          if (map.mode == 0) {
            mapValue = "o"
          } else if (map.mode == 1) {
            mapValue = "t"
          } else if (map.mode == 2) {
            mapValue = "c"
          } else if (map.mode == 3) {
            mapValue = "m"
          }

          if (!applyStringFilter(typeFilter.operator, typeFilter.valueString, mapValue)) {
            return false
          }
        } else if (typeFilter.type == "Year") {
          const setId = map.setId
          let year;

          if (setId < yearData[0].setId) {
            year = 2007;
          } else if (setId > yearData[yearData.length-1].setId) {
            year = yearData[yearData.length-1].year
          } else {
            for (let i = 0; i < yearData.length-1; i++) {
              if (setId >= yearData[i].setId && setId <= yearData[i+1].setId) {
                year = yearData[i].year
                break;
              }
            }
          }

          if (!applyNumberFilter(typeFilter.operator, typeFilter.valueNumber, year)) {
            return false
          }
        }
      }

      return true
    }
  })

  previousFilter = filter
  beatmapCache = filtered
  cacheInitialized = true

  return filtered
}

const applyNumberFilter = (operator: string, filterValue: number, mapValue: number): boolean => {

  if (((operator == "=") || (operator == "==")) && (mapValue == filterValue)) {
		return true
	} else if ((operator == "!=") && (mapValue != filterValue)) {
		return true
	} else if ((operator == "<") && (mapValue < filterValue)) {
		return true
	} else if ((operator == ">") && (mapValue > filterValue)) {
		return true
	} else if ((operator == "<=") && (mapValue <= filterValue)) {
		return true
	} else if ((operator == ">=") && (mapValue >= filterValue)) {
		return true
	}

  return false
}

const applyStringFilter = (operator: string, filterValue: string, mapValue: string): boolean => {

  if (((operator == "=") || (operator == "==")) && (filterValue.toLowerCase() == mapValue.toLowerCase())) {
    return true
  } else if ((operator == "!=") && (filterValue.toLowerCase() != mapValue.toLowerCase())) {
    return true
  }

  return false
}

const applyUnplayedFilter = (operator: string, mapValue: boolean): boolean => {

  if ((operator == "!") && !mapValue) {
    return true
  } else if ((operator == "==") && mapValue) {
    return true
  }

  return false
}

const applyStatusFilter = (operator: string, filterValue: string, mapValue: number): boolean => {

  if ((filterValue == "unknown") && statusComparator(operator, 0x00, mapValue)) {
    return true
  } else if (((filterValue == "notsubmitted") || (filterValue == "n")) && statusComparator(operator, 0x01, mapValue)) {
    return true
  } else if (((filterValue == "pending") || (filterValue == "wip") || (filterValue == "graveyard") || (filterValue == "p")) && statusComparator(operator, 0x02, mapValue)) {
		return true
	} else if (((filterValue == "unused") || (filterValue == "u")) && statusComparator(operator, 0x03, mapValue)) {
		return true
	} else if (((filterValue == "ranked") || (filterValue == "r")) && statusComparator(operator, 0x04, mapValue)) {
		return true
	} else if (((filterValue == "approved") || (filterValue == "a")) && statusComparator(operator, 0x05, mapValue)) {
		return true
	} else if (((filterValue == "qualified") || (filterValue == "q")) && statusComparator(operator, 0x06, mapValue)) {
		return true
	} else if (((filterValue == "loved") || (filterValue == "l")) && statusComparator(operator, 0x07, mapValue)) {
		return true
	}

  return false
}

const statusComparator = (operator: string, status: number, mapValue: number): boolean => {
  if (((operator == "==") || (operator == "=")) && (status == mapValue)) {
    return true
  } else if ((operator == "!=") && (status != mapValue)) {
    return true
  }

  return false
}
