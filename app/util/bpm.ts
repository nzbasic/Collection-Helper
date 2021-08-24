import { Beatmap } from "../../models/cache";
import { BpmChangerOptions, Collection, Override } from "../../models/collection";
import { getOsuPath } from "./database/settings";
import { beatmapMap } from "./parsing/cache";
import { readBeatmap } from "./parsing/hitobjects";
import { createNewFilePath } from "./practice";
import { externalStorage } from "./load";
import * as fs from 'fs'
import * as log from 'electron-log'
import { addCollection } from "./collections";
import { collections } from "./parsing/collections";
import * as crypto from 'crypto'
import { Worker } from "worker_threads";

const pageSize = 20;
const workers: Worker[] = [];
for (let i = 0; i < pageSize; i++) {
  workers.push(new Worker(__dirname + "/bpmworker.js"))
}

export let generationBpmProgress = 0

const calculateFullTempo = (rate: number): string => {
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

// I wrote this drunk its a mess ill fix it later
export const generateBPMChanges = async (collection: Collection, options: BpmChangerOptions) => {
  const osuPath = await getOsuPath()
  const setIdsGenerated = new Set<number>()
  const successfulHashes: string[] = []
  let numberComplete = 0;
  const bpm = options.bpm.enabled ? options.bpm.value : 0

  // serially running ffmpeg is like. really slow. really really slow.
  // here i will launch a load of worker threads which will launch a bunch of ffmpegs in parallel
  // now the audio processing will only be limited by IO speed :sunglasses:
  // what follows is based asynchronous multi-threading

  const pages = Math.ceil(collection.hashes.length / pageSize)
  for (let page = 0; page < pages; page++) {
    let success = 0

    const lowerBound = page*pageSize
    let upperBound = (page+1)*pageSize > collection.hashes.length ? collection.hashes.length : (page+1)*pageSize

    // this promise will resolve when all mp3s have finished (or failed)
    await new Promise<void>(async (res, rej) => {
      let i = 0;
      for (let hashIndex = lowerBound; hashIndex < upperBound; hashIndex++) {
        numberComplete++;
        const currentPageSize = upperBound - lowerBound
        const hash = collection.hashes[hashIndex]
        const beatmap = beatmapMap.get(hash)

        if (!beatmap) {
          success++
          if (success == currentPageSize) {
            res()
          };
          continue;
        }

        const rateChange = bpm / beatmap.ogBpm
        const newBeatmap = await calculateNewHitTimings(beatmap, rateChange, osuPath, options)

        if (newBeatmap) {
          const songsPath = externalStorage ? (externalStorage + "/") : (osuPath + "/Songs/")
          const folderPath = songsPath + newBeatmap.folderName
          const audioPath = folderPath + "/" + newBeatmap.audioFile
          const filePath = folderPath + "/" + newBeatmap.fileName
          const newAudioFile = options.bpm.enabled ? "audio " + bpm + "bpm.mp3" : newBeatmap.audioFile
          const output = folderPath + "/" + newAudioFile
          let atempo
          if (options.bpm.enabled) {
            atempo = calculateFullTempo(rateChange)
          }

          const newDiffName = newBeatmap.difficulty.replace(/[<>:"/\\|?*]/g, "") + (options.bpm.enabled ? (" " + bpm + "bpm") : "")
          const newPath = createNewFilePath(newDiffName, newBeatmap, filePath)
          const contents = await bpmChangeFileConstructor(filePath, newBeatmap, newDiffName, newAudioFile, rateChange)
          fs.writeFile(newPath, contents, e => {
            if (e) {
              log.error(e)
            }
          })

          const hashSum = crypto.createHash('md5')
          hashSum.update(contents)
          successfulHashes.push(hashSum.digest('hex'))

          if (bpm != 0 && options.bpm.enabled) {
            if (!setIdsGenerated.has(newBeatmap.setId)) {
              workers[i].postMessage({ audioPath: audioPath, atempo: atempo, output: output })
              workers[i].removeAllListeners()
              workers[i].on("message", (m) => {
                generationBpmProgress = (numberComplete / collection.hashes.length) * 100
                success++
                if (success == currentPageSize) {
                  res()
                }
              })

              i++
              setIdsGenerated.add(newBeatmap.setId)
            } else {
              success++;
            }
          } else if (hashIndex == upperBound - 1) {
            generationBpmProgress = (numberComplete / collection.hashes.length) * 100
            res()
          }
        } else {
          success++
        }

        if (success == currentPageSize) {
          res()
        }
      }
    })
  }

  let addon = " ("
  for (const key of Object.keys(options)) {
    if (options[key].enabled) {
      addon += key + ": " + options[key].value + " "
    }
  }
  addon = addon.slice(0, -1) + ")"

  let name = collection.name + addon
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

const calculateNewHitTimings = async (beatmap: Beatmap, rateChange: number, path: string, options: BpmChangerOptions): Promise<Beatmap> => {
  beatmap = await readBeatmap(beatmap, path)
  if (beatmap.hitObjects.length == 0) { return null }

  const clonedBeatmap: Beatmap = JSON.parse(JSON.stringify(beatmap))
  const inverseRateChange = 1/rateChange;

  if (options.ar.enabled) {
    clonedBeatmap.ar = options.ar.value
  } else {
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

    if (hitTime <= 1200) {
      clonedBeatmap.ar = 13 - (hitTime / 150)
    } else {
      clonedBeatmap.ar = 15 - (hitTime / 120)
    }

    if (clonedBeatmap.ar > 10) {
      clonedBeatmap.ar = 10
    } else if (clonedBeatmap.ar < 0) {
      clonedBeatmap.ar = 0
    }
  }

  if (options.od.enabled) {
    clonedBeatmap.od = options.od.value
  } else {
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
  }

  if (options.hp.enabled) {
    clonedBeatmap.hp = options.hp.value
  }

  if (options.cs.enabled) {
    clonedBeatmap.cs = options.cs.value
  }

  if (options.bpm.enabled && options.bpm.value) {
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

const bpmChangeFileConstructor = async (path: string, beatmap: Beatmap, diffName: string, audioFile: string, rateChange: number): Promise<string> => {
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
        const type = parseInt(contents[3])
        if ((type & (1<<3)) != 0) {
          const endSpinner = parseInt(contents[5])
          if (rateChange != 0) {
            contents[5] = (endSpinner * 1/rateChange) + ""
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
    } else {
      if (line.startsWith("Version")) {
        output += "Version:" + diffName + "\r\n"
      } else if (line.startsWith("AudioFilename")) {
        output += "AudioFilename: " + audioFile + "\r\n"
      } else if (line.startsWith("ApproachRate")) {
        output += "ApproachRate:" + Math.round(beatmap.ar * 10) / 10 + "\r\n"
      } else if (line.startsWith("OverallDifficulty")) {
        output += "OverallDifficulty:" + Math.round(beatmap.od * 10) / 10 + "\r\n"
      } else if (line.startsWith("HPDrainRate")) {
        output += "HPDrainRate:" + Math.round(beatmap.hp * 10) / 10 + "\r\n"
      } else if (line.startsWith("CircleSize")) {
        output += "CircleSize:" + Math.round(beatmap.cs * 10) / 10 + "\r\n"
      } else if (line.startsWith("osu file format")) {
        output += "osu file format v14\r\n"
      } else {
        output += line + "\r\n"
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
