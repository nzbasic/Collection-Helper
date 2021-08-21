import { Component, OnDestroy, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { Collection } from '../../../../models/collection';
import { CollectionsService } from '../../services/collections.service';

@Component({
  selector: 'app-practice-diffs',
  templateUrl: './practice-diffs.component.html'
})
export class PracticeDiffsComponent implements OnInit, OnDestroy {

  public selected: Collection;
  public length = "30";
  public percentage = 0
  public generatingModal = false
  public warning = false
  private progressSubscription: Subscription

  public lines = [
    "A new collection has been created, you will need to launch/relaunch osu! (possibly multiple times) for it to load properly.",
  ];

  constructor(private collectionsService: CollectionsService, private toastr: ToastrService) { }

  ngOnInit(): void {
    this.progressSubscription = this.collectionsService.progressCurrent.subscribe(percentage => {
      this.percentage = percentage
    })
  }

  ngOnDestroy(): void {
    this.progressSubscription.unsubscribe()
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
    this.generatingModal = true
    await this.collectionsService.generatePracticeDiffs(this.selected, parseInt(this.length));
    this.generatingModal = false
    this.warning = true
    this.toastr.success("Practice difficulties created!", "Success")
  }

  hideWarning(): void {
    this.warning = false
  }

}
