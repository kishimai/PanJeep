import './App.css'
import Login from '../pages/Login.jsx';
import Map from './Map.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {createTheme, ThemeProvider} from "@mui/material";

const theme = createTheme({
    palette: {
        primary: { main: '#ffffff' },
        secondary: { main: '#c7c7c7' },
        text: { main: '#ffffff' },
    }
})

function App() {
    return (
        <ThemeProvider theme={theme}>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/map" element={<Map />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    )
}

export default App;
