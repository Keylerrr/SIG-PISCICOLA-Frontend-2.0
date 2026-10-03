import "../globals.css";
import { Navbar } from "../components/layout/navbar";
import { Breadcrumbs } from "../components/layout/Breadcrumbs";

export const metadata = {
  title: "Póngase Trucha",
  description: "App piscícola",
  icons: {
    icon: "/images/PongaseTrucha.png",
  },
};

export default function HomeLayout({ children }) {
  return (
    <>
      <Navbar />
      <Breadcrumbs />
      {children}
    </>
  );
}