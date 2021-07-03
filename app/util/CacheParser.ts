import { Beatmap, IntDoublePair, TimingPoint } from '../../models/cache'
import { OsuReader, OsuWriter } from 'osu-buffer'
import * as fs from 'fs'

/**
 * Read osu!.db
 */
export class CacheParser {

  private progress: number = 0

  /**
   * Reads a binary osu!.db file to memory
   * @param path Path to osu!.db file
   * @returns Beatmaps
   */
  public read(path: string): Beatmap[] {

    const buffer = fs.readFileSync(path)
    const reader = new OsuReader(buffer.buffer)
    let output: Beatmap[] = []

    reader.readInt32() // version number
    reader.readInt32() // folder count
    reader.readBoolean() // account unlocked
    reader.readDateTime() // date unlocked
    reader.readString() // name

    const numberBeatmaps = reader.readInt32()
    for (let i = 0; i < numberBeatmaps; i++) {

      const beatmap: Beatmap = {
        artist: reader.readString(),
        artistUnicode: reader.readString(),
        song: reader.readString(),
        songUnicode: reader.readString(),
        creator: reader.readString(),
        difficulty: reader.readString(),
        audioFile: reader.readString(),
        md5: reader.readString(),
        fileName: reader.readString(),
        status: reader.readBytes(1)[0],
        circleNumber: reader.readUint16(),
        sliderNumber: reader.readUint16(),
        spinnerNumber: reader.readUint16(),
        modified: reader.readUint64(),
        ar: reader.readFloat(),
        cs: reader.readFloat(),
        hp: reader.readFloat(),
        od: reader.readFloat(),
        sliderVelocity: reader.readDouble(),
        standardDiffs: this.readIntDoublePairs(reader),
        taikoDiffs: this.readIntDoublePairs(reader),
        catchDiffs: this.readIntDoublePairs(reader),
        maniaDiffs: this.readIntDoublePairs(reader),
        drain: reader.readInt32(),
        time: reader.readInt32(),
        previewTime: reader.readInt32(),
        timingPoints: this.readTimingPoints(reader),
        id: reader.readInt32(),
        setId: reader.readInt32(),
        threadId: reader.readInt32(),
        standardRank: reader.readBytes(1)[0],
        taikoRank: reader.readBytes(1)[0],
        catchRank: reader.readBytes(1)[0],
        maniaRank: reader.readBytes(1)[0],
        localOffset: reader.readUint16(),
        stackLeniency: reader.readFloat(),
        mode: reader.readBytes(1)[0],
        songSource: reader.readString(),
        songTags: reader.readString(),
        onlineOffset: reader.readUint16(),
        font: reader.readString(),
        unplayed: reader.readBoolean(),
        timeLastPlayed: reader.readUint64(),
        osz2: reader.readBoolean(),
        folderName: reader.readString(),
        timeChecked: reader.readUint64(),
        ignoreSound: reader.readBoolean(),
        ignoreSkin: reader.readBoolean(),
        disableStory: reader.readBoolean(),
        disableVideo: reader.readBoolean(),
        visualOverride: reader.readBoolean(),
        lastModified: reader.readInt32(),
        scrollSpeed: reader.readBytes(1)[0]
      }

      beatmap.sr = this.parseSr(beatmap)
      beatmap.bpm = this.parseBpm(beatmap)

      // dont need all of those
      delete beatmap.artistUnicode
      delete beatmap.audioFile
      delete beatmap.catchDiffs
      delete beatmap.catchRank
      delete beatmap.disableStory
      delete beatmap.disableVideo
      delete beatmap.font
      delete beatmap.ignoreSkin
      delete beatmap.ignoreSound
      delete beatmap.lastModified
      delete beatmap.localOffset
      delete beatmap.maniaDiffs
      delete beatmap.maniaRank
      delete beatmap.modified
      delete beatmap.onlineOffset
      delete beatmap.osz2
      delete beatmap.previewTime
      delete beatmap.scrollSpeed
      delete beatmap.sliderVelocity
      delete beatmap.songSource
      delete beatmap.songUnicode
      delete beatmap.stackLeniency
      delete beatmap.standardDiffs
      delete beatmap.standardRank
      delete beatmap.taikoDiffs
      delete beatmap.taikoRank
      delete beatmap.threadId
      delete beatmap.time
      delete beatmap.timeChecked
      delete beatmap.timeLastPlayed
      delete beatmap.visualOverride

      output.push(beatmap)

    }

    return output

  }

  public getProgress(): number {
    return this.progress
  }

  private readTimingPoints(reader: OsuReader): TimingPoint[] {

    let output: TimingPoint[] = []
    const number = reader.readInt32()

    for (let i = 0; i < number; i++) {
      const timingPoint: TimingPoint = {
        bpm: reader.readDouble(),
        offset: reader.readDouble(),
        inherited: reader.readBoolean()
      }
      output.push(timingPoint)
    }

    return output
  }

  private readIntDoublePairs(reader: OsuReader): IntDoublePair[] {

    let output: IntDoublePair[] = []
    const number = reader.readInt32()

    for (let i = 0; i < number; i++) {
      reader.readBytes(1)[0] // random bytes between the values
      const int = reader.readInt32()
      reader.readBytes(1)[0] // random bytes between the values
      const double = reader.readDouble()
      const pair: IntDoublePair = { mods: int, stars: double }
      output.push(pair)
    }

    return output
  }

  private parseSr(beatmap: Beatmap): number {
    let output: number
    if (beatmap.mode == 0x00) {
      output = beatmap.standardDiffs[0].stars
    } else if (beatmap.mode == 0x01) {
      output = beatmap.taikoDiffs[0].stars
    } else if (beatmap.mode == 0x02) {
      output = beatmap.catchDiffs[0].stars
    } else if (beatmap.mode == 0x03) {
      output = beatmap.maniaDiffs[0].stars
    }
    return output
  }

  private parseBpm(beatmap: Beatmap): number {

    let timingMap = new Map<number, number>()
    let lastTimingPoint: TimingPoint
    let firstFlag = false

    if (!beatmap.timingPoints.filter(point => point.inherited).length) return 0

    beatmap.timingPoints.forEach((point, index) => {
      if (point.inherited) {
        if (!firstFlag) {
          firstFlag = true
          lastTimingPoint = point
        } else {
          timingMap[lastTimingPoint.bpm] = timingMap[lastTimingPoint.bpm] + point.offset - lastTimingPoint.offset
        }
        lastTimingPoint = point
      }

      if (index == beatmap.timingPoints.length-1) {
        timingMap[lastTimingPoint.bpm] = timingMap[lastTimingPoint.bpm] + beatmap.time - lastTimingPoint.offset
      }

    })

    let maxCount = 0
    let mostCommonBpm = 0
    timingMap.forEach((count, bpm) => {
      if (count > maxCount) {
        maxCount = count
        mostCommonBpm = bpm
      }
    })

    return Math.ceil(60000/mostCommonBpm)

  }

}
