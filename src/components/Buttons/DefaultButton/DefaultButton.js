// @flow
import * as React from 'react';
import {
  Text,
  TouchableHighlight,
} from 'react-native';
import styles from './styles';

type Props = {
  title: string,
  onPress: Function,
};

const DefaultButton = (props: Props) => {
  return (
    <TouchableHighlight style={styles.defaultBtn} onPress={props.onPress}>
      <Text style={styles.defaultBtnTitle}>{props.title}</Text>
    </TouchableHighlight>
  );
};
export default DefaultButton;
