import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html'
})
export class HelpComponent {

  @Input() innerHelp: boolean = false
  @Input() title!: string
  @Input() lines!: string[]
  @Output() emitter = new EventEmitter();

  hide(): void {
    this.emitter.emit()
  }

}
