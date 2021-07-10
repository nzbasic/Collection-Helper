import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";

@Component({
  selector: "app-confirm-modal",
  templateUrl: "./confirm-modal.component.html",
})
export class ConfirmModalComponent {
  @Input() title!: string
  @Input() text!: string
  @Input() confirmText!: string

  @Output() response = new EventEmitter<boolean>()

  confirmAction() {
    this.response.emit(true)
  }

  hide() {
    this.response.emit(false)
  }
}
