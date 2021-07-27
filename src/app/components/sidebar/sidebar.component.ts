import { Component, Input, OnInit } from "@angular/core";
import { Collection } from "../../../../models/collection";
import { ComponentService, Display } from "../../services/component.service";
import { SelectedService } from "../../services/selected.service";
import { UtilService } from "../../services/util.service";
import { limitTextLength } from "../../util/processing";

@Component({
  selector: "app-sidebar",
  templateUrl: "./sidebar.component.html",
})
export class SidebarComponent implements OnInit {
  @Input() version!: string

  public limitTextLength = limitTextLength;
  public buttonSelected: Display = Display.COLLECTIONS;
  public Display = Display;
  public collectionSelected: string = "";

  constructor(
    private selectedService: SelectedService,
    private componentService: ComponentService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.selectedService.currentSelected.subscribe((selected: Collection) => {
      this.collectionSelected = selected.name;
    });
    this.componentService.componentSelected.subscribe((selected: Display) => {
      this.buttonSelected = selected;
    });
  }

  openOsu() {
    this.utilService.openUrl("https://osu.ppy.sh/users/9008211")
  }

  openGithub() {
    this.utilService.openUrl("https://github.com/nzbasic/")
  }

  openTwitter() {
    this.utilService.openUrl("https://twitter.com/nzbasic")
  }
}
