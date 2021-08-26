import { Beatmap } from "../../models/cache";
import { BpmChangerOptions, Collection, Override } from "../../models/collection";
import { getOsuPath } from "./database/settings";
import { beatmapMap } from "./parsing/cache";
import { readBeatmap } from "./parsing/hitobjects";
import { createNewFilePath } from "./practice";
import { externalStorage } from "./load";
import * as fs from 'fs'
import { addCollection } from "./collections";
import { collections } from "./parsing/collections";
import * as crypto from 'crypto'
import * as ffmpeg from 'fluent-ffmpeg'
import * as pathToFfmpeg from 'ffmpeg-static'
import { serve } from "../main";
import { app } from "electron";
import * as path from 'path'
import * as log from 'electron-log'

const pageSize = 10
export let generationBpmProgress = 0

const calculateFullTempo = (rate: number): string => {

  if (rate == Infinity) {
    return "atempo=1"
  }

  const total = []

  let condition: (value: number) => boolean
  let def: number;
  if (rate > 2) {
    def = 2;
    condition = (value) => value/def > 1
  } else if (rate < 0.5) {
    def = 0.5;
    condition = (value) => value/def < 1
  } else {
    return "atempo=" + rate
  }

  while (true) {
    if (condition(rate)) {
      total.push(def)
      rate = rate/def
    } else {
      total.push(rate)
      break
    }
  }

  let output = ""
  for (let i = 0; i < total.length; i++) {
    output += "atempo=" + total[i]
    if (i != total.length-1) {
      output += ","
    }
  }

  return output
}

const generateAudio = (audioPath: string, atempo: string, output: string) => {
  return new Promise<void>((res, rej) => {
    //console.log('checking if exits ' + audioPath)
    if (!fs.existsSync(output)) {
      //console.log(audioPath)
      try {
        ffmpeg()
          .input(audioPath)
          .audioFilters(atempo)
          .output(output)
          .on("end", () => {
            res()
          })
          .run();
      } catch (e) {
        console.log(e)
        res()
      }
    } else {
      res()
    }
  })
}

const check = (index: number, size: number, resolve) => {
  if (index == size) {
    resolve()
  }
}

export const generateBPMChanges = async (collection: Collection, options: BpmChangerOptions) => {

  if (serve) {
    ffmpeg.setFfmpegPath(pathToFfmpeg);
  } else {
    const ffmpegPath = path.join(app.getAppPath(), 'node_modules/ffmpeg-static/ffmpeg.exe').replace('app.asar', 'app.asar.unpacked')
    ffmpeg.setFfmpegPath(ffmpegPath)
  }

  const osuPath = await getOsuPath()
  const successfulHashes: string[] = []
  const bpm = options.bpm.enabled ? options.bpm.value : 0
  let numberComplete = 0
  const pages = Math.ceil(collection.hashes.length / pageSize)
  for (let page = 0; page < pages; page++) {
    const lowerBound = page*pageSize
    let upperBound = (page+1)*pageSize > collection.hashes.length ? collection.hashes.length : (page+1)*pageSize
    const size = upperBound - lowerBound
    // the strategy is: ffmpeg is slow
    // but we can run multiple at once
    // but node worker threads and typescript and electron dont mix very well
    // so we will take a page, calculate all the audio first, then do all the beatmaps

    await new Promise<void>((resolve, reject) => {
      let i = 0;

      for (let hashIndex = lowerBound; hashIndex < upperBound; hashIndex++) {
        const hash = collection.hashes[hashIndex]
        const beatmap = beatmapMap.get(hash)


        if (!beatmap) {
          i++
          check(i, size, resolve)
          continue;
        }

        const rateChange = bpm / beatmap.bpm

        if (rateChange == Infinity) {
          i++
          check(i, size, resolve)
          continue;
        }

        let atempo: string

        if (options.bpm.enabled) {
          atempo = calculateFullTempo(rateChange)
        }

        const songsPath = externalStorage ? (externalStorage + "/") : (osuPath + "/Songs/")
        const folderPath = songsPath + beatmap.folderName
        const newAudioFile = options.bpm.enabled ? "audio " + bpm + "bpm.mp3" : beatmap.audioFile
        const output = folderPath + "/" + newAudioFile
        const audioPath = folderPath + "/" + beatmap.audioFile
        generateAudio(audioPath, atempo, output).then(res => {
          i++
          check(i, size, resolve)
        })
      }
    })

    for (let hashIndex = lowerBound; hashIndex < upperBound; hashIndex++) {
      const hash = collection.hashes[hashIndex]
      const beatmap = beatmapMap.get(hash)

      if (!beatmap) {
        continue;
      }

      const rateChange = bpm / beatmap.ogBpm

      if (rateChange == Infinity) {
        continue;
      }

      const newBeatmap = await calculateNewHitTimings(beatmap, rateChange, osuPath, options)

      if (newBeatmap) {
        const songsPath = externalStorage ? (externalStorage + "/") : (osuPath + "/Songs/")
        const folderPath = songsPath + newBeatmap.folderName
        const filePath = folderPath + "/" + newBeatmap.fileName
        const newAudioFile = options.bpm.enabled ? "audio " + bpm + "bpm.mp3" : newBeatmap.audioFile

        const newDiffName = newBeatmap.difficulty.replace(/[<>:"/\\|?*]/g, "") + getAddonName(options).replace(/[<>:"/\\|?*]/g, "")
        const newPath = createNewFilePath(newDiffName, folderPath)

        newBeatmap.difficulty = newDiffName
        newBeatmap.audioFile = newAudioFile

        const contents = await bpmChangeFileConstructor(filePath, newBeatmap, rateChange)
        await fs.promises.writeFile(newPath, contents)

        const hashSum = crypto.createHash('md5')
        hashSum.update(contents)
        successfulHashes.push(hashSum.digest('hex'))
      }
    }

    numberComplete += size
    generationBpmProgress = numberComplete / collection.hashes.length * 100
  }

  let name = collection.name + getAddonName(options)
  let i = 0
  while (true) {
    const newName = name + (i == 0 ? "" : (" (" + (i) + ")"))
    if (!collections.collections.find(item => item.name == newName)) {
      name = newName
      break
    }
    i++;
  }

  await addCollection(name, successfulHashes)
}

const getAddonName = (options: BpmChangerOptions): string => {
  let addon = " ("
  for (const key of Object.keys(options)) {
    if (options[key].enabled) {
      addon += key + ": " + options[key].value + " "
    }
  }
  return addon.slice(0, -1) + ")"
}

const calculateNewHitTimings = async (beatmap: Beatmap, rateChange: number, path: string, options: BpmChangerOptions): Promise<Beatmap> => {
  beatmap = await readBeatmap(beatmap, path)
  if (beatmap.hitObjects.length == 0) { return null }

  const clonedBeatmap: Beatmap = JSON.parse(JSON.stringify(beatmap))
  const inverseRateChange = 1/rateChange;

  clonedBeatmap.ar = calculateNewAr(options.ar, clonedBeatmap.ar, inverseRateChange)
  clonedBeatmap.od = calculateNewOd(options.od, clonedBeatmap.od, inverseRateChange)

  if (options.hp.enabled) {
    clonedBeatmap.hp = options.hp.value
  }

  if (options.cs.enabled) {
    clonedBeatmap.cs = options.cs.value
  }

  if (options.bpm.enabled && options.bpm.value) {
    clonedBeatmap.previewTime = Math.round(clonedBeatmap.previewTime * inverseRateChange)

    for (let timingPoint of clonedBeatmap.timingPoints) {
      if (timingPoint.inherited) {
        timingPoint.bpm = timingPoint.bpm*inverseRateChange
      }
      timingPoint.offset = Math.round(timingPoint.offset*inverseRateChange)
    }

    for (const hit of clonedBeatmap.hitObjects) {
      hit.time = Math.round(hit.time * inverseRateChange)
    }
  }

  return clonedBeatmap
}

const calculateNewOd = (od: Override, originalOd: number, inverseRateChange: number): number => {
  if (od.enabled) {
    return od.value
  } else {
    let newOd: number
    const hitWindow = 79.5 - (originalOd * 6)
    newOd = (79.5 - hitWindow * inverseRateChange)/6

    if (newOd > 10) {
      newOd = 10
    } else if (newOd < 0) {
      newOd = 0
    }

    return newOd
  }
}

const calculateNewAr = (ar: Override, originalAr: number, inverseRateChange: number): number => {
  if (ar.enabled) {
    return ar.value
  } else {
    // calculate new AR. max = 10
    // need to convert to hitTime, then back to ar
    // formula is hitTime x 1/rateChange then convert hitTime to AR
    // osu ar works differently between 0-4 and 5-10 for some reason
    let newAr: number
    let hitTime: number
    if (originalAr >= 5) {
      hitTime = Math.abs(originalAr - 13) * 150 * inverseRateChange
    } else {
      hitTime = Math.abs(originalAr - 15) * 120 * inverseRateChange
    }

    if (hitTime <= 1200) {
      newAr = 13 - (hitTime / 150)
    } else {
      newAr = 15 - (hitTime / 120)
    }

    if (newAr > 10) {
      newAr = 10
    } else if (newAr < 0) {
      newAr = 0
    }

    return newAr
  }

}

const oneDpRounder = (value: number): number => {
  return Math.round(value * 10) / 10
}

const bpmChangeFileConstructor = async (path: string, beatmap: Beatmap, rateChange: number): Promise<string> => {
  let output = "";
  const contents = await fs.promises.readFile(path)
  const lines = contents.toString("utf8").split(/\r?\n/);

  let hitObjectsFlag = false
  let timingPointsFlag = false
  let eventsFlag = false
  let hitObjectIndex = 0
  let timingPointIndex = 0
  const toUpdate = [
    { name: "ApproachRate:", value: "ar", needRounding: true },
    { name: "OverallDifficulty:", value: "od", needRounding: true },
    { name: "HPDrainRate:", value: "hp", needRounding: true },
    { name: "CircleSize:", value: "cs", needRounding: true },
    { name: "PreviewTime:", value: "previewTime", needRounding: true },
    { name: "Version:", value: "difficulty" },
    { name: "AudioFilename:", value: "audioFile" }
  ]

  for (const line of lines) {
    let contents: string[]
    if (hitObjectsFlag || timingPointsFlag || eventsFlag) {
      if (line == "") {
        hitObjectsFlag = false
        timingPointsFlag = false
        eventsFlag = false
      }

      contents = line.split(",");
      if (contents.length < 3) {
        continue;
      }
    }

    if (hitObjectsFlag && line != "") {
      const hitObject = beatmap.hitObjects[hitObjectIndex]
      if (hitObject) {
        const type = parseInt(contents[3], 10)
        if ((type & (1<<3)) != 0) {
          const endSpinner = parseInt(contents[5], 10)
          if (rateChange != 0) {
            contents[5] = Math.round((endSpinner * 1/rateChange)) + ""
          }
        }
        contents[2] = hitObject.time + ""
        output += contents.join(",") + "\r\n";
        hitObjectIndex++
      }
    } else if (timingPointsFlag && line != "") {
      const timingPoint = beatmap.timingPoints[timingPointIndex]
      if (timingPoint) {
        if (timingPoint.inherited) {
          contents[1] = timingPoint.bpm + ""
        }
        contents[0] = timingPoint.offset + ""

        output += contents.join(",") + "\r\n";
        timingPointIndex++
      }
    } else if (eventsFlag && line != "") {
      if (contents[0] == "2") {
        contents[1] = Math.round((parseInt(contents[1], 10) * 1/rateChange)) + ""
        contents[2] = Math.round((parseInt(contents[2], 10) * 1/rateChange)) + ""
        output += contents.join(",") + "\r\n";
      }
    } else {

      let flag = true
      for (const item of toUpdate) {
        if (line.startsWith(item.name)) {
          const value = item.needRounding ? oneDpRounder(beatmap[item.value]) : beatmap[item.value]
          output += item.name + value + "\r\n"
          flag = false
        }
      }

      if (flag) {
        if (line.startsWith("osu file format")) {
          output += "osu file format v14\r\n"
        } else {
          output += line + "\r\n"
        }
      }
    }

    if (line == "[HitObjects]") {
      hitObjectsFlag = true
    } else if (line == "[TimingPoints]") {
      timingPointsFlag = true
    } else if (line == "[Events]") {
      eventsFlag = true
    }
  }

  return output
}
