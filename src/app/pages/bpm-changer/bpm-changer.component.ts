import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { BpmChangerOptions, Collection, Override } from '../../../../models/collection';
import { CollectionsService } from '../../services/collections.service';
import * as bytes from 'bytes'
import { Subscription } from 'rxjs';
import { TitleService } from '../../services/title.service';

@Component({
  selector: 'app-bpm-changer',
  templateUrl: './bpm-changer.component.html'
})
export class BpmChangerComponent implements OnInit {

  public selected: Collection
  private progressSubscription: Subscription;
  public inputValueBpm = "240";
  public percentage = 0
  public generatingModal = false
  public warning = false
  public estimateSize: string
  public options: BpmChangerOptions = {
    bpm: { value: 240, enabled: true },
    ar: { value: 9.5, enabled: false },
    od: { value: 9, enabled: false },
    cs: { value: 4, enabled: false },
    hp: { value: 8, enabled: false }
  }

  public lines = [
    "A new collection has been created, you will need to launch/relaunch osu! (possibly multiple times) for it to load properly.",
  ];

  constructor(private collectionsService: CollectionsService, private toastr: ToastrService, private titleService: TitleService) {
    this.titleService.changeTitle({
      title: "Mass Difficulty Changer",
      subtitle: "Alter the difficulty settings of every map in a collection",
    });
  }

  ngOnInit(): void {
    this.progressSubscription = this.collectionsService.progressCurrent.subscribe(progress => {
      this.percentage = progress
    })
  }

  ngOnDestroy(): void {
    this.progressSubscription.unsubscribe()
  }

  inputBpmUpdate(): void {
    this.options.bpm.value = parseInt(this.inputValueBpm, 10)

    if (!this.options.bpm.value) {
      this.options.bpm.enabled = false
      this.options.bpm.value = 0
    }
    this.updateEstimate()
  }

  async updateEstimate() {
    if (this.selected) {
      const setCount = await this.collectionsService.getSetCount(this.selected.hashes)
      if (this.options.bpm.enabled && this.options.bpm.value) {
        this.estimateSize = bytes(setCount * 3000000)
      } else {
        this.estimateSize = bytes(this.selected.hashes?.length??0 * 25000)
      }
    } else {
      this.estimateSize = null;
    }
  }

  bpmChange(event) {
    const separator  = '^([0-9])';
    const maskSeparator =  new RegExp(separator , 'g');
    const result = maskSeparator.test(event.key);
    return result;
  }

  async onChange(selected: Collection[]) {
    if (selected.length) {
      this.selected = selected[0];
    } else {
      this.selected = null
    }

    this.updateEstimate()
  }

  async generate() {
    this.generatingModal = true
    await this.collectionsService.generateBPM(this.selected[0], this.options);
    this.generatingModal = false
    this.warning = true
    this.toastr.success("Practice difficulties created!", "Success")
  }

  hideWarning(): void {
    this.warning = false
  }

  generationDisabled(): boolean {
    if (!this.selected) {
      return true
    }

    const overrides: Override[] = Object.values(this.options)
    for (const override of overrides) {
      if (override.enabled) {
        return false
      }
    }

    return true
  }
}
