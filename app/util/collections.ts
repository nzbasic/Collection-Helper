import { Collection } from "../../models/collection";
import { collections, writeCollections } from "./parsing/collections";

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

export const mergeCollections = async (names: string[]) => {

  let toMerge: Collection[] = [];

  for (const collection of collections.collections) {
    if (names.includes(collection.name)) {
      toMerge.push(collection);
    }
  }

  if (toMerge.length >=2) {
    let original = toMerge[0]
    for (let i = 1; i < toMerge.length; i++) {
      original.hashes = original.hashes.concat(toMerge[i].hashes)
    }
    original.hashes = Array.from(new Set(original.hashes))
    original.numberMaps = original.hashes.length
    toMerge.shift()
  }

  removeCollections(toMerge.map(a => a.name))
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


