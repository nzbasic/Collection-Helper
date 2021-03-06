import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import axios from "axios";
import { ToastrService } from "ngx-toastr";
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
    private collectionsService: CollectionsService,
    private translationService: TranslateService,
    private toastr: ToastrService
  ) {}

  public darkModeSource = new BehaviorSubject<boolean>(false);
  darkModeCurrent = this.darkModeSource.asObservable();

  public loadingSource = new BehaviorSubject<number>(0);
  loadingCurrent = this.loadingSource.asObservable();

  public settingsSource = new BehaviorSubject<string>("")
  settingsCurrent = this.settingsSource.asObservable();

  async loadData() {
    this.componentService.changeComponent(Display.LOADING);
    const res = await axios.post<number>(fullIp + "/loadFiles")

    if (res.data === -1) {
      return false
    }

    this.collectionsService.setCollections((await axios.get<Collections>(fullIp + "/collections")).data)
    this.filterService.setFilters((await axios.get<CustomFilter[]>(fullIp + "/filters")).data)
    this.componentService.changeComponent(Display.COLLECTIONS);

    return true
  }

  async loadSettings() {

    this.componentService.changeComponent(Display.LOADING);
    const settings = (await axios.get(fullIp + "/loadSettings")).data

    this.darkModeSource.next(settings.darkMode)

    if (settings.darkMode) {
      document.querySelector('html').classList.add('dark')
    }

    if (settings.path) {
      this.settingsSource.next(settings.path);
      const validPath = await this.loadData();
      if (!validPath) {
        this.componentService.changeComponent(Display.SETUP);
      }
    } else {
      this.componentService.changeComponent(Display.SETUP);
    }

    if (settings.code) {
      this.translationService.use(settings.code)
    }
  }

  async setDarkMode(mode: boolean) {
    if (mode) {
      document.querySelector('html').classList.add('dark')
    } else {
      document.querySelector('html').classList.remove('dark')
    }

    this.darkModeSource.next(mode)
    axios.post(fullIp + "/darkMode", { mode: document.querySelector('html').classList.contains('dark') })
  }

  async createBackup() {
    const timeRes = await axios.post(fullIp + "/createBackup")
    this.toastr.success("collection" + timeRes.data + ".db created in your osu! path.", "Success")
  }

}
