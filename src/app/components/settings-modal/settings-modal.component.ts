import { Component, OnInit } from "@angular/core";
import axios from "axios";
import { LoadingService } from "../../services/loading.service";
import { fullIp } from '../../app.component'

@Component({
  selector: "app-settings-modal",
  templateUrl: "./settings-modal.component.html",
})
export class SettingsModalComponent {

  public invalid = false
  public value = ""

  constructor(private loadingService: LoadingService) { }

  async confirm() {

    let verify: boolean = (await axios.post(fullIp + "/verifyPath", { path: this.value })).data

    if (verify) {
      this.invalid = false
      this.loadingService.loadData()
    } else {
      this.invalid = true
    }
  }

  textChange(event: KeyboardEvent): void {
    this.value = (event.target as HTMLTextAreaElement).value
  }

}
