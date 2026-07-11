import { extendTheme } from '@chakra-ui/react'

export const theme = extendTheme({
  colors: {
    brand: {
      50: '#F2E8E5',
      100: '#E6D0CA',
      200: '#DDB8AF',
      300: '#CF9A8E',
      400: '#C07868',
      500: '#A83426',
      600: '#8F2D20',
      700: '#75251B',
      800: '#5C1E15',
      900: '#421610',
    },
    paper: {
      bg: '#F2EFE6',
      raised: '#FDFCF8',
      sunken: '#E8E4D8',
    },
    ink: {
      DEFAULT: '#1A1814',
      soft: '#6B6659',
    },
    line: {
      DEFAULT: '#D8D3C4',
      strong: '#BDB8A8',
    },
    risk: {
      low: '#2E5231',
      medium: '#7A5410',
      high: '#A83426',
      critical: '#8F2D20',
    },
    gray: {
      50: '#F2EFE6',
      100: '#E8E4D8',
      200: '#D8D3C4',
      300: '#BDB8A8',
      400: '#9F9A8A',
      500: '#6B6659',
      600: '#4A473D',
      700: '#2D2B24',
      800: '#1A1814',
      900: '#12100D',
    },
  },
  fonts: {
    heading: '"Fraunces", Georgia, serif',
    body: '"Inter", -apple-system, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", Consolas, monospace',
  },
  components: {
    Card: {
      baseStyle: {
        borderRadius: '14px',
        boxShadow: '0 1px 2px rgba(26,24,20,0.06), 0 1px 3px rgba(26,24,20,0.04)',
      },
    },
    Button: {
      baseStyle: {
        fontWeight: 'medium',
      },
    },
  },
})
