import electron from 'electron'
import path from 'path'
import fs from 'fs'
import EventEmitter from 'events'
import assert from 'assert'

const { app, BrowserWindow, session, ipcMain } = electron

const createWindow = () => {
    return new BrowserWindow({
        width: 500,
        height: 600,
        useContentSize: true,
        show: false,
        frame: false,
        fullscreen: false,
        webPreferences: {
            nodeIntegration: false, // Enables cookies
            preload: path.join(__dirname, 'messenger.js')
        }
    })
}

export class MessengerAPI extends EventEmitter {
    constructor(options = {}) {
        super()
        this.platformName = 'Messenger'
        this.URL = 'https://www.messenger.com/login/'
        this.userEmail = options.email || null
        this.userPass = options.pass || null
        this.apiWindow = null
    }

    getCookies(callback) {
        session.defaultSession.cookies.get({url: this.URL}, (error, cookies) => {
            assert.equal(error, null)
            if (typeof callback === 'function') return callback(cookies)
        })
    }

    removeAllCookies() {
        this.getCookies(cookies => {
            cookies.forEach(cookie => {
                session.defaultSession.cookies.remove(this.URL, cookie.name, () => {})
            })
        })
    }

    quit() {
        app.quit()
    }

    start(callback = null) {
        const _this = this

        app.on('ready', () => {
            this.apiWindow = createWindow()
            this.removeAllCookies()

            const { webContents } = this.apiWindow

            this.apiWindow.loadURL(this.URL)

            webContents.on('dom-ready', () => {
                const cssOverride = path.join(__dirname, 'css', 'messenger.css')
        		webContents.insertCSS( fs.readFileSync(cssOverride, 'utf8') )
            })

            // DEV
            // this.apiWindow.once('ready-to-show', () => {
            //     this.apiWindow.show()
            //     this.apiWindow.webContents.openDevTools()
            // })
        })

        app.on('window-all-closed', () => {
            this.quit()
        })

        ipcMain.on('messenger_new', (event, message) => {
            _this.emit('new_message', message)
        })

        ipcMain.on('message_onstart', (event, message) => {
            let res = [null, message]
            if (message.type === 'error') res = [message, null]

            if (typeof callback === 'function') callback(...res)
        })

        ipcMain.on('is_logged_in', (event, arg) => {
            let loggedIn = false

            _this.getCookies(cookies => {
                cookies.forEach(cookie => {
                    if (cookie.name === 'c_user') loggedIn = true
                })
                event.returnValue = loggedIn
            })
        })

        ipcMain.on('show_window', (event, arg) => {
            if ( !_this.apiWindow.isVisible() ) _this.apiWindow.show()
        })

        ipcMain.on('hide_window', (event, arg) => {
            if ( _this.apiWindow.isVisible() ) _this.apiWindow.hide()
        })

        ipcMain.on('login_credentials', (event, arg) => {
            event.returnValue = {
                userEmail: _this.userEmail,
                userPass: _this.userPass
            }
        })
    }
}
