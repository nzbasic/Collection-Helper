import { Collection } from "../../models/collection";
import { beatmapMap } from "./parsing/cache";
import { getOsuPath } from "./database/settings";
import { readBeatmap } from "./parsing/hitobjects";
import { Beatmap, HitObject } from "../../models/cache";
import * as fs from 'fs'
import { externalStorage } from "./load";
import * as log from 'electron-log'
import * as crypto from 'crypto'
import { collections } from "./parsing/collections";
import { addCollection, removeCollections } from "./collections";

export let generationPercentage = 0

interface Shape {
  objects: HitObject[],
  bpms: number[],
}

interface Window {
  startTime: number,
  endTime: number,
}

interface Difficulty {
  difficulty: number,
  time: number
}

export const generatePracticeDiffs = async (collection: Collection, prefLength: number) => {
  const osuPath = await getOsuPath();

  const newName = collection.name + " spike difficulty " + prefLength + "s"
  const found = collections.collections.find(collection => collection.name == newName)
  if (found) {
    await removeCollections([newName])
  }

  let i = 0;
  const hashes: string[] = []
  for (const hash of collection.hashes) {
    const beatmap = beatmapMap.get(hash)
    if (beatmap) {
      try {
        const window = await calculateDifficultyWindow(beatmapMap.get(hash), prefLength, osuPath);
        if (window == null) {
          continue;
        }

        const songsPath = externalStorage ? (externalStorage + "/") : (osuPath + "/Songs/")
        const songPath = songsPath + beatmap.folderName
        const filePath = songPath + "/" + beatmap.fileName
        const newDiffName =  beatmap.difficulty + " spike window " + prefLength + "s"
        const fullPath = createNewFilePath(newDiffName, songPath)
        const contents = await practiceFileConstructor(filePath, window, newDiffName)

        const hashSum = crypto.createHash('md5')
        hashSum.update(contents)
        hashes.push(hashSum.digest('hex'))

        await fs.promises.writeFile(fullPath, contents)
      } catch(err) {
        log.error(err)
      }
    }
    i++;
    generationPercentage = (i / collection.hashes.length) * 100
  }

  await addCollection(newName, hashes)
}

export const createNewFilePath = (newDiffName: string, songPath: string): string => {
  const path = songPath + "/" + "collection helper [" + newDiffName + "]"
  return path.slice(0,240) + ".osu"
}

const practiceFileConstructor = async (path: string, window: Window, diffName: string): Promise<string> => {
  let output = "";
  const contents = await fs.promises.readFile(path)
  const lines = contents.toString("utf8").split(/\r?\n/);

  let flag = false;
  lines.forEach((line) => {
    if (flag && line != "") {
      const contents = line.split(",");
      if (contents.length < 4) {
        return;
      }
      const time = parseInt(contents[2]);

      if ((time >= window.startTime) && (time <= window.endTime)) {
        output += line + "\r\n"
      }
    } else {

      if (line.startsWith("Version")) {
        output += "Version:" + diffName + "\r\n"
      } else if (line.startsWith("osu file format")) {
        output += "osu file format v14\r\n"
      } else {
        output += line + "\r\n"
      }
    }

    if (line == "[HitObjects]") {
      flag = true;
    }
  });

  return output
}

const maxDist = Math.sqrt(512**2 + 384**2)


const addShapeToList = (shapes: Shape[], shape: Shape) => {
  if (shape.objects.length == 1) {
    return;
  }
  shapes.push(shape)
}

// heavily inspired (copied from) arcutright: https://github.com/arcutright/osu-diffcalc/blob/c61a224e4cc9bc4d6735db37e3d00fc4f582e7ee/Osu%20DiffCalc/FileProcessor/Analyzer.cs#L237
const calculateDifficultyWindow = async (beatmap: Beatmap, windowSize: number, path: string) => {

  beatmap = await readBeatmap(beatmap, path);

  if (beatmap.hitObjects.length <= 1) {
    return null;
  }

  const bpms = convertTimingBpm(beatmap.timingPoints);

  const aimDifficulty: Difficulty[] = [];
  const shapes: Shape[] = [];
  let currentShape: Shape = { objects: [beatmap.hitObjects[0]], bpms: [bpms[0].bpm] };

  for (let i = 1; i < beatmap.hitObjects.length; i++) {
    const lastObject = beatmap.hitObjects[i-1];
    const currentObject = beatmap.hitObjects[i];

    if (isCircle(currentObject) || isSlider(currentObject)) {

      if (bpms.length >= 2) {
        if (currentObject.time > bpms[0].time && currentObject.time > bpms[1].time) {
          bpms.shift()
        }
      }
      let bpm = bpms[0].bpm

      if (currentShape.objects.length == 0) {
        currentShape.objects.push(currentObject)
      } else {
        const maxTimeMs = Math.round((1/(bpm*4/60))*1000)
        if ((currentObject.time - lastObject.time) <= maxTimeMs) {
          currentShape.objects.push(currentObject)
          currentShape.bpms.push(bpm)
        } else {
          addShapeToList(shapes, currentShape)
          currentShape = { objects: [currentObject], bpms: [bpm] }
        }
      }

      let difficulty = calculateJumpDifficulty(currentObject, lastObject, beatmap.cs)
      aimDifficulty.push({ time: currentObject.time, difficulty: difficulty })
    } else {
      addShapeToList(shapes, currentShape)
    }
  }

  const shapeDifficulty: Difficulty[] = calculateStreamDifficulty(shapes)
  let totalDifficulty = shapeDifficulty.concat(aimDifficulty).sort((a,b) => a.time - b.time)

  const output: Window = { startTime: 0, endTime: windowSize*1000 }
  if (totalDifficulty.length < 2) {
    return output
  }

  // decrease weight on breaks
  let lastObject = totalDifficulty[0];
  const emptyToFill = []
  const breakTime = 3000
  for (let i = 1; i < totalDifficulty.length; i++) {
    const currentObject = totalDifficulty[i];
    if (currentObject.time - lastObject.time > breakTime) {
      emptyToFill.push({ first: lastObject, second: currentObject })
    }
    lastObject = currentObject
  }

  const gap = 100;
  for (let i = 0; i < emptyToFill.length; i++) {
    const first = emptyToFill[i].first;
    const second = emptyToFill[i].second;
    const total = Math.floor((second.time - first.time) / gap)
    for (let i = 0; i < total; i++) {
      totalDifficulty.push({ time: first.time + i*gap, difficulty: -100 })
    }
  }

  totalDifficulty = totalDifficulty.sort((a,b) => a.time - b.time)

  let window = smoothWindow(totalDifficulty)
  const smoothNumber = 3
  for (let i = 0; i < smoothNumber; i++) {
    window = smoothWindow(window)
  }

  // const data = { x: [], y: [] }
  // for (let i = 0; i < window.length; i++) {
  //   data.x.push(window[i].time)
  //   data.y.push(window[i].difficulty)
  // }

  // fs.writeFile("yep.json", JSON.stringify(data), (err) => {})

  if ((window[window.length-1].time - window[0].time) < (windowSize*1000)) {
    output.startTime = window[0].time
  } else {
    let maxAverage = 0
    for (const item of window) {
      if ((item.difficulty > maxAverage)) {
        maxAverage = item.difficulty
        output.startTime = item.time
      }
    }

    if (output.startTime > (window[window.length-1].time - windowSize*1000)) {
      output.startTime = window[window.length-1].time - windowSize*1000
    }

    output.endTime = output.startTime + windowSize*1000

    for (const shape of shapes) {
      if (shape.objects[0].time <= output.startTime && shape.objects[shape.objects.length-1].time >= output.startTime) {
        output.startTime = shape.objects[0].time
      }

      if (shape.objects[0].time <= output.endTime && shape.objects[shape.objects.length-1].time >= output.endTime) {
        output.endTime = shape.objects[shape.objects.length-1].time
      }
    }

  }

  return output;
}

const smoothWindow = (difficultyArr: Difficulty[]): Difficulty[] => {
  const smoothedData: Difficulty[] = []
  const smoothWindowSize = Math.floor((((106-36) / (2134 - 235)) * (difficultyArr.length - 2134)) + 106)
  for (let i = 0; i < difficultyArr.length; i++) {
    let upperBound = i + smoothWindowSize
    if (upperBound > difficultyArr.length-1) {
      upperBound = difficultyArr.length-1
    }

    let lowerBound = i - smoothWindowSize
    if (lowerBound < 0) {
      lowerBound = 0
    }

    // need to not punish sections for being placed after a break
    if (difficultyArr[i].difficulty != -100) {
      let newLowerBound = lowerBound
      for (let j = lowerBound; j <= i; j++) {
        if (difficultyArr[j].difficulty == -100) {
          newLowerBound = j+1;
        }
      }
      lowerBound = newLowerBound
    }

    let sum = 0
    for (let j = lowerBound; j <= upperBound; j++) {
      sum += difficultyArr[j].difficulty
    }

    const average = sum / (upperBound - lowerBound + 1)
    smoothedData.push({time: difficultyArr[i].time, difficulty: average})
  }

  return smoothedData
}

const isCircle = (obj: HitObject): boolean => {
  return (obj.type & (1 << 0)) != 0;
}

const isSlider = (obj: HitObject): boolean => {
  return (obj.type & (1 << 1)) != 0;
}

const calculateStreamDifficulty = (streams: Shape[]) => {
  const diffs = []

  for (const shape of streams) {
    let localDiff = 0
    let pxTotal = 0
    let bpmTotal = 0
    let timeTotal = 0
    let lastHit = shape.objects[0]
    let localAvgPx = 0
    let localAvgBpm = 0
    let localAvgTime = 0

    for (const bpm of shape.bpms) {
      bpmTotal += bpm
    }
    localAvgBpm = bpmTotal / shape.bpms.length

    for (const hit of shape.objects) {
      let distX = hit.x - lastHit.x
      let distY = hit.y - lastHit.y
      timeTotal += hit.time
      pxTotal += Math.sqrt(distX**2 + distY**2)
      lastHit = hit
    }
    localAvgPx = pxTotal / shape.objects.length
    localAvgTime = timeTotal / shape.objects.length

    localDiff = (shape.objects.length ** 0.8) * (localAvgBpm ** 3.4) / 1000000000 * (localAvgPx + 1)
    diffs.push({ time: localAvgTime, difficulty: localDiff*20 })
  }

  return diffs
}

const calculateJumpDifficulty = (current: HitObject, last: HitObject, cs: number) => {
  let csPx = 109 - 9 * cs
  let difficulty = 0;
  const distX = current.x - last.x;
  const distY = current.y - last.y;
  const dist = Math.sqrt(distX ** 2 + distY ** 2) - (csPx / 2);
  const time = current.time - last.time;

  const speedDiff = (10* dist / time) ** 2
  const distDiff = speedDiff * 0.4 * dist / (maxDist - csPx / 2 + 1)
  difficulty = speedDiff + distDiff;

  return difficulty * 0.1
}

const convertTimingBpm = (timingPoints) => {
	const bpmList = []
	timingPoints.forEach(point => {
		if (point.inherited) {
			bpmList.push({bpm: Math.round(60000 / point.bpm), time: point.offset})
		}
	})
	return bpmList
}


