import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { LangChangeEvent, TranslateService } from "@ngx-translate/core";
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
  public lines = []

  constructor(
    private translate: TranslateService,
    private componentService: ComponentService,
    private loadingService: LoadingService,
    private readonly ipcService: IpcService,
    private changeDetector: ChangeDetectorRef
  ) {
    translate.setDefaultLang("en");

    translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.updateTranslation()
    })
    this.updateTranslation()
  }

  updateTranslation() {
    this.translate.get('PAGES.HOME.MODALS.LAUNCH').subscribe(res => {
      this.lines = Object.values(res)
    })
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

    this.installationPath = res.path??""

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
