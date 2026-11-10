import React, { createContext, useContext } from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";
import { fontFamilyFor } from "@/constants/typography";

const InsideText = createContext(false);

function withAppFont(style: StyleProp<TextStyle>, nested: boolean): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  if (flat?.fontFamily) return style;
  // A nested span with no weight of its own inherits its parent's font.
  if (nested && flat?.fontWeight == null) return style;
  const fontFamily = fontFamilyFor(flat?.fontWeight);
  if (!fontFamily) return style;
  // Each weight is a separate font file; leaving fontWeight set would fake-bold it.
  return [style, { fontFamily, fontWeight: "normal" }];
}

/**
 * Drop-in `Text` that renders in the app typeface. Styles keep using
 * `fontWeight`; it is mapped to the matching font file here.
 */
export function Text({ style, ...rest }: TextProps & { ref?: React.Ref<RNText> }) {
  const nested = useContext(InsideText);
  return (
    <InsideText.Provider value>
      <RNText {...rest} style={withAppFont(style, nested)} />
    </InsideText.Provider>
  );
}

/** Drop-in `TextInput` in the app typeface. */
export function TextInput({ style, ...rest }: TextInputProps & { ref?: React.Ref<RNTextInput> }) {
  return <RNTextInput {...rest} style={withAppFont(style, false)} />;
}
