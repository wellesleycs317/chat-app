import React, { useState, useEffect, useContext } from "react";
import { FlatList, LogBox, StyleSheet, ScrollView, 
         Text, TextInput, TouchableOpacity, View } from 'react-native';
import {Picker} from '@react-native-picker/picker';
import { // access to Firestore storage features:
         getFirestore, 
         // for storage access
         collection, doc, addDoc, setDoc,
         query, where, getDocs
  } from "firebase/firestore";
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
  }

  function postMessage() {
    console.log(`postMessage; usingFirestore=${usingFirestore}`);
    const now = new Date();
    const newMessage = {
      'author': authProps.loggedInUser.email, 
      'date': now, 
      'timestamp': now.getTime(), // millsecond timestamp
      'channel': selectedChannel, 
      'content': textInputValue, 
    }
    if (usingFirestore) {
      setLocalMessageDB([...localMessageDB, newMessage]);
      firebasePostMessage(newMessage);
    } else {
      setLocalMessageDB([...localMessageDB, newMessage]);
    }
    setIsComposingMessage(false);
    setTextInputValue('');
  }

  async function firebasePostMessage(msg) {
    // Add a new document in collection "messages"
    const timestampString = msg.timestamp.toString();
    await setDoc(doc(db, "messages", timestampString), 
        {
          'timestamp': msg.timestamp, 
          'author': msg.author, 
          'channel': msg.channel, 
          'content': msg.content, 
        }
      );
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
        <View style={styles.buttonHolder}>
          <TouchableOpacity style={styles.composeButton}
            onPress={cancelMessage}>
            <Text style={styles.composeButtonText}>Cancel</Text>
          </TouchableOpacity> 
          <TouchableOpacity style={styles.composeButton}
             onPress={postMessage}>
            <Text style={styles.composeButtonText}>Post</Text>
          </TouchableOpacity> 
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
        <View style={styles.buttonHolder}>
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
      borderRadius: 10,
      elevation: 3,
      backgroundColor: 'salmon',
      margin: 5,
      marginLeft: 10,
  },
  composeButtonText: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: 'bold',
      letterSpacing: 0.25,
      color: 'white',
  },

});

