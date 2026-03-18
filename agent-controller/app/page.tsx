import { Header } from "@/components/header";
import { LiveStatus } from "@/components/live-status";
import { ChatPanel } from "@/components/chat-panel";

export default function Home() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <Header />
      <LiveStatus />
      <ChatPanel />
    </div>
  );
}
