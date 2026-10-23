export const lightColors = { navy:"#10243A", blue:"#1769AA", sky:"#3B91D9", paleBlue:"#EAF4FC", ivory:"#F7F6F2", white:"#FFFFFF", text:"#202B36", muted:"#667381", border:"#E1E7ED", amber:"#E8A45B", green:"#2F7D66", surface:"#FFFFFF", surfaceAlt:"#F0F3F6", tabBar:"#FFFFFF", heroOverlay:"rgba(7,24,42,0.48)" } as const;
export const darkColors = { navy:"#E7EDF4", blue:"#72B8F0", sky:"#8CCAFF", paleBlue:"#1B344A", ivory:"#0D1722", white:"#FFFFFF", text:"#E7EDF4", muted:"#A5B3C2", border:"#2A3B4C", amber:"#F0B66F", green:"#75C7A8", surface:"#152332", surfaceAlt:"#1D2C3B", tabBar:"#111E2B", heroOverlay:"rgba(4,12,21,0.58)" } as const;
export type AppColors = { [K in keyof typeof lightColors]: string };
export type ThemeMode = "system" | "light" | "dark";
export const colors = lightColors;
export const spacing = { xs:4, sm:8, md:14, lg:20, xl:28, xxl:36 } as const;
export const radius = { sm:10, md:16, lg:24, pill:999 } as const;
