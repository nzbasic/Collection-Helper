import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Collection } from '../../../../models/collection';
import { CollectionsService } from '../../services/collections.service';
import { limitTextLength } from "../../util/processing";

export interface SelectCollection {
  text: string;
  value: string;
  selected: boolean;
}

@Component({
  selector: 'app-collection-dropdown',
  templateUrl: './collection-dropdown.component.html'
})
export class CollectionDropdownComponent implements OnInit {

  @Output() emitter = new EventEmitter<Collection>()
  @Input() placeHolder!: string

  private collection: Collection
  public collections: Collection[]
  public collectionItems: SelectCollection[]
  public selected: string
  public limitTextLength = limitTextLength

  constructor(private collectionService: CollectionsService) { }

  ngOnInit(): void {
    this.collections = this.collectionService.getCollections()
    this.collectionItems = this.collections.map(item => {
      return {
        text: limitTextLength(item.name, 30),
        value: item.name,
        selected: false,
      }
    })
  }

  onChange() {
    let selected = this.collectionItems.filter(item => item.selected).map(filter => filter.value)
    if (selected.length) {
      this.selected = selected[0]
      this.collection = this.collections.find(item => item.name == this.selected)

    } else {
      this.collection = null
      this.selected = ""
    }
    this.emitter.emit(this.collection)
  }

}
