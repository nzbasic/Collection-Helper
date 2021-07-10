import { Injectable } from "@angular/core";
import axios from "axios";
import { BehaviorSubject } from "rxjs";
import { Collection, Collections } from "../../../models/collection";

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
    this.collections = (await axios.post("http://127.0.0.1:7373/collections/remove", names)).data
  }

  async addCollection(name: string): Promise<void> {
    this.collections = (await axios.post("http://127.0.0.1:7373/collections/add", {name: name})).data
  }

  async mergeCollections(names: string[]): Promise<void> {
    this.collections = (await axios.post("http://127.0.0.1:7373/collections/merge", names)).data
  }

  async renameCollection(oldName: string, newName: string): Promise<void> {
    this.collections = (await axios.post("http://127.0.0.1:7373/collections/rename", { oldName: oldName, newName: newName })).data
  }

  async addMaps(hashes: string[], name: string): Promise<Collection> {
    this.collections = (await axios.post("http://127.0.0.1:7373/collections/addMaps", { name: name, hashes: hashes })).data
    return this.collections.collections.find(collection => collection.name == name)
  }

  async removeMaps(hashes: string[], name: string): Promise<Collection> {
    this.collections = (await axios.post("http://127.0.0.1:7373/collections/removeMaps", { name: name, hashes: hashes })).data
    return this.collections.collections.find(collection => collection.name == name)
  }
}
