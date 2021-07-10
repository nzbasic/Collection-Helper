import { readFilters, removeFilters, setCache, writeFilter } from './../util/database/filters';
import * as express from "express";
import { CustomFilter } from '../../models/filters';
import { generateCache, progress, testFilter } from '../util/evaluation';

const router = express.Router();

router.route("/add").post(async (req, res) => {
  let body: CustomFilter = req.body
  await writeFilter(body)
  let filters = await readFilters()
  res.json(filters)
})

router.route("/").get(async (req, res) => {
  let filters = await readFilters()
  let clones: CustomFilter[] = []

  filters.forEach(filter => {
    let copy = JSON.parse(JSON.stringify(filter))
    delete(copy.cache)
    clones.push(copy)
  })

  res.json(clones)
})

router.route("/setCache").post(async (req, res) => {
  let body: {name: string, cache: string[]} = req.body
  await setCache(body.name, body.cache)
  res.json(true)
})

router.route("/testFilter").post(async (req, res) => {
  let body: { filter: string, getHitObjects: boolean } = req.body
  res.json(await testFilter(body.filter, body.getHitObjects))
})

router.route("/generateCache").post(async (req, res) => {
  await generateCache(req.body)
  let filters = await readFilters()
  res.json(filters)
})

router.route("/progress").get((req, res) => {
  res.json(progress)
})

router.route("/remove").post(async (req, res) => {
  await removeFilters(req.body)
  let filters = await readFilters()
  res.json(filters)
})

export default router
