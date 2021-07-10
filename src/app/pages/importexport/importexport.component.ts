import { Component, OnInit } from "@angular/core";
import { TitleService } from "../../services/title.service";

@Component({
  selector: "app-importexport",
  templateUrl: "./importexport.component.html",
})
export class ImportexportComponent implements OnInit {
  constructor(private titleService: TitleService) {
    this.titleService.changeTitle({
      title: "Import / Export",
      subtitle: "Import and export collections",
    });
  }

  ngOnInit(): void {}
}
