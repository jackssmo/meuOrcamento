import { useState, useEffect, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomTabBar } from "./BottomTabBar";
import { TopHeader } from "./TopHeader";
import { GlobalTransactionModal } from "../transaction/GlobalTransactionModal";

export function AppLayout({ children }: { children?: ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === "sidebar_collapsed") {
        setIsSidebarCollapsed(e.newValue === "true");
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b2920] flex">
      {/* Sidebar Desktop Fixa */}
      <Sidebar />

      {/* Conteúdo Principal com compensação de margem responsiva */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        {/* Top Header com Seletor Global de Período */}
        <TopHeader />

        {/* Área de Conteúdo da Página */}
        <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 max-w-7xl w-full mx-auto pb-28 md:pb-12 animate-in fade-in duration-150">
          {children || <Outlet />}
        </main>
      </div>

      {/* Bottom Tab Bar Mobile */}
      <BottomTabBar />

      {/* Modal Global de Transação (aberto de qualquer tela) */}
      <GlobalTransactionModal />
    </div>
  );
}
