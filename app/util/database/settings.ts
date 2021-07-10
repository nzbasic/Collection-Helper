import { getDb } from "../database/database";
import * as fs from 'fs'

export const getOsuPath = async (): Promise<string> => {
  const database = await getDb();
  const row = await database.get("SELECT * FROM osupath");
  return row?.path??""
};

export const setOsuPath = async (path: string): Promise<void> => {
  const database = await getDb();
  await database.run("INSERT INTO osupath (path) VALUES (:path)", {
    ":path": path,
  });
};

export const verifyOsuPath = async (path: string): Promise<boolean> => {
  if (fs.existsSync(path + "/osu!.db")) {
    await setOsuPath(path)
    return true
  } else {
    return false
  }
}
