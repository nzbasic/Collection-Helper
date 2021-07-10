import { Component, OnInit } from "@angular/core";
import { Title, TitleService } from "../../services/title.service";

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
})
export class HeaderComponent implements OnInit {
  public title!: string;
  public subtitle!: string;

  constructor(private data: TitleService) {}

  ngOnInit(): void {
    this.data.currentTitle.subscribe((title: Title) => {
      this.title = title.title;
      this.subtitle = title.subtitle;
    });
  }
}
