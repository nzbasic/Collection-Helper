import * as express from "express";
import { loadFiles } from "../util/load";
import { dialog, shell } from 'electron'
import { getOsuPath, setOsuPath, verifyOsuPath } from "../util/database/settings";
import { win } from '../main'

const router = express.Router();
router.route("/loadFiles").post(async (req, res) => {
  await loadFiles()
  res.json(true);
});

router.route("/loadSettings").get(async (req, res) => {
  res.json(await getOsuPath())
})

router.route("/setPath").post(async (req, res) => {
  await setOsuPath(req.body)
  res.json(true)
})

router.route("/verifyPath").post(async (req, res) => {
  let body: { path: string, mode: string } = req.body
  res.json(await verifyOsuPath(body.path, body.mode))
})

router.route("/openUrl").post((req, res) => {
  shell.openExternal(req.body.url)
})

router.route("/openBrowseDialog").get(async (req, res) => {
  let dialogResult = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
  res.json(dialogResult)
})

export default router
