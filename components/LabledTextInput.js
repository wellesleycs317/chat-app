import React from "react";
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { globalStyles } from '../styles/globalStyles.js';

export default function LabeledTextInput(props) {
  // props should have label, input (state variable) and 
  // setInput (function to change state variable). 
    return (
       <View style={styles.labeledInput}>
         <Text style={styles.inputLabel}>{label}</Text>
         <TextInput placeholder="Enter a user name"
           style={styles.textInput}
           value={props.input}
          onChangeText={props.setInput} />
      </View>
  );
}

const styles = StyleSheet.create({
  labeledInput: {
    width: "100%",
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 20,
  },
  textInput: {
    width: "80%",
    fontSize: 20,
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderColor: "rgba(0, 0, 0, 0.2)",
    borderWidth: 1,
    marginBottom: 8,
  },
});
