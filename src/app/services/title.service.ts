import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

export interface Title {
  title: string;
  subtitle: string;
}

@Injectable({
  providedIn: "root",
})
export class TitleService {
  defaultTitle: Title = { title: "Loading", subtitle: "Loading your data" };

  private titleSource = new BehaviorSubject<Title>(this.defaultTitle);
  currentTitle = this.titleSource.asObservable();

  changeTitle(title: Title) {
    this.titleSource.next(title);
  }
}
