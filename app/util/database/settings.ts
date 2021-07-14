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

const changeOsuPath = async (path: string): Promise<void> => {
  const database = await getDb();
  await database.run("UPDATE osupath SET path = :path", {
    ":path": path,
  });
}

export const verifyOsuPath = async (path: string, mode: string): Promise<boolean> => {
  if (fs.existsSync(path + "/osu!.db")) {
    if (mode == "new") {
      await setOsuPath(path)
    } else if (mode == "edit") {
      await changeOsuPath(path)
    }
    return true
  } else {
    return false
  }
}
