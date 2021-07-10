import { Component, OnInit } from "@angular/core";
import { TitleService } from "../../services/title.service";

@Component({
  selector: "app-settings",
  templateUrl: "./settings.component.html",
})
export class SettingsComponent implements OnInit {
  constructor(private titleService: TitleService) {
    this.titleService.changeTitle({
      title: "Settings",
      subtitle: "Application settings",
    });
  }

  ngOnInit(): void {}
}
