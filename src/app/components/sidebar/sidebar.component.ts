import { Component, OnInit } from "@angular/core";
import { Collection } from "../../../../models/collection";
import { ComponentService, Display } from "../../services/component.service";
import { SelectedService } from "../../services/selected.service";
import { limitTextLength } from "../../util/processing";

@Component({
  selector: "app-sidebar",
  templateUrl: "./sidebar.component.html",
})
export class SidebarComponent implements OnInit {
  public limitTextLength = limitTextLength;
  public buttonSelected: Display = Display.COLLECTIONS;
  public Display = Display;
  public collectionSelected: string = "";

  constructor(
    private selectedService: SelectedService,
    private componentService: ComponentService
  ) {}

  ngOnInit(): void {
    this.selectedService.currentSelected.subscribe((selected: Collection) => {
      this.collectionSelected = selected.name;
    });
    this.componentService.componentSelected.subscribe((selected: Display) => {
      this.buttonSelected = selected;
    });
  }
}
