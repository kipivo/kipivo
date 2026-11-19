import { useRouter } from "expo-router";
import { HomeScreen } from "../features/workspace/home";

export default function HomeRoute() {
  const router = useRouter();
  return <HomeScreen onConnection={() => router.push("/connection")} />;
}
