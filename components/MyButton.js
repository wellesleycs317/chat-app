import React from "react";
import { StyleSheet, Text, TouchableOpacity} from 'react-native';

export default function MyButton(props) {
  return (
    <TouchableOpacity 
      style={props.disabled ? styles.buttonDisabled : styles.button}
      onPress={props.onPress}
      disabled={props.disabled}
     >
    <Text style={styles.buttonText}>{props.title}</Text>
    </TouchableOpacity>
          ); 
}

const styles = StyleSheet.create({
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      elevation: 3,
      backgroundColor: 'steelblue',
      margin: 5,
    },  
  buttonDisabled: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      elevation: 3,
      backgroundColor: 'powderblue',
      margin: 5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});