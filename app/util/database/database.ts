import { Database as Sqlite3, Statement } from "sqlite3";
import { open, Database } from "sqlite";
import * as path from 'path'
import { serve } from '../../main'
import * as fs from 'fs'
import { app } from "electron";
import { CustomFilter } from "../../../models/filters";
import { updateFarmFallback, writeFilter } from "./filters";
import { promisify } from 'util';
import { stream, farm } from './filterScripts'

let database: Database<Sqlite3, Statement>;
let pathToDbFile: string

export const getDb = async (): Promise<Database<Sqlite3, Statement>> => {
  if (!database) {

    if (serve) {
      pathToDbFile = "database.db"
    } else {
      pathToDbFile = path.join(app.getPath('userData'), 'database.db');
    }

    try {
      await fs.promises.stat(pathToDbFile)
      await setupDb()
    } catch {
      await setupFilters()
    }
  }

  return database;
};

const setupDb = async () => {
  database = await open({ filename: pathToDbFile, driver: Sqlite3 });

  // Migrate old filters from beta
  const filterRes = await database.get("SELECT name FROM pragma_table_info('filters') LIMIT 1")
  if (filterRes) {
    await migrateFilters()
  }

  // Setup farm fallback if osutracker.com is down or there is no network connection
  const farmRes = await database.get("SELECT name FROM pragma_table_info('farmfallback') LIMIT 1")
  if (!farmRes) {
    await database.run("CREATE TABLE farmfallback (setId TEXT PRIMARY KEY)")
    await updateFarmFallback(fallbackFarm)
  }

  await database.run("CREATE TABLE IF NOT EXISTS filters (name TEXT PRIMARY KEY, filter TEXT, description TEXT, gethitobjects INTEGER, iscached INTEGER, cache BLOB)");
  await database.run("CREATE TABLE IF NOT EXISTS osupath (path TEXT PRIMARY KEY)");
  await database.run("CREATE TABLE IF NOT EXISTS missingmaps (md5 TEXT PRIMARY KEY, setId INTEGER)")
  await database.run("CREATE TABLE IF NOT EXISTS darkmode (mode INTEGER)")
  await database.run("CREATE TABLE IF NOT EXISTS language (code TEXT)")
}

const setupFilters = async () => {
  await setupDb()
  await writeFilter(streamFilter)
  await writeFilter(farmFilter)
}

const streamFilter: CustomFilter = {
  name: "Stream",
  description: "Maps over 140 bpm with >20% of their notes in bursts (length >5)",
  getHitObjects: true,
  isCached: false,
  cache: [],
  numberCached: 0,
  filter: "const burstCount = 5\n\nlet filtered = beatmaps.filter(beatmap => {\n\tlet bpms = convertTimingBpm(beatmap.timingPoints) \n\n\tif (!bpms.length) {\n\t\treturn false\n\t}\n\n\tif (beatmap.bpm <= 140) {\n\t\treturn false\n\t}\n\n\tlet currentBurstCount = 0\n\tlet maxBurstCount = 1\n\tlet totalBurstNotes = 0\n\tlet lastNoteTime\n\tbeatmap.hitObjects.forEach(hits => { \n\n\t\t// if object is a circle\n\t\tif (hits.type & 1 == 1) {      \n\n\t\t\t// if a burst hasnt started, do no checks and begin the current burst on this object\n\t\t\tif (currentBurstCount == 0) {\n\n\t\t\t\t// for the first circle, we need to set this variable\n\t\t\t\tlastNoteTime = hits.time\n\t\t\t\tcurrentBurstCount = 1\n\n\t\t\t} else {\n\t\t\t\t// this is the second circle in a row, so we need to check if is <= 1/4 timing away from the last note \n\n\t\t\t\t// bpm logic: we need to keep track of the current bpm at any time for 1/4 comparisons.\n\t\t\t\t// T = timing point, C = circle\n\t\t\t\t// Two cases:\n\t\t\t\t// ___T1__C1___T2___C2____T3_____\n\t\t\t\t// ___T1_________C1______________\n\t\t\t\t// To avoid constant checking for each timing point, if the current circle is past the 2ND last timing point, remove it from the bpm array.\n\t\t\t\t// This way we get O(1) bpm checking, the current bpm will always be the first bpm in the array.\n\t\t\t\tif (bpms.length >= 2) {\n\t\t\t\t\tif (hits.time > bpms[0].time && hits.time > bpms[1].time) {\n\t\t\t\t\t\tbpms.shift()\n\t\t\t\t\t}\n\t\t\t\t}	\n\t\t\t\tlet bpm = bpms[0].bpm\n\n\t\t\t\t// 1/4 time calculation in ms\n\t\t\t\t// bpm * 4 = notes per minute.. / 60 = notes per second.. 1/ans = seconds per note.. * 1000 = ms per note\n\t\t\t\tlet maxTimeMs = Math.round((1/(bpm*4/60))*1000)\n\n\t\t\t\t// if last note is within this time period, count it as a burst\n\t\t\t\tif ((hits.time - lastNoteTime) <= maxTimeMs) {\n\t\t\t\t\tcurrentBurstCount++\n\n\t\t\t\t\t// set as max burst length if greater than current\n\t\t\t\t\tif (currentBurstCount > maxBurstCount) {\n\t\t\t\t\t\tmaxBurstCount = currentBurstCount\n\t\t\t\t\t\tmaxBurstEndsAt = hits.time\n\t\t\t\t\t}\n\n\t\t\t\t\t// keep track of total notes in bursts\n\t\t\t\t\tif (currentBurstCount == burstCount) {\n\t\t\t\t\t\ttotalBurstNotes += burstCount\n\t\t\t\t\t} else if (currentBurstCount > burstCount) {\n\t\t\t\t\t\ttotalBurstNotes++\n\t\t\t\t\t}\n\t\t\t\t} else {\n\t\t\t\t\tcurrentBurstCount = 0\n\t\t\t\t}\n\t\t\t\t// finally, keep track of last note time\n\t\t\t\tlastNoteTime = hits.time\n\t\t\t}\n\t\t} else {\n\t\t\tcurrentBurstCount = 0\n\t\t\t lastNoteTime = hits.time\n\t\t}\n\t})\n\treturn (totalBurstNotes/beatmap.hitObjects.length)*100 >= 20\n})\n\nfunction convertTimingBpm(timingPoints) {\n\n\tlet bpmList = []  \n\n\ttimingPoints.forEach(point => {\n\t\tif (point.inherited) {\n\t\t\tbpmList.push({bpm: Math.round(60000 / point.bpm), time: point.offset})\n\t\t}\n\t})\n\n\treturn bpmList\n}\n\nresolve(filtered)"
}

const farmFilter: CustomFilter = {
  name: "Farm",
  description: "Maps in the most popular mapsets",
  getHitObjects: false,
  isCached: false,
  cache: [],
  numberCached: 0,
  filter: "const filtered = beatmaps.filter(beatmap => farmSets.includes(beatmap.setId.toString()))\n\nresolve(filtered)"
}

const oldFilters = [
  {
    old: "const burstCount = 5\n\nlet filtered = beatmaps.filter(beatmap => {\n\tlet bpms = convertTimingBpm(beatmap.timingPoints) \n\n\tif (!bpms.length) {\n\t\treturn false\n\t}\n\n\tif (beatmap.bpm <= 140) {\n\t\treturn false\n\t}\n\n\tlet currentBurstCount = 0\n\tlet maxBurstCount = 1\n\tlet totalBurstNotes = 0\n\tlet lastNoteTime\n\tbeatmap.hitObjects.forEach(hits => { \n\n\t\t// if object is a circle\n\t\tif (hits.type & 1 == 1) {      \n\n\t\t\t// if a burst hasnt started, do no checks and begin the current burst on this object\n\t\t\tif (currentBurstCount == 0) {\n\n\t\t\t\t// for the first circle, we need to set this variable\n\t\t\t\tlastNoteTime = hits.time\n\t\t\t\tcurrentBurstCount = 1\n\n\t\t\t} else {\n\t\t\t\t// this is the second circle in a row, so we need to check if is <= 1/4 timing away from the last note \n\n\t\t\t\t// bpm logic: we need to keep track of the current bpm at any time for 1/4 comparisons.\n\t\t\t\t// T = timing point, C = circle\n\t\t\t\t// Two cases:\n\t\t\t\t// ___T1__C1___T2___C2____T3_____\n\t\t\t\t// ___T1_________C1______________\n\t\t\t\t// To avoid constant checking for each timing point, if the current circle is past the 2ND last timing point, remove it from the bpm array.\n\t\t\t\t// This way we get O(1) bpm checking, the current bpm will always be the first bpm in the array.\n\t\t\t\tif (bpms.length >= 2) {\n\t\t\t\t\tif (hits.time > bpms[0].time && hits.time > bpms[1].time) {\n\t\t\t\t\t\tbpms.shift()\n\t\t\t\t\t}\n\t\t\t\t}	\n\t\t\t\tlet bpm = bpms[0].bpm\n\n\t\t\t\t// 1/4 time calculation in ms\n\t\t\t\t// bpm * 4 = notes per minute.. / 60 = notes per second.. 1/ans = seconds per note.. * 1000 = ms per note\n\t\t\t\tlet maxTimeMs = Math.round((1/(bpm*4/60))*1000)\n\n\t\t\t\t// if last note is within this time period, count it as a burst\n\t\t\t\tif ((hits.time - lastNoteTime) <= maxTimeMs) {\n\t\t\t\t\tcurrentBurstCount++\n\n\t\t\t\t\t// set as max burst length if greater than current\n\t\t\t\t\tif (currentBurstCount > maxBurstCount) {\n\t\t\t\t\t\tmaxBurstCount = currentBurstCount\n\t\t\t\t\t\tmaxBurstEndsAt = hits.time\n\t\t\t\t\t}\n\n\t\t\t\t\t// keep track of total notes in bursts\n\t\t\t\t\tif (currentBurstCount == burstCount) {\n\t\t\t\t\t\ttotalBurstNotes += burstCount\n\t\t\t\t\t} else if (currentBurstCount > burstCount) {\n\t\t\t\t\t\ttotalBurstNotes++\n\t\t\t\t\t}\n\t\t\t\t} else {\n\t\t\t\t\tcurrentBurstCount = 0\n\t\t\t\t}\n\t\t\t\t// finally, keep track of last note time\n\t\t\t\tlastNoteTime = hits.time\n\t\t\t}\n\t\t} else {\n\t\t\tcurrentBurstCount = 0\n\t\t\t lastNoteTime = hits.time\n\t\t}\n\t})\n\treturn (totalBurstNotes/beatmap.hitObjects.length)*100 >= 20\n})\n\nfunction convertTimingBpm(timingPoints) {\n\n\tlet bpmList = []  \n\n\ttimingPoints.forEach(point => {\n\t\tif (point.inherited) {\n\t\t\tbpmList.push({bpm: Math.round(60000 / point.bpm), time: point.offset})\n\t\t}\n\t})\n\n\treturn bpmList\n}\n\nresolve(filtered)",
    updated: stream
  },
  {
    old: "(async () => {\n\tlet topSets = (await axios.get('https://osutracker.com/api/stats/farmSets')).data\n\tlet filtered = beatmaps.filter(beatmap => topSets.includes(beatmap.setId.toString()))\n\tresolve(filtered)\n})()",
    updated: farm
  }
]

//process filter updates
const migrateFilters = async () => {
  for (const filter of oldFilters) {
    const found = await database.get("SELECT * FROM filters WHERE filter = ?", [filter.old]);
    if (found) {
      await database.run("UPDATE filters SET filter = ? WHERE filter = ?", [filter.updated, filter.old]);
    }
  }
}

const fallbackFarm = ["1073074","765778","873811","781509","983911","542081","906786","320118","596704","894883","1053509","942642","881764","770300","859783","968171","952409","744772","863227","444335","1209835","869019","798007","842412","538998","1061287","1174505","962088","984684","1068768","1035167","325158","1171789","1155295","497942","807850","1004468","1148073","1129819","623924","931452","971957","1249048","921889","737128","773330","1178935","1440767","384772","805224","745312","1123162","770306","983942","482090","1028594","1207609","853519","513590","949071","380545","1280506","372851","474376","790895","953015","416153","185250","495332","917345","653534","601135","493273","874835","950289","456986","818778","1017271","765169","371128","409025","1244123","494768","819112","942866","352714","758344","935111","480765","1115477","462386","788233","661919","828757","451830","423527","351280","597111","249939","944993","884581","1224414","1180255","1034008","938926","451250","459149","696175","357466","896080","700726","337527","378183","413117","382400","1203416","368985","441155","785703","932165","842562","221954","785858","411894","966339","546878","808175","361740","1384619","705423","594170","1124391","338293","547504","414667","356357","1054931","399358","752073","1002271","293832","326920","127712","853600","364401","740068","251391","440706","1184314","374820","1187933","1101976","1193588","480609","763619","219380","1045600","1190710","925343","311328","569503","362039","985788","407175","816264","853469","652412","391953","778657","914242","754451","942775","362321","971051","1114770","487774","707380","485056","726747","865746","1164077","130104","501992","443751","664315","297969","497769","437797","771159","748836","450015","999126","945049","695316","842981","824205","702892","773801","352570","518737","864354","707032","790512","439609","836819","312042","1114339","354537","738011","269969","1009278","366070","671199","432290","925999","409214","295946","637445","838182","627110","376552","477640","508222","1210297","488630","282345","395846","780952","390071","775766","504995","292077","409164","503486","779047","363579","133693","845746","293563","208112","437097","288656","792964","701549","490956","1119418","947717","339335","671293","369354","952498","441167","308912","818349","323329","1254404","753356","351630","842236","854509","917930","1001653","798261","570938","356821","1255746","143812","732994","747535","459012","1091595","403759","355573","171388","503213","966062","374767","1341551","595163","1293358","866472","705655","386117","606419","485903","484532","600702","1065834","153776","285577","306591","373114","401869","1216255","456524","529724","342472","840260","342896","440650","325112","399061","680533","1028120","432314","661483","1011341","41384","1107950","662526","780651","514181","630407","1115534","586144","844633","445983","403612","728276","420390","335665","128931","478289","632130","1187395","500341","443589","1315700","661333","414543","919187","915182","751751","334469","405053","905158","1092468","237768","313330","259907","527431","467337","419588","929415","420265","703957","479811","378559","625669","186896","846599","50587","979801","317538","750743","829569","748291","939836","418441","394270","586121","232505","961598","452230","108461","738656","28751","886193","113458","557856","473415","785544","320717","357161","471261","1001825","647452","1002716","475886","962863","625986","517861","519521","930062","986865","1061694","370467","424295","289074","993307","400859","437055","510568","813969","292301","953303","1324247","196028","759178","1264537","329473","461966","1117851","375648","584389","557832","552726","859608","686601","1182043","1190719","107747","638950","559489","774670","575330","172055","1154585","315299","1112825","534054","739368","651721","976908","602803","286383","912207","118459","362718","746506","783769","1350684","1192768","253313","1108759","1246152","483503","1258913","311463","890270","111760","155118","337700","978477","1264800","727714","390668","611004","754219","358471","456237","1158561","347719","778585","395149","365963","985162","999645","511055","469475","268467","297909","558938","439104","1242911","510183","220636","598357","332952","175968","518097","370819","481927","460580","757410","295581","263765","339306","198978","1118112","558217","333947","297110","859370","431248","444079","720240","1175471","493305","496176","957835","594067","594429","874345","323773","305452","736560","1114649","241769","798420","465300","307034","695743","275461","79116","270407","886368","301830","1049704","1211739","765497","557733","737852","532165","532522","507835","134151","993306","540457","186458","420458","1206396","513294","452690","249624","1282660","1001305","1194661","383147","515670","282375","741171","860260","335534","925436","385248","315375","366706","348604","871425","1016145","402887","264147","1033492","119891","652142","936698","926563","410162","206284","80214","602408","29706","453230","1070357","487968","968656","219728","361307","499482","397378","446062","567163","503141","307163","931596","996445","332532","591987","347136","378196","202661","420754","170836","524966","864947","1146827","346301","24372","893614","323044","474731","84458","659093","554626","715596","143823","1091102","1180654","352726","302343","944137","378803","528037","768065","777733","786689","1253246","823259","602242","17331","516494","478405","859718","328284","402631","350381","1251840","210346","934522","266003","450393","788905","827743","870961","920466","301561","883276","136632","1260801","850717","727392","560389","343020","473066","706150","552702","359501","1144490","431983","471889","1234080","235551","757146","342242","977916","52203","528048","789885","232290","991440","260405","750963","878327","494460","457621","1013478","477725","713944","584520","765795","861113","228465","346339","716719","397905","725480","219763","161089","1108263","690977","996024","550344","159527","1293912","764602","456547","24313","723024","880938","420765","1038902","903106","526180","399328","1224232","626406","922004","933863","172013","332082","774716","1031041","67565","1099953","291517","1188740","286460","259127","1012262","328095","564534","231691","310499","1052724","656918","41874","363504","1008679","190222","665057","183656","685622","441459","349445","514601","372144","609311","431708","1094460","1115515","1230966","480298","898005","596910","518932","332623","901188","1159452","1149042","143397","573827","932291","637877","1098490","353650","347021"]

export default database;

