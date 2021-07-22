import { collections } from '../parsing/collections'
import * as fs from 'fs'
import { Database as Sqlite3 } from "sqlite3";
import { open } from "sqlite";
import { beatmapMap, setIds } from '../parsing/cache'
import * as AdmZip from 'adm-zip';
import { getOsuPath } from './settings';
import { MissingMap } from '../../../models/collection';
import { getDb } from './database';
import { addCollection } from '../collections';
import * as log from 'electron-log';
import { generateHash } from 'random-hash'

export let exportPercentage = 0
export let importPercentage = 0

export const exportCollection = async (name: string, exportBeatmaps: boolean, path: string) => {
  exportPercentage = 0.01
  let collection = collections.collections.find(item => item.name === name)

  try {
    await fs.promises.stat(path)
    await fs.promises.rm(path)
  } catch {}

  const database = await open({ filename: path, driver: Sqlite3 });
  await database.run("CREATE TABLE IF NOT EXISTS collection (name TEXT PRIMARY KEY, beatmaps INTEGER, hashes BLOB)");
  await database.run("CREATE TABLE IF NOT EXISTS beatmaps (setId INTEGER, md5 TEXT PRIMARY KEY, folderName TEXT, zip BLOB)");
  await database.run("CREATE TABLE IF NOT EXISTS setidmap (md5 TEXT PRIMARY KEY, id INTEGER, setId INTEGER)")

  const osuPath = await getOsuPath()
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
  exportPercentage = 0
}

export const importCollection = async (path: string, name: string) => {
  importPercentage = 0.01
  const database = await open({ filename: path, driver: Sqlite3 });
  const osuPath = await getOsuPath()

  const allSets = await database.all("SELECT * FROM setidmap")
  const numberBeatmaps = await database.get("SELECT count(*) AS number FROM beatmaps")
  const collection = await database.get("SELECT * FROM collection")

  const number = numberBeatmaps.number
  const exportBeatmaps = collection.beatmaps == 1
  const hashes = JSON.parse(collection.hashes.toString())

  if (exportBeatmaps) {
    const missingMaps = new Set<number>()
    const pageSize = 10
    const pages = Math.ceil(numberBeatmaps.number/pageSize)
    for (let i = 0 ; i < pages; i ++) {
      const offset = i*pageSize
      const limit = (i+1)*10 > number ? number-offset : 10
      const beatmaps = await database.all("SELECT * FROM beatmaps LIMIT ? OFFSET ?", [limit, offset])

      for (const beatmap of beatmaps) {
        if (!setIds.has(beatmap.setId) && !beatmapMap.has(beatmap.md5)) {
          const buffer: Buffer = beatmap.zip
          const randomHash = generateHash({length: 16})
          if (beatmap.folderName == "undefined" || !beatmap.folderName) {
            beatmap.folderName = randomHash
          }
          try {
            await fs.promises.writeFile(osuPath + "/Songs/" + beatmap.folderName + ".osz", buffer)
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
    await removeMissingMaps(missingMaps)
  } else { // need to report missing sets
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
