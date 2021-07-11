import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { Columns, Config } from "ngx-easy-table";
import { Subscription } from "rxjs";
import { Sorting } from "../../../../models/beatmaps";
import { Beatmap } from "../../../../models/cache";
import { Collection } from "../../../../models/collection";
import { BeatmapService } from "../../services/beatmap.service";
import { SelectedService } from "../../services/selected.service";
import { TitleService } from "../../services/title.service";
import baseConfig from "../../util/baseConfig";
import { limitTextLength } from "../../util/processing";
import { debounce } from 'ts-debounce'
import { CollectionsService } from "../../services/collections.service";
import { FilterService } from "../../services/filter.service";
import { ToastrService } from 'ngx-toastr';

interface SelectFilter {
  text: string;
  selected: boolean;
}

@Component({
  selector: "app-edit",
  templateUrl: "./edit.component.html",
})
export class EditComponent implements OnInit, OnDestroy {
  @ViewChild('actionTpl', { static: true }) actionTpl!: TemplateRef<any>;
  @ViewChild('table') table;

  public ordering: Sorting = {header: "Song", order: "Asc"}
  public configuration: Config = JSON.parse(JSON.stringify(baseConfig));
  public beatmapColumns: Columns[]
  public shownMaps: Beatmap[] = []
  public selected: Set<string> = new Set<string>()

  public isCollectionShown = true
  public selectAll = false
  public noResetSelected = false
  public removeModal = false
  public pageNumber = 1
  public limitTextLength = limitTextLength
  public numberResults = 0
  public searchTerm = ""
  public isChangingCollection = false

  private lastSearchTerm = ""
  private selectedSubscription: Subscription
  private selectedCollection: Collection = {name: "", numberMaps: 0, hashes: []}

  public filters: SelectFilter[] = []
  public customApplied = false
  public appliedFilters: SelectFilter[] = []

  constructor(private toastr: ToastrService, private filterService: FilterService, private titleService: TitleService, private selectedService: SelectedService, private beatmapService: BeatmapService, private collectionsService: CollectionsService) {
    this.titleService.changeTitle({
      title: "Edit",
      subtitle: "Edit maps in your collection",
    });
  }

  selectedFilters() {
    return this.filters.filter(item => item.selected).map(filter => filter.text)
  }

  ngOnDestroy(): void {
    this.selectedSubscription.unsubscribe()
  }

  ngOnInit(): void {
    this.selectedSubscription = this.selectedService.currentSelected.subscribe((collection: Collection) => {
      this.selectedCollection = collection
    })

    this.filters = this.filterService.getFilters().filter(filter => filter.isCached).map((filter): SelectFilter => {
      return {text: filter.name, selected: false}
    })

    this.beatmapColumns = [
      { key: 'song', title: 'Song', width: '15%' },
      { key: 'artist', title: 'Artist' },
      { key: 'creator', title: 'Mapper' },
      { key: 'difficulty', title: 'Difficulty' },
      { key: 'sr', title: 'SR', width: '5%' },
      { key: 'bpm', title: 'BPM', width: '5%'},
      { key: 'hp', title: 'HP', width: '5%' },
      { key: 'od', title: 'OD', width: '5%' },
      { key: 'ar', title: 'AR', width: '5%' },
      { key: 'cs', title: 'CS', width: '5%' },
      { key: 'drain', title: 'Drain', width: '5%' }
    ]

    this.updateCurrentlyShown(true)
  }

  applyCustomFilters() {
    this.appliedFilters = this.filters.filter(item => item.selected);
    this.pageNumber = 1
    this.updateCurrentlyShown(true)
  }

  clearCustomFilters() {
    this.appliedFilters = []
    this.filters.forEach(filter => {
      filter.selected = false
    })
    this.pageNumber = 1
    this.updateCurrentlyShown(true)
  }

  changeView(): void {
    this.isCollectionShown = !this.isCollectionShown
    this.resetFields()
  }

  resetFields(): void {
    this.configuration.isLoading = true
    this.pageNumber = 1
    this.updateCurrentlyShown(true)
    this.selected = new Set<string>()
    if (this.selectAll) {
      document.getElementById("selectAllCheckboxes").click()
    }
    this.selectAll = false
  }

  eventEmitted($event: { event: string; value: any }): void {
    if ($event.event == "onSelectAll") {
      if ($event.value) {
        this.selectAll = true
        this.beatmapService.getSelectedList(this.searchTerm, this.isCollectionShown?this.selectedCollection.name:"", this.selectedFilters()).then((res: string[]) => {
          res.forEach(hash => {
            if (!this.selected.has(hash)) {
              this.selected.add(hash);
            }
          })
        })
      } else {
        this.selectAll = false
        if (!this.noResetSelected) {
          this.selected = new Set<string>()
        }
      }
    } else if ($event.event == "onOrder") {
      this.ordering.header = $event.value.key.toLowerCase()
      this.ordering.order = $event.value.order
      this.updateCurrentlyShown(true)
    }
  }

  checkBoxSelect(row: Beatmap): void {
    this.selected.has(row.md5) ? this.selected.delete(row.md5) : this.selected.add(row.md5);
  }

  public debouncedSearch = debounce(this.search, 300)

  search(): void {
    if (this.searchTerm != this.lastSearchTerm) {
      this.updateCurrentlyShown(false)
      if (this.selectAll) {
        this.noResetSelected = true
        document.getElementById("selectAllCheckboxes").click()
        this.noResetSelected = false
      }
    }
    this.lastSearchTerm = this.searchTerm
  }

  onChange(event: Event): void {
    this.debouncedSearch()
    this.searchTerm = (event.target as HTMLInputElement).value
  }

  isChecked(row: Beatmap): boolean {
    return this.selected.has(row.md5)
  }

  pageUpdate(change: number): void {
    this.pageNumber = this.pageNumber + change
    this.updateCurrentlyShown(false)
  }

  updateCurrentlyShown(force: boolean) {
    this.configuration.isLoading = true
    let collectionName = this.selectedCollection.name
    this.beatmapService.getBeatmaps(this.pageNumber, this.searchTerm, collectionName, force, this.ordering, this.isCollectionShown, this.selectedFilters()).then(res => {
      this.shownMaps = res.beatmaps
      this.numberResults = res.numberResults
      this.configuration.isLoading = false
    })
  }

  async addMaps() {
    this.configuration.isLoading = true
    let updatedCollection = await this.collectionsService.addMaps(Array.from(this.selected), this.selectedCollection.name)
    this.selectedService.changeSelected(updatedCollection)
    this.toastr.success('Maps have been added to your collection', 'Success')
    this.resetFields()
  }

  showRemoveModal(): void { this.removeModal = true }

  async removeResponse(result: boolean) {
    if (result) {
      this.configuration.isLoading = true
      let updatedCollection = await this.collectionsService.removeMaps(Array.from(this.selected), this.selectedCollection.name)
      this.selectedService.changeSelected(updatedCollection)
      this.toastr.success('Maps have been removed from your collection', 'Success')
      this.resetFields()
    }
    this.removeModal = false
  }
}
