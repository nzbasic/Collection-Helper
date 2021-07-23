import { AddResponse } from './../../components/add-modal/add-modal.component';
import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { Collection } from "../../../../models/collection";
import { TitleService } from "../../services/title.service";
import { Columns, Config } from "ngx-easy-table";
import { CollectionsService } from "../../services/collections.service";
import baseConfig from "../../util/baseConfig";
import { SelectedService } from "../../services/selected.service";
import { ComponentService, Display } from "../../services/component.service";
import { ToastrService } from 'ngx-toastr';
import { BeatmapService } from "../../services/beatmap.service";

@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
})
export class HomeComponent implements OnInit {
  @ViewChild("actionTpl", { static: true }) actionTpl!: TemplateRef<any>;
  @ViewChild("table") table;
  public configuration: Config = JSON.parse(JSON.stringify(baseConfig));
  public columns: Columns[] = [];
  public selected = new Set<string>();
  public collections: Collection[] = [];
  public names = new Set<string>();
  public singleSelected!: Collection;

  public addModal = false;
  public renameModal = false;
  public removeModal = false;
  public mergeModal = false;

  public loading = false
  public pageNumber = 1;
  private removeType = "";
  public inputValue = "";
  private selectAll = false;
  private noResetSelected = false;

  constructor(
    private titleService: TitleService,
    private collectionsService: CollectionsService,
    private selectedService: SelectedService,
    private componentService: ComponentService,
    private toastr: ToastrService
  ) {
    this.titleService.changeTitle({
      title: "Collections",
      subtitle: "Your collections",
    });
  }

  ngOnInit() {
    this.columns = [
      { key: "Name", title: "Name" },
      { key: "NumberMaps", title: "Number of Maps", searchEnabled: false },
      { key: "action", title: "Action", cellTemplate: this.actionTpl, searchEnabled: false, }
    ];

    this.configuration.orderEnabled = false
    this.collections = this.collectionsService.getCollections("", 1);
    this.configuration.isLoading = false;
    this.names = new Set(this.collections.map((collection) => collection.name.toLowerCase()));
  }

  onChange(event: Event): void {
    this.inputValue = (event.target as HTMLInputElement).value;
    this.pageNumber = 1
    this.collections = this.collectionsService.getCollections(this.inputValue, this.pageNumber);

    if (this.selectAll) {
      this.noResetSelected = true;
      document.getElementById("selectAllCheckboxes").click();
      this.noResetSelected = false;
    }
  }

  pageUpdate(change: number): void {
    this.pageNumber = this.pageNumber + change;
    this.collections = this.collectionsService.getCollections(this.inputValue, this.pageNumber)
  }

  numberResults(): number {
    return this.collectionsService.getCollections(this.inputValue).length
  }

  eventEmitted($event: { event: string; value: any }): void {
    if ($event.event == "onSelectAll") {
      if ($event.value) {
        let toAdd = this.collectionsService.getCollections(this.inputValue);
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
    } else if ($event.event == "onClick") {
      this.singleSelected = $event.value.row;
    }
  }

  checkBoxSelect(row: Collection): void {
    this.selected.has(row.name) ? this.selected.delete(row.name) : this.selected.add(row.name);
  }

  select(row: Collection): void {
    this.selectedService.changeSelected(row);
    this.componentService.changeComponent(Display.EDIT);
  }

  isChecked(row: Collection): boolean {
    return this.selected.has(row.name);
  }

  showAddModal() { this.addModal = true }
  showMergeModal() { this.mergeModal = true }
  showRenameModal() { this.renameModal = true }
  showRemoveModal(type: string): void {
    this.removeModal = true;
    this.removeType = type;
  }

  async addResponse(res: AddResponse) {
    this.addModal = false
    if (res.name) {
      this.loading = true
      await this.collectionsService.addCollection(res.name, res.hashes)
      this.toastr.success('The new collection has been written', 'Success')
      this.collections = this.collectionsService.getCollections(this.inputValue, this.pageNumber)
      this.loading = false
    }
  }

  async mergeResponse(status: boolean) {
    this.mergeModal = false
    if (status) {
      this.loading = true
      await this.collectionsService.mergeCollections(Array.from(this.selected))
      this.toastr.success('The selected collections have been merged', 'Success')
      this.collections = this.collectionsService.getCollections(this.inputValue, this.pageNumber)
      this.loading = false
    }
    this.selected = new Set<string>()
  }

  async renameResponse(name: string) {
    this.renameModal = false
    if (name) {
      this.loading = true
      await this.collectionsService.renameCollection(this.singleSelected.name, name)
      this.toastr.success('Your collection has been renamed', 'Success')
      this.collections = this.collectionsService.getCollections(this.inputValue, this.pageNumber)
      this.loading = false
    }
  }

  async removeResponse(status: boolean) {
    this.removeModal = false;
    if (status) {
      this.loading = true
      let toRemove = this.removeType == "Mass" ? Array.from(this.selected) : Array.from([this.singleSelected.name]);
      if (this.removeType == "Mass") { this.selected = new Set<string>() }
      await this.collectionsService.removeCollections(toRemove);
      this.toastr.success('Removed collection(s)', 'Success')
      this.collections = this.collectionsService.getCollections(this.inputValue, this.pageNumber)
      this.loading = false
    }
    this.removeType = "";
  }
}
