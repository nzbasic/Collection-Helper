import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Collection } from '../../../../models/collection';
import { CollectionsService } from '../../services/collections.service';
import * as bytes from 'bytes'
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-bpm-changer',
  templateUrl: './bpm-changer.component.html'
})
export class BpmChangerComponent implements OnInit {

  public selected: Collection;
  private progressSubscription: Subscription;
  public bpm = "240";
  public percentage = 0
  public generatingModal = false
  public warning = false
  public estimateSize: string

  public lines = [
    "A new collection has been created, you will need to launch/relaunch osu! (possibly multiple times) for it to load properly.",
  ];

  constructor(private collectionsService: CollectionsService, private toastr: ToastrService) { }

  ngOnInit(): void {
    this.progressSubscription = this.collectionsService.progressCurrent.subscribe(progress => {
      this.percentage = progress
    })
  }

  ngOnDestroy(): void {
    this.progressSubscription.unsubscribe()
  }

  bpmChange(event) {
    const separator  = '^([0-9])';
    const maskSeparator =  new RegExp(separator , 'g');
    const result = maskSeparator.test(event.key);
    return result;
  }

  async onChange(selected: Collection) {
    this.selected = selected;
    if (selected != null) {
      const setCount = await this.collectionsService.getSetCount(selected.hashes)
      this.estimateSize = bytes(setCount * 3000000)
    } else {
      this.estimateSize = null;
    }
  }

  async generate() {
    this.generatingModal = true
    await this.collectionsService.generateBPM(this.selected, parseInt(this.bpm));
    this.generatingModal = false
    this.warning = true
    this.toastr.success("Practice difficulties created!", "Success")
  }

  hideWarning(): void {
    this.warning = false
  }
}
