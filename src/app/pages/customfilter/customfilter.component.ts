import { Component, OnDestroy, OnInit } from "@angular/core";
import axios from "axios";
import { ToastrService } from "ngx-toastr";
import { Subscription } from "rxjs";
import { Beatmap } from "../../../../models/cache";
import { CustomFilter } from "../../../../models/filters";
import { ComponentService, Display } from "../../services/component.service";
import { FilterService } from "../../services/filter.service";
import { TitleService } from "../../services/title.service";

@Component({
  selector: "app-customfilter",
  templateUrl: "./customfilter.component.html",
})
export class CustomfilterComponent implements OnInit, OnDestroy {

  private oldName: string
  public editFilter: CustomFilter
  public content: string = "resolve(beatmaps)"
  public numberResult = 0
  public filteredText = ""
  public errorText = ""
  public rawError = ""
  public gettingData = false
  public inputValue = ""
  public description = ""
  public alreadyExists = false
  public getHitObjects = false
  private errorSubscription: Subscription
  private editSubscription: Subscription
  public editorOptions = {theme: 'vs', language: 'javascript'};
  public resultOptions = {theme: 'vs', language: 'json', readOnly: true, }

  constructor(private toastr: ToastrService, private titleService: TitleService, private filterService: FilterService, private componentService: ComponentService) {
    this.titleService.changeTitle({
      title: "Custom Filter",
      subtitle: "Write a custom filter in JavaScript",
    });
  }

  ngOnInit(): void {
    this.errorSubscription = this.filterService.evaluationError.subscribe(error => {
      this.rawError = error
      this.errorText = JSON.stringify([{error: error}])
      if (error != "") {
        this.gettingData = false
      }
    })

    this.editSubscription = this.filterService.editCurrent.subscribe(edit => {
      if (edit.name) {
        console.log(edit)
        this.oldName = edit.name
        this.editFilter = edit
        this.inputValue = edit.name
        this.description = edit.description
        this.content = edit.filter
      }
    })
  }

  ngOnDestroy(): void {
    this.errorSubscription.unsubscribe()
    this.editSubscription.unsubscribe()
  }

  toggleGetHitObjects(): void {
    this.getHitObjects = !this.getHitObjects
  }

  nameChange(event: KeyboardEvent): void {
    this.inputValue = (event.target as HTMLTextAreaElement).value
  }

  descriptionChange(event: KeyboardEvent): void {
    this.description = (event.target as HTMLTextAreaElement).value
  }

  openDoc(): void {
    axios.post("http://127.0.0.1:7373/openUrl", { url: "https://github.com/nzbasic/Collection-Helper#custom-filters" })
  }

  async test() {

    this.filteredText = ""
    this.filterService.evaluationErrorSource.next("")
    this.gettingData = true

    if (this.content.trim() == "") {
      this.filterService.evaluationErrorSource.next("Empty!")
      this.toastr.error('Test failed, the content field is empty', 'Error')
      return
    }

    this.filterService.testFilter(this.content, this.getHitObjects).then(res => {
      try {
        this.numberResult = JSON.parse(res).length
        this.filteredText = res
        this.toastr.success('Test was successful, check output for beatmaps matching the filter', 'Success')
      } catch {
        this.filterService.evaluationErrorSource.next(res)
        this.toastr.error('Test failed, check output for error logs', 'Error')
      }
      this.gettingData = false
    })
  }

  async save() {

    let filter: CustomFilter = {name: this.inputValue, description: this.description, getHitObjects: this.getHitObjects, filter: this.content, cache: [], numberCached: 0, isCached: false}

    if (this.editFilter) {
      this.editFilter.name = this.inputValue
      this.editFilter.description = this.description
      this.editFilter.filter = this.content
      await this.filterService.saveFilter(this.oldName, this.editFilter)
      this.toastr.success('Filter saved, you must generate its cache before using it in map selection', 'Success')

      // reset edit observable
      this.filterService.editSource.next({ name: "", filter: "", description: "", isCached: false, getHitObjects: false, numberCached: 0 })
    } else {
      await this.filterService.addFilter(filter)
      this.toastr.success('New filter created, you must generate its cache before using it in map selection.', 'Success')
    }

    this.componentService.changeComponent(Display.FILTERS)
  }
}
