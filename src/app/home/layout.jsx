import "../globals.css";
import { Navbar } from "../components/layout/navbar";
import { Breadcrumbs } from "../components/layout/Breadcrumbs";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata = {
  title: "Póngase Trucha",
  description: "App piscícola",
  icons: {
    icon: "/images/PongaseTrucha.png",
  },
};

export default function HomeLayout({ children }) {
  // D-03: nada de esta sección se renderiza sin una sesión válida
  return (
    <AuthGuard>
      <Navbar />
      <Breadcrumbs />
      {children}
    </AuthGuard>
  );
}