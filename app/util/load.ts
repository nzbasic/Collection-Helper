import { CacheParser } from './CacheParser';
import { CollectionParser } from './CollectionParser'

export const loadFiles = () => {

  const collectionParser = new CollectionParser()
  const collections = collectionParser.read("D:/osu/collection.db")
  collectionParser.write(collections, "D:/osu/collection.db")

  const cacheParser = new CacheParser()
  cacheParser.read("D:/osu/osu!.db")

};

