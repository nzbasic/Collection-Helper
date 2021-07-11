import { Injectable } from "@angular/core";
import axios from "axios";
import { BehaviorSubject } from "rxjs";
import { Collections } from "../../../models/collection";
import { CustomFilter } from "../../../models/filters";
import { fullIp } from "../app.component";
import { CollectionsService } from "./collections.service";
import { ComponentService, Display } from "./component.service";
import { FilterService } from "./filter.service";

@Injectable({
  providedIn: "root",
})
export class LoadingService {
  constructor(
    private filterService: FilterService,
    private componentService: ComponentService,
    private collectionsService: CollectionsService
  ) {}

  public loadingSource = new BehaviorSubject<number>(0);
  loadingCurrent = this.loadingSource.asObservable();

  async loadData() {
    this.componentService.changeComponent(Display.LOADING);
    await axios.post(fullIp + "/loadFiles")
    this.collectionsService.setCollections((await axios.get<Collections>(fullIp + "/collections")).data)
    this.filterService.setFilters((await axios.get<CustomFilter[]>(fullIp + "/filters")).data)
    this.componentService.changeComponent(Display.COLLECTIONS);
  }

  async loadSettings() {

    this.componentService.changeComponent(Display.LOADING);
    let path = (await axios.get(fullIp + "/loadSettings")).data

    if (path) {
      await this.loadData()
    } else {
      this.componentService.changeComponent(Display.SETUP);
    }

  }


}
