import { Ionicons } from "@expo/vector-icons";
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
	const isSyncing = useSyncStore((state) => monitorSync ? state.isSyncing : false);
	const isBackendConfigured = useSyncStore((state) => monitorSync ? state.isBackendConfigured : false);
	const isOnline = useSyncStore((state) => monitorSync ? state.isOnline : false);
	const isConnected = isOnline && isBackendConfigured;
	const unsyncedRecordCount = pendingAssessments + pendingPatients;

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
				<View style={tw`bg-sky-500 px-5 pb-8 pt-2`}>
					{showSyncStatus ? (
						<View style={tw`mb-6 flex-row items-center rounded-2xl bg-yellow-300 px-4 py-3`}>
							<View style={tw`h-7 w-7 items-center justify-center rounded-full bg-sky-100`}>
								<Ionicons name={isConnected ? "cloud-done-outline" : "cloud-offline-outline"} size={17} color="#1671B8" />
							</View>
							<View style={tw`ml-3 flex-1`}>
								<Text style={tw`text-xs font-bold text-slate-800`}>
									{!isConnected
										? isOnline ? "Cloud sync is not configured" : "API unavailable"
										: unsyncedRecordCount > 0
											? `${unsyncedRecordCount} unsynced record${unsyncedRecordCount === 1 ? "" : "s"}`
											: isSyncing
												? "Syncing records..."
													: "All records synced"}
								</Text>
								<Text style={tw`mt-1 text-xs font-medium text-slate-700`} numberOfLines={3}>
									{isConnected
										? `${pendingAssessments} assessments · ${pendingPatients} patients`
										: ""}
								</Text>
							</View>
						</View>
					) : null}
					<View style={tw`flex-row items-start justify-between`}>
						<View>
							<Text style={tw`text-4xl font-bold text-white`}>AI Health</Text>
							<Text style={tw`mt-1 text-2xl font-medium text-white`}>Decision Support System</Text>
							<Text style={tw`mt-2 text-2xl font-semibold text-white`}> Hello {nurseName ?? "Nurse"}</Text>
						</View>
						<Pressable
							accessibilityLabel="Open menu"
							accessibilityRole="button"
							onPress={() => setIsMenuOpen(true)}
							style={({ pressed }) => [tw`h-12 w-12 items-center justify-center rounded-2xl bg-sky-400`, pressed && tw`opacity-70`]}
						>
							<Ionicons name="menu-outline" size={28} color="white" />
						</Pressable>
					</View>
				</View>
			) : (
			<View style={tw`flex-row items-center justify-between border-b border-slate-100 pt-3 pb-5`}>
				<View>
					<View style={tw`flex-row items-center`}>
						<View style={tw`mr-2 h-7 w-7 items-center justify-center rounded-lg bg-teal-700`}><Ionicons name="pulse" size={16} color="white" /></View>
						<Text style={tw`text-sm font-extrabold tracking-widest text-slate-900`}>AI HEALTH</Text>
					</View>
					<Text style={tw`mt-1 text-xs font-medium text-slate-500`}>{nurseName ?? "Nurse"} · Primary care decision support</Text>
				</View>
				<Pressable
					accessibilityLabel="Open menu"
					accessibilityRole="button"
					onPress={() => setIsMenuOpen(true)}
					style={({ pressed }) => [
						tw`h-11 w-11 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50`,
						pressed && tw`opacity-70`,
					]}
				>
					<Ionicons name="menu-outline" size={24} color="#0F766E" />
				</Pressable>
			</View>
			)}

			<Modal animationType="fade" transparent visible={isMenuOpen} onRequestClose={() => setIsMenuOpen(false)}>
				<Pressable style={tw`flex-1 bg-slate-900/30`} onPress={() => setIsMenuOpen(false)}>
					<Pressable style={tw`absolute right-5 top-16 w-72 rounded-2xl border border-slate-100 bg-white p-3 shadow-lg`} onPress={(event) => event.stopPropagation()}>
						<View style={tw`border-b border-slate-100 px-3 pb-3`}>
							<Text style={tw`text-lg font-bold text-slate-900`}>Menu</Text>
							<Text style={tw`mt-1 text-xs text-slate-500`}></Text>
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
