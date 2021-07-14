import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { ComponentService, Display } from "../../services/component.service";
import { LoadingService } from "../../services/loading.service";
import { TitleService } from "../../services/title.service";

@Component({
  selector: "app-settings",
  templateUrl: "./settings.component.html",
})
export class SettingsComponent implements OnInit, OnDestroy {

  public osuPath = ""
  public isChange = false
  private pathSubscription: Subscription

  constructor(private titleService: TitleService, private loadingService: LoadingService, private componentService: ComponentService) {
    this.titleService.changeTitle({
      title: "Settings",
      subtitle: "Application settings",
    });
  }

  ngOnInit(): void {
    this.pathSubscription = this.loadingService.settingsCurrent.subscribe(path => {
      this.osuPath = path;
    })
  }

  ngOnDestroy(): void {
    this.pathSubscription.unsubscribe();
  }

  changePath() {
    this.isChange = true
  }
}
