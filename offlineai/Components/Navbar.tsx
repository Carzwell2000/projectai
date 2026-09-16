import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import tw from "twrnc";
import { useAuthStore } from "../stores/authStore";
import { useSyncStore } from "../stores/syncStore";

type NavbarProps = {
	variant?: "default" | "hero";
};

export default function Navbar({ variant = "default" }: NavbarProps) {
	const router = useRouter();
	const nurseName = useAuthStore((state) => state.session?.nurse.name);
	const logout = useAuthStore((state) => state.logout);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const pendingSyncCount = useSyncStore((state) => state.pendingSyncCount);
	const pendingAssessments = useSyncStore((state) => state.pendingAssessments);
	const pendingPatients = useSyncStore((state) => state.pendingPatients);
	const conflicts = useSyncStore((state) => state.conflicts);
	const isSyncing = useSyncStore((state) => state.isSyncing);
	const isBackendConfigured = useSyncStore((state) => state.isBackendConfigured);
	const isOnline = useSyncStore((state) => state.isOnline);
	const isConnected = isOnline && isBackendConfigured;

	useEffect(() => {
		return useSyncStore.getState().startMonitoring();
	}, []);

	const openScreen = (screen: "/Analysis" | "/Settings" | "/RegisteredPatients" | "/ChangePassword") => {
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
					<View style={tw`mb-6 flex-row items-center rounded-full bg-yellow-300 px-4 py-3`}>
						<View style={tw`h-7 w-7 items-center justify-center rounded-full bg-sky-100`}><Ionicons name={isConnected ? "cloud-done-outline" : "cloud-offline-outline"} size={17} color="#1671B8" /></View>
						<View style={tw`ml-3 flex-1 flex-row items-center justify-end`}>
							<Text numberOfLines={1} style={tw`mr-3 shrink text-xs font-bold text-slate-800`}>
								{nurseName ?? "Nurse"}
							</Text>
							<Text numberOfLines={1} style={tw`shrink text-right text-xs font-medium text-slate-700`}>
								{isSyncing
									? "Syncing records..."
									: pendingSyncCount > 0
									? `${pendingAssessments} assessments · ${pendingPatients} patients${conflicts ? ` · ${conflicts} conflicts` : ""}`
									: "All records synced"}
							</Text>
						</View>
					</View>
					<View style={tw`flex-row items-start justify-between`}>
						<View>
							<Text style={tw`text-4xl font-bold text-white`}>AI Health</Text>
							<Text style={tw`mt-1 text-xl font-medium text-white`}>Decision Support System</Text>
							<Text style={tw`mt-2 text-sm font-semibold text-white`}>{nurseName ?? "Nurse"}</Text>
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
