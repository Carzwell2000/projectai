import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import tw from "twrnc";
import { useAuthStore } from "../stores/authStore";
import { useSyncStore } from "../stores/syncStore";

type NavbarProps = {
	variant?: "default" | "hero";
	monitorSync?: boolean;
	showSyncStatus?: boolean;
};

export default function Navbar({ variant = "default", monitorSync = true, showSyncStatus = true }: NavbarProps) {
	const router = useRouter();
	const nurseName = useAuthStore((state) => state.session?.nurse.name);
	const logout = useAuthStore((state) => state.logout);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const pendingAssessments = useSyncStore((state) => monitorSync ? state.pendingAssessments : 0);
	const pendingPatients = useSyncStore((state) => monitorSync ? state.pendingPatients : 0);
	const pendingMessages = useSyncStore((state) => monitorSync ? state.pendingMessages : 0);
	const isSyncing = useSyncStore((state) => monitorSync ? state.isSyncing : false);
	const isBackendConfigured = useSyncStore((state) => monitorSync ? state.isBackendConfigured : false);
	const isOnline = useSyncStore((state) => monitorSync ? state.isOnline : false);
	const isConnected = isOnline && isBackendConfigured;
	const unsyncedRecordCount = pendingAssessments + pendingPatients + pendingMessages;

	useEffect(() => {
		if (!monitorSync) return;
		return useSyncStore.getState().startMonitoring();
	}, [monitorSync]);

	const openScreen = (screen: "/Analysis" | "/Settings" | "/Chat" | "/RegisteredPatients" | "/ChangePassword") => {
		setIsMenuOpen(false);
		router.push(screen);
	};

	const signOut = async () => {
		setIsMenuOpen(false);
		await logout();
	};

	return (
		<>
			{variant === "hero" ? (
				<LinearGradient
					colors={["#075B51", "#06463F", "#063C39"]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={tw`overflow-hidden rounded-b-[26px] px-5 pb-6 pt-3`}
				>
					<View style={tw`mb-5 flex-row items-center justify-between`}>
						<View style={tw`flex-row items-center`}>
							<View style={tw`h-10 w-10 items-center justify-center rounded-2xl border border-white/25 bg-white/10`}>
								<Ionicons name="pulse" size={23} color="#A8F5DF" />
							</View>
							<View style={tw`ml-3`}>
								<Text style={tw`text-base font-extrabold tracking-wide text-white`}>Clinic AI</Text>
								<Text style={tw`mt-0.5 text-[10px] font-medium text-emerald-100`}>Healthier community</Text>
							</View>
						</View>
						<Pressable
							accessibilityLabel="Open menu"
							accessibilityRole="button"
							onPress={() => setIsMenuOpen(true)}
							style={({ pressed }) => [tw`h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10`, pressed && tw`opacity-70`]}
						>
							<Ionicons name="menu-outline" size={24} color="white" />
						</Pressable>
					</View>
					<View style={tw`flex-row items-end justify-between`}>
						<View style={tw`flex-1 pr-3`}>
							<Text style={tw`text-[10px] font-bold tracking-[1.7px] text-emerald-200`}>CLINICAL WORKSPACE</Text>
							<Text style={tw`mt-1 text-2xl font-bold text-white`}>Hello, {nurseName ?? "Nurse"}</Text>
							<Text style={tw`mt-1 text-xs leading-5 text-emerald-50`}>Patient care, supported by clinical insight.</Text>
						</View>
						<View style={tw`h-11 w-11 items-center justify-center rounded-full border-2 border-emerald-100/70 bg-white/10`}>
							<Text style={tw`text-base font-bold uppercase text-white`}>{nurseName?.slice(0, 1) ?? "N"}</Text>
						</View>
					</View>
					{showSyncStatus ? (
						<View style={tw`mt-5 flex-row items-center rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5`}>
							<View style={tw`h-8 w-8 items-center justify-center rounded-xl bg-white/10`}>
								<Ionicons name={isConnected ? "cloud-done-outline" : "cloud-offline-outline"} size={17} color={isConnected ? "#9BF2D3" : "#FFD49D"} />
							</View>
							<View style={tw`ml-2.5 flex-1`}>
								<Text style={tw`text-xs font-bold text-white`}>
									{!isConnected
										? isOnline ? "Cloud sync is not configured" : "API unavailable"
										: unsyncedRecordCount > 0
											? `${unsyncedRecordCount} item${unsyncedRecordCount === 1 ? "" : "s"} awaiting sync`
											: isSyncing
												? "Syncing records..."
												: "All records synced"}
								</Text>
								{isConnected ? (
									<Text style={tw`mt-0.5 text-[10px] font-medium text-emerald-100`} numberOfLines={1}>
										{pendingAssessments} assessments · {pendingPatients} patients
									</Text>
								) : null}
							</View>
							<View style={tw`ml-2 h-2 w-2 rounded-full ${isConnected ? "bg-emerald-300" : "bg-amber-300"}`} />
						</View>
					) : null}
				</LinearGradient>
			) : (
			<View style={tw`flex-row items-center justify-between border-b border-[#E2ECE7] bg-[#F3F7F5] pt-3 pb-4`}>
				<View>
					<View style={tw`flex-row items-center`}>
						<View style={tw`mr-2 h-8 w-8 items-center justify-center rounded-xl bg-[#075B51]`}><Ionicons name="pulse" size={17} color="#A8F5DF" /></View>
						<Text style={tw`text-sm font-extrabold tracking-widest text-[#143B4F]`}>CLINIC AI</Text>
					</View>
					<Text style={tw`mt-1 text-xs font-medium text-slate-500`}>{nurseName ?? "Nurse"} · Clinical workspace</Text>
				</View>
				<Pressable
					accessibilityLabel="Open menu"
					accessibilityRole="button"
					onPress={() => setIsMenuOpen(true)}
					style={({ pressed }) => [
						tw`h-10 w-10 items-center justify-center rounded-xl border border-[#D7ECE4] bg-white`,
						pressed && tw`opacity-70`,
					]}
				>
					<Ionicons name="menu-outline" size={22} color="#075B51" />
				</Pressable>
			</View>
			)}

			<Modal animationType="fade" transparent visible={isMenuOpen} onRequestClose={() => setIsMenuOpen(false)}>
				<Pressable style={tw`flex-1 bg-slate-900/30`} onPress={() => setIsMenuOpen(false)}>
					<Pressable style={tw`absolute right-5 top-16 w-72 overflow-hidden rounded-2xl border border-[#E2ECE7] bg-white p-3 shadow-lg`} onPress={(event) => event.stopPropagation()}>
						<View style={tw`border-b border-slate-100 px-3 pb-3`}>
							<Text style={tw`text-lg font-bold text-[#143B4F]`}>Workspace menu</Text>
							<Text style={tw`mt-1 text-xs text-slate-500`}>Quick links and account</Text>
						</View>
			
						<MenuItem icon="person-outline" label="Registered patients" onPress={() => openScreen("/RegisteredPatients")} />
						<MenuItem icon="chatbubble-ellipses-outline" label="Nurse inbox" onPress={() => openScreen("/Chat")} />
						<MenuItem icon="settings-outline" label="Settings" onPress={() => openScreen("/Settings")} />
						<MenuItem icon="key-outline" label="Reset password" onPress={() => openScreen("/ChangePassword")} />
						<MenuItem icon="log-out-outline" label="Sign out" onPress={signOut} />
						<MenuItem icon="close-outline" label="Close menu" onPress={() => setIsMenuOpen(false)} />
					</Pressable>
				</Pressable>
			</Modal>
		</>
	);
}

type MenuItemProps = {
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	onPress: () => void;
};

function MenuItem({ icon, label, onPress }: MenuItemProps) {
	return (
		<Pressable
			accessibilityRole="button"
			onPress={onPress}
			style={({ pressed }) => [tw`mt-1 flex-row items-center rounded-xl px-3 py-3`, pressed && tw`bg-slate-50`]}
		>
			<Ionicons name={icon} size={21} color="#0F766E" />
			<Text style={tw`ml-3 text-sm font-semibold text-slate-700`}>{label}</Text>
		</Pressable>
	);
}
