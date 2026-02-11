import React, { PropsWithChildren } from 'react';
import { Text as RNText, View as RNView, type TextProps, type ViewProps } from 'react-native';

export const colors = {
  background: '#0B0F1A',
  card: '#12172A',
  cardElevated: '#1A2040',

  primary: '#FF6B00',       
  primarySoft: '#FF8C42',

  success: '#22C55E',     
  danger: '#EF4444',

  text: '#FFFFFF',
  textMuted: '#A1A6C3',
  border: '#23284A',
};


export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 64,
};

export const Text = (props: TextProps & PropsWithChildren) => {
  return (
    <RNText
      {...props}
      style={[
        {
          color: colors.text,
        },
        props.style,
      ]}
    />
  );
};

export const View = (props: ViewProps & PropsWithChildren) => {
  return (
    <RNView
      {...props}
      style={[
        {
          backgroundColor: colors.background,
        },
        props.style,
      ]}
    />
  );
};

