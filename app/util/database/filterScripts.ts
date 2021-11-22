export const stream = `
const burstCount = 5
const minimumPercentage = 20
const minimumBpm = 140
const maximumTimeDifference = Math.ceil((1/(minimumBpm*4/60))*1000)

const filtered = beatmaps.filter(beatmap => {
	const bpms = convertTimingBpm(beatmap.timingPoints)

	if (!bpms.length) {
		return false
	}

	if (beatmap.bpm <= minimumBpm) {
		return false
	}

	let currentBurstCount = 0
	let maxBurstCount = 1
	let totalBurstNotes = 0
	let lastNoteTime
	beatmap.hitObjects.forEach(hits => {

		// if object is a circle
		if (hits.type & 1 == 1) {

			// if a burst hasnt started, do no checks and begin the current burst on this object
			if (currentBurstCount == 0) {

				// for the first circle, we need to set this variable
				lastNoteTime = hits.time
				currentBurstCount = 1

			} else {
				// this is the second circle in a row, so we need to check if is <= 1/4 timing away from the last note

				// bpm logic: we need to keep track of the current bpm at any time for 1/4 comparisons.
				// T = timing point, C = circle
				// Two cases:
				// ___T1__C1___T2___C2____T3_____
				// ___T1_________C1______________
				// To avoid constant checking for each timing point, if the current circle is past the 2ND last timing point, remove it from the bpm array.
				// This way we get O(1) bpm checking, the current bpm will always be the first bpm in the array.
				if (bpms.length >= 2) {
					if (hits.time > bpms[0].time && hits.time > bpms[1].time) {
						bpms.shift()
					}
				}
				const bpm = bpms[0].bpm

				// 1/4 time calculation in ms
				// bpm * 4 = notes per minute.. / 60 = notes per second.. 1/ans = seconds per note.. * 1000 = ms per note
				const calculatedTimeDifference = Math.ceil((1/(bpm*4/60))*1000)*1.1

				// if last note is within this time period, count it as a burst
                const timeDifference = hits.time - lastNoteTime
				if (timeDifference <= calculatedTimeDifference && timeDifference < maximumTimeDifference) {
					currentBurstCount++

					// set as max burst length if greater than current
					if (currentBurstCount > maxBurstCount) {
						maxBurstCount = currentBurstCount
						maxBurstEndsAt = hits.time
					}

					// keep track of total notes in bursts
					if (currentBurstCount == burstCount) {
						totalBurstNotes += burstCount
					} else if (currentBurstCount > burstCount) {
						totalBurstNotes++
					}
				} else {
					currentBurstCount = 0
				}
				// finally, keep track of last note time
				lastNoteTime = hits.time
			}
		} else {
			currentBurstCount = 0
			 lastNoteTime = hits.time
		}
	})
	return (totalBurstNotes/beatmap.hitObjects.length)*100 >= minimumPercentage
})

function convertTimingBpm(timingPoints) {

	const bpmList = []

	timingPoints.forEach(point => {
		if (point.inherited) {
			bpmList.push({bpm: Math.round(60000 / point.bpm), time: point.offset})
		}
	})

	return bpmList
}

resolve(filtered)
`

export const farm = `
const filtered = beatmaps.filter(beatmap => farmSets.includes(beatmap.setId.toString()))

resolve(filtered)
`
