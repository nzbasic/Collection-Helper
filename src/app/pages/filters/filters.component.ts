import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { Columns, Config } from "ngx-easy-table";
import { ToastrService } from "ngx-toastr";
import { Subscription } from "rxjs";
import { CustomFilter } from "../../../../models/filters";
import { ComponentService, Display } from "../../services/component.service";
import { FilterService } from "../../services/filter.service";
import { TitleService } from "../../services/title.service";
import baseConfig from "../../util/baseConfig";
import { limitTextLength } from "../../util/processing"

@Component({
  selector: "app-filters",
  templateUrl: "./filters.component.html",
})
export class FiltersComponent implements OnInit, OnDestroy {

  @ViewChild('actionTpl', { static: true }) actionTpl!: TemplateRef<any>;
  public filters: CustomFilter[]
  public shownFilters: CustomFilter[]
  public configuration: Config = JSON.parse(JSON.stringify(baseConfig));
  public columns: Columns[]
  public selected: Set<string> = new Set<string>()
  private progressSubscription: Subscription

  public isLoading = true
  public removeModal = false
  public pageNumber = 1
  public inputValue = ""
  public generatingModal = false
  private selectAll = false;
  private noResetSelected = false;
  public percentage = 0
  private toRemove: string[]
  public limitTextLength = limitTextLength

  constructor(private toastr: ToastrService, private titleService: TitleService, private filterService: FilterService, private componentService: ComponentService) {
    this.titleService.changeTitle({
      title: "Filters",
      subtitle: "Your filters",
    });
  }

  ngOnInit(): void {

    this.progressSubscription = this.filterService.progressCurrent.subscribe(percentage => {
      this.percentage = percentage
    })

    this.columns = [
      { key: 'name', title: 'Name', width: '10%' },
      { key: 'isCached', title: 'Cached', width: '5%'},
      { key: 'description', title: 'Description', width: '55%' },
      { key: 'action', title: 'Action', cellTemplate: this.actionTpl, width: '30%'}
    ]

    this.configuration.orderEnabled = false
    this.filters = this.filterService.getFilters("", 1)
    this.configuration.isLoading = false;
  }

  ngOnDestroy() {
    this.progressSubscription.unsubscribe()
  }

  eventEmitted($event: { event: string; value: any }): void {
    if ($event.event == "onSelectAll") {
      if ($event.value) {
        let toAdd = this.filterService.getFilters(this.inputValue);
        toAdd.forEach((details, _) => {
          if (!this.selected.has(details.name)) {
            this.selected.add(details.name);
          }
        });
        this.selectAll = true;
      } else {
        if (!this.noResetSelected) {
          this.selected = new Set<string>();
        }
        this.selectAll = false;
      }
    }
  }

  isChecked(row: CustomFilter): boolean {
    return this.selected.has(row.name);
  }

  checkBoxSelect(row: CustomFilter): void {
    this.selected.has(row.name) ? this.selected.delete(row.name) : this.selected.add(row.name);
  }

  pageUpdate(change: number): void {
    this.pageNumber = this.pageNumber + change;
    this.filters = this.filterService.getFilters(this.inputValue, this.pageNumber)
  }

  numberResults(): number {
    return this.filterService.getFilters(this.inputValue).length
  }

  onChange(event: Event): void {
    this.inputValue = (event.target as HTMLInputElement).value
    this.pageNumber = 1
    this.filters = this.filterService.getFilters(this.inputValue, 1)

    if (this.selectAll) {
      this.noResetSelected = true;
      document.getElementById("selectAllCheckboxes").click();
      this.noResetSelected = false;
    }
  }

  addFilter(): void {
    this.componentService.changeComponent(Display.CUSTOM_FILTERS)
  }

  showRemoveModal(row: CustomFilter): void {
    this.removeModal = true
    this.toRemove = this.selectedConversion(row)
  }

  async generateCache(row: CustomFilter) {
    this.generatingModal = true
    await this.filterService.generateCache(this.selectedConversion(row))
    this.filters = this.filterService.getFilters(this.inputValue, this.pageNumber)
    this.generatingModal = false
    this.toastr.success('Filter cache has been generated', 'Success')
  }

  selectedConversion(row: CustomFilter): string[] {
    if (row) {
      return [row.name]
    } else {
      return Array.from(this.selected)
    }
  }

  async removeResponse(status: boolean) {
    if (status) {
      await this.filterService.removeFilters(this.toRemove)
      this.toastr.success('Filter(s) removed', 'Success')
      this.filters = this.filterService.getFilters(this.inputValue, this.pageNumber)
      this.toRemove.forEach(name => {
        if (this.selected.has(name)) {
          this.selected.delete(name)
        }
      })
    }
    this.removeModal = false
  }

  edit(row: CustomFilter): void {
    this.filterService.edit(row)
  }


}
