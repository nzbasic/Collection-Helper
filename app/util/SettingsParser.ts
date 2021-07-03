import { Collections, Collection } from '../../models/collection'
import { OsuReader, OsuWriter } from 'osu-buffer'
import * as fs from 'fs'

/**
 * Read and write collection files
 */
export class SettingsParser {

  /**
   * Reads a binary collections file to memory
   * @param path Path to collection.db file
   * @returns Collections
   */
  public read(path: string): Collections {

    const buffer = fs.readFileSync(path)
    const reader = new OsuReader(buffer.buffer)

    const output: Collections = {
      version: reader.readInt32(),
      numberCollections: reader.readInt32(),
      collections: []
    }

    for (let colIdx = 0; colIdx < output.numberCollections; colIdx++) {
      const collection: Collection = {
        name: reader.readString(),
        numberMaps: reader.readInt32(),
        hashes: []
      }

      for (let mapIdx = 0; mapIdx < collection.numberMaps; mapIdx++) {
        collection.hashes.push(reader.readString())
      }

      output.collections.push(collection)

    }

    return output

  }

  /**
   * Writes the given collections to disk
   * @param collections Collections to write
   */
  public write(collections: Collections, path: string): void {

    const length = this.calculateLength(collections)
    const arrayBuffer = new ArrayBuffer(length)
    const writer = new OsuWriter(arrayBuffer)

    writer.writeInt32(collections.version)
    writer.writeInt32(collections.numberCollections)

    collections.collections.forEach((collection) => {
      writer.writeString(collection.name)
      writer.writeInt32(collection.numberMaps)

      collection.hashes.forEach((hash) => {
        writer.writeString(hash)
      })
    })

    const buffer = Buffer.from(writer.buff)
    fs.writeFileSync(path, buffer)

  }

  /**
   * Calculates the length of the given collections in bytes for use in a buffer
   * @param collections Collections to calculate
   * @returns Byte length
   */
  private calculateLength(collections: Collections): number {

    // starts at 8 for version + numberCollections
    let count = 8

    collections.collections.forEach(collection => {

      // 1 byte for empty name, length+2 for anything else
      if (collection.name == "") {
        count += 1
      } else {
        count += collection.name.length + 2
      }

      // 4 bytes for numberMaps
      count += 4

      // 34 bytes for each hash
      count += 34 * collection.numberMaps

    })

    return count

  }

}
