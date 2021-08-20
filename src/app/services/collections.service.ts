import { Injectable } from "@angular/core";
import axios from "axios";
import { BehaviorSubject } from "rxjs";
import { Collection, Collections } from "../../../models/collection";
import { fullIp } from "../app.component";
import * as bytes from 'bytes'

@Injectable({
  providedIn: "root",
})
export class CollectionsService {
  private collections: Collections;

  private progressSource = new BehaviorSubject<number>(0)
  progressCurrent = this.progressSource.asObservable()

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

  async mergeCollections(names: string[]): Promise<void> {
    this.collections = (await axios.post(fullIp + "/collections/merge", names)).data
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

  async exportCollection(name: string, exportBeatmaps: boolean, path: string) {
    let progressInterval = setInterval(async () => {
      let progress = await axios.get(fullIp + "/collections/exportProgress")
      this.progressSource.next(progress.data)
    }, 200)

    let dialogRes = (await axios.post(fullIp + "/collections/export", { name: name, exportBeatmaps: exportBeatmaps })).data
    clearInterval(progressInterval)
    this.progressSource.next(0)
    if (dialogRes.canceled) {
      return false
    }
    return
  }

  async importCollection(name: string): Promise<boolean | string> {
    let progressInterval = setInterval(async () => {
      let progress = await axios.get(fullIp + "/collections/importProgress")
      this.progressSource.next(progress.data)
    }, 200)

    let res = (await axios.post(fullIp + "/collections/import", { name: name })).data
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

  async getEstimatedSize(collection: Collection, exportBeatmaps: boolean): Promise<string> {
    let size = 28672
    let setCount = (await axios.post(fullIp + "/collections/setCount", { hashes: collection.hashes })).data

    if (exportBeatmaps) {
      // 21500 map sets = 207,660,670,976 bytes
      // average map set = 9658635 bytes
      size = size + (setCount * 9658635)
    } else {
      // 21500 map sets = 13,111,296 bytes
      // average map set = 609
      size = size + (setCount * 609)
    }

    return bytes(size)
  }

  async generatePracticeDiffs(collection: Collection, prefLength: number) {
    axios.post(fullIp + "/collections/generatePracticeDiffs", { collection: collection, prefLength: prefLength })
  }
}
