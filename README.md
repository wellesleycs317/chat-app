# chat-app
A simple app that allows users to post messages on several channels

## Installation steps

1. On your computer, while connected to an appropriate folder that you own,
   run the following in an appropriate shell (terminal window):
   `git clone https://github.com/wellesleycs317/chat-app.git`
2. `cd` to the `chat-app` directory created by `git clone`
3. Run `yarn` to create and populate the the `node_modules` subdirectory
4. If you haven't done so already, follow the steps in the Lec 22 slides to 
   create a Firebase project with authentication & Firestore
5. In `App.js`, replace the stub for `const firebaseConfig = { ... }` with 
   the details you saved in Step 4c from the Lec 22 slides
6. Run `expo start` to test your app. 

## Images Branch

This is the images branch, which allows adding images to chat posts
that can be saved to Firebase storage and viewed in message posts.

For details, study how `postMessage` works in `ChatViewScreen.js`,
and how some messages contain an `imageUri` field that is filled
from the `downloadURL` in Firebase storage. 

### Known issues

* On iPhones, the keyboard does not go away when a message 
  is posted. Does someone know how to fix this?

* On my iPad, posting an image works if the image is small,
  but crashes if the image is big. 
