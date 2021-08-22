import { Component, OnDestroy, OnInit } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { Subscription } from "rxjs";
import { runInThisContext } from "vm";
import { Collection } from "../../../../models/collection";
import { SelectCollection } from "../../components/collection-dropdown/collection-dropdown.component";
import { CollectionsService } from "../../services/collections.service";
import { TitleService } from "../../services/title.service";
import { UtilService } from "../../services/util.service";
import * as bytes from 'bytes'

@Component({
  selector: "app-importexport",
  templateUrl: "./importexport.component.html",
})
export class ImportexportComponent implements OnInit, OnDestroy {

  public selected: Collection[]
  private collections: Collection[]
  private percentageSubscription: Subscription
  public exportBeatmaps = true
  public path = ""
  public newName = ""
  public estimatedSize = ""
  public exporting = false
  public percentage = 0
  public warning = false
  public importing = false

  public lines = [
    "You will need to launch/relaunch osu! AND refresh cache in this client for new maps or new collections to load.",
  ];

  constructor(private titleService: TitleService,
    private collectionService: CollectionsService,
    private toastr: ToastrService,
    private utilService: UtilService) {

    this.titleService.changeTitle({
      title: "Import / Export",
      subtitle: "Import and export collections",
    });
    this.collections = this.collectionService.getCollections()
  }

  ngOnInit(): void {
    this.percentageSubscription = this.collectionService.progressCurrent.subscribe(progress => {
      this.exporting = progress != 0
      this.percentage = progress
    })
  }

  ngOnDestroy(): void {
    this.percentageSubscription.unsubscribe()
  }

  exists(): boolean {
    return this.collections.find(item => item.name == this.newName) != undefined
  }

  export(): void {
    this.exporting = true
    this.collectionService.exportCollection(this.selected, this.exportBeatmaps, this.path).then((res) => {
      if (res) {
        this.toastr.success("Collection exported", "Success")
      }
      this.exporting = false
    })
  }

  import(): void {
    this.importing = true
    this.collectionService.importCollection(this.newName).then((res) => {
      if (typeof res === "string") {
        this.toastr.error(res, "Error")
      } else {
        if (res) {
          this.toastr.success("Collection imported", "Success")
          this.newName = ""
          this.warning = true
        }
        this.importing = false
      }
    })
  }

  async onChange(selected: Collection[]) {
    this.selected = selected
    this.calculateSize()
  }

  async selectExportBeatmaps() {
    this.exportBeatmaps = !this.exportBeatmaps
    this.calculateSize()
  }

  async calculateSize() {
    if (this.selected.length) {
      this.estimatedSize = ""
      let size = 0;
      for (const collection of this.selected) {
        size += await this.collectionService.getEstimatedSize(collection, this.exportBeatmaps)
      }
      this.estimatedSize = bytes(size)
    } else {
      this.estimatedSize = ""
    }
  }

  hideWarning(): void {
    this.warning = false
  }

  openCollectionsDrive() {
    this.utilService.openUrl("https://drive.google.com/drive/folders/1PBtYMH5EmrAezc8wQdLd8cMiozddYhRZ?usp=sharing")
  }
}
