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
    this.collections.collections = this.collections.collections.sort((a,b) => a.name.localeCompare(b.name))
  }

  getCollections(filter?: string, pageNumber?: number): Collection[] {
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
    this.progressSource.next(0)
    let progressInterval = setInterval(async () => {
      let progress = await axios.get(fullIp + "/collections/progress")
      this.progressSource.next(progress.data)
    }, 200)

    let dialogRes = (await axios.post(fullIp + "/collections/exportProgress", { name: name, exportBeatmaps: exportBeatmaps })).data
    clearInterval(progressInterval)
    this.progressSource.next(0)
    if (dialogRes.canceled) {
      return false
    }
    return
  }

  async importCollection(name: string) {
    this.progressSource.next(0)
    let progressInterval = setInterval(async () => {
      let progress = await axios.get(fullIp + "/collections/importProgress")
      this.progressSource.next(progress.data)
    }, 200)

    let collections = (await axios.post(fullIp + "/collections/import", { name: name })).data
    clearInterval(progressInterval)
    this.progressSource.next(0)

    if (collections.collections.length == this.collections.collections.length) {
      return false
    }

    this.setCollections(collections)
    return true
  }

  async getEstimatedSize(collection: Collection, exportBeatmaps: boolean): Promise<string> {
    let size = 20000
    let setCount = (await axios.post(fullIp + "/collections/setCount", { hashes: collection.hashes })).data

    if (exportBeatmaps) {
      size = size + (setCount * 12000000)
    } else {
      size = size + (setCount * 40)
    }

    return bytes(size)
  }
}
