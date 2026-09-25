import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAnonymousUser } from './hooks';
import { Home } from './routes/Home';
import { Table } from './routes/Table';

export default function App() {
  const auth = useAnonymousUser();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home auth={auth} />} />
        <Route path="/table/:sessionId" element={<Table auth={auth} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
