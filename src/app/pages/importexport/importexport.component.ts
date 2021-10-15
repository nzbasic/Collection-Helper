import { Component, OnDestroy, OnInit } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { Subscription } from "rxjs";
import { runInThisContext } from "vm";
import { Collection } from "../../../../models/collection";
import { SelectCollection } from "../../components/collection-dropdown/collection-dropdown.component";
import { CollectionsService } from "../../services/collections.service";
import { TitleService } from "../../services/title.service";
import { UtilService } from "../../services/util.service";
import bytes from 'bytes';
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-importexport",
  templateUrl: "./importexport.component.html",
})
export class ImportexportComponent implements OnInit, OnDestroy {

  public selected: Collection[] = []
  private collections: Collection[]
  private percentageSubscription: Subscription
  private multipleImportExportSubscription: Subscription
  public multipleNumberProgress = 1;
  public exportBeatmaps = true
  public newName = ""
  public estimatedSize = ""
  public exporting = false
  public percentage = 0
  public warning = false
  public importing = false
  public importMultiple = false;

  public lines = [
    "You will need to launch/relaunch osu! AND refresh cache in this client for new maps or new collections to load.",
  ];

  constructor(private titleService: TitleService,
    private collectionService: CollectionsService,
    private toastr: ToastrService,
    private utilService: UtilService,
    private translateService: TranslateService) {
    this.titleService.changeTitle('PAGES.IMPORT_EXPORT');
    this.collections = this.collectionService.getCollections()
  }

  ngOnInit(): void {
    this.percentageSubscription = this.collectionService.progressCurrent.subscribe(progress => {
      this.percentage = progress
    })

    this.multipleImportExportSubscription = this.collectionService.multipleImportExport.subscribe(number => {
      this.multipleNumberProgress = number
    })
  }

  ngOnDestroy(): void {
    this.percentageSubscription.unsubscribe()
    this.multipleImportExportSubscription.unsubscribe()
  }

  exists(): boolean {
    return this.collections.find(item => item.name == this.newName) != undefined
  }

  export(): void {
    this.exporting = true
    this.collectionService.exportCollection(this.selected, this.exportBeatmaps).then((res) => {
      if (res) {
        this.toastr.success("Collection exported", "Success")
      }
      this.exporting = false
    })
  }

  exportCollectionDetails(): void {
    this.collectionService.exportCollectionDetails(this.selected).then((res) => {
      if (res) {
        this.toastr.success("Collection exported", "Success")
      }
    })
  }

  import(): void {
    this.exporting = false
    this.importing = true
    this.collectionService.importCollection(this.newName, this.importMultiple).then((res) => {
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

  openImportVideo() {
    this.utilService.openUrl("https://www.youtube.com/watch?v=Su9Av0jSX_U")
  }
}
