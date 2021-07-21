import { collections } from '../parsing/collections'
import * as fs from 'fs'
import { Database as Sqlite3, Statement } from "sqlite3";
import { open, Database } from "sqlite";
import { beatmapMap, setIds } from '../parsing/cache'
import * as AdmZip from 'adm-zip';
import { getOsuPath } from './settings';
import { Collection, MissingMap } from '../../../models/collection';
import { getDb } from './database';
import { addCollection } from '../collections';
import * as log from 'electron-log';

export let exportPercentage = 0
export let importPercentage = 0

export const exportCollection = async (name: string, exportBeatmaps: boolean, path: string) => {

  let collection = collections.collections.find(item => item.name === name)

  try {
    await fs.promises.stat(path)
    await fs.promises.rm(path)
  } catch {}

  const database = await open({ filename: path, driver: Sqlite3 });
  await database.run("CREATE TABLE IF NOT EXISTS collection (name TEXT PRIMARY KEY, beatmaps INTEGER, hashes BLOB)");
  await database.run("CREATE TABLE IF NOT EXISTS beatmaps (setId INTEGER PRIMARY KEY, zip BLOB)");
  await database.run("CREATE TABLE IF NOT EXISTS setidmap (md5 TEXT PRIMARY KEY, setId INTEGER)")

  const osuPath = await getOsuPath()
  const setSet = new Set<number>()
  let progress = 0

  const pageSize = exportBeatmaps ? 100 : 10000
  const pages = Math.ceil(collection.hashes.length/pageSize)
  for (let page = 0 ; page < pages; page++) {
    let lower = page*pageSize
    let upper = lower+pageSize > collection.hashes.length ? collection.hashes.length : lower+pageSize
    await database.run("BEGIN TRANSACTION")

    for (let index = lower; index < upper; index++) {
      const hash = collection.hashes[index]
      const beatmap = beatmapMap.get(hash)
      progress++
      exportPercentage = progress / collection.hashes.length * 100

      if (beatmap) {
        await database.run("INSERT INTO setidmap (md5, setId) VALUES (?, ?)", [beatmap.md5, beatmap.setId])
        if (!setSet.has(beatmap.setId)) {
          setSet.add(beatmap.setId)

          if (exportBeatmaps) {
            const fullPath = osuPath + "/Songs/" + beatmap.folderName

            try {
              let files = await fs.promises.readdir(fullPath)
              const zip = new AdmZip()

              for (const file of files) {
                let filePath = fullPath + "/" + file
                if ((await fs.promises.lstat(filePath)).isDirectory()) {
                  zip.addLocalFolder(filePath)
                } else {
                  zip.addLocalFile(filePath)
                }
              }

              await database.run("INSERT INTO beatmaps (setId, zip) VALUES (?, ?)", [beatmap.setId, zip.toBuffer()])
            } catch(err) {
              log.error(err)
            }
          } else {
            await database.run("INSERT INTO beatmaps (setId, zip) VALUES (?, ?)", [beatmap.setId, null])
          }
        }
      }
    }
    await database.run("COMMIT")
  }

  let buf = Buffer.from(JSON.stringify(collection.hashes))
  await database.run("INSERT INTO collection (name, beatmaps, hashes) VALUES (?, ?, ?)", [name, exportBeatmaps, buf])

  database.close()
  exportPercentage = 0
}

export const importCollection = async (path: string, name: string) => {
  const database = await open({ filename: path, driver: Sqlite3 });
  const osuPath = await getOsuPath()

  const numberBeatmaps = await database.get("SELECT count(*) AS number FROM beatmaps")
  const number = numberBeatmaps.number

  const collection = await database.get("SELECT * FROM collection")
  const exportBeatmaps = collection.beatmaps == 1
  const hashes = JSON.parse(collection.hashes.toString())

  if (exportBeatmaps) {
    const missingMaps = new Set<number>()
    const pageSize = 10
    const pages = Math.ceil(numberBeatmaps.number/pageSize)
    for (let i = 0 ; i < pages; i ++) {
      const offset = i*pageSize
      const limit = (i+1)*10 > number ? number-offset : 10
      importPercentage = i / pages * 100

      const beatmaps = await database.all("SELECT * FROM beatmaps LIMIT ? OFFSET ?", [limit, offset])

      for (const beatmap of beatmaps) {
        if (!setIds.has(beatmap.setId)) {
          let buffer: Buffer = beatmap.zip
          await fs.promises.writeFile(osuPath + "/Songs/" + beatmap.setId + ".osz", buffer)
          missingMaps.add(beatmap.setId)
        }
      }
    }
    await removeMissingMaps(missingMaps)
  } else { // need to report missing sets
    const beatmaps = await database.all("SELECT * FROM setidmap")
    const missingMaps: MissingMap[] = []
    let i = 0
    for (const beatmap of beatmaps) {
      importPercentage = i / beatmaps.length * 100
      if (!setIds.has(beatmap.setId)) {
        missingMaps.push({ setId: beatmap.setId, md5: beatmap.md5 })
        beatmapMap.set(beatmap.md5, { setId: beatmap.setId, md5: beatmap.md5, missing: true })
      }
      i++
    }

    await addMissingMaps(missingMaps)
  }

  await addCollection(name, hashes)
  database.close()
  importPercentage = 0
}

const addMissingMaps = async (missingMaps: MissingMap[]) => {
  const database = await getDb()
  const currentMissing = await database.all("SELECT * FROM missingmaps")
  const currentMissingSet = new Set(currentMissing.map(item => item.setId))

  for (const missingMap of missingMaps) {
    if (!currentMissingSet.has(missingMap)) {
      await database.run("INSERT INTO missingmaps (md5, setId) VALUES (?, ?)", [missingMap.md5, missingMap.setId])
    }
  }
}

export const removeMissingMaps = async (mapSet: Set<number>) => {
  const database = await getDb()
  const currentMissing = await database.all("SELECT * FROM missingMaps")
  const currentMissingSet = new Set(currentMissing.map(item => item.setId))

  for (const missingMap of currentMissingSet) {
    if (mapSet.has(missingMap)) {
      await database.run("DELETE FROM missingmaps WHERE setId = ?", [missingMap])
    }
  }
}

export const getMissingMaps = async (): Promise<MissingMap[]> => {
  const database = await getDb()
  const missingMaps = await database.all("SELECT * FROM missingmaps")
  return missingMaps.map(item => {
    let missingMap: MissingMap = {
      setId: item.setId,
      md5: item.md5
    };
    return missingMap
  })
}