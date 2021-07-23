import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Collection } from '../../../../models/collection';
import { CollectionsService } from '../../services/collections.service';

export interface SelectCollection {
  text: string;
  selected: boolean;
}

@Component({
  selector: 'app-collection-dropdown',
  templateUrl: './collection-dropdown.component.html'
})
export class CollectionDropdownComponent implements OnInit {

  @Output() emitter = new EventEmitter<Collection>()

  private collection: Collection
  public collections: Collection[]
  public collectionItems: SelectCollection[]
  public placeHolder = "Select a collection"
  public selected: string

  constructor(private collectionService: CollectionsService) { }

  ngOnInit(): void {
    this.collections = this.collectionService.getCollections()
    this.collectionItems = this.collections.map(item => {
      return {
        text: item.name,
        selected: false,
      }
    })
  }

  onChange() {
    let selected = this.collectionItems.filter(item => item.selected).map(filter => filter.text)
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
