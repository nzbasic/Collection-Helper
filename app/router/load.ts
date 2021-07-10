import * as express from "express";
import { serve } from "../main";
import { loadFiles } from "../util/load";
import * as path from 'path'
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

export default router
