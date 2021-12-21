import React, { useState, useEffect, useContext } from "react";
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { // access to authentication features:
         getAuth, 
         // for email/password authentication: 
         createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification,
         // for logging out:
         signOut
  } from "firebase/auth";
import MyButton from './MyButton';
import { formatJSON, emailOf } from '../utils';
import { globalStyles } from '../styles/globalStyles';
import StateContext from './StateContext';

export default function SignInOutScreen(props) {
  const [errorMsg, setErrorMsg] = React.useState('');
  const stateProps = useContext(StateContext);
  const auth = stateProps.firebaseProps.auth;
  const authProps = stateProps.authProps;
  
  /* 
  // Clear error message when email is updated to be nonempty
  useEffect(
    () => { if (email != '') setErrorMsg(''); },
    [email]
  ); 
  */

  // component mount and unmount
  useEffect(() => {
      console.log('SignInOutScreen did mount');
      console.log(`on mount: emailOf(auth.currentUser)=${emailOf(auth.currentUser)}`);
      console.log(`on mount: emailOf(authProps.loggedInUser)=${emailOf(authProps.loggedInUser)}`);
      if (authProps.email !== '' && authProps.password !== '') {
        // If defaults are provided for email and password, 
        // use them to log in to avoid the hassle of logging in
        // console.log(`on mount: attempting to sign in default user ${authProps.email}`);
        // signInUserEmailPassword();
      } 
      // console.log(`on mount: checkEmailVerification()`);
      // checkEmailVerification();

      // This has worked already, so commenting it out
      // console.log(`on mount: populateFirestoreDB(testMessages)`);
      // populateFirestoreDB(testMessages); 
      return () => {
        // Anything in here is fired on component unmount.
        console.log('SignInOutScreen did unmount');
        console.log(`on unmount: emailOf(auth.currentUser)=${emailOf(auth.currentUser)}`);
        console.log(`on unmount: emailOf(authProps.loggedInUser)=${emailOf(authProps.loggedInUser)}`);
      }
    }, []);


  function signUpUserEmailPassword() {
    console.log('called signUpUserEmailPassword');
    if (auth.currentUser) {
      signOut(auth); // sign out auth's current user (who is not loggedInUser, 
                     // or else we wouldn't be here
    }
    if (!authProps.email.includes('@')) {
      setErrorMsg('Not a valid email address');
      return;
    }
    if (authProps.password.length < 6) {
      setErrorMsg('Password too short');
      return;
    }
    // Invoke Firebase authentication API for Email/Password sign up 
    createUserWithEmailAndPassword(auth, authProps.email, authProps.password)
      .then((userCredential) => {
        console.log(`signUpUserEmailPassword: sign up for email ${authProps.email} succeeded (but email still needs verification).`);

        // Clear email/password inputs
        const savedEmail = email; // Save for email verification
        authProps.setEmail('');
        authProps.setPassword('');

        // Note: could store userCredential here if wanted it later ...
        // console.log(`createUserWithEmailAndPassword: setCredential`);
        // setCredential(userCredential);

        // Send verication email
        console.log('signUpUserEmailPassword: about to send verification email');
        sendEmailVerification(auth.currentUser)
        .then(() => {
            console.log('signUpUserEmailPassword: sent verification email');
            setErrorMsg(`A verification email has been sent to ${savedEmail}. You will not be able to sign in to this account until you click on the verification link in that email.`); 
            // Email verification sent!
            // ...
          });
      })
      .catch((error) => {
        console.log(`signUpUserEmailPassword: sign up failed for email ${authProps.email}`);
        const errorMessage = error.message;
        // const errorCode = error.code; // Could use this, too.
        console.log(`createUserWithEmailAndPassword: ${errorMessage}`);
        setErrorMsg(`createUserWithEmailAndPassword: ${errorMessage}`);
      });
  }

  function signInUserEmailPassword() {
    console.log('called signInUserEmailPassword');
    console.log(`signInUserEmailPassword: emailOf(currentUser)0=${emailOf(auth.currentUser)}`); 
    console.log(`signInUserEmailPassword: emailOf(authProps.loggedInUser)0=${emailOf(authProps.loggedInUser)}`); 
    // Invoke Firebase authentication API for Email/Password sign in 
    // Use Email/Password for authentication 
    signInWithEmailAndPassword(auth, authProps.email, authProps.password)
                               /* 
                               defaultEmail ? defaultEmail : email, 
                               defaultPassword ? defaultPassword : password
                               */
      .then((userCredential) => {
        console.log(`signInUserEmailPassword succeeded for email ${authProps.email}; have userCredential for emailOf(auth.currentUser)=${emailOf(auth.currentUser)} (but may not be verified)`); 
        console.log(`signInUserEmailPassword: emailOf(currentUser)1=${emailOf(auth.currentUser)}`); 
        console.log(`signInUserEmailPassword: emailOf(authProps.loggedInUser)1=${emailOf(authProps.loggedInUser)}`); 

        // Only log in auth.currentUser if their email is verified
        checkEmailVerification();

        // Clear email/password inputs 
        authProps.setEmail('');
        authProps.setPassword('');

        // Note: could store userCredential here if wanted it later ...
        // console.log(`createUserWithEmailAndPassword: setCredential`);
        // setCredential(userCredential);
    
        })
      .catch((error) => {
        console.log(`signUpUserEmailPassword: sign in failed for email ${authProps.email}`);
        const errorMessage = error.message;
        // const errorCode = error.code; // Could use this, too.
        console.log(`signInUserEmailPassword: ${errorMessage}`);
        setErrorMsg(`signInUserEmailPassword: ${errorMessage}`);
      });
  }

  function checkEmailVerification() {
    if (auth.currentUser) {
      console.log(`checkEmailVerification: auth.currentUser.emailVerified=${auth.currentUser.emailVerified}`);
      if (auth.currentUser.emailVerified) {
        console.log(`checkEmailVerification: setLoggedInUser for ${auth.currentUser.email}`);
        authProps.setLoggedInUser(auth.currentUser);
        console.log("checkEmailVerification: setErrorMsg('')");
        setErrorMsg('');
        props.navigation.navigate('Chat'); // Go to the Chat Screen
      } else {
        console.log('checkEmailVerification: remind user to verify email');
        setErrorMsg(`You cannot sign in as ${auth.currentUser.email} until you verify that this is your email address. You can verify this email address by clicking on the link in a verification email sent by this app to ${auth.currentUser.email}.`)
      }
    }
  }

  return (
    <View style={globalStyles.screen}>
      <View style={authProps.loggedInUser === null ? styles.signInOutPane : globalStyles.hidden}>
          <View style={globalStyles.labeledInput}>
            <Text style={globalStyles.inputLabel}>Email:</Text>
            <TextInput 
              placeholder="Enter your email address" 
              style={globalStyles.textInput} 
              value={authProps.email} 
              onChangeText={ textVal => authProps.setEmail(textVal)} />
          </View>
          <View style={globalStyles.labeledInput}>
            <Text style={globalStyles.inputLabel}>Password:</Text>
            <TextInput 
              placeholder="Enter your password" 
              style={globalStyles.textInput} 
              value={authProps.password} 
              onChangeText={ textVal => authProps.setPassword(textVal)} />
          </View>
          <View style={globalStyles.buttonHolder}>
            <MyButton 
              title='Sign Up'
              onPress={() => signUpUserEmailPassword()}
            />
            <MyButton 
              title='Sign In'
              onPress={() => signInUserEmailPassword()}
            />
          </View>
          <View style={errorMsg === '' ? globalStyles.hidden : styles.errorBox}>
            <Text style={styles.errorMessage}>{errorMsg}</Text>
          </View>
      </View>
      <View style={authProps.loggedInUser === null ? globalStyles.hidden : styles.signInOutPane }>
        <MyButton 
          title='Sign Out'
          onPress={() => authProps.logOut()}
         />
        <MyButton 
          title='Chat'
          onPress={() => props.navigation.navigate('Chat')}
         />
      </View>
    </View>

 );
}

const styles = StyleSheet.create({
  signInOutPane: {
      flex: 3, 
      alignItems: 'center',
      justifyContent: 'center',
  }, 
  errorBox: {
      width: '80%',
      borderWidth: 1,
      borderStyle: 'dashed', // Lyn sez: doesn't seem to work 
      borderColor: 'red',
  },
  errorMessage: {
      color: 'red',
      padding: 10, 
  },
});
