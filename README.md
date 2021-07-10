<h1 align="center">
  <a href="https://github.com/nzbasic/Collection-Helper">
    <img src="https://user-images.githubusercontent.com/54062686/125156185-54ed4500-e1b8-11eb-8051-2f4b981eb542.png" alt="Logo" width="256" height="256">
  </a>
  
  Collection Helper (WIP)
</h1>

<div align="center">
  <a href="https://github.com/nzbasic/Collection-Helper/issues/new?assignees=&labels=&template=bug_report.md&title=Bug%3A+">Report a Bug</a>
  ·
  <a href="https://github.com/nzbasic/Collection-Helper/issues/new?assignees=&labels=&template=feature_request.md&title=%3A+">Request a Feature</a>
</div>

<div align="center">
<br />

[![license](https://img.shields.io/github/license/nzbasic/Collection-Helper?style=flat-square)](LICENSE)


[![stars](https://img.shields.io/github/stars/nzbasic/Collection-Helper?style=flat-square)]()
[![release](https://img.shields.io/github/v/release/nzbasic/Collection-Helper?style=flat-square)]()
[![downloads](https://img.shields.io/github/downloads/nzbasic/Collection-Helper/total?style=flat-square)]()
[![lastcommit](https://img.shields.io/github/last-commit/nzbasic/Collection-Helper?style=flat-square)]()
 
  
  
</div>

<details open="open">
<summary>Table of Contents</summary>

- [About](#about)
  - [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Usage](#usage)
    - [Build instructions](#build-instructions)
    - [Custom filters](#custom-filters)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)
- [Acknowledgements](#acknowledgements)

</details>

---

## About

<table>
<tr>
<td>

Collection Helper is a tool you can use to manage your collections in osu!. It aims to make editing  and sharing your collections quick and easy with its intuitive interface. Included is a very powerful custom filter interface which allows you to programatically filter through your beatmaps by writing your own code. 

The key features of **Collection Helper**:

- Add/remove/merge collections
- Edit collections
- Apply ingame filters to select maps
- Import and Export collections (WIP)
- Ability to create custom filters using javascript
- Inbuilt stream and farm filters
- Backup your collections

</td>
</tr>
</table>

### Built With

- [Angular](https://github.com/angular/angular)
- [Electron](https://github.com/electron/electron)
- [Typescript](https://github.com/microsoft/TypeScript)
- [Node.js](https://github.com/nodejs/node)
- [SQLite](https://github.com/sqlite/sqlite)

## Getting Started

### Prerequisites

[osu!](https://osu.ppy.sh)

Currently, port 7373 must be available, this will not be a requirement in the future. You can ignore this if you are not a developer.

You must have run your osu! client at least once.

### Usage

#### Build instructions

Please follow these steps to build the project yourself:

1. Pull the repo
2. Install dependencies in both frontend and backend (/ and /app/)
3. Run "npm run electron:build" (or "npm run start" to dev)
4. Run the installer found in /releases/

#### Custom filters

Custom filters work by passing you a list of beatmaps which get filtered by your code.

Any function you write must resolve with a list of beatmaps. Minimum boilerplate code is given when creating a new custom filter.

Your filter will be passed 3 objects: The resolve function, a list of beatmaps, and axios for any request needs.

If you want to use a beatmaps hit objects, you must select the Get HitObjects checkbox on the creation screen. Note: this will cause the filter to take a lot longer to cache, on my computer this is about 15 minutes for 87000 maps.

To use any custom filter in the collection edit screen, you must generate its cache first in the filters screen. This ensures the filters can be applied instantly to a list of maps instead of having to process every beatmap every time. 

Beatmap anatomy: 
| Name            | Type          | Description                                                                                              |
| --------------- | ------------  | -------------------------------------------------------------------------------------------------------- |
| artist          | string        |                                                                                                          |
| song            | string        |                                                                                                          |
| creator         | string        | Mapper                                                                                                   |
| difficulty      | string        | Difficulty name                                                                                          |
| md5             | string        | Beatmap hash, unique identifier                                                                          |
| fileName        | string        |                                                                                                          |
| status          | number        | Bitwise status indicator. [See osu! docs](https://osu.ppy.sh/wiki/en/osu!_File_Formats/Db_(file_format)) |
| circleNumber    | number        | Number of circles                                                                                        |
| sliderNumber    | number        | Number of sliders                                                                                        |
| spinnerNumber   | number        | Number of spinner                                                                                        |
| ar              | number        | Approach rate                                                                                            |
| cs              | number        | Circle size                                                                                              |
| hp              | number        | Health drain rate                                                                                        |
| od              | number        | Overall difficulty                                                                                       |
| sr              | number        | Star rating                                                                                              |
| bpm             | number        | Beats per minute (most common)                                                                           |
| drain           | number        | Drain time                                                                                               |
| timingPoints    | TimingPoint[] | Bpm and slider velocity changes                                                                          |
| id              | number        | Beatmap id                                                                                               |
| setId           | number        | Beatmap setId                                                                                            |
| mode            | number        | 0 = osu!, 1 = taiko, 2 = ctb, 3 = mania                                                                  |
| songTags        | string        |                                                                                                          |
| unplayed        | boolean       |                                                                                                          |
| folderName      | string        |                                                                                                          |
| hitObjects      | HitObject[]   |                                                                                                          |

HitObject
| Name   | Type         | Description                                                                                      |
| ------ | ------------ | ------------------------------------------------------------------------------------------------ |
| x      | number       | x position                                                                                       |
| y      | number       | y position                                                                                       |
| time   | number       | Time in ms                                                                                       |
| type   | number       | Bitwise indicator [See osu! docs](https://osu.ppy.sh/wiki/en/osu!_File_Formats/Db_(file_format)) |

TimingPoint
| Name         | Type         | Description                                                                           |
| ------------ | ------------ | ------------------------------------------------------------------------------------- |
| bpm          | number       | [See osu! docs](https://osu.ppy.sh/wiki/en/osu%21_File_Formats/Osu_%28file_format%29) |
| offset       | number       | Offset in ms                                                                          |
| inherited    | boolean      |                                                                                       |

More details from osu! documentation:
- [Cache File](https://osu.ppy.sh/wiki/en/osu!_File_Formats/Db_(file_format))
- [Beatmap File](https://osu.ppy.sh/wiki/en/osu%21_File_Formats/Osu_%28file_format%29)

## Roadmap

- Add importing collections
- Add exporting collections
- Automatically download missing maps
- Improve error handling 
- Improve beatmap hit object parsing speed
- More user settings 

## Contributing

First off, thanks for taking the time to contribute! Contributions are what makes the open-source community such an amazing place to learn, inspire, and create. Any contributions you make will benefit everybody else and are **greatly appreciated**.

Please try to create bug reports that are:

- _Reproducible._ Include steps to reproduce the problem.
- _Specific._ Include as much detail as possible: which version, what environment, etc.
- _Unique._ Do not duplicate existing opened issues.
- _Scoped to a Single Bug._ One bug per report.

## Support

Reach out to the maintainer at one of the following places:

- Discord: basic#7373
- Twitter: @nzbasic
- osu!: YEP
- Email: jamescoppard024@gmail.com

## Donate

If you would like to support me I would greatly appreicate it. 

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/nzbasic)

Crypto
- NANO: nano_3ymx5ymxgwrsfc53mem7bfmwjgzwxhtzp41wdkepnxmjdzzhhf3dgiiif8qc
- ETH: 0x46cB2b27C5607282BAdAaf9973EFd728D202A1d3
- BTC: bc1q0f0xtmmf7n05qgnmeun6ytc8z676j8tryszrr3
- DOGE: DRRhYtaFFoyGUaU1h8MyE8LBbMETjDU5AR

## License

This project is licensed under the **MIT license**. Feel free to edit and distribute the code as you like.

See [LICENSE](LICENSE) for more information.

## Acknowledgements

Special thanks to the following:

- bluetayden and ningalu for their support and testing 
- <https://github.com/Itsyuka/osu-buffer> - Great tool for reading and writing osu! binary types
- <https://github.com/maximegris/angular-electron> - Great electron angular template
- <https://github.com/dec0dOS/amazing-github-template> - Great readme template
