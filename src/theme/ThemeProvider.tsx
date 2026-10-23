import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type AppColors, type ThemeMode } from "./tokens";
type ThemeValue={mode:ThemeMode;setMode:(mode:ThemeMode)=>void;isDark:boolean;colors:AppColors};
const Context=createContext<ThemeValue|null>(null);
const KEY="black-diamond-theme-mode";
export function ThemeProvider({children}:{children:React.ReactNode}){
 const system=useColorScheme(); const [mode,setModeState]=useState<ThemeMode>("system");
 useEffect(()=>{AsyncStorage.getItem(KEY).then(v=>{if(v==="system"||v==="light"||v==="dark")setModeState(v)}).catch(()=>{});},[]);
 const setMode=(v:ThemeMode)=>{setModeState(v);AsyncStorage.setItem(KEY,v).catch(()=>{});};
 const isDark=mode==="dark"||(mode==="system"&&system==="dark");
 const value=useMemo(()=>({mode,setMode,isDark,colors:isDark?darkColors:lightColors}),[mode,isDark]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAppTheme(){const v=useContext(Context);if(!v)throw new Error("useAppTheme must be inside ThemeProvider");return v;}
