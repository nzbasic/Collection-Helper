const modsDict = new Map<string, number>();

modsDict.set("ez", 1)
modsDict.set("td", 2)
modsDict.set("hd", 3)
modsDict.set("hr", 4)
modsDict.set("dt", 6)
modsDict.set("ht", 8)
modsDict.set("nc", 9)
modsDict.set("fl", 10)
modsDict.set("4k", 15)
modsDict.set("5k", 16)
modsDict.set("6k", 17)
modsDict.set("7k", 18)
modsDict.set("8k", 19)
modsDict.set("fi", 20)
modsDict.set("rd", 21)
modsDict.set("cn", 22)
modsDict.set("tg", 23)
modsDict.set("9k", 24)
modsDict.set("ck", 25)
modsDict.set("1k", 26)
modsDict.set("3k", 27)
modsDict.set("2k", 28)
modsDict.set("v2", 29)
modsDict.set("mr", 30)

export function convertMods(mods: string[]) {
  let result = 0;
  mods.forEach(mod => {
    // best nullish coalesce ever done
    result += Math.pow(2, modsDict.get(mod)??-Infinity);
  });
  return result;
}

