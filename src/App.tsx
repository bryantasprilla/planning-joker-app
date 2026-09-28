import { BrowserRouter, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { SiteFooter } from './components/SiteFooter';
import { useAnonymousUser, type AuthState } from './hooks';
import { Home } from './routes/Home';
import { Table } from './routes/Table';
import { tablePath } from './sessionId';

export default function App() {
  const auth = useAnonymousUser();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby auth={auth} />} />
        <Route path="/table/:sessionId" element={<OldTableLink />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SiteFooter />
    </BrowserRouter>
  );
}

function Lobby({ auth }: { auth: AuthState }) {
  const [params] = useSearchParams();
  const table = params.get('table');
  return table === null ? <Home auth={auth} /> : <Table key={table} auth={auth} sessionId={table} />;
}

// Links shared before the switch to "?table=" still land on the right table.
function OldTableLink() {
  const { sessionId = '' } = useParams();
  return <Navigate to={tablePath(sessionId)} replace />;
}
