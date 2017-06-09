<p>
  <h1 align="center">Messenger Personal API</h1>
  <h4 align="center">Hacky solution for receiving messages on personal accounts</h4>
  <p align="center"><a href="https://badge.fury.io/js/messenger-personal-api"><img src="https://badge.fury.io/js/messenger-personal-api.svg" alt="npm version" height="18"></a></p>
  <hr />
</p>

Why hacky? `messenger-personal-api` **is an Electron app** that extracts messages from Messenger.com's DOM... so not optimal, but working solution.

## Install
```sh
npm install messenger-personal-api --save
```
*You will need to have `electron` package installed as well.*

## Getting Started
```javascript
import { MessengerAPI } from 'messenger-personal-api'

const api = new MessengerAPI({
    email: 'your@email.com',
    pass: 'SuperSecretPassword'
})

api.start()

api.on('new_message', message => {
    console.log(`${message.sender}: ${message.content}`)
})
```

## Run
```sh
electron .
```
*You will need to run your program as an Electron app.*

**TIP:** If you need the API for non-electron app, you can build a very simple http(s) server on Electron and let it send POST requests to your app.

## API in Detail
### New instance of API
If you initialize the API with both e-mail and password, user will be logged in automatically.

If you only fill in the e-mail, you'll be prompted to type in your password securely via HTTPS connection to Messenger.com.

Password encryption will hopefully be implemented in future versions of the API.
```javascript
const api = new MessengerAPI({
    email: 'your@email.com',
    // Hard-code your password only if
    // you don't distribute this piece of app
    // where it could get decompiled
    pass: 'SuperSecretPassword'
})
```

### Start the API
```javascript
// Simply start the API
api.start()

// Or start and listen to useful messages
// (e.g. logged in, couldn't log in etc)
api.start((err, message) => {
    if (err) {
        console.error(err.content)
    } else {
        console.log(message)
    }
})
```

### Listen to new messages
```javascript
api.on('new_message', message => {
    // new message object
})
```

### Messages Format
All messages are sent to you as objects, e.g.:
```javascript
{
    type: 'text',
    date: 1496966580162, // Date in UTC format
    sender: 'Your Friend',
    sender_id: '1032752459',
    content: 'Chill out my friend 😎'
}
```

### Message `type:`
#### `text`
Returns plain text with emojis in `content`
#### `image`
Returns URL of the image/s in `content`
#### `video`
Returns URL of the video in `content`
#### `attachment`
Returns URL of the attached file in `content`
#### `thumbs_up`
Returns 👍 in `content`
#### `sticker`
Returns URL of the sticker in `content`
#### `huge_emoji`
Returns URL of the inflated emoji in `content`
#### `gif`
Returns the GIF URL in `content`
#### `link`
Returns the link from featured tab in `content`
#### `voice`
Currently can't retrieve the actual message.

## Contribute
These are some points that need few hours of work:
- ability to send messages
- leave DOM as much as possible (during final debugging, I found out messages are also passed to front-end in server response inside `thread_info.php`)
- genuinely secure way to store password in configuration

So if you're awesome and want to contribute to this project, go fork, clone and send pull requests!

### Shout-out!
Thanks to [Caprine](https://github.com/sindresorhus/caprine) for DOM-wrapped-in-Electron app inspiration.

## Disclaimer
This is a third-party application and is not affiliated with Facebook.
