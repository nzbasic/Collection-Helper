import { Beatmap } from "../../models/cache";
import { Collection } from "../../models/collection";
import { beatmapMap } from "./parsing/cache";
import { collections, writeCollections } from "./parsing/collections";
import * as fs from 'fs'

export const renameCollection = async (oldName: string, newName: string) => {

  for (const collection of collections.collections) {
    if (collection.name == oldName) {
      collection.name = newName
    }
  }
  await writeCollections()
}

export const removeCollections = async (names: string[]) => {

  let newCollections: Collection[] = [];

  for (const collection of collections.collections) {
    if (!names.includes(collection.name)) {
      newCollections.push(collection)
    }
  }

  collections.collections = newCollections
  collections.numberCollections = collections.collections.length
  await writeCollections()
}

export const mergeCollections = async (newName: string, names: string[]) => {

  const newHashes: Set<string> = new Set()
  for (const collection of collections.collections) {
    if (names.includes(collection.name)) {
      for (const hash of collection.hashes) {
        newHashes.add(hash)
      }
    }
  }

  await addCollection(newName, Array.from(newHashes))
}

export const addCollection = async (name: string, hashes: string[]) => {
  const newCollection: Collection = {name: name, numberMaps: hashes.length, hashes: hashes}
  collections.collections.push(newCollection)
  collections.numberCollections++
  await writeCollections()
}

export const addMaps = async (name: string, hashes: string[]) => {
  const match = collections.collections.filter(collection => collection.name == name)

  if (match.length) {
    const collection = match[0]
    let combined = collection.hashes.concat(hashes)

    //remove duplicates, there shouldn't be any but just in case
    combined = Array.from(new Set(combined))

    collection.hashes = combined
    collection.numberMaps = combined.length
    await writeCollections()
  }
}

export const removeMaps = async (name: string, hashes: string[]) => {
  const match = collections.collections.filter(collection => collection.name == name)

  if (match.length) {
    const collection = match[0]
    const newHashes = collection.hashes.filter(hash => !hashes.includes(hash))
    collection.hashes = newHashes
    collection.numberMaps = newHashes.length
    await writeCollections()
  }
}

export const exportCollectionDetails = async (exporting: Collection[], path: string) => {

  let output = "Collection Details as of " + new Date().toISOString().replace(/:/g, '-') + "\n\n"

  const toExport = exporting.length == 0 ? collections.collections : exporting

  for (const collection of toExport) {
    output += collection.name + "\n"
    const formatted = collection.hashes.map(hash => formatBeatmap(hash)).sort((a,b) => a.localeCompare(b))
    formatted.forEach(item => output += "- " + item + "\n")
    output += "\n"
  }

  fs.writeFile(path, output, () => {})
}

const formatBeatmap = (hash: string): string => {
  const beatmap = beatmapMap.get(hash)

  if (!beatmap) {
    return "Unknown hash: " + hash
  } else {
    return beatmap.artist + " - " + beatmap.song + " [" + beatmap.difficulty + "]"
  }
}


