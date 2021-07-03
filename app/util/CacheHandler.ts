import { Beatmap, IntDoublePair, TimingPoint } from '../../models/cache'
import { OsuReader, OsuWriter } from 'osu-buffer'
import * as fs from 'fs'
import { BeatmapParserUtil } from './BeatmapParserUtil'

/**
 * Interact with osu! cache
 */
export class CacheHandler {

  private beatmaps: Beatmap[] = []

  /**
   * Reads a binary osu!.db file to memory
   * @param path Path to osu!.db file
   * @returns Beatmaps
   */
  public read(path: string): void {

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

      let beatmap: Beatmap = {
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
        standardDiffs: BeatmapParserUtil.readIntDoublePairs(reader),
        taikoDiffs: BeatmapParserUtil.readIntDoublePairs(reader),
        catchDiffs: BeatmapParserUtil.readIntDoublePairs(reader),
        maniaDiffs: BeatmapParserUtil.readIntDoublePairs(reader),
        drain: reader.readInt32(),
        time: reader.readInt32(),
        previewTime: reader.readInt32(),
        timingPoints: BeatmapParserUtil.readTimingPoints(reader),
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

      beatmap.sr = BeatmapParserUtil.parseSr(beatmap)
      beatmap.bpm = BeatmapParserUtil.parseBpm(beatmap)
      beatmap = BeatmapParserUtil.deleteFields(beatmap)

      output.push(beatmap)
    }

    this.beatmaps = output
  }

  public getBeatmaps(): Beatmap[] {
    return this.beatmaps
  }

}
