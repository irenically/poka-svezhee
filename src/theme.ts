import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    primary: { main: '#335d45', dark: '#254b36', light: '#e2eacd', contrastText: '#fff' },
    secondary: { main: '#cf7547' },
    background: { default: '#f5f3e9', paper: '#fffefa' },
    text: { primary: '#202b23', secondary: '#68786b' },
    error: { main: '#b44d40' },
    success: { main: '#366640' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'DM Sans', sans-serif",
    h1: { fontFamily: 'Manrope, sans-serif', fontWeight: 800 },
    h2: { fontFamily: 'Manrope, sans-serif', fontWeight: 800 },
    h3: { fontFamily: 'Manrope, sans-serif', fontWeight: 800 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 44, borderRadius: 10 } } },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#fff' } } },
  },
})
