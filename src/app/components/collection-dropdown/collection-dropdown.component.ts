import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Collection } from '../../../../models/collection';
import { CollectionsService } from '../../services/collections.service';
import { limitTextLength } from "../../util/processing";

export interface SelectCollection {
  text: string;
  value: Collection;
  selected: boolean;
}

@Component({
  selector: 'app-collection-dropdown',
  templateUrl: './collection-dropdown.component.html'
})
export class CollectionDropdownComponent implements OnInit {

  @Output() emitter = new EventEmitter<Collection[]>()
  @Input() placeHolder!: string
  @Input() multi!: boolean;

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
        value: item,
        selected: false,
      }
    })
  }

  onChange() {
    const collections = this.collectionItems.filter(item => item.selected).map(filter => filter.value)
    this.emitter.emit(collections)

    if (collections.length) {
      this.selected = collections.map(item => item.name).join(', ')
    } else {
      this.selected = ""
    }
  }

}
