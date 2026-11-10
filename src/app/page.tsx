import GuideContent from "@/components/GuideContent";
import ChatFAB from "@/components/ChatFAB";
import NavBar from "@/components/NavBar";
import SupportBot from "@/components/SupportBot";

export default function Home() {
  return (
    <>
      <NavBar />
      <GuideContent />
      <SupportBot apiKey="" onApiKeyChange={() => {}} />
      <ChatFAB />
    </>
  );
}
