import { Beatmap, IntDoublePair, TimingPoint } from "../../../models/cache";
import { OsuReader } from "osu-buffer";
import * as fs from "fs";
import { getMissingMaps, removeMissingMaps } from "../database/collection";

export let beatmapMap: Map<string, Beatmap>
export let setIds: Set<number>
/**
 * Reads a binary osu!.db file to memory
 * @param path Path to osu!.db file
 * @returns Beatmaps
 */
export const readCache = async (path: string) => {
  const buffer = await fs.promises.readFile(path + "\\osu!.db");
  const reader = new OsuReader(buffer.buffer);
  let output = new Map<string, Beatmap>()
  setIds = new Set<number>()

  reader.readInt32(); // version number
  reader.readInt32(); // folder count
  reader.readBoolean(); // account unlocked
  reader.readDateTime(); // date unlocked
  reader.readString(); // name

  const numberBeatmaps = reader.readInt32();
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
      standardDiffs: readIntDoublePairs(reader),
      taikoDiffs: readIntDoublePairs(reader),
      catchDiffs: readIntDoublePairs(reader),
      maniaDiffs: readIntDoublePairs(reader),
      drain: reader.readInt32(),
      time: reader.readInt32(),
      previewTime: reader.readInt32(),
      timingPoints: readTimingPoints(reader),
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
      scrollSpeed: reader.readBytes(1)[0],
    };

    beatmap.sr = parseSr(beatmap);
    beatmap.bpm = parseBpm(beatmap);
    beatmap = deleteFields(beatmap);

    beatmap.ogAr = beatmap.ar
    beatmap.ogCs = beatmap.cs
    beatmap.ogHp = beatmap.hp
    beatmap.ogOd = beatmap.od
    beatmap.ogBpm = beatmap.bpm
    beatmap.ogDrain = beatmap.drain

    setIds.add(beatmap.setId)

    output.set(beatmap.md5, beatmap);
  }

  reader.readInt32(); // permissions

  await removeMissingMaps(setIds)
  let missingMaps = await getMissingMaps()
  missingMaps.forEach(item => {
    let beatmap: Beatmap = { setId: item.setId, md5: item.md5, missing: true }
    output.set(item.md5, beatmap)
    console.log("setting missing map " + beatmap.md5)
  })

  beatmapMap = output;
};

/**
 * Read beatmap timing points
 */
const readTimingPoints = (reader: OsuReader): TimingPoint[] => {
  let output: TimingPoint[] = [];
  const number = reader.readInt32();

  for (let i = 0; i < number; i++) {
    const timingPoint: TimingPoint = {
      bpm: reader.readDouble(),
      offset: reader.readDouble(),
      inherited: reader.readBoolean(),
    };
    output.push(timingPoint);
  }

  return output;
};

/**
 * Read beatmap difficulties
 */
const readIntDoublePairs = (reader: OsuReader): IntDoublePair[] => {
  let output: IntDoublePair[] = [];
  const number = reader.readInt32();

  for (let i = 0; i < number; i++) {
    reader.readBytes(1)[0]; // random bytes between the values
    const int = reader.readInt32();
    reader.readBytes(1)[0]; // random bytes between the values
    const double = reader.readDouble();
    const pair: IntDoublePair = { mods: int, stars: double };
    output.push(pair);
  }

  return output;
};

/**
 * Calculate beatmap sr
 */
const parseSr = (beatmap: Beatmap): number => {
  let output: number;

  // cannot assume difficulty calculation has happened on every map, so use ??0
  if (beatmap.mode == 0x00) {
    output = beatmap.standardDiffs[0]?.stars??0;
  } else if (beatmap.mode == 0x01) {
    output = beatmap.taikoDiffs[0]?.stars??0;
  } else if (beatmap.mode == 0x02) {
    output = beatmap.catchDiffs[0]?.stars??0;
  } else if (beatmap.mode == 0x03) {
    output = beatmap.maniaDiffs[0]?.stars??0;
  }
  return output;
};

/**
 * Calculate beatmap most common bpm
 */
const parseBpm = (beatmap: Beatmap): number => {
  let timingMap = new Map<number, number>();
  let lastTimingPoint: TimingPoint;
  let firstFlag = false;

  if (!beatmap.timingPoints.filter((point) => point.inherited).length) return 0;

  beatmap.timingPoints.forEach((point, index) => {
    if (point.inherited) {
      if (!firstFlag) {
        firstFlag = true;
        lastTimingPoint = point;
      } else {
        timingMap.set(lastTimingPoint.bpm, timingMap.get(lastTimingPoint.bpm)??0 + point.offset - lastTimingPoint.offset)
      }
      lastTimingPoint = point;
    }

    if (index == beatmap.timingPoints.length - 1) {
      timingMap.set(lastTimingPoint.bpm, timingMap.get(lastTimingPoint.bpm)??0 + beatmap.time - lastTimingPoint.offset)
    }
  });

  let maxCount = 0;
  let mostCommonBpm = 0;
  timingMap.forEach((count, bpm) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonBpm = bpm;
    }
  });

  if (mostCommonBpm == 0) {
    return 0
  }

  return Math.ceil(60000 / mostCommonBpm);
};

/**
 * Delete beatmap un-needed fields
 */
const deleteFields = (beatmap: Beatmap): Beatmap => {
  // dont need all of those
  delete beatmap.artistUnicode;
  delete beatmap.audioFile;
  delete beatmap.catchRank;
  delete beatmap.disableStory;
  delete beatmap.disableVideo;
  delete beatmap.font;
  delete beatmap.ignoreSkin;
  delete beatmap.ignoreSound;
  delete beatmap.lastModified;
  delete beatmap.localOffset;
  delete beatmap.maniaRank;
  delete beatmap.modified;
  delete beatmap.onlineOffset;
  delete beatmap.osz2;
  delete beatmap.previewTime;
  delete beatmap.scrollSpeed;
  delete beatmap.sliderVelocity;
  delete beatmap.songSource;
  delete beatmap.songUnicode;
  delete beatmap.stackLeniency;
  delete beatmap.standardRank;
  delete beatmap.taikoRank;
  delete beatmap.threadId;
  delete beatmap.time;
  delete beatmap.timeChecked;
  delete beatmap.timeLastPlayed;
  delete beatmap.visualOverride;

  return beatmap;
};




