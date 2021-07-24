import { Component, OnDestroy, OnInit } from "@angular/core";
import axios from "axios";
import { Subscription } from "rxjs";
import { fullIp } from "../../app.component";
import { ComponentService } from "../../services/component.service";
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
  public darkModeSubscription: Subscription;
  public darkMode = false

  constructor(private titleService: TitleService, private loadingService: LoadingService) {
    this.titleService.changeTitle({
      title: "Settings",
      subtitle: "Application settings",
    });
  }

  ngOnInit(): void {
    this.pathSubscription = this.loadingService.settingsCurrent.subscribe(path => {
      this.osuPath = path;
    })

    this.darkModeSubscription = this.loadingService.darkModeCurrent.subscribe(mode => {
      this.darkMode = mode
    })
  }

  ngOnDestroy(): void {
    this.pathSubscription.unsubscribe();
    this.darkModeSubscription.unsubscribe();
  }

  changePath() {
    this.isChange = true
  }

  closePath() {
    this.isChange = false
  }

  changeStyle() {
    if (document.querySelector('html').classList.contains('dark')) {
      document.querySelector('html').classList.remove('dark')
    } else {
      document.querySelector('html').classList.add('dark')
    }

    axios.post(fullIp + "/darkMode", { mode: document.querySelector('html').classList.contains('dark') })
  }
}
