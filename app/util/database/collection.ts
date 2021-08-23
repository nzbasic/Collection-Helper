import { collections } from '../parsing/collections'
import * as fs from 'fs'
import { Database as Sqlite3 } from "sqlite3";
import { Database, open } from "sqlite";
import { beatmapMap, setIds } from '../parsing/cache'
import * as AdmZip from 'adm-zip';
import { getOsuPath } from './settings';
import { MissingMap } from '../../../models/collection';
import { getDb } from './database';
import { addCollection } from '../collections';
import * as log from 'electron-log';
import { generateHash } from 'random-hash'
import { externalStorage } from '../load'

export let exportPercentage = 0
export let importPercentage = 0

export const exportCollection = async (name: string, exportBeatmaps: boolean, multiple: boolean, path: string, last: boolean) => {
  exportPercentage = 0.01
  let collection = collections.collections.find(item => item.name === name)

  if (multiple) {
    path = path + "/" + name + ".db"
    path = path.replace(/[<>:"/\\|?*]/g, "")
  }

  try {
    await fs.promises.stat(path)
    await fs.promises.rm(path)
  } catch {}

  let database: Database;
  try {
    database = await open({ filename: path, driver: Sqlite3 });
  } catch (e) {
    log.error(e)
    return
  }

  await database.run("CREATE TABLE IF NOT EXISTS collection (name TEXT PRIMARY KEY, beatmaps INTEGER, hashes BLOB)");
  await database.run("CREATE TABLE IF NOT EXISTS beatmaps (setId INTEGER, md5 TEXT PRIMARY KEY, folderName TEXT, zip BLOB)");
  await database.run("CREATE TABLE IF NOT EXISTS setidmap (md5 TEXT PRIMARY KEY, id INTEGER, setId INTEGER)")

  const osuPath = await getOsuPath()
  const songsPath = externalStorage ? (externalStorage + "/") : (osuPath + "/Songs/")
  const setSet = new Set<number>()
  let lastInvalid = ""
  let progress = 0

  const pageSize = exportBeatmaps ? 100 : 10000
  const pages = Math.ceil(collection.hashes.length/pageSize)
  for (let page = 0 ; page < pages; page++) {
    let lower = page*pageSize
    let upper = lower+pageSize > collection.hashes.length ? collection.hashes.length : lower+pageSize
    await database.run("BEGIN TRANSACTION")

    for (let index = lower; index < upper; index++) {
      const md5 = collection.hashes[index]
      const beatmap = beatmapMap.get(md5)
      progress++
      exportPercentage = progress / collection.hashes.length * 100

      if (beatmap) {
        await database.run("INSERT INTO setidmap (md5, id, setId) VALUES (?, ?, ?)", [beatmap.md5, beatmap.id, beatmap.setId])
        if (!setSet.has(beatmap.setId) || beatmap.setId == -1) {
          setSet.add(beatmap.setId)

          if (exportBeatmaps) {
            const fullPath = songsPath + beatmap.folderName

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

              if ((beatmap.setId == -1)) {
                if (beatmap.folderName != lastInvalid) {
                  lastInvalid = beatmap.folderName
                } else {
                  continue
                }
              }

              await database.run("INSERT INTO beatmaps (setId, md5, folderName, zip) VALUES (?, ?, ?, ?)", [beatmap.setId, beatmap.md5, beatmap.folderName, zip.toBuffer()])
            } catch(err) {
              log.error(err)
            }
          } else {
            await database.run("INSERT INTO beatmaps (setId, md5, folderName, zip) VALUES (?, ?, ?, ?)", [beatmap.setId, beatmap.md5, beatmap.folderName, null])
          }
        }
      }
    }
    await database.run("COMMIT")
  }

  let buf = Buffer.from(JSON.stringify(collection.hashes))
  await database.run("INSERT INTO collection (name, beatmaps, hashes) VALUES (?, ?, ?)", [name, exportBeatmaps, buf])

  database.close()

  if (last) {
    exportPercentage = 0
  }
}

let multipleSetId: Set<number> = new Set()
export const importCollection = async (path: string, name: string, multiple: boolean, last: boolean): Promise<void | string> => {
  let database: Database

  console.log(path)

  try {
    database = await open({ filename: path, driver: Sqlite3 });
  } catch(err) {
    importPercentage = 0
    return "Could not open database"
  }

  let allSets: any[]

  try {
    allSets = await database.all("SELECT * FROM setidmap")
  } catch(err) {
    importPercentage = 0
    return "Invalid database format"
  }

  const osuPath = await getOsuPath()
  const songsPath = externalStorage ? (externalStorage + "/") : (osuPath + "/Songs/")
  const numberBeatmaps = await database.get("SELECT count(*) AS number FROM beatmaps")
  const collection = await database.get("SELECT * FROM collection")

  const number = numberBeatmaps.number
  const exportBeatmaps = collection.beatmaps == 1
  const hashes = JSON.parse(collection.hashes.toString())

  if (exportBeatmaps) {

    importPercentage = -1
    // create temp table with all installed maps
    await database.run("DROP TABLE IF EXISTS temp")
    await database.run("CREATE TABLE IF NOT EXISTS temp (hash TEXT PRIMARY KEY)")
    const maps = Array.from(beatmapMap.values())

    await database.run("BEGIN TRANSACTION")
    for (const map of maps) {
      await database.run("INSERT INTO temp (hash) VALUES (?)", [map.md5])
    }
    await database.run("COMMIT")

    importPercentage = 0.01
    const count = await database.get("SELECT COUNT(*) AS count, md5 FROM beatmaps WHERE NOT EXISTS ( SELECT hash FROM temp WHERE md5=hash )");
    const missingMaps = new Set<number>()
    const pageSize = 10
    const pages = Math.ceil(count.count/pageSize)
    for (let i = 0 ; i < pages; i ++) {
      const offset = i*pageSize
      const limit = (i+1)*10 > number ? number-offset : 10
      const beatmaps = await database.all("SELECT md5, zip, folderName, setId FROM beatmaps WHERE NOT EXISTS ( SELECT hash FROM temp WHERE md5=hash ) LIMIT ? OFFSET ? ", [limit, offset])

      for (const beatmap of beatmaps) {
        if (!multipleSetId.has(beatmap.setId)) {
          multipleSetId.add(beatmap.setId)
          const buffer: Buffer = beatmap.zip
          const randomHash = generateHash({length: 16})
          if (beatmap.folderName == "undefined" || !beatmap.folderName) {
            beatmap.folderName = randomHash
          }
          try {
            await fs.promises.writeFile(songsPath + beatmap.folderName + ".osz", buffer)
            missingMaps.add(beatmap.setId)
          } catch(err) {
            log.error("Error importing beatmap " + beatmap.folderName)
          }
        }
      }

      if (i !== 0) {
        importPercentage = i / pages * 100
      }
    }

    await database.run("DROP TABLE temp")
    await removeMissingMaps(missingMaps)
  } else { // need to report missing sets
    importPercentage = 0.01
    const missingMaps: MissingMap[] = []
    let i = 0
    for (const beatmap of allSets) {
      importPercentage = i / allSets.length * 100
      if (!setIds.has(beatmap.setId)) {
        missingMaps.push({ setId: beatmap.setId, md5: beatmap.md5 })
        beatmapMap.set(beatmap.md5, { setId: beatmap.setId, md5: beatmap.md5, missing: true })
      }
      i++
    }

    await addMissingMaps(missingMaps)
  }

  if (multiple) {
    const names = path.split("\\")

    let i = 0
    while (true) {
      const newName = names[names.length-1] + (i == 0 ? "" : (" (" + (i) + ")"))
      if (!collections.collections.find(item => item.name == newName)) {
        name = newName
        break
      }
      i++;
    }
  }

  if (last) {
    multipleSetId = new Set()
    importPercentage = 0
  }

  await addCollection(name, hashes)
  database.close()
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
