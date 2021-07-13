import { Injectable } from "@angular/core";
import axios from "axios";
import { BehaviorSubject } from "rxjs";
import { Collection, Collections } from "../../../models/collection";
import { fullIp } from "../app.component";

@Injectable({
  providedIn: "root",
})
export class CollectionsService {
  private collections: Collections;

  setCollections(collections: Collections): void {
    this.collections = collections;
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
}
