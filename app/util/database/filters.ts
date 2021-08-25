import { CustomFilter } from "../../../models/filters";
import { getDb } from "./database";

export const writeFilter = async (filter: CustomFilter) => {

  const database = await getDb();
  let buf = Buffer.from(JSON.stringify(filter.cache))

  await database.run("INSERT INTO filters (name, filter, description, gethitobjects, iscached, cache) VALUES (:name, :filter, :description, :gethitobjects, :iscached, :cache)", {
    ":name": filter.name,
    ":filter": filter.filter,
    ":description": filter.description,
    ":gethitobjects": filter.getHitObjects,
    ":iscached": filter.isCached,
    ":cache": buf
  });
}

export const updateFilter = async (oldName: string, filter: CustomFilter, sameAsOld: boolean) => {
  const database = await getDb();

  await database.run("UPDATE filters SET name=$1, description=$2, filter=$3, gethitobjects=$4, iscached=$5, cache=$6 WHERE name=$7", {
    $1: filter.name,
    $2: filter.description,
    $3: filter.filter,
    $4: filter.getHitObjects,
    $5: sameAsOld,
    $6: sameAsOld ? Buffer.from(JSON.stringify(filter.cache)??[]) : Buffer.from(JSON.stringify([])),
    $7: oldName
  })

}

export const setCache = async (name: string, cache: string[]) => {

  const database = await getDb();
  const row = await database.get("SELECT * FROM filters WHERE name=$1", { $1: name });

  let buf = Buffer.from(JSON.stringify(cache))

  if (row) {
    await database.run("UPDATE filters SET iscached=$1, cache=$2 WHERE name=$3", { $1: true, $2: buf, $3: name })
  }

}

export const readFilters = async (): Promise<CustomFilter[]> => {

  const database = await getDb();
  const rows = await database.all("SELECT * FROM filters");

  const output: CustomFilter[] = []
  rows.forEach(row => {
    const text = JSON.parse(row.cache.length > 0 ? row.cache.toString() : "[]")
    const number = text.length
    const getHitObjects = row.gethitobjects == 1
    const isCached = row.iscached == 1
    const filter: CustomFilter = {name: row.name, filter: row.filter, description: row.description, getHitObjects: getHitObjects, isCached: isCached, numberCached: number, cache: text}
    output.push(filter)
  })

  return output
}

export const removeFilters = async (names: string[]) => {
  const database = await getDb();
  for (const name of names) {
    await database.run("DELETE FROM filters WHERE name=$1", { $1: name })
  }
}

export const updateFarmFallback = async (farm: string[]) => {
  const database = await getDb();
  await database.run("DELETE FROM farmfallback")
  await database.run("BEGIN TRANSACTION")
  for (const setId of farm) {
    await database.run("INSERT INTO farmfallback (setId) VALUES (?)", [setId])
  }
  await database.run("COMMIT")
}

export const getFarmFallback = async (): Promise<string[]> => {
  const database = await getDb();
  const rows = await database.all("SELECT * FROM farmfallback");
  const output: string[] = []
  rows.forEach(row => {
    output.push(row.setId)
  })
  return output
}

