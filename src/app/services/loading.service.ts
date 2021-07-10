import { Injectable } from "@angular/core";
import axios from "axios";
import { BehaviorSubject } from "rxjs";
import { Collections } from "../../../models/collection";
import { CustomFilter } from "../../../models/filters";
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
    await axios.post("http://127.0.0.1:7373/loadFiles")
    this.collectionsService.setCollections((await axios.get<Collections>("http://127.0.0.1:7373/collections")).data)
    this.filterService.setFilters((await axios.get<CustomFilter[]>("http://127.0.0.1:7373/filters")).data)
    this.componentService.changeComponent(Display.COLLECTIONS);
  }

  async loadSettings() {

    this.componentService.changeComponent(Display.LOADING);
    let path = (await axios.get("http://127.0.0.1:7373/loadSettings")).data

    if (path) {
      this.loadData()
    } else {
      this.componentService.changeComponent(Display.SETUP);
    }

  }


}
