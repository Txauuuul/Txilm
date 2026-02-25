/**
 * Txilms - App.js (Entry Point)
 * ==============================
 * Configura la navegación principal con BottomTabNavigator.
 * Temática oscura cinematográfica.
 */

import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";

import HomeScreen from "./src/screens/HomeScreen";
import DetailsScreen from "./src/screens/DetailsScreen";
import ListsScreen from "./src/screens/ListsScreen";
import { COLORS } from "./src/theme/theme";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Stack de Home (incluye navegación a Detalles) ────────
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
    </Stack.Navigator>
  );
}

// ── Stack de Listas (incluye navegación a Detalles) ──────
function ListsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="ListsMain" component={ListsScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
    </Stack.Navigator>
  );
}

// ── Tema de navegación (Dark) ────────────────────────────
const DarkTheme = {
  dark: true,
  colors: {
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.textPrimary,
    border: COLORS.border,
    notification: COLORS.primary,
  },
};

// ── App Principal ────────────────────────────────────────
export default function App() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
            borderTopWidth: 0.5,
            height: 60,
            paddingBottom: 8,
            paddingTop: 4,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === "Inicio") {
              iconName = focused ? "film" : "film-outline";
            } else if (route.name === "Mis Listas") {
              iconName = focused ? "heart" : "heart-outline";
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Inicio" component={HomeStack} />
        <Tab.Screen name="Mis Listas" component={ListsStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
