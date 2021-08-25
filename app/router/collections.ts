import { dialog } from "electron";
import * as express from "express";
import { addCollection, addMaps, mergeCollections, removeCollections, removeMaps, renameCollection } from "../util/collections";
import { collections } from "../util/parsing/collections";
import { win } from '../main'
import { exportCollection, exportPercentage, importCollection, importPercentage } from "../util/database/collection";
import { beatmapMap } from "../util/parsing/cache";
import * as log from 'electron-log'
import { BpmChangerOptions, Collection } from "../../models/collection";
import { generatePracticeDiffs, generationPercentage } from "../util/practice";
import { generateBPMChanges, generationBpmProgress } from "../util/bpm";

const router = express.Router();

router.route("/").get((req, res) => {
  //log.info("[API] /collections/ called")
  res.json(collections);
});

router.route("/add").post(async (req, res) => {
  //log.info("[API] /collections/add called")
  await addCollection(req.body.name, req.body.hashes)
  res.json(collections)
})

router.route("/rename").post(async (req, res) => {
  //log.info("[API] /collections/rename called " + JSON.stringify(req.body))
  await renameCollection(req.body.oldName, req.body.newName)
  res.json(collections)
})

router.route("/merge").post(async (req, res) => {
  //log.info("[API] /collections/merge called " + JSON.stringify(req.body))
  await mergeCollections(req.body.newName, req.body.names)
  res.json(collections)
})

router.route("/remove").post(async (req, res) => {
  //log.info("[API] /collections/remove called " + JSON.stringify(req.body))
  await removeCollections(req.body)
  res.json(collections)
})

router.route("/addMaps").post(async (req, res) => {
  //log.info("[API] /collections/addMaps called")
  const body: { name: string, hashes: string[] } = req.body
  await addMaps(body.name, body.hashes)
  res.json(collections)
})

router.route("/removeMaps").post(async (req, res) => {
  //log.info("[API] /collections/removeMaps called " + JSON.stringify(req.body))
  const body: { name: string, hashes: string[] } = req.body
  await removeMaps(body.name, body.hashes)
  res.json(collections)
})

let multipleFolderPath = "";
router.route("/export").post(async (req, res) => {
  //log.info("[API] /collections/export called " + JSON.stringify(req.body))
  let fileName: string = req.body.name
  let multiple: boolean = req.body.multiple
  let last = true
  fileName = fileName.replace(/[<>:"/\\|?*]/g, '_')

  let dialogRes: any
  if (multiple) {
    last = req.body.last
    if (multipleFolderPath == "") {
      dialogRes = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    } else {
      dialogRes = { canceled: false }
    }
  } else {
    dialogRes = await dialog.showSaveDialog(win, {defaultPath: fileName, filters: [{ name: 'Collection Database File', extensions: ['db']}]})
  }

  let path: string
  if (!dialogRes.canceled) {
    if (multiple) {
      if (multipleFolderPath == "") {
        multipleFolderPath = dialogRes.filePaths[0]
      }

      path = multipleFolderPath
      if (last) {
        multipleFolderPath = ""
      }
    } else {
      path = dialogRes.filePath
    }
    await exportCollection(req.body.name, req.body.exportBeatmaps, multiple, path, last)
  }

  res.json(dialogRes)
})

router.route("/import").post(async (req, res) => {
  //log.info("[API] /collections/import called " + JSON.stringify(req.body))
  const multiple = req.body.multiple
  const options = {properties: [], filters: [{ name: 'Collection Database File', extensions: ['db']}]}
  if (multiple) {
    options.properties.push('multiSelections')
  }

  const dialogRes = await dialog.showOpenDialog(win, options)
  let error: void | string
  const errors: string[] = []
  if (!dialogRes.canceled) {
    for (let i = 0; i < dialogRes.filePaths.length; i++) {
      error = await importCollection(dialogRes.filePaths[i], req.body.name, multiple, i==(dialogRes.filePaths.length-1))
      if (typeof error === "string") {
        errors.push(error)
      }
    }
  }

  res.json({ collections: collections, errors: errors })
})

router.route("/setCount").post((req, res) => {
  //log.info("[API] /collections/setCount called")
  const body: { hashes: string[] } = req.body
  const setSet = new Set<number>()
  let numberInvalid = 0

  let lastFolder = ""
  body.hashes.forEach(hash => {
    const beatmap = beatmapMap.get(hash)
    if (beatmap) {
      if (beatmap.setId == -1) {
        if (lastFolder == beatmap.folderName) {
          return;
        } else {
          lastFolder = beatmap.folderName
          numberInvalid++
        }
      }
      setSet.add(beatmap.setId)
    }
  })

  res.json(setSet.size + numberInvalid)
})

router.route("/exportProgress").get((req, res) => {
  res.json(exportPercentage)
})

router.route("/importProgress").get((req, res) => {
  res.json(importPercentage)
})

router.route("/generationProgress").get((req, res) => {
  res.json(generationPercentage)
})

router.route("/bpmGenerationProgress").get((req, res) => {
  res.json(generationBpmProgress)
})

router.route("/generatePracticeDiffs").post(async (req, res) => {
  const body: { collection: Collection, prefLength: number } = req.body
  await generatePracticeDiffs(body.collection, body.prefLength)
  res.json()
})

router.route("/generateBPMChanges").post(async (req, res) => {
  const body: { collection: Collection, options: BpmChangerOptions } = req.body
  await generateBPMChanges(body.collection, body.options)
  res.json()
})

export default router
