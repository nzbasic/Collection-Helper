import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

export enum Display {
  COLLECTIONS,
  EDIT,
  LOADING,
  SETUP,
  FILTERS,
  CUSTOM_FILTERS,
  IMPORT_EXPORT,
  SETTINGS,
  PRACTICE_DIFF_GENERATOR
}

@Injectable({
  providedIn: "root",
})
export class ComponentService {
  private componentSource = new BehaviorSubject<Display>(Display.LOADING);
  componentSelected = this.componentSource.asObservable();

  changeComponent(display: Display) {
    this.componentSource.next(display);
  }
}
