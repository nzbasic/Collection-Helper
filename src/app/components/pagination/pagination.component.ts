import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { debounce } from 'ts-debounce';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html'
})
export class PaginationComponent {

  @Input() pageNumber!: number
  @Input() rowsPerPage!: number
  @Input() showNumberResults!: boolean
  @Input() numberResults!: number
  @Input() infiniteScroll?: boolean

  ceil(number: number) {
    return Math.ceil(number)
  }

  inputValidator(event) {
    const separator  = '^([0-9])';
    const maskSeparator =  new RegExp(separator , 'g');
    const result = maskSeparator.test(event.key);
    return result;
  }

  public debouncedValidate = debounce(this.pageUpdateValidate, 500)

  pageUpdateValidate() {
    if (this.pageNumber > Math.ceil(this.numberResults / this.rowsPerPage)) {
      this.pageNumber = Math.ceil(this.numberResults / this.rowsPerPage)
    }
    this.pageUpdate()
  }

  @Output() emitter = new EventEmitter<number>()

  pageUpdate(change?: number) {
    if (change) {
      this.pageNumber += change
    }
    this.emitter.emit(this.pageNumber);
  }

}
