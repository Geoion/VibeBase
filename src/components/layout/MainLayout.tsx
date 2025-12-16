import Header from "./Header";
import Navigator from "./Navigator";
import Canvas from "./Canvas";
import Inspector from "./Inspector";
import Console from "./Console";

export default function MainLayout() {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <Header />

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Navigator */}
        <Navigator />

        {/* Middle Panel - Canvas */}
        <Canvas />

        {/* Right Panel - Inspector */}
        <Inspector />
      </div>

      {/* Bottom Panel - Console */}
      <Console />
    </div>
  );
}






