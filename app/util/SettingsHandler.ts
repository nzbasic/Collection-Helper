import { OsuReader, OsuWriter } from 'osu-buffer'
import * as fs from 'fs'
import { Settings } from '../../models/settings'

/**
 * Read and write settings files
 */
export class SettingsHandler {



  /**
   * Reads a binary settings file to memory
   * @param path Path to collection.db file
   * @returns Collections
   */
  public read(path: string): Settings {

    const buffer = fs.readFileSync(path)
    const reader = new OsuReader(buffer.buffer)

    const settings: Settings = {
      osuPath: reader.readString()
    }

    return settings

  }

  /**
   * Writes the given collections to disk
   * @param collections Collections to write
   */
  public write(settings: Settings): void {

    const length = this.calculateLength(settings)
    const arrayBuffer = new ArrayBuffer(length)
    const writer = new OsuWriter(arrayBuffer)

    writer.writeString(settings.osuPath)

    const buffer = Buffer.from(writer.buff)
    fs.writeFileSync("./settings.db", buffer)

  }

  /**
   * Calculates the length of the given settings in bytes for use in a buffer
   * @param settings Settings to calculate
   * @returns Byte length
   */
  private calculateLength(settings: Settings): number {

    let count = 0

    // 1 byte for empty name, length+2 for anything else
    if (settings.osuPath == "") {
      count += 1
    } else {
      count += settings.osuPath.length + 2
    }

    return count

  }

}
