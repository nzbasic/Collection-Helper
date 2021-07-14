import { Component, Input, OnInit } from "@angular/core";
import axios from "axios";
import { LoadingService } from "../../services/loading.service";
import { fullIp } from '../../app.component'

@Component({
  selector: "app-settings-modal",
  templateUrl: "./settings-modal.component.html",
})
export class SettingsModalComponent {

  @Input() path!: string
  @Input() mode!: string
  public invalid = false

  constructor(private loadingService: LoadingService) { }

  async confirm() {

    let verify: boolean = (await axios.post(fullIp + "/verifyPath", { path: this.path, mode: this.mode })).data

    if (verify) {
      this.invalid = false
      this.loadingService.settingsSource.next(this.path)
      this.loadingService.loadData()
    } else {
      this.invalid = true
    }
  }

  textChange(event: KeyboardEvent): void {
    this.path = (event.target as HTMLTextAreaElement).value
  }

}
