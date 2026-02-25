import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Details from "./pages/Details";
import Lists from "./pages/Lists";
import LogoShowcase from "./pages/LogoShowcase";

export default function App() {
  return (
    <div className="bg-cine-bg text-white min-h-screen">
      <Navbar />
      {/* main area: add top padding for fixed desktop nav */}
      <main className="md:pt-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:id" element={<Details />} />
          <Route path="/lists" element={<Lists />} />
          <Route path="/logos" element={<LogoShowcase />} />
        </Routes>
      </main>
    </div>
  );
}
