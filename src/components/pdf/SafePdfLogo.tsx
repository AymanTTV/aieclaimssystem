// src/components/pdf/SafePdfLogo.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { isValidPdfImageSrc } from '../../utils/safePdfImage';
import { resolveCompanyLogo } from '../../utils/companyLogoResolver';

export interface SafePdfLogoProps {
  src?: string | null;
  companyName?: string;
  tradingName?: string;
  style?: any;
  textStyle?: any;
  cache?: boolean;
  entityKey?: string;
  entityDetails?: any;
}

const localStyles = StyleSheet.create({
  defaultLogo: {
    width: 150,
    height: 'auto',
    objectFit: 'contain',
  },
  fallbackContainer: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'flex-start',
    minWidth: 120,
    maxWidth: 180,
  },
  fallbackTitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#0F172A',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  fallbackSubtitle: {
    fontSize: 6.5,
    color: '#64748B',
    marginTop: 1.5,
    fontWeight: 'bold',
  },
});

export const SafePdfLogo: React.FC<SafePdfLogoProps> = ({
  src,
  companyName = 'AIE SKYLINE LIMITED',
  tradingName,
  style,
  textStyle,
  cache = false,
  entityKey,
  entityDetails,
}) => {
  const displayName = tradingName || companyName || 'AIE SKYLINE LIMITED';

  // 1. Dynamic Company Logo Resolver:
  // Prefer explicit valid base64 or local public path, otherwise resolve dynamically from issuing entity
  let resolvedSrc: string | null = null;
  if (
    typeof src === 'string' &&
    src.trim().length > 10 &&
    (src.startsWith('data:image/') || src.startsWith('/assets/') || src.startsWith('/'))
  ) {
    resolvedSrc = src.trim();
  } else {
    resolvedSrc = resolveCompanyLogo(
      entityDetails || { key: entityKey, fullName: companyName, tradingName },
      companyName
    );
  }

  // 2. Robust Fallback Rendering:
  // If resolvedSrc is valid, render image with explicit width (160px) and objectFit: "contain"
  if (isValidPdfImageSrc(resolvedSrc)) {
    return (
      <Image
        src={resolvedSrc as string}
        style={[localStyles.defaultLogo, style]}
        cache={cache}
      />
    );
  }

  // 3. Fallback text badge if logo file is null/undefined or fails to load
  const sanitizeForView = (s: any): any => {
    if (!s) return {};
    if (Array.isArray(s)) return s.map(sanitizeForView);
    if (typeof s === 'object') {
      const { objectFit, maxHeight, ...rest } = s;
      return rest;
    }
    return {};
  };

  const containerStyle = [localStyles.fallbackContainer, sanitizeForView(style)];

  return (
    <View style={containerStyle}>
      <Text style={[localStyles.fallbackTitle, textStyle]}>
        {displayName.toUpperCase()}
      </Text>
      <Text style={localStyles.fallbackSubtitle}>
        OFFICIAL DOCUMENT
      </Text>
    </View>
  );
};

export default SafePdfLogo;

