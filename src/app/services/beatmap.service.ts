import { FilterDetail, GetBeatmapsReq, GetSelectedReq, PageResponse, Sorting } from './../../../models/beatmaps';
import { Injectable } from '@angular/core';
import { Filter } from '../../../models/beatmaps';
import axios from 'axios';
import { fullIp } from '../app.component';

@Injectable({
  providedIn: 'root'
})
export class BeatmapService {

  async getBeatmaps(page: number, search: string, name: string, force: boolean, order: Sorting, getCollection: boolean, customFilters?: string[]): Promise<PageResponse> {
    let filter = this.parseFilter(search)
    let req: GetBeatmapsReq = { page: page, filter: filter, name: name, force: force, order: order, getCollection: getCollection }

    if (customFilters.length) {
      req.customFilters = customFilters
    }

    let res = await axios.post(fullIp + "/beatmaps/", req)
    return res.data
  }

  async getSelectedList(search: string, name: string, force: boolean, customFilters?: string[]): Promise<string[]> {
    let filter = this.parseFilter(search)
    let req: GetSelectedReq = { filter: filter, name: name, force: force }

    if (customFilters.length) {
      req.customFilters = customFilters
    }

    let res = await axios.post(fullIp + "/beatmaps/selectedList", req)
    return res.data
  }

  private parseFilter(search: string): Filter {
    let split = search.split(" ")
    let filter: Filter = {text: "", filters: [], mods: []}

    // warning regex ahead
    split.forEach(word => {
      word = word.toLowerCase()
      if (word.match(/^\w*(<|<=|>|>=|==|=|!=)\d+\.?\d*$/g)) { // this line matches word operator number e.g. length<120

        let type = word.match(/^\w+/g)[0] // gets the word before operator
        let symbol = word.match(/(<|<=|>|>=|==|=|!=)/g)[0] // gets operator
        let number = parseFloat(word.match(/\d+\.?\d*$/g)[0]) // gets number after operator

        if (type == "length") { type = "drain" }
        if (type == "stars") { type = "sr" }

        let filterDetail: FilterDetail = {type: "Numeric", valueNumber: number, operator: symbol, filtering: type}

        if (type == "year" ) {
          filterDetail = { type: "Year", filtering: "setId", valueNumber: number, operator: symbol }
        }

        filter.filters.push(filterDetail)

      } else if (word.match(/^\w*(==|=|!=)\w+$/g)) { // this line matches word operator word e.g. artist=xanthochroid

        let type = word.match(/^\w+/g)[0] // gets the word before operator
        let operator = word.match(/(==|=|!=)/g)[0] // gets operator
        let term = word.match(/\w+$/g)[0] // gets word after operator

        if (type == "version") { type = "difficulty" }

        let filterDetail: FilterDetail = {type: "Text", filtering: type, valueString: term, operator: operator}

        if (type == "mode" ) {
          filterDetail = { type: "Mode", filtering: "mode", valueString: term, operator: operator }
        }

        if (type == "status") {
          filterDetail.type = "Status"
        }

        filter.filters.push(filterDetail)

      } else if (word == "unplayed" || word == "!unplayed") { // special filter for single word boolean

        let operator = "=="
        if (word.startsWith("!")) {
          operator = "!"
        }
        filter.filters.push({type: "Unplayed", operator: operator})

      } else if (word.match(/[+]\w+/g)) { // filter for applying mods to SR
        let mods = word.match(/[+]\w+/g)[0]
        for (let i=1; i<mods.length; i+=2) {
          let mod = mods.slice(i, i+2)
          if (!filter.mods.includes(mod)) {
            if (mod == "nc" || mod == "dt") {
              if (!filter.mods.includes("nc") && !filter.mods.includes("dt")) {
                filter.mods.push(mod)
              }
            } else {
              filter.mods.push(mod)
            }
          }
        }
      } else { // any text that doesn't match a filter template
        filter.text += word + " "
      }
    })

    filter.text = filter.text.trim()
    return filter
  }
}




