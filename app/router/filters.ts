import { readFilters, removeFilters, setCache, updateFilter, writeFilter } from './../util/database/filters';
import * as express from "express";
import { CustomFilter } from '../../models/filters';
import { generateCache, progress, testFilter } from '../util/evaluation';
import * as log from 'electron-log'

const router = express.Router();

router.route("/add").post(async (req, res) => {
  log.info("[API] /filters/add called " + JSON.stringify(req.body))
  let body: CustomFilter = req.body
  await writeFilter(body)
  let filters = await readFilters()
  res.json(filters)
})

router.route("/").get(async (req, res) => {
  log.info("[API] /filters called " + JSON.stringify(req.body))
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
  log.info("[API] /filters/setCache called " + JSON.stringify(req.body.name))
  let body: {name: string, cache: string[]} = req.body
  await setCache(body.name, body.cache)
  res.json(true)
})

router.route("/testFilter").post(async (req, res) => {
  log.info("[API] /filters/testFilter called " + JSON.stringify(req.body))
  let body: { filter: string, getHitObjects: boolean, name: string } = req.body
  res.json(await testFilter(body.filter, body.getHitObjects, body.name))
})

router.route("/generateCache").post(async (req, res) => {
  log.info("[API] /filters/generateCache called " + JSON.stringify(req.body))
  await generateCache(req.body)
  let filters = await readFilters()
  res.json(filters)
})

router.route("/progress").get((req, res) => {
  res.json(progress)
})

router.route("/remove").post(async (req, res) => {
  log.info("[API] /filters/remove called " + JSON.stringify(req.body))
  await removeFilters(req.body)
  let filters = await readFilters()
  res.json(filters)
})

router.route("/save").post(async (req, res) => {
  log.info("[API] /filters/save called " + JSON.stringify(req.body))
  let body: { oldName: string, filter: CustomFilter } = req.body
  await updateFilter(body.oldName, body.filter)
  let filters = await readFilters()
  res.json(filters)
})

export default router
