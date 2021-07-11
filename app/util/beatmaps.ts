import { Filter, GetBeatmapsReq, GetSelectedReq, PageResponse } from "../../models/beatmaps";
import { Beatmap } from "../../models/cache";
import { CustomFilter } from "../../models/filters";
import { readFilters } from "./database/filters";
import { beatmapMap } from "./parsing/cache";
import { collections } from "./parsing/collections";
import * as log from 'electron-log'

let cacheInitialized: boolean = false
let beatmapCache: Beatmap[] = []
let previousFilter: Filter;

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

    const lower = (request.page-1) * 15
    const higher = (request.page) * 15

    response.beatmaps = beatmapList.slice(lower, higher)
  }

  return response
}

export const getSelected = async (request: GetSelectedReq): Promise<string[]> => {

  let customFilters: string[] = []
  if (request.customFilters) {
    customFilters = request.customFilters
  }

  const matchedLast = (JSON.stringify(request.filter) == JSON.stringify(previousFilter)) && cacheInitialized
  const getCollection = !!request.name.length
  const beatmapList = await filterBeatmaps(request.filter, request.name, getCollection, matchedLast, customFilters)
  return beatmapList.map(map => map.md5)

}

const filterBeatmaps = async (filter: Filter, name: string, getCollection: boolean, matchedLast: boolean, customFilters: string[]): Promise<Beatmap[]> => {

  if (matchedLast) {
    return beatmapCache
  }

  const matchedCollection = collections.collections.filter(collection => collection.name == name)

  if (!matchedCollection.length) {
    console.log(name)
    return null
  }

  const collection = matchedCollection[0]
  let toSearch: Beatmap[]

  if (getCollection) {
    toSearch = collection.hashes.map(hash => beatmapMap.get(hash))
  } else {
    let beatmapArray = Array.from(beatmapMap.values())
    let collectionHashSet = new Set<string>()
    collection.hashes.map(hash => collectionHashSet.add(hash))
    toSearch = beatmapArray.filter(map => !collectionHashSet.has(map.md5))
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

    if (!map) {
      return false
    }

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
      }
    }

    return true
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
