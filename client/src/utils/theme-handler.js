import { defaultTheme } from '../constants/theme'

export const setTheme = (theme) => localStorage.setItem('birdTheme', theme)

export const getTheme = () => localStorage.getItem('birdTheme') ? JSON.parse(localStorage.getItem('birdTheme')) : defaultTheme
