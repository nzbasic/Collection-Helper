import { Component, Input, OnInit } from "@angular/core";
import axios from "axios";
import { LoadingService } from "../../services/loading.service";
import { fullIp } from '../../app.component'
import { SelectedService } from "../../services/selected.service";

@Component({
  selector: "app-settings-modal",
  templateUrl: "./settings-modal.component.html",
})
export class SettingsModalComponent {

  @Input() path!: string
  @Input() mode!: string
  public invalid = false

  constructor(private loadingService: LoadingService, private selectedService: SelectedService) { }

  async confirm() {

    let verify: boolean = (await axios.post(fullIp + "/verifyPath", { path: this.path, mode: this.mode })).data

    if (verify) {
      this.invalid = false
      this.loadingService.settingsSource.next(this.path)
      this.selectedService.clearSelected()
      this.loadingService.loadData()
    } else {
      this.invalid = true
    }
  }

  textChange(event: KeyboardEvent): void {
    this.path = (event.target as HTMLTextAreaElement).value
    if (this.invalid) {
      this.invalid = false
    }
  }

  async openBrowseDialog() {
    let res = await axios.get(fullIp + "/openBrowseDialog")
    if (!res.data.canceled) {
      this.path = res.data.filePaths[0]
    }
  }

}
