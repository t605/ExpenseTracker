import type { Metadata } from "next";
import "./globals.css";
import { ExpensesProvider } from "@/components/ExpensesProvider";
import { ToastProvider } from "@/components/Toasts";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { ExpenseActionsProvider } from "@/components/ExpenseActions";
import { Header } from "@/components/Header";
import { StorageBanner } from "@/components/StorageBanner";

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track your spending, see where the money goes, and export it to CSV.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <ExpensesProvider>
          <CurrencyProvider>
            <ToastProvider>
              <ExpenseActionsProvider>
                <Header />
                <StorageBanner />
                <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
              </ExpenseActionsProvider>
            </ToastProvider>
          </CurrencyProvider>
        </ExpensesProvider>
      </body>
    </html>
  );
}
