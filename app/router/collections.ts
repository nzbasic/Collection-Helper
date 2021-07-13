import * as express from "express";
import { addCollection, addMaps, mergeCollections, removeCollections, removeMaps, renameCollection } from "../util/collections";
import { collections } from "../util/parsing/collections";

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
  let body: { name: string, hashes: string[] } = req.body
  await addMaps(body.name, body.hashes)
  res.json(collections)
})

router.route("/removeMaps").post(async (req, res) => {
  let body: { name: string, hashes: string[] } = req.body
  await removeMaps(body.name, body.hashes)
  res.json(collections)
})

export default router
