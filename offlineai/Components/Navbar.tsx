import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import tw from "twrnc";
import { getSyncStatus, syncPendingAssessments } from "../services/api";

type NavbarProps = {
	variant?: "default" | "hero";
};

export default function Navbar({ variant = "default" }: NavbarProps) {
	const router = useRouter();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [pendingSyncCount, setPendingSyncCount] = useState(0);

	useEffect(() => {
		let isActive = true;
		const refreshSyncStatus = async () => {
			try {
				const status = await getSyncStatus();
				if (status.postgresConfigured && status.pending > 0) {
					await syncPendingAssessments();
				}
				if (isActive) setPendingSyncCount(status.pending);
			} catch {
				// Keep the last known count while FastAPI is unavailable.
			}
		};

		void refreshSyncStatus();
		const interval = setInterval(() => { void refreshSyncStatus(); }, 5000);
		return () => {
			isActive = false;
			clearInterval(interval);
		};
	}, []);

	const openScreen = (screen: "/Analysis" | "/Settings") => {
		setIsMenuOpen(false);
		router.push(screen);
	};

	return (
		<>
			{variant === "hero" ? (
				<View style={tw`bg-sky-500 px-5 pb-8 pt-2`}>
					<View style={tw`mb-6 flex-row items-center rounded-full bg-yellow-300 px-4 py-3`}>
						<View style={tw`h-7 w-7 items-center justify-center rounded-full bg-sky-100`}><Ionicons name="cloud-offline-outline" size={17} color="#1671B8" /></View>
						<Text style={tw`ml-2 flex-1 text-xs font-bold text-slate-800`}>Offline mode</Text>
						<Text style={tw`text-xs font-medium text-slate-700`}>{pendingSyncCount} pending sync</Text>
					</View>
					<View style={tw`flex-row items-start justify-between`}>
						<View>
							<Text style={tw`text-4xl font-bold text-white`}>AI Health</Text>
							<Text style={tw`mt-1 text-xl font-medium text-white`}>Decision Support System</Text>
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
					<Text style={tw`mt-1 text-xs font-medium text-slate-500`}>Primary care decision support</Text>
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
							<Text style={tw`mt-1 text-xs text-slate-500`}>Tools and account settings</Text>
						</View>
						<MenuItem icon="analytics-outline" label="Analysis" onPress={() => openScreen("/Analysis")} />
						<MenuItem icon="settings-outline" label="Settings" onPress={() => openScreen("/Settings")} />
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
