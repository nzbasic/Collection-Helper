import { Beatmap, HitObject } from "../../../models/cache";
import * as fs from "graceful-fs";
import { promisify } from "util";
import * as log from 'electron-log'

const readFile = promisify(fs.readFile);

export const readBeatmap = async (beatmap: Beatmap, osuPath: string): Promise<Beatmap> => {

  const path = osuPath + "/Songs/" + beatmap.folderName + "/" + beatmap.fileName

  try {
    await fs.promises.stat(path)
    let buffer = await readFile(path);
    let lines = buffer.toString("utf8").split(/\r?\n/);

    let objects: HitObject[] = [];
    let flag = false;

    lines.forEach((line) => {
      if (flag && line != "") {
        const contents = line.split(",");
        if (contents.length < 4) {
          return;
        }

        const x = parseInt(contents[0]);
        const y = parseInt(contents[1]);
        const time = parseInt(contents[2]);
        const type = parseInt(contents[3]);
        objects.push({ x: x, y: y, time: time, type: type });
      }

      if (line == "[HitObjects]") {
        flag = true;
      }
    });

    // dont want to write hitobjects to the cache
    let copy = JSON.parse(JSON.stringify(beatmap))
    copy.hitObjects = objects

    return copy;
  } catch {
    log.warn("Could not load hitobjects of " + beatmap.setId + " " + beatmap.artist + " - " + beatmap.song + " [" + beatmap.difficulty + "]");
    beatmap.hitObjects = []
    return beatmap;
  }
};


