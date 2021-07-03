import { CacheHandler } from './CacheHandler';
import { CollectionHandler } from './CollectionHandler'

export const loadFiles = () => {

  const collectionParser = new CollectionHandler()
  const collections = collectionParser.read("D:/osu/collection.db")
  collectionParser.write(collections, "D:/osu/collection.db")

  const cacheParser = new CacheHandler()
  cacheParser.read("D:/osu/osu!.db")

};

