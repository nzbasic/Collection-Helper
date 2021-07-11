import { Component, OnInit } from "@angular/core";
import { ElectronService } from "./core/services";
import { TranslateService } from "@ngx-translate/core";
import { ComponentService, Display } from "./services/component.service";
import { LoadingService } from "./services/loading.service";
import { IpcService } from "./services/ipc.service";

export let fullIp: string
@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
})
export class AppComponent implements OnInit {
  public display: Display;
  public allTypes = Display;
  public version = "1.0.0"

  constructor(
    private electronService: ElectronService,
    private translate: TranslateService,
    private componentService: ComponentService,
    private loadingService: LoadingService,
    private readonly ipcService: IpcService
  ) {
    this.translate.setDefaultLang("en");
  }

  async ngOnInit() {
    let res = await this.ipcService.invoke('app_details')
    let baseIp = "http://127.0.0.1:"

    if (res) {
      fullIp = baseIp + res.port
      this.version = res.version
    } else {
      fullIp = baseIp + 7373
    }

    this.componentService.componentSelected.subscribe((display: Display) => {
      this.display = display;
    });

    await this.loadingService.loadSettings()
  }
}
