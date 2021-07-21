import { Database as Sqlite3, Statement } from "sqlite3";
import { open, Database } from "sqlite";
import * as path from 'path'
import { serve } from '../../main'
import * as fs from 'fs'
import { app } from "electron";
import { CustomFilter } from "../../../models/filters";
import { writeFilter } from "./filters";
import { promisify } from 'util';

let database: Database<Sqlite3, Statement>;
let pathToDbFile: string

export const getDb = async (): Promise<Database<Sqlite3, Statement>> => {
  if (!database) {

    if (serve) {
      pathToDbFile = "database.db"
    } else {
      pathToDbFile = path.join(app.getPath('userData'), 'database.db');
    }

    try {
      await fs.promises.stat(pathToDbFile)
      await setupDb()
    } catch {
      await setupFilters()
    }
  }

  return database;
};

const setupDb = async () => {
  database = await open({ filename: pathToDbFile, driver: Sqlite3 });
  await database.run("CREATE TABLE IF NOT EXISTS osupath (path TEXT PRIMARY KEY)");
  await database.run("CREATE TABLE IF NOT EXISTS filters (name TEXT PRIMARY KEY, filter TEXT, description TEXT, gethitobjects INTEGER, iscached INTEGER, cache BLOB)");
  await database.run("CREATE TABLE IF NOT EXISTS missingmaps (md5 TEXT PRIMARY KEY, setId INTEGER)")
  //await database.run("CREATE TABLE IF NOT EXISTS newmaps (md5 TEXT PRIMARY KEY, setId INTEGER, id INTEGER)")
}

const setupFilters = async () => {
  await setupDb()
  await writeFilter(streamFilter)
  await writeFilter(farmFilter)
}

const streamFilter: CustomFilter = {
  name: "Stream",
  description: "Maps over 140 bpm with >20% of their notes in bursts (length >5)",
  getHitObjects: true,
  isCached: false,
  cache: [],
  numberCached: 0,
  filter: "const burstCount = 5\n\nlet filtered = beatmaps.filter(beatmap => {\n\tlet bpms = convertTimingBpm(beatmap.timingPoints) \n\n\tif (!bpms.length) {\n\t\treturn false\n\t}\n\n\tif (beatmap.bpm <= 140) {\n\t\treturn false\n\t}\n\n\tlet currentBurstCount = 0\n\tlet maxBurstCount = 1\n\tlet totalBurstNotes = 0\n\tlet lastNoteTime\n\tbeatmap.hitObjects.forEach(hits => { \n\n\t\t// if object is a circle\n\t\tif (hits.type & 1 == 1) {      \n\n\t\t\t// if a burst hasnt started, do no checks and begin the current burst on this object\n\t\t\tif (currentBurstCount == 0) {\n\n\t\t\t\t// for the first circle, we need to set this variable\n\t\t\t\tlastNoteTime = hits.time\n\t\t\t\tcurrentBurstCount = 1\n\n\t\t\t} else {\n\t\t\t\t// this is the second circle in a row, so we need to check if is <= 1/4 timing away from the last note \n\n\t\t\t\t// bpm logic: we need to keep track of the current bpm at any time for 1/4 comparisons.\n\t\t\t\t// T = timing point, C = circle\n\t\t\t\t// Two cases:\n\t\t\t\t// ___T1__C1___T2___C2____T3_____\n\t\t\t\t// ___T1_________C1______________\n\t\t\t\t// To avoid constant checking for each timing point, if the current circle is past the 2ND last timing point, remove it from the bpm array.\n\t\t\t\t// This way we get O(1) bpm checking, the current bpm will always be the first bpm in the array.\n\t\t\t\tif (bpms.length >= 2) {\n\t\t\t\t\tif (hits.time > bpms[0].time && hits.time > bpms[1].time) {\n\t\t\t\t\t\tbpms.shift()\n\t\t\t\t\t}\n\t\t\t\t}	\n\t\t\t\tlet bpm = bpms[0].bpm\n\n\t\t\t\t// 1/4 time calculation in ms\n\t\t\t\t// bpm * 4 = notes per minute.. / 60 = notes per second.. 1/ans = seconds per note.. * 1000 = ms per note\n\t\t\t\tlet maxTimeMs = Math.round((1/(bpm*4/60))*1000)\n\n\t\t\t\t// if last note is within this time period, count it as a burst\n\t\t\t\tif ((hits.time - lastNoteTime) <= maxTimeMs) {\n\t\t\t\t\tcurrentBurstCount++\n\n\t\t\t\t\t// set as max burst length if greater than current\n\t\t\t\t\tif (currentBurstCount > maxBurstCount) {\n\t\t\t\t\t\tmaxBurstCount = currentBurstCount\n\t\t\t\t\t\tmaxBurstEndsAt = hits.time\n\t\t\t\t\t}\n\n\t\t\t\t\t// keep track of total notes in bursts\n\t\t\t\t\tif (currentBurstCount == burstCount) {\n\t\t\t\t\t\ttotalBurstNotes += burstCount\n\t\t\t\t\t} else if (currentBurstCount > burstCount) {\n\t\t\t\t\t\ttotalBurstNotes++\n\t\t\t\t\t}\n\t\t\t\t} else {\n\t\t\t\t\tcurrentBurstCount = 0\n\t\t\t\t}\n\t\t\t\t// finally, keep track of last note time\n\t\t\t\tlastNoteTime = hits.time\n\t\t\t}\n\t\t} else {\n\t\t\tcurrentBurstCount = 0\n\t\t\t lastNoteTime = hits.time\n\t\t}\n\t})\n\treturn (totalBurstNotes/beatmap.hitObjects.length)*100 >= 20\n})\n\nfunction convertTimingBpm(timingPoints) {\n\n\tlet bpmList = []  \n\n\ttimingPoints.forEach(point => {\n\t\tif (point.inherited) {\n\t\t\tbpmList.push({bpm: Math.round(60000 / point.bpm), time: point.offset})\n\t\t}\n\t})\n\n\treturn bpmList\n}\n\nresolve(filtered)"
}

const farmFilter: CustomFilter = {
  name: "Farm",
  description: "Maps in the most popular mapsets",
  getHitObjects: false,
  isCached: false,
  cache: [],
  numberCached: 0,
  filter: "(async () => {\n\tlet topSets = (await axios.get('https://osutracker.com/api/stats/farmSets')).data\n\tlet filtered = beatmaps.filter(beatmap => topSets.includes(beatmap.setId.toString()))\n\tresolve(filtered)\n})()"
}

export default database;
