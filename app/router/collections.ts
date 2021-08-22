import { dialog } from "electron";
import * as express from "express";
import { addCollection, addMaps, mergeCollections, removeCollections, removeMaps, renameCollection } from "../util/collections";
import { collections } from "../util/parsing/collections";
import { win } from '../main'
import { exportCollection, exportPercentage, importCollection, importPercentage } from "../util/database/collection";
import { beatmapMap } from "../util/parsing/cache";
import * as log from 'electron-log'
import { Collection } from "../../models/collection";
import { generatePracticeDiffs, generationPercentage } from "../util/practice";
import { generateBPMChanges } from "../util/bpm";

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
  await mergeCollections(req.body)
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

router.route("/export").post(async (req, res) => {
  //log.info("[API] /collections/export called " + JSON.stringify(req.body))
  let fileName: string = req.body.name
  fileName = fileName.replace(/[<>:"/\\|?*]/g, '_')

  const dialogRes = await dialog.showSaveDialog(win, {defaultPath: fileName, filters: [{ name: 'Collection Database File', extensions: ['db']}]})
  if (!dialogRes.canceled) {
    await exportCollection(req.body.name, req.body.exportBeatmaps, dialogRes.filePath)
  }

  res.json(dialogRes)
})

router.route("/import").post(async (req, res) => {
  //log.info("[API] /collections/import called " + JSON.stringify(req.body))
  const dialogRes = await dialog.showOpenDialog(win, {filters: [{ name: 'Collection Database File', extensions: ['db']}]})
  let error: void | string
  if (!dialogRes.canceled) {
    error = await importCollection(dialogRes.filePaths[0], req.body.name)
  }

  if (typeof error === "string") {
    res.json({ error: error })
  } else {
    res.json({ collections: collections })
  }
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

router.route("/generatePracticeDiffs").post(async (req, res) => {
  const body: { collection: Collection, prefLength: number } = req.body
  await generatePracticeDiffs(body.collection, body.prefLength)
  res.json()
})

router.route("/generateBPMChanges").post(async (req, res) => {
  const body: { collection: Collection, bpm: number } = req.body
  await generateBPMChanges(body.collection, body.bpm)
  res.json()
})

export default router
