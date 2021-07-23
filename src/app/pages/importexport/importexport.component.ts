import { Component, OnDestroy, OnInit } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { Subscription } from "rxjs";
import { runInThisContext } from "vm";
import { Collection } from "../../../../models/collection";
import { SelectCollection } from "../../components/collection-dropdown/collection-dropdown.component";
import { CollectionsService } from "../../services/collections.service";
import { TitleService } from "../../services/title.service";

@Component({
  selector: "app-importexport",
  templateUrl: "./importexport.component.html",
})
export class ImportexportComponent implements OnInit, OnDestroy {

  public selected: Collection
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

  constructor(private titleService: TitleService, private collectionService: CollectionsService, private toastr: ToastrService) {
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
    this.collectionService.exportCollection(this.selected.name, this.exportBeatmaps, this.path).then((res) => {
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

  async onChange(selected: Collection) {
    if (selected) {
      this.estimatedSize = await this.collectionService.getEstimatedSize(selected, this.exportBeatmaps)
    } else {
      this.estimatedSize = ""
    }
    this.selected = selected
  }

  async selectExportBeatmaps() {
    this.exportBeatmaps = !this.exportBeatmaps
    this.estimatedSize = await this.collectionService.getEstimatedSize(this.selected, this.exportBeatmaps)
  }

  hideWarning(): void {
    this.warning = false
  }
}
