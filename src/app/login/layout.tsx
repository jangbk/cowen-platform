import { ThemeProvider } from "@/components/layout/ThemeProvider";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex items-center justify-center bg-background">
        {children}
      </div>
    </ThemeProvider>
  );
}
