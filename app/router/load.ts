import * as express from "express";
import { loadFiles } from "../util/load";
import { dialog, shell } from 'electron'
import { getDarkMode, getLanguage, getOsuPath, setDarkMode, setLanguage, setOsuPath, verifyOsuPath } from "../util/database/settings";
import { win } from '../main'
import * as log from 'electron-log'
import { writeCollections } from "../util/parsing/collections";

const router = express.Router();
router.route("/loadFiles").post(async (req, res) => {
  //log.info("[API] /loadFiles called " + JSON.stringify(req.body))
  const result = await loadFiles()
  res.json(result);
});

router.route("/loadSettings").get(async (req, res) => {
  //log.info("[API] /loadSettings called")
  const path = await getOsuPath()
  const darkMode = await getDarkMode()
  const language = await getLanguage()
  res.json({ path: path, darkMode: darkMode, code: language })
})

router.route("/setPath").post(async (req, res) => {
  //log.info("[API] /setPath called " + JSON.stringify(req.body))
  await setOsuPath(req.body)
  res.json(true)
})

router.route("/verifyPath").post(async (req, res) => {
  //log.info("[API] /verifyPath called " + JSON.stringify(req.body))
  let body: { path: string, mode: string } = req.body
  res.json(await verifyOsuPath(body.path, body.mode))
})

router.route("/openUrl").post((req, res) => {
  //log.info("[API] /openUrl called " + JSON.stringify(req.body))
  shell.openExternal(req.body.url)
})

router.route("/openBrowseDialog").get(async (req, res) => {
  //log.info("[API] /openBrowseDialog called " + JSON.stringify(req.body))
  let dialogResult = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
  res.json(dialogResult)
})

router.route("/darkMode").post(async (req, res) => {
  //log.info("[API] POST /darkMode called " + JSON.stringify(req.body))
  const body: { mode: boolean } = req.body
  await setDarkMode(body.mode)
})

router.route("/darkMode").get(async (req, res) => {
  //log.info("[API] GET /darkMode called")
  const darkMode = await getDarkMode()
  res.json({ darkMode: darkMode })
})

router.route("/createBackup").post(async (req, res) => {
  //log.info("[API] POST /createBackup called")
  const dateTime = await writeCollections(false, true)
  res.json(dateTime)
})

router.route("/setLanguage").post(async (req, res) => {
  //log.info("[API] POST /setLanguage called " + JSON.stringify(req.body))
  const body: { code: string } = req.body
  res.json(await setLanguage(body.code))
})

export default router
