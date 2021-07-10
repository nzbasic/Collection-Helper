import { Component, OnInit } from "@angular/core";
import { ElectronService } from "./core/services";
import { TranslateService } from "@ngx-translate/core";
import { APP_CONFIG } from "../environments/environment";
import axios from "axios";
import { ComponentService, Display } from "./services/component.service";
import { LoadingService } from "./services/loading.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
})
export class AppComponent implements OnInit {
  public display: Display;
  public allTypes = Display;

  constructor(
    private electronService: ElectronService,
    private translate: TranslateService,
    private componentService: ComponentService,
    private loadingService: LoadingService
  ) {
    this.translate.setDefaultLang("en");
  }

  async ngOnInit() {
    this.componentService.componentSelected.subscribe((display: Display) => {
      this.display = display;
    });

    await this.loadingService.loadSettings()
  }
}
