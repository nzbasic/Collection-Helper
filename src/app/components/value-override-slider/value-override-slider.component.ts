import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Options } from '@angular-slider/ngx-slider';

@Component({
  selector: 'app-value-override-slider',
  templateUrl: './value-override-slider.component.html'
})
export class ValueOverrideSliderComponent {

  @Input() value!: number;
  @Output() valueChange = new EventEmitter<number>()

  @Input() enabled!: boolean
  @Output() enabledChange = new EventEmitter<boolean>()

  public on = false
  public options: Options = {
    floor: 0,
    ceil: 10,
    step: 0.1,
    hideLimitLabels: true,
    hidePointerLabels: true,
    disabled: true
  }

  change(value: number) {
    this.valueChange.emit(value)
  }

  /* Due to the way Angular 2+ handles change detection, we have to create a new options object. */
  onChangeDisabled(): void {
    this.options = Object.assign({}, this.options, {disabled: !this.on});
    this.enabledChange.emit(this.on)
  }

}
