import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { ComponentService, Display } from "../../services/component.service";

@Component({
  selector: "app-sidebar-button",
  templateUrl: "./sidebar-button.component.html",
})
export class SidebarButtonComponent implements OnInit, OnDestroy {
  @Input() text!: string;
  @Input() type!: Display;
  public selected: Display;
  private componentSubscription: Subscription;

  constructor(private componentService: ComponentService) {}

  changeComponent(): void {
    this.componentService.changeComponent(this.type);
  }

  ngOnInit(): void {
    this.componentSubscription =
      this.componentService.componentSelected.subscribe((selected: Display) => {
        this.selected = selected;
      });
  }

  ngOnDestroy(): void {
    this.componentSubscription.unsubscribe();
  }
}
