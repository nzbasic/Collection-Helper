import { Beatmap } from "../../models/cache";
import { getOsuPath } from "./database/settings";
import { beatmapMap } from "./parsing/cache";
import { readBeatmap } from "./parsing/hitobjects";

export const getTestObjects = async (toGet: Beatmap[]): Promise<Beatmap[]> => {
  const path = await getOsuPath()
  const output = await Promise.all(toGet.map((beatmap) => readBeatmap(beatmap, path)));
  return output
}
