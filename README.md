<h1 align="center">
  <a href="https://github.com/nzbasic/Collection-Helper">
    <img src="https://user-images.githubusercontent.com/54062686/125156185-54ed4500-e1b8-11eb-8051-2f4b981eb542.png" alt="Logo" width="256" height="256">
  </a>
  
  Collection Helper (WIP)
</h1>

<div align="center">
  <a href="https://github.com/nzbasic/Collection-Helper/releases/latest">Latest Release</a>
  ·
  <a href="https://github.com/nzbasic/Collection-Helper/issues/new?assignees=&labels=&template=bug_report.md&title=Bug%3A+">Report a Bug</a>
  ·
  <a href="https://github.com/nzbasic/Collection-Helper/issues/new?assignees=&labels=&template=feature_request.md&title=%3A+">Request a Feature</a>
</div>

<div align="center">
<br />
  
 
[![codefactor](https://img.shields.io/codefactor/grade/github/nzbasic/Collection-Helper?style=flat-square)](https://github.com/nzbasic/Collection-Helper)
[![license](https://img.shields.io/github/license/nzbasic/Collection-Helper?style=flat-square)](LICENSE)
[![stars](https://img.shields.io/github/stars/nzbasic/Collection-Helper?style=flat-square)](https://github.com/nzbasic/Collection-Helper)
[![release](https://img.shields.io/github/v/release/nzbasic/Collection-Helper?style=flat-square)](https://github.com/nzbasic/Collection-Helper)
[![downloads](https://img.shields.io/github/downloads/nzbasic/Collection-Helper/total?style=flat-square)](https://github.com/nzbasic/Collection-Helper)
[![lastcommit](https://img.shields.io/github/last-commit/nzbasic/Collection-Helper?style=flat-square)](https://github.com/nzbasic/Collection-Helper)
  

[![electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)](https://github.com/electron/electron)
[![angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://github.com/angular/angular)
[![typescript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://github.com/microsoft/TypeScript)
[![sqlite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://github.com/sqlite/sqlite)
[![tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://github.com/tailwindlabs/tailwindcss)

  
[![coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/nzbasic)
  
</div>

<details open="open">
<summary>Table of Contents</summary>

- [About](#about)
  - [Built With](#built-with)
  - [Screenshots](#screenshots)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Usage](#usage)
    - [Build instructions](#building-yourself-for-devs)
    - [Custom filters](#custom-filters)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Support](#support)
- [Donate](#donate)
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
- [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)

### Demo

Example making a collection with the farm filter. Note: you only have to generate cache for a filter once ever.
![ezgif-2-4e4cb569259a](https://user-images.githubusercontent.com/54062686/125193748-3b282c80-e2a2-11eb-9578-ec205ea8fb51.gif)

### Screenshots

Collections
![image](https://user-images.githubusercontent.com/54062686/125189725-aa475600-e28d-11eb-883e-29c967157b29.png)

Running custom filter
![image](https://user-images.githubusercontent.com/54062686/125189778-f1354b80-e28d-11eb-966f-c34f496322de.png)

Collection editing with custom filter applied (Farm)
![image](https://user-images.githubusercontent.com/54062686/125189812-1d50cc80-e28e-11eb-8a9e-ae700ca479f8.png)

## Getting Started

### Prerequisites

[osu!](https://osu.ppy.sh)

You must have run your osu! client at least once.

### Usage

<a href="https://github.com/nzbasic/Collection-Helper/releases/latest">Download the latest release here</a>

#### Building yourself (for devs)

Please follow these steps to build the project yourself:

1. Pull the repo
2. Install dependencies in both frontend and backend (/ and /app/)
3. Run "npm run electron:build" (or "npm run start" to dev)
4. Run the installer found in /releases/

#### Custom filters

Custom filters work by passing you a list of beatmaps which get filtered by your code.

Any function you write must resolve with a list of beatmaps. Minimum boilerplate code is given when creating a new custom filter.

Your filter will be passed 4 objects: The resolve function, a list of beatmaps, axios for any request needs, and farmSets which is a list of osutracker.com farm sets.

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

If you would like to support me I would greatly appreciate it. 

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
