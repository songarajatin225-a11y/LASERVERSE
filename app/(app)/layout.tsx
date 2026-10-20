import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { Footer } from "@/components/shell/Footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8 pt-6 sm:px-6 md:px-8 md:pt-8">
          {children}
        </main>
        <Footer wide />
      </div>
    </div>
  );
}
