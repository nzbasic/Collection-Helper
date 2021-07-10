import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html'
})
export class PaginationComponent {

  @Input() pageNumber!: number
  @Input() rowsPerPage!: number
  @Input() showNumberResults!: boolean
  @Input() numberResults!: number

  @Output() emitter = new EventEmitter<number>()

  pageUpdate(change: number) {
    this.emitter.emit(change);
  }

}
