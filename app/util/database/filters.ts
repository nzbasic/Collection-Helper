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
    const text = JSON.parse(row.cache.toString())
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
