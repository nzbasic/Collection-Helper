import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { Collection } from "../../../models/collection";

@Injectable({
  providedIn: "root",
})
export class SelectedService {
  public selectedSource = new BehaviorSubject<Collection>({
    name: "",
    numberMaps: 0,
    hashes: [],
  });
  currentSelected = this.selectedSource.asObservable();

  changeSelected(selected: Collection) {
    this.selectedSource.next(selected);
  }
}
