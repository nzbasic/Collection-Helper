import { CustomFilter } from "../../models/filters"
import { Beatmap } from "../../models/cache"
import { getTestObjects } from "./hitobjects"
import { beatmapMap } from './parsing/cache'
import axios from 'axios'
import { readBeatmap } from "./parsing/hitobjects"
import { getFarmFallback, readFilters, setCache, updateFarmFallback } from "./database/filters"
import { getOsuPath } from "./database/settings"
import { collections } from "./parsing/collections"
import { Collection } from "../../models/collection"
import * as dns from 'dns'
import * as isReachable from 'is-reachable'

let lastName: string
let randomBeatmaps: Beatmap[]
let storedBeatmaps: Beatmap[]
let hitObjectsLoaded = false
const args = ['resolve', 'beatmaps', 'axios', 'farmSets']

export let progress = 0

export const testFilter = async (filter: string, getHitObjects: boolean, name: string) => {

  let userFilter: Function
  let beatmaps: Beatmap[]
  let collection: Collection

  if (lastName != name) {
    hitObjectsLoaded = false
  }

  try {
    userFilter = new Function(...args, filter);
  } catch(error) {
    return { filteredText: error.message, numberTested: 0 }
  }

  if (name) {
    collection = collections.collections.find(item => item.name == name)
    randomBeatmaps = collection.hashes.map(item => beatmapMap.get(item)).sort(() => 0.5-Math.random()).slice(0,1000)
  }

  if (!randomBeatmaps || (name == "" && lastName != "")) {
    randomBeatmaps = Array.from(beatmapMap.values()).sort(() => 0.5-Math.random()).slice(0,1000)
  }

  if (!getHitObjects && !hitObjectsLoaded) {
    storedBeatmaps = randomBeatmaps
  }

  if (lastName == name) {
    if (getHitObjects && !hitObjectsLoaded) {
      storedBeatmaps = await getTestObjects(randomBeatmaps)
      hitObjectsLoaded = true
    }
    beatmaps = storedBeatmaps
  } else {
    lastName = name
    if (getHitObjects) {
      storedBeatmaps = await getTestObjects(randomBeatmaps)
      hitObjectsLoaded = true
    }
    beatmaps = storedBeatmaps
  }

  let filteredText: string
  let filtered = await waitEval(userFilter, beatmaps);

  if (typeof(filtered) == "string") {
    filteredText = filtered
  } else {
    try {
      filteredText = JSON.stringify(filtered.map(({artist, song, creator, difficulty, bpm}) => ({artist, song, creator, difficulty, bpm})), null, 2)
    } catch(error) {
      filteredText = error.message
    }
  }

  return { filteredText: filteredText, numberTested: randomBeatmaps.length }
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
    progress = ((i)/pages) * 100

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
  return new Promise(async (res, rej) => {

    const isConnected = await isReachable("osutracker.com", { timeout: 1000 })
    let farm: string[] = []

    if (isConnected) {
      farm = (await axios.get("https://osutracker.com/api/stats/farmSets")).data
      updateFarmFallback(farm)
    } else {
      farm = await getFarmFallback()
    }

    try {
      // resolve inside eval
      func(res, beatmaps, axios, farm)
    } catch(error) {
      res(error.message)
    }
  })
}
