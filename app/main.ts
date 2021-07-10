import { app, BrowserWindow } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as url from "url";
import * as express from "express";
import * as cors from "cors";
import collectionRouter from './router/collections'
import loadRouter from './router/load'
import beatmapRouter from './router/beatmaps'
import filterRouter from './router/filters'

const rest = express();

rest.use(express.json({limit: '50mb'}));
rest.use(express.urlencoded({ extended: false, limit: '50mb' }));
rest.use(cors({ credentials: true, origin: true }));
rest.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

rest.use("/collections", collectionRouter)
rest.use("/", loadRouter);
rest.use("/beatmaps", beatmapRouter)
rest.use("/filters", filterRouter)

rest.listen(7373, '127.0.0.1');

// Initialize remote module
//require("@electron/remote/main").initialize();

let win: BrowserWindow = null
const args = process.argv.slice(1)
export const serve = args.some((val) => val === "--serve");

const mainOpts: Electron.BrowserWindowConstructorOptions = {
  x: 0,
  y: 0,
  width: 1400,
  height: 900,
  minWidth: 1400,
  backgroundColor: '#fff',
  minHeight: 900,
  webPreferences: {
    nodeIntegration: true,
    allowRunningInsecureContent: serve ? true : false,
    contextIsolation: false, // false if you want to run 2e2 test with Spectron
    enableRemoteModule: false, // true if you want to run 2e2 test  with Spectron or use remote module in renderer context (ie. Angular)
  },
  title: "Collection Helper"
};

function createWindow(): BrowserWindow {
  // Create the browser window.
  win = new BrowserWindow(mainOpts);
  win.setMenu(null);

  if (serve) {
    win.webContents.openDevTools();
    require("electron-reload")(__dirname, {
      electron: require(path.join(__dirname, "/../node_modules/electron")),
    });
    win.loadURL("http://localhost:4200");
  } else {

    // Path when running electron executable
    let pathIndex = "./index.html";

    if (fs.existsSync(path.join(__dirname, "../app/index.html"))) {
      // Path when running electron in local folder
      pathIndex = "../app/index.html";
    }

    win.loadURL(
      url.format({
        pathname: path.join(__dirname, pathIndex),
        protocol: "file:",
        slashes: true,
      })
    );

    win.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  win.on("closed", () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  return win;
}

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  if (!serve) {
    app.on("ready", () => setTimeout(createWindow, 400));
  }


  // Quit when all windows are closed.
  app.on("window-all-closed", () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });
} catch (e) {
  // Catch Error
  // throw e;
}
