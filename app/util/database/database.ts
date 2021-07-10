import { Database as Sqlite3, Statement } from "sqlite3";
import { open, Database } from "sqlite";
import * as path from 'path'
import { serve } from '../../main'
import * as fs from 'fs'

let database: Database<Sqlite3, Statement>;

export const getDb = async (): Promise<Database<Sqlite3, Statement>> => {

  let pathToDbFile: string
  if (serve) {
    pathToDbFile = "database.db"
  } else {
    pathToDbFile = path.join(process.resourcesPath, 'prod-files', 'database.db');
  }

  if (!database) {
    let db = await open({ filename: pathToDbFile, driver: Sqlite3 });

    database = db;
    database.run("CREATE TABLE IF NOT EXISTS osupath (path TEXT PRIMARY KEY)");
    database.run("CREATE TABLE IF NOT EXISTS filters (name TEXT PRIMARY KEY, filter TEXT, description TEXT, gethitobjects INTEGER, iscached INTEGER, cache BLOB)");
  }
  return database;
};

export default database;
