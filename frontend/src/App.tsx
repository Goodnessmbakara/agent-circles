import { Routes, Route } from "react-router";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { CreatePool } from "./pages/CreatePool";
import { PoolDetail } from "./pages/PoolDetail";
import { JoinPool } from "./pages/JoinPool";
import { Demo } from "./pages/Demo";
import { Header } from "./components/layout/Header";

export function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pools" element={<Dashboard />} />
          <Route path="/pools/create" element={<CreatePool />} />
          <Route path="/pools/:id" element={<PoolDetail />} />
          <Route path="/pools/:id/join" element={<JoinPool />} />
          <Route path="/demo" element={<Demo />} />
        </Routes>
      </main>
    </div>
  );
}
