import { Collection } from "../../models/collection";
import { beatmapMap } from "./parsing/cache";
import { getOsuPath } from "./database/settings";
import { readBeatmap } from "./parsing/hitobjects";
import { Beatmap, HitObject } from "../../models/cache";
import * as fs from 'fs'
import { externalStorage } from "./load";

export const generatePracticeDiffs = async (collection: Collection, prefLength: number) => {

  const osuPath = await getOsuPath();

  for (const hash of collection.hashes) {
    const beatmap = beatmapMap.get(hash)
    if (beatmap) {
      const window = await calculateDifficultyWindow(beatmapMap.get(hash), prefLength, osuPath);
      //console.log(window)
      const newDiffName = beatmap.difficulty + " spike window " + prefLength + "s"

      const songsPath = externalStorage ? (externalStorage + "/") : (osuPath + "/Songs/")
      const path = songsPath + beatmap.folderName + "/" + beatmap.fileName
      const regex = new RegExp("\\[" + beatmap.difficulty + "\\].osu$", 'gi')
      const newPath = path.replace(regex, "[" + newDiffName + "]") + ".osu"
      const contents = await practiceFileConstructor(path, beatmap, window, newDiffName)
      //fs.writeFile(newPath, contents, (err) => { if (err) return console.log(err) })
    }
  }
}

const practiceFileConstructor = async (path: string, beatmap: Beatmap, window: Window, diffName: string): Promise<string> => {
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
        output += line + "\n"
      }
    } else {

      if (line.startsWith("Version")) {
        output += "Version:" + diffName + "\n"
      } else {
        output += line + "\n"
      }
    }

    if (line == "[HitObjects]") {
      flag = true;
    }
  });

  return output
}

const maxDist = Math.sqrt(512**2 + 384**2)

interface Shape {
  objects: HitObject[],
  bpms: number[],
}

interface Window {
  startTime: number,
  endTime: number,
  allItems: {
    difficulty: number,
    time: number
  }[]
}

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

  const aimDifficulty = [];
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

  const shapeDifficulty = calculateStreamDifficulty(shapes)
  const totalDifficulty = shapeDifficulty.concat(aimDifficulty).sort((a,b) => a.time - b.time)

  const list = { x: [], y: [] }

  let window: Window = { startTime: 0, endTime: 0, allItems: [] }
  let maxAverage = 0;
  let maxWindow = window
  for (const item of totalDifficulty) {

    if (window.allItems.length == 0) {
      window.allItems.push(item)
      window.startTime = item.time
      window.endTime = item.time
      continue
    }

    if (window.endTime - window.startTime == (windowSize*1000)) {
      let total = 0
      for (const item of window.allItems) {
        total += item.difficulty
      }
      const average = total / window.allItems.length

      list.x.push(window.startTime)
      list.y.push(average)

      if (average > maxAverage) {
        maxAverage = average
        maxWindow = JSON.parse(JSON.stringify(window))
      }
    }

    window.allItems.push(item)
    window.endTime = item.time

    if ((window.endTime - window.startTime) > (windowSize * 1000)) {
      window.startTime = window.endTime - (windowSize * 1000)

      let shiftCount = 0
      for (const item of window.allItems) {
        if (item.time < window.startTime) {
          shiftCount++;
        } else {
          break
        }
      }

      for (let i = 0; i < shiftCount; i++) {
        window.allItems.shift()
      }

    }
  }

  // const windowWindowList = { x: [], y: [] }
  // const windowWindow = { startTime: 0, endTime: 0, allItems: [] };
  // let maxWindowAverage = 0
  // let maxWindowWindow = windowWindow
  // for (let i = 0; i < list.x.length; i++) {
  //   if (windowWindow.allItems.length == 0) {
  //     windowWindow.allItems.push({ time: list.x[i], average: list.y[i] })
  //     continue;
  //   }

  //   if (windowWindow.endTime - windowWindow.startTime == (windowSize*1000)) {
  //     let total = 0
  //     for (const item of windowWindow.allItems) {
  //       total += item.average
  //     }
  //     const average = total / windowWindow.allItems.length

  //     windowWindowList.x.push(windowWindow.startTime)
  //     windowWindowList.y.push(average)

  //     if (average > maxWindowAverage) {
  //       maxWindowAverage = average
  //       maxWindowWindow = JSON.parse(JSON.stringify(windowWindow))
  //     }
  //   }

  //   windowWindow.allItems.push({ time: list.x[i], average: list.y[i] })
  //   windowWindow.endTime = list.x[i]

  //   if ((windowWindow.endTime - windowWindow.startTime) > (windowSize*1000)) {
  //     windowWindow.startTime = windowWindow.endTime - (windowSize*1000)

  //     let shiftCount = 0
  //     for (const item of windowWindow.allItems) {
  //       if (item.time < windowWindow.startTime) {
  //         shiftCount++;
  //       } else {
  //         break
  //       }
  //     }

  //     for (let i = 0; i < shiftCount; i++) {
  //       windowWindow.allItems.shift()
  //     }
  //   }
  // }

  const smoothedData = { x: [], y: [] }
  const smoothWindowSize = Math.ceil(list.x.length * 0.05);
  for (let i = 0; i < list.x.length; i++) {
    let lowerBound = i
    let upperBound = i + smoothWindowSize
    if (upperBound > list.x.length-1) {
      upperBound = list.x.length-1
    }

    let sum = 0
    for (let j = lowerBound; j <= upperBound; j++) {
      sum += list.y[j]
    }
    const average = sum / smoothWindowSize
    smoothedData.x.push(list.x[i] + (windowSize*1000))
    smoothedData.y.push(average)
  }

  fs.writeFile("list.json", JSON.stringify(list), () => {})
  fs.writeFile("list2.json", JSON.stringify(smoothedData), () => {})

  for (const shape of shapes) {
    if ((shape.objects[0].time < maxWindow.startTime) && (shape.objects[shape.objects.length-1].time > maxWindow.startTime)) {
      maxWindow.startTime = shape.objects[0].time
    } else if ((shape.objects[0].time < maxWindow.endTime) && (shape.objects[shape.objects.length-1].time > maxWindow.endTime)) {
      maxWindow.endTime = shape.objects[shape.objects.length-1].time
    }
  }

  return maxWindow;
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


