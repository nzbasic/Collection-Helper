import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { debounce } from 'ts-debounce';
import { BeatmapService } from '../../services/beatmap.service';

export interface AddResponse {
  name: string;
  hashes: string[];
}

@Component({
  selector: 'app-add-modal',
  templateUrl: './add-modal.component.html'
})
export class AddModalComponent {

  @Input() list!: Set<string>
  @Output() response = new EventEmitter<AddResponse>();

  public res: AddResponse = { name: "", hashes: []}
  public searchValue = ""
  public result = "0"
  public selectedFilters: string[] = []

  constructor(private beatmapService: BeatmapService) { }

  confirm(): void {
    this.response.emit(this.res)
  }

  cancel(): void {
    this.res.name = "";
    this.response.emit(this.res)
  }

  textChange(event: KeyboardEvent): void {
    this.res.name = (event.target as HTMLTextAreaElement).value
  }

  public debouncedSearch = debounce(this.search, 300)

  searchChange(event: KeyboardEvent): void {
    this.debouncedSearch()
    this.searchValue = (event.target as HTMLTextAreaElement).value
  }

  async search() {
    this.result = "..."
    let res = await this.beatmapService.getSelectedList(this.searchValue, "", this.selectedFilters)
    this.res.hashes = res
    this.result = res.length.toString()
  }

  changeSelected(selected: string[]) {
    this.selectedFilters = selected
    if (selected.length) {
      this.debouncedSearch()
    } else {
      this.result = "0"
    }
  }

}
