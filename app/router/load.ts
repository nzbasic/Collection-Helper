import * as express from "express";
import { loadFiles } from "../util/load";
import { shell } from 'electron'
import { getOsuPath, setOsuPath, verifyOsuPath } from "../util/database/settings";

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
  let body: { path: string } = req.body
  res.json(await verifyOsuPath(body.path))
})

router.route("/openUrl").post((req, res) => {
  shell.openExternal("https://github.com/nzbasic/Collection-Helper#custom-filters")
})

export default router
