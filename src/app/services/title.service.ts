import { Injectable } from "@angular/core";
import { LangChangeEvent, TranslateService } from "@ngx-translate/core";
import { BehaviorSubject } from "rxjs";

export interface Title {
  title: string;
  subtitle: string;
}

@Injectable({
  providedIn: "root",
})
export class TitleService {
  constructor(private translateService: TranslateService) {}

  defaultTitle: Title = { title: "Loading", subtitle: "Loading your data" };

  private titleSource = new BehaviorSubject<Title>(this.defaultTitle);
  currentTitle = this.titleSource.asObservable();

  changeTitle(page: string) {
    this.updateTranslation(page)
    this.translateService.onLangChange.subscribe((event: LangChangeEvent) => {
      this.updateTranslation(page);
    });
  }

  updateTranslation(page: string) {
    this.translateService.get([page + '.TITLE', page + ".SUBTITLE"]).subscribe((res: string[]) => {
      const title: Title = {
        title: res[page + '.TITLE'],
        subtitle: res[page + ".SUBTITLE"]
      }

      this.titleSource.next(title);
    })
  }
}
