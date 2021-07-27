import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";

@Component({
  selector: "app-rename-modal",
  templateUrl: "./rename-modal.component.html",
})
export class RenameModalComponent {
  @Input() list!: Set<string>
  @Input() value!: string
  @Input() title!: string
  @Input() action!: string

  @Output() response = new EventEmitter<string>();

  public inputValue = ""

  ngOnInit() {
    this.list.delete(this.value)
  }

  confirm(): void {
    this.response.emit(this.inputValue)
  }

  cancel(): void {
    this.response.emit("")
  }

  textChange(event: KeyboardEvent): void {
    this.inputValue = (event.target as HTMLTextAreaElement).value
  }

  disabled(): boolean {
    return this.list.has(this.inputValue.toLowerCase()) || this.inputValue == '' || this.inputValue == this.value
  }
}
