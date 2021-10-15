import { Component, OnInit } from "@angular/core";
import { LangChangeEvent, TranslateService } from "@ngx-translate/core";
import { ComponentService, Display } from "../../services/component.service";
import { LoadingService } from "../../services/loading.service";
import { Title, TitleService } from "../../services/title.service";

interface Help {
  title: string,
  lines: string[]
}

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
})
export class HeaderComponent implements OnInit {
  public title!: string;
  public subtitle!: string;
  public helpShown = false
  public dict = new Map<Display, Help>()
  public helpCurrent: Help

  constructor(private titleService: TitleService,
    private componentService: ComponentService,
    private loadingService: LoadingService,
    translateService: TranslateService) {

    translateService.onLangChange.subscribe((event: LangChangeEvent) => {
      this.updateTranslation(event.translations.HELP)
      this.ngOnInit()
    })

    translateService.get('HELP').subscribe(res => {
      this.updateTranslation(res)
    })
  }

  updateTranslation(res: any) {
    this.dict.set(Display.COLLECTIONS, { title: res.HOME.NAME, lines: Object.values(res.HOME.LINES)})
    this.dict.set(Display.FILTERS, { title: res.FILTERS.NAME, lines: Object.values(res.FILTERS.LINES)})
    this.dict.set(Display.CUSTOM_FILTERS, { title: res.CUSTOM_FILTERS.NAME, lines: Object.values(res.CUSTOM_FILTERS.LINES)})
    this.dict.set(Display.EDIT, { title: res.EDIT.NAME, lines: Object.values(res.EDIT.LINES)})
    this.dict.set(Display.IMPORT_EXPORT, { title: res.IMPORT_EXPORT.NAME, lines: Object.values(res.IMPORT_EXPORT.LINES)})
    this.dict.set(Display.SETTINGS, { title: res.SETTINGS.NAME, lines: Object.values(res.SETTINGS.LINES)})
    this.dict.set(Display.PRACTICE_DIFF_GENERATOR, { title: res.PRACTICE.NAME, lines: Object.values(res.PRACTICE.LINES)})
    this.dict.set(Display.BPM_CHANGER, { title: res.DIFF_CHANGER.NAME, lines: Object.values(res.DIFF_CHANGER.LINES)})
  }

  ngOnInit(): void {
    this.titleService.currentTitle.subscribe((title: Title) => {
      this.title = title.title;
      this.subtitle = title.subtitle;
    });

    this.componentService.componentSelected.subscribe(component => {
      this.helpCurrent = this.dict.get(component)??{title: "", lines: []}
    })
  }

  help(): void {
    this.helpShown = true
  }

  hideHelp(): void {
    this.helpShown = false
  }

  refresh(): void {
    this.loadingService.loadData()
  }

}
