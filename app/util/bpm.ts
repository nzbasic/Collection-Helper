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

ffmpeg.setFfmpegPath(pathToFfmpeg)

export const generateBPMChanges = async (collection: Collection, bpm: number) => {
  const osuPath = await getOsuPath()
  for (const hash of collection.hashes) {
    const beatmap = beatmapMap.get(hash)
    if (!beatmap) { continue; }
    const newBeatmap = await calculateNewHitTimings(beatmap, bpm, osuPath)

    if (newBeatmap) {

    }
  }
}

const calculateNewHitTimings = async (beatmap: Beatmap, bpm: number, path: string) => {
  beatmap = await readBeatmap(beatmap, path)
  if (beatmap.hitObjects.length == 0) { return null }

  const clonedBeatmap: Beatmap = JSON.parse(JSON.stringify(beatmap))
  let rateChange = bpm / beatmap.bpm
  const inverseRateChange = 1/rateChange;

  // atempo is limited to a 0.5-2 range
  if (rateChange > 2) {
    rateChange = 2
  } else if (rateChange < 0.5) {
    rateChange = 0.5
  }

  for (let timingPoint of clonedBeatmap.timingPoints) {
    if (timingPoint.inherited) {
      timingPoint.bpm = Math.round(timingPoint.bpm*inverseRateChange)
    }
    timingPoint.offset = Math.round(timingPoint.offset*inverseRateChange)
  }

  const songsPath = externalStorage ? (externalStorage + "/") : (path + "/Songs/")
  const folderPath = songsPath + clonedBeatmap.folderName
  const audioPath = folderPath + "/" + clonedBeatmap.audioFile
  const filePath = folderPath + "/" + clonedBeatmap.fileName
  const newAudioFile = "audio " + rateChange + "x speed.mp3"
  const output = folderPath + "/" + newAudioFile
  ffmpeg().input(audioPath).audioFilters("atempo=" + rateChange).output(output).run()

  for (const hit of clonedBeatmap.hitObjects) {
    hit.time = Math.round(hit.time * inverseRateChange)
  }

  const newDiffName = beatmap.difficulty + " " + bpm + "bpm"
  const newPath = createNewFilePath(newDiffName, clonedBeatmap, filePath)
  const contents = await bpmChangeFileConstructor(filePath, clonedBeatmap, newDiffName, newAudioFile)
  fs.writeFile(newPath, contents, e => {
    if (e) {
      log.error(e)
    }
  })
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
