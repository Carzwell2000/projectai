import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import Navbar from "../Components/Navbar";
import {
	getApiErrorMessage,
	listMessageNurses,
	listNurseMessages,
	sendNurseMessage,
	type NurseMessage,
} from "../services/api";
import { useAuthStore } from "../stores/authStore";

export default function ChatConversation() {
	const router = useRouter();
	const params = useLocalSearchParams<{ nurseId?: string | string[] }>();
	const nurseId = Array.isArray(params.nurseId) ? params.nurseId[0] : params.nurseId;
	const currentNurseId = useAuthStore((state) => state.session?.nurse.id);
	const [nurseName, setNurseName] = useState("Nurse");
	const [messages, setMessages] = useState<NurseMessage[]>([]);
	const [draft, setDraft] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isSending, setIsSending] = useState(false);
	const messageList = useRef<FlatList<NurseMessage>>(null);

	const loadConversation = useCallback(async () => {
		if (!nurseId) {
			setError("Choose a nurse from the inbox first.");
			setIsLoading(false);
			return;
		}
		setError("");
		try {
			const [nurses, conversation] = await Promise.all([
				listMessageNurses(),
				listNurseMessages(nurseId),
			]);
			const nurse = nurses.find((contact) => contact.id === nurseId);
			if (!nurse) {
				setError("This nurse is no longer available.");
				setMessages([]);
				return;
			}
			setNurseName(nurse.name);
			setMessages(conversation);
		} catch (loadError) {
			setError(getApiErrorMessage(loadError));
		} finally {
			setIsLoading(false);
		}
	}, [nurseId]);

	const refreshMessages = useCallback(async () => {
		if (!nurseId) return;
		setError("");
		try {
			setMessages(await listNurseMessages(nurseId));
		} catch (loadError) {
			setError(getApiErrorMessage(loadError));
		}
	}, [nurseId]);

	useFocusEffect(
		useCallback(() => {
			void loadConversation();
			const interval = setInterval(() => void refreshMessages(), 5000);
			return () => clearInterval(interval);
		}, [loadConversation, refreshMessages]),
	);

	const send = async () => {
		const body = draft.trim();
		if (!nurseId || !body || isSending) return;
		setIsSending(true);
		setError("");
		try {
			const sentMessage = await sendNurseMessage(nurseId, body);
			setMessages((current) => [...current, sentMessage]);
			setDraft("");
			requestAnimationFrame(() => messageList.current?.scrollToEnd({ animated: true }));
		} catch (sendError) {
			setError(getApiErrorMessage(sendError));
		} finally {
			setIsSending(false);
		}
	};

	return (
		<SafeAreaView style={tw`flex-1 bg-slate-50`}>
			<Stack.Screen options={{ headerShown: false }} />
			<Navbar variant="hero" />
			<KeyboardAvoidingView style={tw`flex-1`} behavior={Platform.OS === "ios" ? "padding" : undefined}>
				<View style={tw`flex-1 px-4 pb-4 pt-4`}>
					<View style={tw`mb-4 flex-row items-center justify-between`}>
						<View>
							<Text style={tw`text-xs font-bold text-teal-700`}>CONVERSATION</Text>
							<Text style={tw`mt-1 text-2xl font-bold text-slate-900`}>{nurseName}</Text>
						</View>
						<Pressable accessibilityLabel="Back to nurse list" onPress={() => router.replace("/Chat")} style={tw`h-10 w-10 items-center justify-center rounded-full bg-white`}>
							<Ionicons name="arrow-back" size={20} color="#0F766E" />
						</Pressable>
					</View>

					<View style={tw`flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white`}>
						<View style={tw`flex-row items-center justify-between border-b border-slate-100 px-4 py-3`}>
							<Text style={tw`text-sm font-bold text-slate-800`}>Messages</Text>
							<Pressable accessibilityLabel="Refresh messages" onPress={() => void refreshMessages()}>
								<Ionicons name="refresh-outline" size={20} color="#64748B" />
							</Pressable>
						</View>
						{error ? <Text style={tw`px-4 pt-3 text-xs text-rose-600`}>{error}</Text> : null}
						<FlatList
							ref={messageList}
							data={messages}
							keyExtractor={(message) => message.id}
							contentContainerStyle={tw`grow justify-end px-4 py-4`}
							ListEmptyComponent={isLoading ? <ActivityIndicator color="#0F766E" /> : <Text style={tw`py-6 text-center text-sm text-slate-500`}>No messages yet. Start the conversation.</Text>}
							renderItem={({ item }) => {
								const isMine = item.senderId === currentNurseId;
								return (
									<View style={[tw`mb-3 max-w-[85%] rounded-2xl px-3 py-2`, isMine ? tw`self-end bg-teal-700` : tw`self-start bg-slate-100`]}>
										<Text style={[tw`text-sm`, isMine ? tw`text-white` : tw`text-slate-800`]}>{wrapLongMessageText(item.body)}</Text>
										<View style={tw`mt-1 flex-row items-center justify-end`}>
											<Text style={[tw`text-[10px]`, isMine ? tw`text-teal-100` : tw`text-slate-500`]}>{formatMessageTime(item.createdAt)}</Text>
											{isMine ? (
												<Ionicons
													name={item.deliveredAt ? "checkmark-done" : "checkmark"}
													size={15}
													color={item.deliveredAt ? "#38BDF8" : "#CBD5E1"}
													style={tw`ml-1`}
												/>
											) : null}
										</View>
									</View>
								);
							}}
						/>
						<View style={tw`flex-row items-end border-t border-slate-100 px-3 py-3`}>
							<TextInput value={draft} onChangeText={setDraft} placeholder="Write a message" maxLength={4000} multiline style={tw`max-h-24 min-h-11 flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800`} />
							<Pressable accessibilityLabel="Send message" disabled={!draft.trim() || isSending} onPress={() => void send()} style={[tw`ml-2 h-11 w-11 items-center justify-center rounded-full`, draft.trim() && !isSending ? tw`bg-teal-700` : tw`bg-slate-300`]}>
								{isSending ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="send" size={17} color="white" />}
							</Pressable>
						</View>
					</View>
					<Text style={tw`px-2 pt-2 text-center text-[11px] text-slate-500`}>Keep patient-identifying details out of messages.</Text>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

function wrapLongMessageText(value: string): string {
	return value
		.split(/(\s+)/)
		.map((part) => {
			if (/^\s+$/.test(part)) return part;
			const characters = Array.from(part);
			const chunks: string[] = [];
			for (let index = 0; index < characters.length; index += 20) {
				chunks.push(characters.slice(index, index + 20).join(""));
			}
			return chunks.join("\u200B");
		})
		.join("");
}

function formatMessageTime(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}