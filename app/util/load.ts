import { readCollections, writeCollections } from "./parsing/collections";
import { getOsuPath } from "./database/settings";
import { readCache } from "./parsing/cache";
import * as username from 'username'
import * as fs from 'fs'
import * as log from 'electron-log'
import { exportIds } from './snipetool'

export let externalStorage: string

export const loadFiles = async () => {
  const path = await getOsuPath();
  externalStorage = await findExternalBeatmapStorage(path)
  await readCollections(path);
  await writeCollections(true);
  await readCache(path);

  //await exportIds()
};

const findExternalBeatmapStorage = async (path: string): Promise<string> => {
  const user = await username()

  if (user) {
    try {
      const file = await fs.promises.readFile(path + "/osu!." + user + ".cfg")
      const lines = file.toString("utf8").split(/\r?\n/);

      for (const line of lines) {
        if (line.startsWith("BeatmapDirectory")) {
          const index = line.indexOf("=");
          const value = line.substring(index + 1).trim()

          if (value.toLowerCase() != "songs") {
            return value;
          }
        }
      }
    } catch(err) {
      log.error(err)
    }
  }

  return undefined
}
