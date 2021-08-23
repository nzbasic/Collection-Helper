import { Beatmap } from "../../models/cache";
import { Collection } from "../../models/collection";
import { getOsuPath } from "./database/settings";
import { beatmapMap } from "./parsing/cache";
import { readBeatmap } from "./parsing/hitobjects";
import { createNewFilePath } from "./practice";
import * as ffmpeg from 'fluent-ffmpeg'
import { externalStorage } from "./load";
import * as pathToFfmpeg from 'ffmpeg-static'
import * as fs from 'fs'
import * as log from 'electron-log'
import { addCollection } from "./collections";
import { collections } from "./parsing/collections";
import * as crypto from 'crypto'

ffmpeg.setFfmpegPath(pathToFfmpeg)

export let generationBpmProgress = 0

export const generateBPMChanges = async (collection: Collection, bpm: number) => {
  const osuPath = await getOsuPath()
  const setIdsGenerated = new Set<number>()
  const successfulHashes: string[] = []
  let numberComplete = -1;
  for (const hash of collection.hashes) {
    numberComplete++;
    const beatmap = beatmapMap.get(hash)
    if (!beatmap) { continue; }
    const rateChange = bpm / beatmap.ogBpm
    const newBeatmap = await calculateNewHitTimings(beatmap, rateChange, osuPath)

    if (newBeatmap) {
      const songsPath = externalStorage ? (externalStorage + "/") : (osuPath + "/Songs/")
      const folderPath = songsPath + newBeatmap.folderName
      const audioPath = folderPath + "/" + newBeatmap.audioFile
      const filePath = folderPath + "/" + newBeatmap.fileName
      const newAudioFile = "audio " + rateChange + "x speed.mp3"
      const output = folderPath + "/" + newAudioFile

      if (!setIdsGenerated.has(newBeatmap.setId)) {
        ffmpeg().input(audioPath).audioFilters("atempo=" + rateChange).output(output).run()
        setIdsGenerated.add(newBeatmap.setId)
      }

      const newDiffName = newBeatmap.difficulty + " " + bpm + "bpm"
      const newPath = createNewFilePath(newDiffName, newBeatmap, filePath)
      const contents = await bpmChangeFileConstructor(filePath, newBeatmap, newDiffName, newAudioFile)

      fs.writeFile(newPath, contents, e => {
        if (e) {
          log.error(e)
        }
      })

      const hashSum = crypto.createHash('md5')
      hashSum.update(contents)
      successfulHashes.push(hashSum.digest('hex'))
      generationBpmProgress = (numberComplete / collection.hashes.length) * 100
    }
  }

  let name = collection.name + " @ " + bpm + "bpm"
  const found = collections.collections.find(collection => collection.name == newName)
  if (found) {
    await removeCollections([newName])
  }

  await addCollection(name, successfulHashes)
}

const calculateNewHitTimings = async (beatmap: Beatmap, rateChange: number, path: string): Promise<Beatmap> => {
  beatmap = await readBeatmap(beatmap, path)
  if (beatmap.hitObjects.length == 0) { return null }

  const clonedBeatmap: Beatmap = JSON.parse(JSON.stringify(beatmap))
  const inverseRateChange = 1/rateChange;

  // calculate new AR. max = 10
  // need to convert to hitTime, then back to ar
  // formula is hitTime x 1/rateChange then convert hitTime to AR
  // osu ar works differently between 0-4 and 5-10 for some reason
  const ar = clonedBeatmap.ar
  let hitTime: number
  if (ar >= 5) {
    hitTime = Math.abs(ar - 13) * 150 * inverseRateChange
  } else {
    hitTime = Math.abs(ar - 15) * 120 * inverseRateChange
  }

  if (hitTime >= 1200) {
    clonedBeatmap.ar = 13 - (hitTime / 150)
  } else {
    clonedBeatmap.ar = 15 - (hitTime / 120)
  }

  if (clonedBeatmap.ar > 10) {
    clonedBeatmap.ar = 10
  } else if (clonedBeatmap.ar < 0) {
    clonedBeatmap.ar = 0
  }

  // calculate new OD, max = 10
  // same formula as above
  const od = clonedBeatmap.od
  const hitWindow = 79.5 - (od * 6)
  clonedBeatmap.od = (79.5 - hitWindow * inverseRateChange)/6

  if (clonedBeatmap.od > 10) {
    clonedBeatmap.od = 10
  } else if (clonedBeatmap.od < 0) {
    clonedBeatmap.od = 0
  }

  for (let timingPoint of clonedBeatmap.timingPoints) {
    if (timingPoint.inherited) {
      timingPoint.bpm = Math.round(timingPoint.bpm*inverseRateChange)
    }
    timingPoint.offset = Math.round(timingPoint.offset*inverseRateChange)
  }

  for (const hit of clonedBeatmap.hitObjects) {
    hit.time = Math.round(hit.time * inverseRateChange)
  }

  return clonedBeatmap
}

const bpmChangeFileConstructor = async (path: string, beatmap: Beatmap, diffName: string, audioFile: string): Promise<string> => {
  let output = "";
  const contents = await fs.promises.readFile(path)
  const lines = contents.toString("utf8").split(/\r?\n/);

  let hitObjectsFlag = false
  let timingPointsFlag = false
  let hitObjectIndex = 0
  let timingPointIndex = 0
  lines.forEach((line) => {
    let contents: string[]
    if (hitObjectsFlag || timingPointsFlag) {
      if (line == "") {
        hitObjectsFlag = false
        timingPointsFlag = false
      }

      contents = line.split(",");
      if (contents.length < 4) {
        return;
      }
    }

    if (hitObjectsFlag && line != "") {
      const hitObject = beatmap.hitObjects[hitObjectIndex]
      if (hitObject) {
        contents[2] = hitObject.time + ""
        output += contents.join(",") + "\n";
        hitObjectIndex++
      }
    } else if (timingPointsFlag && line != "") {
      const timingPoint = beatmap.timingPoints[timingPointIndex]
      if (timingPoint) {
        if (timingPoint.inherited) {
          contents[1] = timingPoint.bpm + ""
        }
        contents[0] = timingPoint.offset + ""

        output += contents.join(",") + "\n";
        timingPointIndex++
      }
    } else {
      if (line.startsWith("Version")) {
        output += "Version:" + diffName + "\n"
      } else if (line.startsWith("AudioFilename")) {
        output += "AudioFilename:" + audioFile + "\n"
      } else if (line.startsWith("ApproachRate")) {
        output += "ApproachRate:" + beatmap.ar + "\n"
      } else if (line.startsWith("OverallDifficulty")) {
        output += "OverallDifficulty:" + beatmap.od + "\n"
      } else {
        output += line + "\n"
      }
    }

    if (line == "[HitObjects]") {
      hitObjectsFlag = true
    } else if (line == "[TimingPoints]") {
      timingPointsFlag = true
    }
  });

  return output
}
