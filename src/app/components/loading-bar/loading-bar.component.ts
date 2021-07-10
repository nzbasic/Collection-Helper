import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { ProgressBarMode } from "@angular/material/progress-bar";
import { Subscription } from "rxjs";
import { FilterService } from "../../services/filter.service";
import { LoadingService } from "../../services/loading.service";

@Component({
  selector: "app-loading-bar",
  templateUrl: "./loading-bar.component.html",
})
export class LoadingBarComponent {

  @Input() text!: string
  @Input() mode!: ProgressBarMode
  @Input() percentage = 0

}
