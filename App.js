import React, { useState, useEffect } from "react";
import { FlatList, LogBox, StyleSheet, ScrollView, 
         Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { initializeApp } from "firebase/app";
import { // access to authentication features:
         getAuth, 
         // for logging out:
         signOut
       } from "firebase/auth";
import { // access to Firestore features:
         getFirestore, 
       } from "firebase/firestore";
import { // access to Firebase storage features (for files like images, video, etc.)
         getStorage, 
       } from "firebase/storage";

import SignInOutScreen from './components/SignInOutScreen'; 
import ChatViewScreen from './components/ChatViewScreen'; 
import { formatJSON, emailOf } from './utils';
import { globalStyles } from './styles/globalStyles';
import StateContext from './components/StateContext';

const Stack = createNativeStackNavigator();

// *** REPLACE THIS STUB! ***
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "...details omitted...",
  authDomain: "...details omitted...",
  projectId: "...details omitted...",
  storageBucket: "...details omitted...",
  messagingSenderId: "...details omitted...",
  appId: "...details omitted...",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp); // for storaging messages in Firestore
const storage = getStorage(firebaseApp, 
    firebaseConfig.storageBucket) // for storaging images in Firebase storage

// According to   
//   https://duckduckgo.com/?t=ffab&q=%22Setting+a+timer+for+a+long+period+of+time%22&ia=web
// console.ignoredYellowBox hides apparently bogus Android error
// "Setting a timer for a long period of time, i.e. multiple
// minutes, is a performance and correctness issue on Android as
// it keeps the timer module awake, and timers can only be
// called when the app is in the foreground. See
// https://github.com/facebook/react-native/issues/12981 for
// more info." 
// 
// For more discussion, see:
//   https://github.com/facebook/react-native/issues/12981
// YellowBox.ignoreWarnings(['Setting a timer']);
LogBox.ignoreLogs(['Setting a timer', 
                   'AsyncStorage', // While we're at it, squelch AyncStorage, too!
                   ]); 

export default function App() {

  /***************************************************************************
   INITIALIZATION
   ***************************************************************************/
  // Shared state for authentication 
  const [email, setEmail] = React.useState(''); // Provide default email for testing
  const [password, setPassword] = React.useState(''); // Provide default passwored for testing
  const [loggedInUser, setLoggedInUser] = React.useState(null);
  function logOut() {
    console.log('logOut'); 
    console.log(`logOut: emailOf(auth.currentUser)=${emailOf(auth.currentUser)}`);
    console.log(`logOut: emailOf(loggedInUser)=${emailOf(loggedInUser)}`);
    console.log(`logOut: setLoggedInUser(null)`);
    setLoggedInUser(null);
    console.log('logOut: signOut(auth)');
    signOut(auth); // Will eventually set auth.currentUser to null     
  }

  const firebaseProps = { auth, db, storage }

  const authProps = { email, setEmail, 
                      password, setPassword, 
                      loggedInUser, setLoggedInUser, logOut
                     }

  const stateProps = { firebaseProps, authProps }

  return (
    <StateContext.Provider value={stateProps}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator 
          screenOptions={{ headerStyle: { backgroundColor: 'coral' }}}
            initialRouteName="Sign In/Out">
          <Stack.Screen 
            name="Sign In/Out" 
            component={SignInOutScreen}
          /> 
          <Stack.Screen 
            name="Chat" 
            component={ChatViewScreen} 
          /> 
        </Stack.Navigator>
      </NavigationContainer>
    </StateContext.Provider>
  );

}

