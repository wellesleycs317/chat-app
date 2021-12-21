import React, { useState, useEffect, useContext } from "react";
import { FlatList, Image, Keyboard, LogBox, StyleSheet, ScrollView, 
         Text, TextInput, TouchableOpacity, 
         TouchableWithoutFeedback, View } from 'react-native';
import {Picker} from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { // access to Firestore storage features:
         getFirestore, 
         // for storage access
         collection, doc, addDoc, setDoc,
         query, where, getDocs
  } from "firebase/firestore";
import { // access to Firebase storage features (for files like images, video, etc.)
         getStorage, 
        ref, uploadBytes, uploadBytesResumable, getDownloadURL
       } from "firebase/storage";
import MyButton from './MyButton';
import { formatJSON, emailOf } from '../utils';
import { globalStyles } from '../styles/globalStyles';
import { testMessages } from '../fakeData';
import StateContext from './StateContext';

// Default initial channels
const defaultChannels = ['Arts', 'Crafts', 'Food', 'Gatherings', 'Outdoors'];

export default function ChatViewScreen(props) {
  const stateProps = useContext(StateContext);
  const firebaseProps = stateProps.firebaseProps;
  const auth = firebaseProps.auth;
  const db = firebaseProps.db;
  const storage = firebaseProps.storage;
  const authProps = stateProps.authProps;

  function addTimestamp(message) {
    // Add millisecond timestamp field to message 
    return {...message, timestamp:message.date.getTime()}
  }  

  // State for chat channels and messages
  const [channels, setChannels] = React.useState(defaultChannels);
  const [selectedChannel, setSelectedChannel] = React.useState('Food');
  const [selectedMessages, setSelectedMessages] = React.useState([]);
  const [textInputValue, setTextInputValue] = useState('');
  const [isComposingMessage, setIsComposingMessage] = useState(false);
  // Faking message database (just a list of messages) for local testing
  const [localMessageDB, setLocalMessageDB] = useState(testMessages.map( addTimestamp ));
  const [usingFirestore, setUsingFirestore] = useState(true); // If false, only using local data. 
  const [postImageUri, setPostImageUri] = useState(null);


  /***************************************************************************
   CHAT CHANNEL/MESSAGE CODE
   ***************************************************************************/

  // component mount and unmount
  useEffect(() => {

      console.log('ChatViewScreen did mount');
      

      console.log(`on mount: getMessagesForChannel('${selectedChannel}')`);
      getMessagesForChannel(selectedChannel); // find messages on mount 

      // This has worked already, so commenting it out
      // console.log(`on mount: populateFirestoreDB(testMessages)`);
      // populateFirestoreDB(testMessages); 

      return () => {
        // Anything in here is fired on component unmount.
        console.log('ChatViewScreen did unmount');
      }
    }, []);

  // Update messages when selectedChannel or localMessageDB changes
  useEffect(
    () => { 
      getMessagesForChannel(selectedChannel); 
      setTextInputValue(''); // empirically need on iOS to prevent keeping 
                             // text completion from most recent post
    },
    [selectedChannel, localMessageDB]
  ); 

  function toggleStorageMode() {
    setUsingFirestore(!usingFirestore);
  }

  /* 
   import { collection, query, where, getDocs } 
   const q = query(collection(db, "cities"), where("capital", "==", true));
   const querySnapshot = await getDocs(q);
  */ 

  async function getMessagesForChannel(chan) {
    console.log(`getMessagesForChannel(${chan}); usingFirestore=${usingFirestore}`);
    if (usingFirestore) {
      firebaseGetMessagesForChannel(chan); 
    } else {
      setSelectedMessages(localMessageDB.filter( msg => msg.channel === chan));
    }
  }

  function docToMessage(msgDoc) {
    // msgDoc has the form {id: timestampetring, 
    //                   data: {timestamp: ..., 
    //                          author: ..., 
    //                          channel: ..., 
    //                          content: ...}
    // Need to add missing date field to data portion, reconstructed from timestamp
    console.log('docToMessage');
    const data = msgDoc.data();
    console.log(msgDoc.id, " => ", data);
    return {...data, date: new Date(data.timestamp)}
  }

  async function firebaseGetMessagesForChannel(chan) {
    const q = query(collection(db, 'messages'), where('channel', '==', chan));
    const querySnapshot = await getDocs(q);
    // const messages = Array.from(querySnapshot).map( docToMessage );
    let messages = []; 
    querySnapshot.forEach(doc => {
        messages.push(docToMessage(doc));
    });
    setSelectedMessages( messages );
  }

  function composeMessage() {
    setIsComposingMessage(true);
  }

  function cancelMessage() {
    setIsComposingMessage(false);
    setPostImageUri(null);
  }

  async function postMessage() {
    console.log(`postMessage; usingFirestore=${usingFirestore}`);
    Keyboard.dismiss(); // hide the keyboard
    const now = new Date();
    const timestamp = now.getTime(); // millsecond timestamp
    const newMessage = {
      'author': authProps.loggedInUser.email, 
      'date': now, 
      'timestamp': timestamp, 
      'channel': selectedChannel, 
      'content': textInputValue, 
    }
    if (postImageUri) {
      newMessage.imageUri = postImageUri; // Local image uri
    }
    // Want to see new message immediately, no matter what:
    setSelectedMessages([...selectedMessages, newMessage]) 
    setIsComposingMessage(false);
    setTextInputValue('');
    if (! usingFirestore) {
      setLocalMessageDB([...localMessageDB, newMessage]);
    } else {
      if (!postImageUri) {
        firebasePostMessage(newMessage);
      } else {
        // If there's an image, we need to
        // (1) store the image in Firebase storage
        // (2) wait to for the downloadURL to include in the message
        // (3) and only then post the message with the download URL
        const storageRef = ref(storage, `chatImages/${timestamp}`);
        const fetchResponse = await fetch(postImageUri);
        // console.log(`fetchResponse: ${JSON.stringify(fetchResponse)}`);
        const imageBlob = await fetchResponse.blob();
        // console.log(`imageBlob: ${JSON.stringify(imageBlob)}`);
        const uploadTask = uploadBytesResumable(storageRef, imageBlob);
        // console.log(`uploadTask: ${JSON.stringify(uploadTask)}`);
        console.log(`Uploading image for message ${timestamp} ...`);
        uploadTask.on('state_changed',
                (snapshot) => {
                  // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                  console.log('Upload is ' + progress + '% done');
                  switch (snapshot.state) {
                  case 'paused':
                    console.log('Upload is paused');
                    break;
                  case 'running':
                    console.log('Upload is running');
                    break;
                  }
                }, 
                (error) => {
                  console.error(error);
                }, 
                async function() {
                  console.log(`Uploading image for message ${timestamp} succeeded!`);
                  const downloadURL = await getDownloadURL(storageRef);
                  console.log(`Message image file for ${timestamp} available at ${downloadURL}`);
                  const messageWithDownloadURL = {...newMessage, imageUri: downloadURL}; 
                  firebasePostMessage(messageWithDownloadURL);
                  setPostImageUri(null);
                });
        /*
        uploadTask.on('state_changed', function(snapshot) {
          }, function(error){
            console.error(error);
          }, async function() {
            console.log(`Uploading image for message ${timestamp} succeeded!`);
            const downloadURL = await getDownloadURL(storageRef);
            console.log(`Message image file for ${timestamp} available at ${downloadURL}`);
            const messageWithDownloadURL = {...newMessage, imageUri: downloadURL}; 
            firebasePostMessage(messageWithDownloadURL);
            setPostImageUri(null);
          });
        */
      }
    }
  }



  /*
    // Create the file metadata
  const metadata = {
    contentType: 'image/jpeg'
  };
  uploadImage = async(uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    var ref = firebaseApp.storage().ref().child("my-image");
    return ref.put(blob);
  }

  // Upload file and metadata to the object 'images/mountains.jpg'
  const storageRef = ref(storage, 'images/' + file.name);
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  // Listen for state changes, errors, and completion of the upload.
  uploadTask.on('state_changed',
                (snapshot) => {
                  // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                  console.log('Upload is ' + progress + '% done');
                  switch (snapshot.state) {
                  case 'paused':
                    console.log('Upload is paused');
                    break;
                  case 'running':
                    console.log('Upload is running');
                    break;
                  }
                }, 
                (error) => {
                  // A full list of error codes is available at
                  // https://firebase.google.com/docs/storage/web/handle-errors
                  switch (error.code) {
                  case 'storage/unauthorized':
                  // User doesn't have permission to access the object
                  break;
                  case 'storage/canceled':
                  // User canceled the upload
                  break;

                  // ...

                  case 'storage/unknown':
                  // Unknown error occurred, inspect error.serverResponse
                  break;
                  }
                }, 
                () => {
                  // Upload completed successfully, now we can get the download URL
                  getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                      console.log('File available at', downloadURL);
                    });
                }
                );

  */


  async function firebasePostMessage(msg) {
    // Add a new document in collection "messages"
    const timestampString = msg.timestamp.toString();
    const docMessage = {
          'timestamp': msg.timestamp, 
          'author': msg.author, 
          'channel': msg.channel, 
          'content': msg.content, 
        }
    if (msg.imageUri) {
      docMessage.imageUri = msg.imageUri;
    }
    console.log(`firebasePostMessage ${JSON.stringify(docMessage)}`);
    await setDoc(doc(db, "messages", timestampString), docMessage);
  }

  async function populateFirestoreDB(messages) {

    // Returns a promise to add message to firestore
    async function addMessageToDB(message) {
      const timestamp = message.date.getTime(); // millsecond timestamp
      const timestampString = timestamp.toString();

      // Add a new document in collection "messages"
      return setDoc(doc(db, "messages", timestampString), 
        {
          'timestamp': timestamp, 
          'author': message.author, 
          'channel': message.channel, 
          'content': message.content, 
        }
      );
    }

    // Peform one await for all the promises. 
    await Promise.all(
      messages.map( addMessageToDB ) 
    );

  }

  function signOutAndGoToSignIn() {
    authProps.logOut();
    props.navigation.navigate('Sign In/Out'); 
  }

  function formatDateTime(date) {
    return `${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US')}`; 
  }

  async function pickImage () {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

    console.log('Picked image:', result);

    if (!result.cancelled) {
      setPostImageUri(result.uri);
    }
  };

  async function addImageToMessage () {
    await(pickImage());
  } 

  const DismissKeyboard = ({ children }) => (
    <TouchableWithoutFeedback
    onPress={() => Keyboard.dismiss()}>
      {children}
    </TouchableWithoutFeedback>
  );

  function debug() {
    const debugObj = {
      channels: channels, 
      selectedChannel, selectedChannel, 
      selectedMessages: selectedMessages, 
    }
    alert(formatJSON(debugObj));
  }

  function debugButton(bool) {
    if (bool) {
      return (
        <TouchableOpacity style={styles.button}
           onPress={debug}>
          <Text style={styles.buttonText}>Debug</Text>
        </TouchableOpacity> 
      ); 
    } else {
      return false;
    }
  }                                                                                      

  const MessageItem = props => { 
    return (
      <View style={styles.messageItem}>
        <Text style={styles.messageDateTime}>{formatDateTime(props.message.date)}</Text>
        <Text style={styles.messageAuthor}>{props.message.author}</Text>
        <Text style={styles.messageContent}>{props.message.content}</Text>
        {props.message.imageUri &&
          <Image
            style={styles.thumbnail}
            source={{uri: props.message.imageUri}}
          />
        }
      </View> 
    ); 
  }

  function composeMessagePane() {
    return (
      <View style={isComposingMessage ? styles.composePane : globalStyles.hidden}>
        <TextInput
          multiline
          numberOfLines={3}
          placeholder="message text goes here"
          style={styles.textInputArea}
          value={textInputValue} 
          onChangeText={(value) => setTextInputValue(value)}
        /> 
        {postImageUri &&
          <Image
            style={styles.thumbnail}
            source={{uri: postImageUri}}
          />
        }
        <View style={globalStyles.buttonHolder}>
          <MyButton style={styles.composeButton}
            title='Cancel'
            onPress={cancelMessage}
           />
          <MyButton style={styles.composeButton}
            title='Add Image'
            onPress={addImageToMessage}
           />
          <MyButton style={styles.composeButton}
            title='Post'
            onPress={postMessage}
           />
        </View>
      </View>
    );
  }

  return (
      <View style={globalStyles.screen}>
        {debugButton(false)}
        <Text>{emailOf(authProps.loggedInUser)} is logged in</Text>
        <Text>{`usingFirestore=${usingFirestore}`}</Text>
        <MyButton 
          title = {usingFirestore ? 
                  'Using Firestore; Click to use local DB' :
                   'Using local DB; Click to use Firestore'}
          onPress={toggleStorageMode}
        />
        <View style={globalStyles.buttonHolder}>
          <MyButton
            title='Compose Message'
            disabled={isComposingMessage}
            onPress={composeMessage}
          />
          <MyButton
            title='Sign Out'
            disabled={isComposingMessage}
            onPress={signOutAndGoToSignIn}
          />
        </View>
        {composeMessagePane()}
        <Text style={styles.header}>Selected Channel</Text>
        <Picker
           style={styles.pickerStyles}
           mode='dropdown' // or 'dialog'; chooses mode on Android
           selectedValue={selectedChannel}
           onValueChange={(itemValue, itemIndex) => setSelectedChannel(itemValue)}>
           {channels.map(chan => <Picker.Item key={chan} label={chan} value={chan}/>)}
        </Picker>
        <Text style={styles.header}>Messages</Text> 
        {(selectedMessages.length === 0) ? 
         <Text>No messages to display</Text> :
         <FlatList style={styles.messageList}
            data={selectedMessages} 
            renderItem={ datum => <MessageItem message={datum.item}></MessageItem>} 
            keyExtractor={item => item.timestamp} 
            />
        }
      </View>
   );
}


const styles = StyleSheet.create({
  header: {
    marginTop: 10,
    fontSize: 25,
    fontWeight: 'bold'
  },
  pickerStyles:{
    width:'70%',
    backgroundColor:'plum',
    color:'black'
  },
  messageList: {
    width:'90%',
    marginTop: 5,
  },
  messageItem: {
    marginTop: 5,
    marginBottom: 5,
    backgroundColor:'bisque',
    color:'black',
    borderWidth: 1,
    borderColor: 'blue',
  },
  messageDateTime: {
    paddingLeft: 5,
    color:'gray',
  },
  messageAuthor: {
    paddingLeft: 5,
    color:'blue',
  },
  messageContent: {
    padding: 5,
    color:'black',
  },
  composePane: {
    width:'90%',
    borderWidth: 1,
    borderColor: 'blue',
  },
  textInputArea: {
    fontSize: 14, 
    padding: 5,
  },
  composeButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: 'salmon',
      marginLeft: 10,
  },
  bigImage: {
      width: 300,
      height: 300,
      margin: 20
  },
  thumbnail: {
      width: 90,
      height: 90,
      margin: 10
  },
});

