import "../globals.css";
import { Navbar } from "../components/layout/navbar";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata = {
  title: "Póngase Trucha",
  description: "App piscícola",
  icons: {
    icon: "/images/PongaseTrucha.png",
  },
};

export default function ManageUsersLayout({ children }) {
  return (
    <AuthGuard>
      <Navbar />
      {children}
    </AuthGuard>
  );
}