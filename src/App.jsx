import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EcoLinkProvider } from './EcolinkContext';
import Ecolink from './pages/Ecolink.jsx';
import Login from './pages/Login.jsx';
import Otp from './pages/Otp.jsx';
import Status from './pages/Status.jsx';

function App() {
  return (
    <EcoLinkProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Ecolink />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Otp />} />
          <Route path="/status" element={<Status />} />
        </Routes>
      </Router>
    </EcoLinkProvider>
  );
}

export default App;