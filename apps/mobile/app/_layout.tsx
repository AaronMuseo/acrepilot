import { Stack } from 'expo-router';
import { AppProvider } from '../src/app-state';
export default function Layout() { return <AppProvider><Stack screenOptions={{ headerShown: false, animation: 'none' }} /></AppProvider>; }
