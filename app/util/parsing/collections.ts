import { Collections, Collection } from "../../../models/collection";
import { OsuReader, OsuWriter } from "osu-buffer";
import * as fs from "fs";
import { getOsuPath } from "../database/settings";
import { readNameUtf8, writeNameUtf8 } from "./utf8";
import { stringToUtf8ByteArray } from 'utf8-string-bytes'
import * as log from 'electron-log'

export let collections: Collections;

/**
 * Reads a binary collections file to memory
 * @param path Path to collection.db file
 */
export const readCollections = async (path: string) => {
  const buffer = await fs.promises.readFile(path + "\\collection.db");
  const reader = new OsuReader(buffer.buffer);

  collections = {
    version: reader.readInt32(),
    numberCollections: reader.readInt32(),
    collections: [],
  };

  for (let colIdx = 0; colIdx < collections.numberCollections; colIdx++) {
    const collection: Collection = {
      name: readNameUtf8(reader),
      numberMaps: reader.readInt32(),
      hashes: [],
    }

    for (let mapIdx = 0; mapIdx < collection.numberMaps; mapIdx++) {
      collection.hashes.push(reader.readString());
    }

    collections.collections.push(collection);
  }
};

/**
 * Writes the current collections to disk
 */
export const writeCollections = async (initialBackup?: boolean, newBackup?: boolean) => {

  const osuPath = await getOsuPath()
  let writer: OsuWriter;

  try {
    const length = calculateLength();
    const arrayBuffer = new ArrayBuffer(length);
    writer = new OsuWriter(arrayBuffer);

    writer.writeInt32(collections.version);
    writer.writeInt32(collections.numberCollections);

    collections.collections.forEach((collection) => {
      writeNameUtf8(writer, collection.name);
      writer.writeInt32(collection.numberMaps);

      collection.hashes.forEach((hash) => {
        writer.writeString(hash);
      });
    });

  } catch(err) {
    log.error(err)
  }

  const buffer = Buffer.from(writer.buff);

  let path = ""
  if (initialBackup) {
    path = osuPath + "/collectionBackup.db"
    try {
      await fs.promises.stat(path)
    } catch {
      await fs.promises.writeFile(path, buffer);
    }
  } else if (newBackup) {
    const dateTime = new Date().toISOString().replace(/:/g, '-')
    await fs.promises.writeFile(osuPath + "/collection" + dateTime + ".db", buffer)
    return dateTime
  } else {
    path = osuPath + "/collection.db"
    await fs.promises.writeFile(path, buffer);
  }
};

/**
 * Calculates the length of the given collections in bytes for use in a buffer
 * @param collections Collections to calculate
 * @returns Byte length
 */
const calculateLength = (): number => {
  // starts at 8 for version + numberCollections
  let count = 8;

  collections.collections.forEach((collection) => {
    // 1 byte for empty name, length+2 for anything else
    if (collection.name == "") {
      count += 1;
    } else {
      count += stringToUtf8ByteArray(collection.name).length + 2;
    }

    // 4 bytes for numberMaps
    count += 4;

    // 34 bytes for each hash
    count += 34 * collection.numberMaps;
  });

  return count;
};

