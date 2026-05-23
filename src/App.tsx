import AntigravitySiteBackdrop from "./components/AntigravitySiteBackdrop";
import Navigation from "./components/Navigation";
import Hero from "./sections/Hero";
import About from "./sections/About";
import Projects from "./sections/Projects";
import Connect from "./sections/Connect";

export default function App() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0f]">
      <AntigravitySiteBackdrop />
      <Navigation />
      <main className="relative z-10">
        <Hero />
        <About />
        <Projects />
        <Connect />
      </main>
    </div>
  );
}
