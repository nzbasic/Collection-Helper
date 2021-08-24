import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import * as fs from 'fs'
import * as pathToFfmpeg from 'ffmpeg-static'
import * as ffmpeg from 'fluent-ffmpeg'

export const yep = () => true

const ffmpegSync = async (audioPath: string, atempo: string, output: string) => {
  return new Promise<boolean>(async (resolve, reject) => {
    if (!fs.existsSync(output)) {
      try {
        ffmpeg()
          .input(audioPath)
          .audioFilters(atempo)
          .output(output)
          .on('end', () => {
            resolve(true)
          })
          .run();
      } catch (e) {
        resolve(false)
      }
    } else {
      resolve(true)
    }
  })
};

parentPort.on("message", async (data) => {
  ffmpeg.setFfmpegPath(pathToFfmpeg)
  await ffmpegSync(data.audioPath, data.atempo, data.output)
  parentPort?.postMessage(true)
})
