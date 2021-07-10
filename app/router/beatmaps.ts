import * as express from "express";
import { GetBeatmapsReq, GetSelectedReq } from "../../models/beatmaps";
import { getBeatmaps, getSelected } from "../util/beatmaps";
import { getTestObjects } from "../util/hitobjects";
import { beatmapMap } from "../util/parsing/cache";

const router = express.Router();

router.route("/").post(async (req, res) => {
  let body: GetBeatmapsReq = req.body
  let page = await getBeatmaps(body)
  res.json(page)
})

router.route("/selectedList").post(async (req, res) => {
  let body: GetSelectedReq = req.body
  let selected = await getSelected(body)
  res.json(selected)
})

export default router
