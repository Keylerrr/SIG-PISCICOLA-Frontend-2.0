import "../globals.css";
import { Navbar } from "../components/layout/navbar";

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
      {children}
    </>
  );
}