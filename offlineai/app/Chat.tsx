import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import { getApiErrorMessage, listMessageNurses, type NurseContact } from "../services/api";

export default function Chat() {
	const router = useRouter();
	const [nurses, setNurses] = useState<NurseContact[]>([]);
	const [selectedNurse, setSelectedNurse] = useState<NurseContact | null>(null);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(true);

	const loadNurses = useCallback(async () => {
		setError("");
		try {
			const registeredNurses = await listMessageNurses();
			setNurses(registeredNurses);
			setSelectedNurse((current) =>
				current ? registeredNurses.find((nurse) => nurse.id === current.id) ?? null : null,
			);
		} catch (loadError) {
			setError(getApiErrorMessage(loadError));
		} finally {
			setIsLoading(false);
		}
	}, []);

	useFocusEffect(useCallback(() => {
		void loadNurses();
	}, [loadNurses]));

	return (
		<SafeAreaView style={tw`flex-1 bg-slate-50`}>
			<Stack.Screen options={{ headerShown: false }} />
			<Navbar variant="hero" />
			<View style={tw`flex-1 px-4 pb-5 pt-4`}>
				<View style={tw`mb-4 flex-row items-center justify-between`}>
					<View>
						<Text style={tw`text-xs font-bold text-teal-700`}>TEAM COMMUNICATION</Text>
						<Text style={tw`mt-1 text-2xl font-bold text-slate-900`}>Registered nurses</Text>
					</View>
					<Pressable accessibilityLabel="Back to home" onPress={() => router.replace("/Home")} style={tw`h-10 w-10 items-center justify-center rounded-full bg-white`}>
						<Ionicons name="arrow-back" size={20} color="#0F766E" />
					</Pressable>
				</View>

				<View style={tw`flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white`}>
					{isLoading ? (
						<ActivityIndicator style={tw`py-10`} color="#0F766E" />
					) : error ? (
						<Text style={tw`px-4 py-5 text-sm text-rose-600`}>{error}</Text>
					) : nurses.length === 0 ? (
						<View style={tw`items-center px-6 py-10`}>
							<Ionicons name="people-outline" size={28} color="#94A3B8" />
							<Text style={tw`mt-3 text-center text-sm font-semibold text-slate-700`}>No other nurses registered</Text>
						</View>
					) : (
						<FlatList
							data={nurses}
							keyExtractor={(nurse) => nurse.id}
							keyboardShouldPersistTaps="handled"
							renderItem={({ item }) => {
								const isSelected = item.id === selectedNurse?.id;
								return (
									<Pressable
									accessibilityRole="button"
									accessibilityState={{ selected: isSelected }}
									onPress={() => setSelectedNurse(item)}
									style={[tw`flex-row items-center border-b border-slate-100 px-4 py-4`, isSelected ? tw`bg-teal-50` : undefined]}
								>
									<View style={tw`h-10 w-10 items-center justify-center rounded-full bg-teal-100`}>
										<Ionicons name="person-outline" size={19} color="#0F766E" />
									</View>
									<Text numberOfLines={1} style={tw`ml-3 flex-1 text-sm font-semibold text-slate-800`}>{item.name}</Text>
									{isSelected ? <Ionicons name="checkmark-circle" size={21} color="#0F766E" /> : null}
								</Pressable>
								);
							}}
						/>
					)}
					{selectedNurse ? (
						<View style={tw`border-t border-slate-100 p-4`}>
							<Pressable
								accessibilityRole="button"
								onPress={() => router.push({ pathname: "/ChatConversation", params: { nurseId: selectedNurse.id } })}
								style={tw`flex-row items-center justify-center rounded-xl bg-teal-700 px-4 py-4`}
							>
								<Ionicons name="chatbubble-ellipses-outline" size={19} color="white" />
								<Text style={tw`ml-2 font-bold text-white`}>Open chat with {selectedNurse.name}</Text>
							</Pressable>
						</View>
					) : null}
				</View>
				<Text style={tw`px-2 pt-2 text-center text-[11px] text-slate-500`}>Keep patient-identifying details out of messages.</Text>
			</View>
		</SafeAreaView>
	);
}