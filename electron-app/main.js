const { app, BrowserWindow, Menu, shell, dialog } = require('electron')
const path = require('path')

const APP_URL = 'https://achavez2-q4ingenieros.nxftdm.easypanel.host'
const ICON    = path.join(__dirname, 'build', 'icon.png')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width:     1440,
    height:    900,
    minWidth:  1024,
    minHeight: 600,
    icon:      ICON,
    title:     'Q4 Ingenieros',
    backgroundColor: '#F0F2F6',   // canvas color — no white flash while loading
    show: false,
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      webSecurity:      true,
    },
  })

  // No native menu bar (File / Edit / View …)
  Menu.setApplicationMenu(null)

  // Load the cloud app
  mainWindow.loadURL(APP_URL)

  // Open maximized, only show once content is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  // If connection fails, show a friendly error
  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    if (code === -3) return   // ERR_ABORTED — happens on redirects, ignore
    mainWindow.loadFile(path.join(__dirname, 'offline.html'))
  })

  // Keep navigation inside the app domain
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_URL) && !url.startsWith('data:')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // New windows (target="_blank" links): open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_URL)) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => app.quit())

app.on('activate', () => { if (!mainWindow) createWindow() })
