import electron from 'electron'

const { ipcRenderer } = electron

const selector = {
    allMessages: '._1t_p.clearfix',
    receivedOnly: '_1t_q',
    sendersName: '._17w2 ._3oh-',
    conversation: '._4u-c._1wfr._9hq',

    selectedThread: '._5l-3._1ht1._1ht2',
    threadList: '[role="navigation"] > div > ul',
    unreadThreads: '._5l-3._1ht1[aria-live="polite"]'
}

const timeShift = new Date().getTimezoneOffset() / 60

const cb = (func, ...args) => {
    if (typeof func === 'function') {
        return func(...args)
    }
    return null
}

const dateNow = () => {
    const now = new Date()
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(),
                    now.getHours() + timeShift, now.getMinutes())
}

const startDate = dateNow()

const getSendersName = () => {
    return document.querySelector(selector.sendersName).textContent
}

const getSendersId = () => {
    const userID = /[\d]+/
    return document.querySelector(selector.selectedThread)
            .childNodes[0].id.match(userID)[0]
}

const getAllMessages = () => {
    return document.querySelectorAll(selector.allMessages)
}

// Filter out messages without the child with "_1t_q" class (sender's profile pic)
const getReceivedMessages = () => {
    return Array.prototype.filter.call(getAllMessages(), messageNode => {
        return messageNode.childNodes[0].className === selector.receivedOnly
    })
}

const hoursMinutes = timeString => {
    const regex = /([\d:]+)(am|pm)/
    const time = timeString.match(regex)

    const twentyFour = { am: 0, pm: 12 }

    return  [
                parseInt(time[1].split(':')[0].replace('12', '0')) + timeShift + twentyFour[time[2]],
                parseInt(time[1].split(':')[1])
            ]
}

const parseDateToday = date => {
    const [inputTime] = date

    const now = new Date()

    const today = [now.getFullYear(), now.getMonth(), now.getDate()]
    return Date.UTC(...today, ...hoursMinutes(inputTime))
}

const dayToNumber = day => {
    const dayNumbers = {
        Sunday: 0, Monday: 1, Tuesday: 2,
        Wednesday: 3, Thursday: 4, Friday: 5,
        Saturday: 6
    }

    return dayNumbers[day]
}

const daysAgo = (today, before) => {
    before = dayToNumber(before)

    const dayOffset = today - before
    return dayOffset < 0 ? dayOffset + 7 : dayOffset
}

const parseThisWeek = date => {
    const [inputDay, inputTime] = date

    const now = new Date()
    const todayInWeek = now.getDay()
    const todayInMonth = now.getDate()

    const msgInMonth = todayInMonth - daysAgo(todayInWeek, inputDay)
    const msgDate = new Date(now.setDate(msgInMonth))

    const msg = [msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate()]
    return Date.UTC(...msg, ...hoursMinutes(inputTime))
}

const strToMonth = monthString => {
    const month = {
        January: 0, February: 1, March: 2,
        April: 3, May: 4, June: 5,
        July: 6, August: 7, September: 8,
        October: 9, November: 10, December: 11
    }

    return month[monthString]
}

const parseThisYear = date => {
    const [inputMonth, inputDay, inputTime] = date

    const now = new Date()

    const msgDate = [now.getFullYear(), strToMonth(inputMonth), parseInt(inputDay)]
    return Date.UTC(...msgDate, ...hoursMinutes(inputTime))
}

const parseAnyDate = date => {
    const [inputMonth, inputDay, inputYear, inputTime, input12hour] = date

    const msgDate = [parseInt(inputYear), strToMonth(inputMonth), parseInt(inputDay)]
    return Date.UTC(...msgDate, ...hoursMinutes(`${inputTime}${input12hour}`))
}

const parseDate = (date, sendersName) => {
    if (date.indexOf(sendersName) !== -1) {
        date = date.replace(`${sendersName} `, '')
    }
    date = date.split(' ')

    switch(date.length) {
        // e.g. 3:40pm
        case 1: return parseDateToday(date)
        // e.g. Tuesday 9:21am
        case 2: return parseThisWeek(date)
        // e.g. March 21st, 5:43pm
        case 3: return parseThisYear(date)
        // e.g. October 2, 2016 11:03 pm
        case 5: return parseAnyDate(date)
    }

}

const msgType = {
    textMessage: '_3oh- _58nk',
    media: '_5fk1',
    sticker: '_2poz _ui9',
    thumbsUp: '_576q',
    hugeEmoji: '_2poz _ui9 _383m',
    gif: '_3zvs _5z-5',
    link: '_5rw4',
    voice: '_hh7 _s1-',
    attachment: '_2uf5',
    youtubePreview: '_4u-c',
    emojiOnly: ''
}

const freeTheLink = link => {
    const fbShit = /https:.+\.php\?u=|&h=.+|url\("|"\)/g
    const ytFix = /https:\/\/www\.youtube\.com\/embed\//g
    return link.replace(fbShit, '').replace(/%3A/g, ':').replace(/%2F/g, '/')
            .replace(/%3F/g, '?').replace(/%26/g, '&').replace(/%/g, '=')
            .replace(ytFix, 'https://www.youtube.com/watch?v=')
}

const isMessageFul = (str, alt) => {
    if (str === undefined || str === null || str === '' || typeof str !== 'string') return alt
    return str
}

const constructMsg = (message, date, sendersName, sendersID, type) => {
    return {
        type: type,
        date: date,
        sender: sendersName,
        sender_id: sendersID,
        content: message
    }
}

const processText = (message, date, sendersName, sendersID) => {
    const freeTheEmoji = /<img alt="|" class[^>]*>/g
    const stripHTML = /<\/?([a-z][a-z0-9]*)\b[^>]*>?/gi

    let text = message.innerHTML.replace(freeTheEmoji, '').replace(stripHTML, '').trim()
    text = isMessageFul(text, 'Couldn\'t retrieve the text message')

    const textMessage = constructMsg(
        text,
        date,
        sendersName,
        sendersID,
        'text')

    // Check if there are any attachments
    if (message.parentNode.childNodes.length !== 1) {
        let messages = [textMessage]

        let attachments = message.parentNode.childNodes[1].childNodes[0]
        messages.push(createMessage(attachments, date, sendersName, sendersID))

        return messages

    // If not, return just the text message
    } else {
        return textMessage
    }
}

const processMedia = (message, date, sendersName, sendersID) => {
    const dontDownload = /\&dl=1/g

    // Photo album
    if (message.childNodes[0].className === '_2n8g') {
        const images = []
        message.childNodes[0].childNodes.forEach(image => {
            let imgURL = freeTheLink(image.style['background-image'])
            imgURL = isMessageFul(imgURL, 'Couldn\'t get the image URL')
            images.push(constructMsg(
                imgURL,
                date,
                sendersName,
                sendersID,
                'image'))
        })
        return images

    // Single image
    } else if (message.childNodes[0].className === '_4tsk _52mr') {
        let imgURL = freeTheLink(message.childNodes[0].style['background-image'])
        imgURL = isMessageFul(imgURL, 'Couldn\'t get the image URL')

        return constructMsg(
            imgURL,
            date,
            sendersName,
            sendersID,
            'image')

    // Video
    } else if (message.childNodes[0].className.indexOf('_ccq') !== -1){
        // let videoURL = message.childNodes[0].childNodes[0].childNodes[0]
        //                 .childNodes[0].src
        let videoURL = message.querySelector('video')
        videoURL = videoURL !== null ? videoURL.src : null

        videoURL = (typeof videoURL === 'string') ?
                videoURL.replace(dontDownload, '') :
                'Couldn\'t get the video URL'

        return constructMsg(
            videoURL,
            date,
            sendersName,
            sendersID,
            'video')

    // Unknown type of media
    } else {
        return constructMsg(
            'Message with attachment',
            date,
            sendersName,
            sendersID,
            'attachment')
    }
}

const processThumbsUp = (message, date, sendersName, sendersID) => {
    return constructMsg(
        '👍',
        date,
        sendersName,
        sendersID,
        'thumbs_up')
}

const processSticker = (message, date, sendersName, sendersID) => {
    const freeTheSticker = /\d+/
    const stickerID = message.style['background-image'].match(freeTheSticker)
    let stickerURL = `https://messenger.com/stickers/asset/?sticker_id=${stickerID}`

    return constructMsg(
        stickerURL,
        date,
        sendersName,
        sendersID,
        'sticker')
}

const processHugeEmoji = (message, date, sendersName, sendersID) => {
    let emoji = message !== null ? message.getAttribute('aria-label') : null

    emoji = isMessageFul(emoji, 'Huge Emoji')

    return constructMsg(
        emoji,
        date,
        sendersName,
        sendersID,
        'huge_emoji')
}

const processGIF = (message, date, sendersName, sendersID) => {
    // let gifURL = message.childNodes[0].childNodes[0]
    //                 .childNodes[0].childNodes[0].src
    let gifURL = message.querySelector('img[src*=".gif"]').src

    gifURL = isMessageFul(gifURL, 'Couldn\'t get the GIF URL')

    return constructMsg(
        gifURL,
        date,
        sendersName,
        sendersID,
        'gif')
}

const processFeatLink = (message, date, sendersName, sendersID) => {
    let link = message.href
    link = isMessageFul(link, 'Couldn\'t get the exact link')

    return constructMsg(
        freeTheLink(link),
        date,
        sendersName,
        sendersID,
        'link')
}

const processVoice = (message, date, sendersName, sendersID) => {
    return constructMsg(
        'Voice Message',
        date,
        sendersName,
        sendersID,
        'voice')
}

const processAttachment = (message, date, sendersName, sendersID) => {
    let attachments = []

    message.parentNode.parentNode.childNodes.forEach(att => {
        let attURL = att.href
        attURL = isMessageFul(attURL, 'Couldn\'t get attachment link')

        if (att.className !== msgType.textMessage) {
            attachments.push(constructMsg(
                attURL,
                date,
                sendersName,
                sendersID,
                'attachment'))
        }
    })

    return attachments
}

// We don't want this, 'cause the YT link will probably be in a previous message
const processYTPreview = (message, date, sendersName, sendersID) => {
    let ytEmbedLink = message.querySelector(`[class*="${msgType.link}"]`).href
    ytEmbedLink = isMessageFul(ytEmbedLink, 'Couldn\'t get the video link')

    return constructMsg(
        freeTheLink(ytEmbedLink),
        date,
        sendersName,
        sendersID,
        'youtube_video')
}

const createMessage = (message, date, sendersName, sendersID) => {
    const msgIdentity = message.className

    if (msgIdentity === msgType.textMessage || msgIdentity === msgType.emojiOnly) {
        return processText(message, date, sendersName, sendersID)
    } else if (msgIdentity.indexOf(msgType.media) !== -1) {
        return processMedia(message, date, sendersName, sendersID)
    } else if (msgIdentity.indexOf(msgType.thumbsUp) !== -1) {
        return processThumbsUp(message, date, sendersName, sendersID)
    } else if (msgIdentity === msgType.sticker) {
        return processSticker(message, date, sendersName, sendersID)
    } else if (msgIdentity === msgType.hugeEmoji) {
        return processHugeEmoji(message, date, sendersName, sendersID)
    } else if (msgIdentity === msgType.gif) {
        return processGIF(message, date, sendersName, sendersID)
    } else if (msgIdentity === msgType.link) {
        return processFeatLink(message, date, sendersName, sendersID)
    } else if (msgIdentity.indexOf(msgType.voice) !== -1) {
        return processVoice(message, date, sendersName, sendersID)
    } else if (msgIdentity === msgType.attachment) {
        return processAttachment(message, date, sendersName, sendersID)
    } else if (msgIdentity === msgType.youtubePreview) {
        return processYTPreview(message, date, sendersName, sendersID)
    } else {
        return constructMsg('Unidentifiable Message', date, sendersName, sendersID, 'unknown')
    }

}

const getMessages = callback => {
    const sendersName = getSendersName()
    const sendersID = getSendersId()
    let messages = []

    getReceivedMessages().forEach(receivedNode => {
        // Use node's second child to go through individual messages
        const messageNodes = receivedNode.childNodes[1].childNodes

        for (let i = 1; i < messageNodes.length; i++) {
            const ptntlDate = messageNodes[i].querySelector('div[data-hover="tooltip"]')
            const altDate = receivedNode.querySelector('div[data-hover="tooltip"]')

            const messageDate = ptntlDate === null ?
                                parseDate(altDate.getAttribute('data-tooltip-content'), sendersName) :
                                parseDate(ptntlDate.getAttribute('data-tooltip-content'), sendersName)


            if (messageDate < startDate) continue

            let message = createMessage(
                                messageNodes[i].childNodes[0]
                                .childNodes[0].childNodes[0],
                                messageDate,
                                sendersName,
                                sendersID)

            // Check if the node has a tab with preview (link/photo)
            if (messageNodes[i].childNodes.length > 1) {
                if (messageNodes[i].childNodes[1].className.indexOf('_3058') !== -1) {
                    let tabLink = messageNodes[i].querySelector(`[class*="${msgType.link}"]`)

                    // Link with preview
                    if (tabLink !== null) {
                        tabLink = freeTheLink(tabLink.href)
                        if (message.content.indexOf(tabLink) === -1) {
                            message.content += ` ${tabLink}`
                        }

                    // Photo/video attachment
                    } else {
                        let photo = messageNodes[i].childNodes[1].childNodes[0].childNodes[0]
                        message = [message]
                        message.push(createMessage(
                                        photo,
                                        messageDate,
                                        sendersName,
                                        sendersID))
                    }
                }
            }

            const pushHierarchy = (array, item) => {
                if (Array.isArray(item)) {
                    item.forEach(it => {
                        pushHierarchy(array, it)
                    })
                } else {
                    array.push(item)
                }
            }

            pushHierarchy(messages, message)

        }
    })

    return cb(callback, messages)
}

const isAlreadySent = (msg, msgArray) => {
    for (let i = 0; i < msgArray.length; i++) {
        const dateDifference = Math.abs(msg.date - msgArray[i].date)

        if (msg.content === msgArray[i].content &&
            msg.sender === msgArray[i].sender &&
            dateDifference <= 120000
        ) return true
    }
    return false
}

const messagesFilter = () => {
    let sentMessages = []

    return (messages, callback) => {
        let newMessages = []

        messages.forEach(msg => {
            if ( !isAlreadySent(msg, sentMessages) ) {
                newMessages.push(msg)
                sentMessages.push(msg)
            }
        })

        return cb(callback, newMessages)
    }
}

const filterOutOld = messagesFilter()

const getNewMessages = callback => {
    getMessages(messages => {
        filterOutOld(messages, newMessages => {
            return cb(callback, newMessages)
        })
    })
}

// GOING THROUGH THE CONVERSATIONS ——————————————————————————————————

// Stolen from Caprine, haha https://github.com/sindresorhus/caprine
const getIndex = (elementOrNext = false) => {
	const selected = !elementOrNext && document.querySelector(selector.selectedThread) ||
                     elementOrNext

	if (!selected && !elementOrNext) {
		return 0
	}

	const list = selected.parentNode.childNodes
	const index = Array.prototype.indexOf.call(list, selected) + (elementOrNext ? 0 : 1)

    return index
}

const nextUnread = () => {
    const unread = document.querySelector(selector.unreadThreads)
    if (!unread) {
        return getIndex()
    } else {
        return getIndex(unread)
    }
}

const markRead = () => {
    const conversation = document.querySelector(selector.conversation)
    if (conversation) conversation.click()
}

const threadOnload = callback => {
    let isThere = setInterval(() => {
        if (document.querySelector(selector.conversation) !== null) {
            clearInterval(isThere)
            markRead()
            return cb(callback)
        }
    }, 200)
}

const selectThread = (index, callback) => {
	let thread = document.querySelector(selector.threadList).children[index] ||
                 document.querySelector(selector.threadList).children[0]

    thread.firstChild.firstChild.click()
    return threadOnload(callback)
}

let lastTimeChecked = startDate

const threadOnloadOverride = () => {
    const now = Date.now()
    if ( (now - lastTimeChecked) > 5000 ) {
        startReceiving()
    }
}

const startReceiving = () => {
    let loadOverride = setInterval(threadOnloadOverride, 6000)

    selectThread(nextUnread(), () => {
        getNewMessages(messages => {
            messages.forEach(message => {
                ipcRenderer.send('messenger_new', message)
            })

            lastTimeChecked = Date.now()
            setTimeout(startReceiving, 400)
            clearInterval(loadOverride)
        })
    })
}

const login = credentials => {
    const loginFailed = document.querySelector('div[class="_3403 _3404"]')
    if (loginFailed) {
        let failedMessage = 'Error: Couldn\'t log in. '

        if (loginFailed.innerHTML.indexOf('incorrect') !== -1) {
            failedMessage += 'Password is incorrect'
        } else if(loginFailed.innerHTML.indexOf('too many') !== -1) {
            failedMessage += 'Trying too many times'
        } else {
            failedMessage += 'Don\'t know why though'
        }

        const errorMessage = {
            content: failedMessage,
            type: 'error'
        }

        ipcRenderer.send('message_onstart', errorMessage)
    }

    const loginEmail = document.querySelector('input[id="email"]')
    const loginPass = document.querySelector('input[id="pass"]')
    const loginPersistent = document.querySelector('input[name="persistent"]')
    const loginForm = document.querySelector('form[id="login_form"]')

    loginEmail.value = credentials.userEmail ? credentials.userEmail : ''
    loginPass.value = credentials.userPass ? credentials.userPass : ''

    loginPersistent.click()

    if (credentials.userEmail && credentials.userPass) {
        loginForm.submit()
    } else {
        ipcRenderer.send('show_window')
    }
}

window.onload = setTimeout(() => {
    const loggedIn = ipcRenderer.sendSync('is_logged_in')

    if (loggedIn) {
        startReceiving()

        const loggedInMessage = {
            content: 'Successfully logged in!',
            date: startDate,
            type: 'success'
        }
        ipcRenderer.send('message_onstart', loggedInMessage)
        ipcRenderer.send('hide_window')

    } else {
        login( ipcRenderer.sendSync('login_credentials') )
    }
}, 2000)
