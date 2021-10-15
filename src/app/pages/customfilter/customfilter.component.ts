import { Component, OnDestroy, OnInit } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import axios from "axios";
import { ToastrService } from "ngx-toastr";
import { Subscription } from "rxjs";
import { Beatmap } from "../../../../models/cache";
import { Collection } from "../../../../models/collection";
import { CustomFilter } from "../../../../models/filters";
import { fullIp } from "../../app.component";
import { ComponentService, Display } from "../../services/component.service";
import { FilterService } from "../../services/filter.service";
import { TitleService } from "../../services/title.service";
import { UtilService } from "../../services/util.service";

interface Tested {
  status: boolean;
  text: string;
}

@Component({
  selector: "app-customfilter",
  templateUrl: "./customfilter.component.html",
})
export class CustomfilterComponent implements OnInit, OnDestroy {

  public tested: Tested = { status: false, text: "" }
  public selected: Collection
  private errorSubscription: Subscription
  private editSubscription: Subscription
  public editFilter: CustomFilter
  private oldContent = ""
  private oldName = ""
  private names: string[] = []
  public content = "resolve(beatmaps)"
  public numberResult = 0
  public totalTested = 0
  public filteredText = ""
  public errorText = ""
  public rawError = ""
  public gettingData = false
  public inputValue = ""
  public description = ""
  public alreadyExists = false
  public getHitObjects = false

  public editorOptions = {theme: document.querySelector('html').classList.contains('dark') ? 'vs-dark' : 'vs', language: 'javascript'};
  public resultOptions = {theme: document.querySelector('html').classList.contains('dark') ? 'vs-dark' : 'vs', language: 'json', readOnly: true, }

  constructor(private toastr: ToastrService,
    private titleService: TitleService,
    private filterService: FilterService,
    private componentService: ComponentService,
    private utilService: UtilService,
    private translateService: TranslateService) {
    this.titleService.changeTitle('PAGES.CUSTOM_FILTER');
  }

  ngOnInit(): void {
    this.names = this.filterService.getFilters().map(filter => filter.name.toLowerCase())

    this.errorSubscription = this.filterService.evaluationError.subscribe(error => {
      this.rawError = error
      this.errorText = JSON.stringify([{error: error}])
      if (error != "") {
        this.gettingData = false
      }
    })

    this.editSubscription = this.filterService.editCurrent.subscribe(edit => {
      if (edit.name) {
        this.oldContent = edit.filter
        this.oldName = edit.name
        this.editFilter = edit
        this.inputValue = edit.name
        this.description = edit.description
        this.content = edit.filter
        this.getHitObjects = edit.getHitObjects
        this.tested = { text: edit.filter, status: true }
        this.names = this.names.filter(name => name !== edit.name.toLowerCase())
      }
    })
  }

  ngOnDestroy(): void {
    this.errorSubscription.unsubscribe()
    this.editSubscription.unsubscribe()

    if (this.editFilter) {
      this.filterService.editSource.next({ name: "", filter: "", description: "", isCached: false, getHitObjects: false, numberCached: 0 })
    }
  }

  validFilter(): boolean {
    return this.alreadyExists || !this.inputValue || this.content != this.tested.text || !this.tested.status
  }

  onNameChange(event: string): void {
    this.alreadyExists = this.names.includes(this.inputValue.toLowerCase())
  }

  openDoc(): void {
    this.utilService.openUrl("https://github.com/nzbasic/Collection-Helper#custom-filters")
  }

  openVid(): void {
    this.utilService.openUrl("https://youtu.be/ukOA1JCHLLo")
  }

  async test() {

    this.filteredText = ""
    this.filterService.evaluationErrorSource.next("")
    this.gettingData = true

    // check if resolve exists
    if (!this.content.match(/resolve\(*.+\)/g)) {
      this.filterService.evaluationErrorSource.next("No resolve found")
      this.toastr.error('Test failed, resolve was not found in your script', 'Error')
    }

    if (this.content.trim() == "") {
      this.filterService.evaluationErrorSource.next("Empty!")
      this.toastr.error('Test failed, the content field is empty', 'Error')
      return
    }

    const res = await this.filterService.testFilter(this.content, this.getHitObjects, this.selected?.name??"")

    try {
      this.numberResult = JSON.parse(res.filteredText).length
      this.totalTested = res.numberTested
      this.filteredText = res.filteredText
      this.toastr.success('Test was successful, check output for beatmaps matching the filter', 'Success')
      this.tested = { text: this.content, status: true }
    } catch {
      this.filterService.evaluationErrorSource.next(res.filteredText)
      this.toastr.error('Test failed, check output for error logs', 'Error')
    }
    this.gettingData = false

  }

  async save() {

    let filter: CustomFilter = {name: this.inputValue, description: this.description, getHitObjects: this.getHitObjects, filter: this.content, cache: [], numberCached: 0, isCached: false}

    if (this.editFilter) {

      const sameAsOld = this.content == this.oldContent
      this.editFilter.name = this.inputValue
      this.editFilter.description = this.description
      this.editFilter.filter = this.content

      await this.filterService.saveFilter(this.oldName, this.editFilter, sameAsOld)

      if (sameAsOld) {
        this.toastr.success('Filter saved', 'Success')
      } else {
        this.toastr.success('Filter saved, you must generate its cache before using it in map selection', 'Success')
      }

      // reset edit observable
      this.filterService.editSource.next({ name: "", filter: "", description: "", isCached: false, getHitObjects: false, numberCached: 0 })
    } else {
      await this.filterService.addFilter(filter)
      this.toastr.success('New filter created, you must generate its cache before using it in map selection.', 'Success')
    }

    this.componentService.changeComponent(Display.FILTERS)
  }

  onCollectionChange(selected: Collection[]) {
    if (selected.length) {
      this.selected = selected[0]
    } else {
      this.selected = null
    }
  }
}
