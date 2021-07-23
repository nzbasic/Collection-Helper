import { Injectable } from '@angular/core';
import axios from 'axios';
import { BehaviorSubject } from 'rxjs';
import { Beatmap } from '../../../models/cache';
import { CustomFilter } from '../../../models/filters';
import { fullIp } from '../app.component';
import { ComponentService, Display } from './component.service';

@Injectable({
  providedIn: 'root'
})
export class FilterService {

  private filters: CustomFilter[]

  private filterNumberSource = new BehaviorSubject<number>(0)
  filterNumber = this.filterNumberSource.asObservable()

  private progressSource = new BehaviorSubject<number>(0)
  progressCurrent = this.progressSource.asObservable()

  public evaluationErrorSource = new BehaviorSubject<string>("")
  evaluationError = this.evaluationErrorSource.asObservable()

  public editSource = new BehaviorSubject<CustomFilter>({ name: "", filter: "", description: "", isCached: false, getHitObjects: false, numberCached: 0 })
  editCurrent = this.editSource.asObservable()

  constructor(private componentService: ComponentService) {}

  setFilters(filters: CustomFilter[]) {
    this.filters = filters
    this.filterNumberSource.next(filters.filter(filter => filter.isCached).length)
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
    let res = await axios.post(fullIp + "/filters/add", filter)
    this.setFilters(res.data)
  }

  async removeFilters(names: string[]) {
    let res = await axios.post(fullIp + "/filters/remove", names)
    this.setFilters(res.data)
  }

  async testFilter(filter: string, getHitObjects: boolean, name: string) {
    let res = await axios.post(fullIp + "/filters/testFilter", { filter: filter, getHitObjects: getHitObjects, name: name })
    let data: { filteredText: string, numberTested: number } = res.data
    return data
  }

  async generateCache(names: string[]) {

    let progressInterval = setInterval(async () => {
      let progress = await axios.get(fullIp + "/filters/progress")
      this.progressSource.next(progress.data)
    }, 200)

    let res = await axios.post(fullIp + "/filters/generateCache", names)
    clearInterval(progressInterval)
    this.setFilters(res.data)
    return
  }

  edit(row: CustomFilter) {
    this.editSource.next(row)
    this.componentService.changeComponent(Display.CUSTOM_FILTERS)
  }

  async saveFilter(oldName: string, filter: CustomFilter) {
    let res = await axios.post(fullIp + "/filters/save", { oldName: oldName, filter: filter })
    this.setFilters(res.data)
  }
}
