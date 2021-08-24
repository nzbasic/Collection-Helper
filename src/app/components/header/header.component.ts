import { Component, OnInit } from "@angular/core";
import { ComponentService, Display } from "../../services/component.service";
import { LoadingService } from "../../services/loading.service";
import { Title, TitleService } from "../../services/title.service";

interface Help {
  title: string,
  lines: string[]
}

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
})
export class HeaderComponent implements OnInit {
  public title!: string;
  public subtitle!: string;
  public helpShown = false
  public dict = new Map<Display, Help>()
  public helpCurrent: Help

  constructor(private data: TitleService, private componentService: ComponentService, private loadingService: LoadingService) {

    this.dict.set(Display.COLLECTIONS, { title: "Collections", lines: [
      "You can select multiple collections to merge/remove by clicking the checkboxes.",
      "Merging collections will remove the selected collections and create a new collection with the combined maps.",
      "Click on the name of a collection or the edit button to edit the maps in the collection"
    ]})

    this.dict.set(Display.FILTERS, { title: "Filters", lines: [
      "Filters run on all of your beatmaps. If a filter requires hit objects to be parsed (e.g. beatmaps) then calculating the filter will take a long time. For me this is about 20 minutes for 87000 maps.",
      "A filter must be cached before it can be used in the collection edit beatmap list. You can cache multiple filters at a time by using the checkboxes and clicking cache at the top of the table.",
      "Filter cache is saved, so unless you edit the filter, the only reason to generate the cache again is if you have downloaded more maps.",
      "Caching multiple filters is recommended as the most expensive part is getting the beatmap data and if you cache multiple it only needs to get the data once for every filter.",
      "You can create your own filters on the custom filter screen."
    ]})

    this.dict.set(Display.CUSTOM_FILTERS, { title: "Custom Filters", lines: [
      "Here you can make your own filters in javascript. You will need to look at the documentation linked on the component to write a filter.",
      "You must at some point resolve() the function otherwise it will run forever.",
      "The basic idea of the filter system is you are passed a list of beatmaps as 'beatmaps' and you must filter these and resolve the filtered list of beatmaps.",
      "ONLY CHECK GET HIT OBJECTS IF YOU NEED THEM, IT INCREASES THE COMPUTATION TIME GREATLY!",
      "Test your filter before you save it. It will run on 1000 random maps you have."
    ]})

    this.dict.set(Display.EDIT, { title: "Edit Collection", lines: [
      "This is where you edit the maps in your collection. By default the maps in your collection are shown, to see the list of all maps not in the collection you must click the green button to swap views",
      "You can apply any cached custom filters via selecting them in the dropdown and clicking apply cache. Click clear cache to revert to normal",
      "You can use any of osu!'s in-game filters to filter the beatmap list by typing them in the search. This implementation is less refined than the official one.",
      "I recommend applying any custom filter and writing some in-game filter e.g. (mode=0, status=r stars>5) and then using select all to add all filtered maps to a collection."
    ]})

    this.dict.set(Display.IMPORT_EXPORT, { title: "Import / Export", lines: [
      "You should only import one collection at a time, then open osu!, wait for the maps to process, and then refresh the cache in collection helper.",
      "I recommend exporting and importing collections with beatmaps included so you avoid missing beatmaps."
    ]})

    this.dict.set(Display.SETTINGS, { title: "Settings" , lines: [
      "Change application settings here.",
      "Dark mode selection will persist when you close the app."
    ]})

    this.dict.set(Display.PRACTICE_DIFF_GENERATOR, { title: "Practice Difficulty Generator", lines: [
      "The practice difficulty generator automatically finds the hardest X seconds of a map and generates new maps with that section. It takes a collection as input and creates a practice difficulty for each map in the collection.",
      "You can specify the preferred length of each practice difficulty by changing the length setting.",
      "A new collection will be made with all of the new maps.",
      "Difficulty is approximated, so some maps may not perfectly line up with the ppv2 implementation.",
      "Note: If the generated maps do not appear in game, you will have to refresh your maps by pressing F5 in osu!."
    ]})

    this.dict.set(Display.BPM_CHANGER, { title: "Mass Difficulty Changer", lines: [
      "The mass difficulty changer allows you to create large numbers of new difficulties of maps with the difficulty values you want.",
      "Changing the bpm will generate new audio files for every beatmap set which could take a few minutes.",
      "Note: If the generated maps do not appear in game, you will have to refresh your maps by pressing F5 in osu!."
    ]})
  }

  ngOnInit(): void {
    this.data.currentTitle.subscribe((title: Title) => {
      this.title = title.title;
      this.subtitle = title.subtitle;
    });

    this.componentService.componentSelected.subscribe(component => {
      this.helpCurrent = this.dict.get(component)??{title: "", lines: []}
    })
  }

  help(): void {
    this.helpShown = true
  }

  hideHelp(): void {
    this.helpShown = false
  }

  refresh(): void {
    this.loadingService.loadData()
  }

}
