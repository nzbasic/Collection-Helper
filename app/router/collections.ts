import { dialog } from "electron";
import * as express from "express";
import { addCollection, addMaps, mergeCollections, removeCollections, removeMaps, renameCollection } from "../util/collections";
import { collections } from "../util/parsing/collections";
import { win } from '../main'
import { exportCollection, importCollection, percentage } from "../util/database/collection";
import { beatmapMap } from "../util/parsing/cache";

const router = express.Router();

router.route("/").get((req, res) => {
  res.json(collections);
});

router.route("/add").post(async (req, res) => {
  await addCollection(req.body.name, req.body.hashes)
  res.json(collections)
})

router.route("/rename").post(async (req, res) => {
  await renameCollection(req.body.oldName, req.body.newName)
  res.json(collections)
})

router.route("/merge").post(async (req, res) => {
  await mergeCollections(req.body)
  res.json(collections)
})

router.route("/remove").post(async (req, res) => {
  await removeCollections(req.body)
  res.json(collections)
})

router.route("/addMaps").post(async (req, res) => {
  const body: { name: string, hashes: string[] } = req.body
  await addMaps(body.name, body.hashes)
  res.json(collections)
})

router.route("/removeMaps").post(async (req, res) => {
  const body: { name: string, hashes: string[] } = req.body
  await removeMaps(body.name, body.hashes)
  res.json(collections)
})

router.route("/export").post(async (req, res) => {

  let fileName: string = req.body.name
  fileName = fileName.replace(/[<>:"/\\|?*]/g, '_')

  const dialogRes = await dialog.showSaveDialog(win, {defaultPath: fileName, filters: [{ name: 'Collection Database File', extensions: ['db']}]})
  if (!dialogRes.canceled) {
    await exportCollection(req.body.name, req.body.exportBeatmaps, dialogRes.filePath)
  }

  res.json(dialogRes)
})

router.route("/import").post(async (req, res) => {
  const dialogRes = await dialog.showOpenDialog(win, {filters: [{ name: 'Collection Database File', extensions: ['db']}]})
  if (!dialogRes.canceled) {
    await importCollection(dialogRes.filePaths[0], req.body.name)
  }

  res.json(collections)
})

router.route("/setCount").post((req, res) => {
  const body: { hashes: string[] } = req.body
  const setSet = new Set<number>()

  body.hashes.forEach(hash => {
    const beatmap = beatmapMap.get(hash)
    if (beatmap) {
      setSet.add(beatmap.setId)
    }
  })

  res.json(setSet.size)
})

router.route("/progress").get((req, res) => {
  res.json(percentage)
})

export default router
