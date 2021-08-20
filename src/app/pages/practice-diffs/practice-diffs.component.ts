import { Component, OnInit } from '@angular/core';
import { Collection } from '../../../../models/collection';
import { CollectionsService } from '../../services/collections.service';

@Component({
  selector: 'app-practice-diffs',
  templateUrl: './practice-diffs.component.html'
})
export class PracticeDiffsComponent implements OnInit {

  public selected: Collection;
  public length = "30";

  constructor(private collectionsService: CollectionsService) { }

  ngOnInit(): void {
  }

  lengthChange(event) {
    const separator  = '^([0-9])';
    const maskSeparator =  new RegExp(separator , 'g');
    const result = maskSeparator.test(event.key);
    return result;
  }

  onChange(selected: Collection) {
    this.selected = selected;
  }

  async generate() {
    this.collectionsService.generatePracticeDiffs(this.selected, parseInt(this.length));
  }

}
