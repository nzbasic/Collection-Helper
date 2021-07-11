import { CustomFilter } from "../../models/filters"
import { Beatmap } from "../../models/cache"
import { getTestObjects } from "./hitobjects"
import { beatmapMap } from './parsing/cache'
import axios from 'axios'
import { readBeatmap } from "./parsing/hitobjects"
import { readFilters, setCache } from "./database/filters"
import { getOsuPath } from "./database/settings"

let randomBeatmaps: Beatmap[]
let toTest: Beatmap[]
let hitObjectsLoaded = false
let args = ['resolve', 'beatmaps', 'axios']

export let progress = 0

export const testFilter = async (filter: string, getHitObjects: boolean): Promise<string> => {

  let userFilter: Function

  try {
    userFilter = new Function(...args, filter);
  } catch(error) {
    return error.message
  }

  if (!randomBeatmaps) {
    randomBeatmaps = Array.from(beatmapMap.values()).sort(() => 0.5-Math.random())
    randomBeatmaps = randomBeatmaps.slice(0,1000)
  }

  if (!toTest) {
    if (getHitObjects) {
      toTest = await getTestObjects(randomBeatmaps)
      hitObjectsLoaded = true
    } else {
      toTest = randomBeatmaps
    }
  }

  if (toTest && getHitObjects && !hitObjectsLoaded) {
    toTest = await getTestObjects(randomBeatmaps)
    hitObjectsLoaded = true
  }

  let filtered = await waitEval(userFilter, toTest);
  if (typeof(filtered) == "string") {
    return filtered
  }

  let filteredText = JSON.stringify(filtered.map(({artist, song, creator, difficulty, bpm}) => ({artist, song, creator, difficulty, bpm})), null, 2)
  return filteredText
}

export const generateCache = async (names: string[]) => {

  const path = await getOsuPath()
  const userFilters = new Map<string, Function>()
  const cache = new Map<string, string[]>()
  const filters = await readFilters()
  let getHitObjects = false

  names.forEach(filterName => {
    const filter = filters.find(filter => filter.name == filterName)
    if (filter) {
      userFilters.set(filterName, (new Function(...args, filter.filter)))
      if (filter.getHitObjects) {
        // if one of them needs objects, get them for all
        getHitObjects = true
      }
    }
  })

  const beatmaps = Array.from(beatmapMap.values())
  const pages = beatmaps.length / 1000

  for (let i = 0; i < pages; i++) {
    progress = ((i+1)/pages) * 100

    const lowerBound = i*1000
    const upperBound = (i+1)*1000
    let slice = beatmaps.slice(lowerBound, upperBound)

    if (getHitObjects) {
      //await new Promise<void>((res, rej) => setTimeout(() => res(), 10000))
      slice = await Promise.all(slice.map((beatmap) => readBeatmap(beatmap, path)))
    }

    // generate hashes for each filter given
    for (const [name, filter] of userFilters) {
      let beatmapObjects = await waitEval(filter, slice)
      if (typeof(beatmapObjects) != "string") {
        cache.set(name, (cache.get(name)??[]).concat(beatmapObjects.map(beatmap => beatmap.md5)))
      }
    }
  }

  for (const [name, filter] of userFilters) {
    await setCache(name, cache.get(name)??[])
  }

  progress = 0

}

/**
 * Uses promises to wait for user code to finish evaluating. Returns either result beatmaps or error string.
 */
const waitEval = (func, beatmaps): Promise<Beatmap[] | string> => {
  return new Promise((res, rej) => {
    try {
      // resolve inside eval
      func(res, beatmaps, axios)
    } catch(error) {
      res(error.message)
    }
  })
}
