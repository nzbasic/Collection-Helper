import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
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
  public update = false
  public downloaded = false
  public launch = false
  public installationPath = ""

  public lines = [
    "I have included some help text for each component of Collection Helper, if you are confused please use the help button on the top right.",
    "A backup of your collection.db file will be created when you set your osu! path. To restore it, go to your osu! path, and replace your collection.db file with collectionBackup.db.",
    "If you find a bug, please message me on discord: basic#7373. If it is obvious I probably already know about it."
  ]

  constructor(
    private electronService: ElectronService,
    private translate: TranslateService,
    private componentService: ComponentService,
    private loadingService: LoadingService,
    private readonly ipcService: IpcService,
    private changeDetector: ChangeDetectorRef
  ) {
    this.translate.setDefaultLang("en");
  }

  async ngOnInit() {
    const res = await this.ipcService.invoke('app_details')
    const baseIp = "http://127.0.0.1:"

    if (res) {
      fullIp = baseIp + res.port
      this.version = res.version
    } else {
      fullIp = baseIp + 7373
    }

    this.installationPath = res.path

    this.ipcService.on('update_available', () => {
      this.update = true
      this.changeDetector.detectChanges()
    })

    this.ipcService.on('update_downloaded', () => {
      this.downloaded = true
      this.changeDetector.detectChanges()
    });

    this.componentService.componentSelected.subscribe((display: Display) => {
      this.display = display;
    });

    await this.loadingService.loadSettings()
    this.launch = true
  }

  hideUpdate(status: boolean) {
    if (!status) {
      this.update = false
    }
  }

  hideLaunch() {
    this.launch = false
  }
}
