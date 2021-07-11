import { readCollections, writeCollections } from "./parsing/collections";
import { getOsuPath } from "./database/settings";
import { readCache } from "./parsing/cache";

export const loadFiles = async () => {
  let path = await getOsuPath();
  await readCollections(path);
  await writeCollections(true);
  await readCache(path);
};
