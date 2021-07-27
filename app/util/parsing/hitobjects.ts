import { Beatmap, HitObject } from "../../../models/cache";
import * as fs from "graceful-fs";
import { promisify } from "util";
import * as log from 'electron-log'
import { externalStorage } from '../load'

const readFile = promisify(fs.readFile);

export const readBeatmap = async (beatmap: Beatmap, osuPath: string): Promise<Beatmap> => {

  const songsPath = externalStorage??(osuPath + "/Songs/")
  const path = songsPath + beatmap.folderName + "/" + beatmap.fileName

  try {
    await fs.promises.stat(path)
    const buffer = await readFile(path);
    const lines = buffer.toString("utf8").split(/\r?\n/);

    const objects: HitObject[] = [];
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
    const copy = JSON.parse(JSON.stringify(beatmap))
    copy.hitObjects = objects

    return copy;
  } catch {
    log.warn("Could not load hitobjects of " + beatmap.setId + " " + beatmap.artist + " - " + beatmap.song + " [" + beatmap.difficulty + "]");
    beatmap.hitObjects = []
    return beatmap;
  }
};


