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

export const setDarkMode = async (mode: boolean) => {
  const database = await getDb();

  const rows = await database.get("SELECT * FROM darkmode")
  if (!rows) {
    await database.run("INSERT INTO darkmode (mode) VALUES (?)", [mode])
  } else {
    await database.run("UPDATE darkmode SET mode = ?", [mode])
  }
}

export const getDarkMode = async () => {
  const database = await getDb();
  const row = await database.get("SELECT * FROM darkmode");
  return row?.mode??false
}

export const getLanguage = async () => {
  const database = await getDb();
  const row = await database.get("SELECT * FROM language");
  return row?.code??'en'
}

export const setLanguage = async (code: string) => {
  const database = await getDb();
  const rows = await database.get("SELECT * FROM language")
  if (!rows) {
    await database.run("INSERT INTO language (code) VALUES (?)", [code])
  } else {
    await database.run("UPDATE language SET code = ?", [code])
  }
}
