import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FilterService } from '../../services/filter.service';
import { limitTextLength } from '../../util/processing';

export interface SelectFilter {
  text: string;
  value: string;
  selected: boolean;
}

@Component({
  selector: 'app-filter-select',
  templateUrl: './filter-select.component.html'
})
export class FilterSelectComponent implements OnInit {

  @Output() emitter = new EventEmitter<string[]>()
  public filters: SelectFilter[] = []
  public placeHolder = ""

  constructor(private filterService: FilterService) { }

  ngOnInit(): void {
    this.filters = this.filterService.getFilters().filter(filter => filter.isCached).map((filter): SelectFilter => {
      return {text: limitTextLength(filter.name, 15), value: filter.name, selected: false}
    })
  }

  onChange() {
    let selected = this.filters.filter(item => item.selected).map(filter => filter.value)
    this.placeHolder = limitTextLength(selected.toString(), 15)
    this.emitter.emit(selected)
  }

}
