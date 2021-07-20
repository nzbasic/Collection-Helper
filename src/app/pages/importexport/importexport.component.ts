import { Component, OnDestroy, OnInit } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { Subscription } from "rxjs";
import { runInThisContext } from "vm";
import { Collection } from "../../../../models/collection";
import { CollectionsService } from "../../services/collections.service";
import { TitleService } from "../../services/title.service";

export interface SelectCollection {
  text: string;
  selected: boolean;
}

@Component({
  selector: "app-importexport",
  templateUrl: "./importexport.component.html",
})
export class ImportexportComponent implements OnInit, OnDestroy {

  private percentageSubscription: Subscription
  private collection: Collection
  public collections: Collection[]
  public collectionItems: SelectCollection[]
  public placeHolder = "Select a collection"
  public selected: string
  public exportBeatmaps = false
  public path = ""
  public newName = ""
  public estimatedSize = ""
  public exporting = false
  public percentage = 0
  public warning = false

  public lines = [
    "You will need to launch/relaunch osu! AND this client for new maps or new collections to load.",
  ];

  constructor(private titleService: TitleService, private collectionService: CollectionsService, private toastr: ToastrService) {
    this.titleService.changeTitle({
      title: "Import / Export",
      subtitle: "Import and export collections",
    });
  }

  ngOnInit(): void {
    this.percentageSubscription = this.collectionService.progressCurrent.subscribe(progress => {
      this.exporting = progress != 0
      this.percentage = progress
    })

    this.collections = this.collectionService.getCollections()
    this.collectionItems = this.collections.map(item => {
      return {
        text: item.name,
        selected: false,
      }
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
      this.warning = true
    })
  }

  import(): void {
    this.collectionService.importCollection(this.newName).then((res) => {
      if (res) {
        this.toastr.success("Collection imported", "Success")
        this.newName = ""
        this.warning = true
      }
    })
  }

  async onChange() {
    let selected = this.collectionItems.filter(item => item.selected).map(filter => filter.text)
    if (selected.length) {
      this.selected = selected[0]
      this.collection = this.collections.find(item => item.name == this.selected)
      this.estimatedSize = await this.collectionService.getEstimatedSize(this.collection, this.exportBeatmaps)
    } else {
      this.collection = null
      this.estimatedSize = ""
      this.selected = ""
    }
  }

  async selectExportBeatmaps() {
    this.exportBeatmaps = !this.exportBeatmaps
    this.estimatedSize = await this.collectionService.getEstimatedSize(this.collection, this.exportBeatmaps)
  }

  hideWarning(): void {
    this.warning = false
  }
}
