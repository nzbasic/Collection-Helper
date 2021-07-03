import { OsuReader } from "osu-buffer"
import { Beatmap, IntDoublePair, TimingPoint } from "../../models/cache"

/**
 * Beatmap parsing tools
 */
export class BeatmapParserUtil {

  /**
   * Read beatmap timing points
   */
  public static readTimingPoints(reader: OsuReader): TimingPoint[] {

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

  /**
   * Read beatmap difficulties
   */
   public static readIntDoublePairs(reader: OsuReader): IntDoublePair[] {

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

  /**
   * Calculate beatmap sr
   */
   public static parseSr(beatmap: Beatmap): number {
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

  /**
   * Calculate beatmap most common bpm
   */
   public static parseBpm(beatmap: Beatmap): number {

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

  /**
   * Delete beatmap un-needed fields
   */
  public static deleteFields(beatmap: Beatmap): Beatmap {

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

    return beatmap

  }

}
