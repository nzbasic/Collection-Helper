import { Component, OnInit } from "@angular/core";
import { TitleService } from "../../services/title.service";

@Component({
  selector: "app-loading",
  templateUrl: "./loading.component.html",
})
export class LoadingComponent implements OnInit {
  constructor(private titleService: TitleService) {
    this.titleService.changeTitle({
      title: "Loading",
      subtitle: "Loading cache...",
    });
  }

  ngOnInit(): void {}
}
