import { Injectable } from '@angular/core';
import axios from 'axios';
import { BehaviorSubject } from 'rxjs';
import { Beatmap } from '../../../models/cache';
import { CustomFilter } from '../../../models/filters';

@Injectable({
  providedIn: 'root'
})
export class FilterService {

  private filters: CustomFilter[]

  private progressSource = new BehaviorSubject<number>(0)
  progressCurrent = this.progressSource.asObservable()

  public evaluationErrorSource = new BehaviorSubject<string>("")
  evaluationError = this.evaluationErrorSource.asObservable()

  setFilters(filters: CustomFilter[]) {
    this.filters = filters
  }

  getFilters(filterString?: string, pageNumber?: number): CustomFilter[] {

    let output = this.filters

    if (filterString) {
      output = output.filter((customFilter) =>
        customFilter.name.toLowerCase().includes(filterString.toLowerCase())
      );
    }

    if (pageNumber) {
      output = output.slice((pageNumber - 1) * 10, pageNumber * 10);
    }

    return output

  }

  async addFilter(filter: CustomFilter) {
    let res = await axios.post("http://127.0.0.1:7373/filters/add", filter)
    this.filters = res.data
  }

  async removeFilters(names: string[]) {

    let res = await axios.post("http://127.0.0.1:7373/filters/remove", names)
    this.filters = res.data

  }

  async testFilter(filter: string, getHitObjects: boolean): Promise<string> {
    let res = await axios.post("http://127.0.0.1:7373/filters/testFilter", { filter: filter, getHitObjects: getHitObjects })
    let data: string = res.data
    return data
  }

  async generateCache(names: string[]) {

    let progressInterval = setInterval(async () => {
      let progress = await axios.get("http://127.0.0.1:7373/filters/progress")
      this.progressSource.next(progress.data)
    }, 200)

    let res = await axios.post("http://localhost:7373/filters/generateCache", names)
    clearInterval(progressInterval)
    this.filters = res.data
    return
  }
}
