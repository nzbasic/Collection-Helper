import { Injectable } from "@angular/core";
import axios from "axios";
import { BehaviorSubject } from "rxjs";
import { BpmChangerOptions, Collection, Collections } from "../../../models/collection";
import { fullIp } from "../app.component";

@Injectable({
  providedIn: "root",
})
export class CollectionsService {
  private collections: Collections;

  private progressSource = new BehaviorSubject<number>(0)
  progressCurrent = this.progressSource.asObservable()

  private multipleImportExportSource = new BehaviorSubject<number>(1)
  multipleImportExport = this.multipleImportExportSource.asObservable()

  setCollections(collections: Collections): void {
    this.collections = collections
  }

  getCollections(filter?: string, pageNumber?: number): Collection[] {
    this.collections.collections = this.collections.collections.sort((a,b) => a.name.localeCompare(b.name))
    let output = this.collections.collections
    if (filter) {
      output = output.filter((collection) =>
        collection.name.toLowerCase().includes(filter.toLowerCase())
      );
    }

    if (pageNumber) {
      output = output.slice((pageNumber - 1) * 10, pageNumber * 10);
    }

    return output
  }

  async removeCollections(names: string[]): Promise<void> {
    this.collections = (await axios.post(fullIp + "/collections/remove", names)).data
  }

  async addCollection(name: string, hashes: string[]): Promise<void> {
    this.collections = (await axios.post(fullIp + "/collections/add", {name: name, hashes: hashes})).data
  }

  async mergeCollections(newName: string, names: string[]): Promise<void> {
    this.collections = (await axios.post(fullIp + "/collections/merge", { newName: newName, names: names })).data
  }

  async renameCollection(oldName: string, newName: string): Promise<void> {
    this.collections = (await axios.post(fullIp + "/collections/rename", { oldName: oldName, newName: newName })).data
  }

  async addMaps(hashes: string[], name: string): Promise<Collection> {
    this.collections = (await axios.post(fullIp + "/collections/addMaps", { name: name, hashes: hashes })).data
    return this.collections.collections.find(collection => collection.name == name)
  }

  async removeMaps(hashes: string[], name: string): Promise<Collection> {
    this.collections = (await axios.post(fullIp + "/collections/removeMaps", { name: name, hashes: hashes })).data
    return this.collections.collections.find(collection => collection.name == name)
  }

  async exportCollection(collections: Collection[], exportBeatmaps: boolean) {
    for (let i = 0; i < collections.length; i++) {
      this.multipleImportExportSource.next(i+1)
      const collection = collections[i]
      let progressInterval = setInterval(async () => {
        let progress = await axios.get(fullIp + "/collections/exportProgress")
        this.progressSource.next(progress.data)
      }, 200)

      let dialogRes = (await axios.post(fullIp + "/collections/export", { name: collection.name, exportBeatmaps: exportBeatmaps, multiple: collections.length > 1, last: i == collections.length-1 })).data
      clearInterval(progressInterval)
      this.progressSource.next(0)
      if (dialogRes.canceled) {
        return false
      }
    }
    return
  }

  async importCollection(name: string, multiple: boolean): Promise<boolean | string> {
    let progressInterval = setInterval(async () => {
      let progress = await axios.get(fullIp + "/collections/importProgress")
      this.progressSource.next(progress.data)
    }, 200)

    let res = (await axios.post(fullIp + "/collections/import", { name: name, multiple: multiple })).data
    clearInterval(progressInterval)
    this.progressSource.next(0)

    if (res.error) {
      return res.error
    }

    if (res.collections.collections.length == this.collections.collections.length) {
      return false
    }

    this.setCollections(res.collections)
    return true
  }

  async getSetCount(hashes: string[]): Promise<number> {
    return (await axios.post(fullIp + "/collections/setCount", { hashes: hashes })).data
  }

  async getEstimatedSize(collection: Collection, exportBeatmaps: boolean): Promise<string> {
    let size = 28672
    const setCount = await this.getSetCount(collection.hashes)

    if (exportBeatmaps) {
      // 21500 map sets = 207,660,670,976 bytes
      // average map set = 9658635 bytes
      size = size + (setCount * 9658635)
    } else {
      // 21500 map sets = 13,111,296 bytes
      // average map set = 609
      size = size + (setCount * 609)
    }

    return size
  }

  async generatePracticeDiffs(collection: Collection, prefLength: number) {
    let progressInterval = setInterval(async () => {
      let progress = await axios.get(fullIp + "/collections/generationProgress")
      this.progressSource.next(progress.data)
    }, 200)
    await axios.post(fullIp + "/collections/generatePracticeDiffs", { collection: collection, prefLength: prefLength })
    clearInterval(progressInterval)
    this.progressSource.next(0)
  }

  async generateBPM(collection: Collection, options: BpmChangerOptions) {
    let progressInterval = setInterval(async () => {
      let progress = await axios.get(fullIp + "/collections/bpmGenerationProgress")
      this.progressSource.next(progress.data)
    }, 200)
    await axios.post(fullIp + "/collections/generateBPMChanges", { collection: collection, options: options })
    clearInterval(progressInterval)
    this.progressSource.next(0)
  }
}
