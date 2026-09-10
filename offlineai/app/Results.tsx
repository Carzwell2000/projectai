import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import tw from "twrnc";
import Navbar from "../Components/Navbar";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

export default function Results() {
  const router = useRouter();
  const { name = "Patient", age = "", symptoms = "", temperature = "", bloodPressure = "", assessmentId = "", disease = "", confidence = "", recommendation = "", modelVersion = "", predictions = "[]", offline = "false", error = "" } = useLocalSearchParams<{
    name: string;
    age: string;
    symptoms: string;
    temperature: string;
    bloodPressure: string;
    assessmentId: string;
    disease: string;
    confidence: string;
    recommendation: string;
    modelVersion: string;
    predictions: string;
    offline: string;
    error: string;
  }>();
  const symptomText = Array.isArray(symptoms) ? symptoms.join(", ") : symptoms;
  const diseaseText = Array.isArray(disease) ? disease[0] : disease;
  const confidenceText = Array.isArray(confidence) ? confidence[0] : confidence;
  const recommendationText = Array.isArray(recommendation) ? recommendation[0] : recommendation;
  const modelVersionText = Array.isArray(modelVersion) ? modelVersion[0] : modelVersion;
  const predictionText = Array.isArray(predictions) ? predictions[0] : predictions;
  const topPredictions = parsePredictions(predictionText);
  const topMatch = topPredictions[0];
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: diseaseText
        ? `I can explain this prediction for ${name}. What would you like to understand first?`
        : "I can explain how predictions work, but this assessment does not have a model result yet. What would you like to know?",
    },
  ]);

  const askQuestion = (value = question) => {
    const trimmedQuestion = value.trim();
    if (!trimmedQuestion) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      { id: `${Date.now()}-question`, role: "user", text: trimmedQuestion },
      { id: `${Date.now()}-answer`, role: "assistant", text: answerPredictionQuestion(trimmedQuestion, { diseaseText, confidenceText, symptomText, recommendationText, modelVersionText }) },
    ]);
    setQuestion("");
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={tw`px-5 pb-8`} showsVerticalScrollIndicator={false}>
        <Navbar variant="hero" />
        <Pressable onPress={() => router.back()} style={tw`mb-7 mt-3 flex-row items-center`}>
          <Ionicons name="arrow-back" size={20} color="#0F766E" />
          <Text style={tw`ml-2 text-sm font-bold text-teal-700`}>Back to assessment</Text>
        </Pressable>

        <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}>DECISION SUPPORT</Text>
        <Text style={tw`mt-2 text-3xl font-bold text-slate-900`}>Assessment result</Text>
        <Text style={tw`mt-2 text-sm leading-5 text-slate-500`}>Prediction returned by the FastAPI model service.</Text>

        <View style={tw`mt-6 rounded-3xl bg-teal-800 p-5 shadow-sm`}>
          <Text style={tw`text-xs font-bold tracking-widest text-teal-100`}>PATIENT</Text>
          <Text style={tw`mt-2 text-2xl font-bold text-white`}>{name}</Text>
          <Text style={tw`mt-1 text-sm text-teal-100`}>{age} years old</Text>
          <Text style={tw`mt-1 text-sm text-teal-100`}>{temperature} °C · BP {bloodPressure}</Text>
          <View style={tw`mt-5 rounded-xl bg-teal-600 p-3`}>
            <Text style={tw`text-xs font-semibold text-teal-100`}>Reported symptoms</Text>
            <Text style={tw`mt-1 text-sm leading-5 text-white`}>{symptomText || "No symptoms provided"}</Text>
          </View>
        </View>

        {diseaseText ? (
          <>
            <ResultCard
              icon="medkit-outline"
              title={diseaseText === "Insufficient evidence" ? "Possible match (low confidence)" : "Possible match"}
              message={diseaseText === "Insufficient evidence"
                ? topMatch
                  ? `${topMatch.disease} (${Math.round(topMatch.confidence * 100)}% model confidence). Add more specific symptoms before relying on this result.`
                  : "The model needs at least one more specific symptom before it can make a reliable prediction. Review any result with a qualified healthcare professional."
                : `${diseaseText}${confidenceText ? ` (${Math.round(Number(confidenceText) * 100)}% confidence)` : ""}`}
            />
            <ResultCard icon="list-outline" title="Recommendations" message={recommendationText || "Review this result with a qualified healthcare professional."} />
            <Text style={tw`mt-3 text-right text-xs text-slate-400`}>Model {modelVersionText || "unknown"}</Text>
            <TopPredictions predictions={topPredictions} />
          </>
        ) : (
          <ResultPlaceholder
            icon="medkit-outline"
            title="Prediction unavailable"
            message={error || "FastAPI did not return a prediction. Check that the backend is running and reachable from this device."}
          />
        )}

        <PredictionChat
          messages={messages}
          question={question}
          onQuestionChange={setQuestion}
          onAsk={askQuestion}
        />

        <View style={tw`mt-6 flex-row items-start rounded-2xl bg-slate-100 p-4`}>
          <Ionicons name="information-circle-outline" size={21} color="#64748B" />
          <Text style={tw`ml-3 flex-1 text-xs leading-5 text-slate-500`}>Assessment {assessmentId ? `${assessmentId} was ` : "was "}processed by FastAPI. Predicted disease and recommendations require the exported model and review by a qualified health professional.</Text>
        </View>

        <Pressable onPress={() => router.replace("/Assess")} style={({ pressed }) => [tw`mt-6 items-center rounded-xl bg-teal-700 py-4`, pressed && tw`opacity-80`]}>
          <Text style={tw`font-bold text-white`}>Start another assessment</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function parsePredictions(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.disease === "string" && typeof item.confidence === "number").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function TopPredictions({ predictions }: { predictions: { disease: string; confidence: number }[] }) {
  if (!predictions.length) return null;

  return (
    <View style={tw`mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm`}>
      <Text style={tw`text-base font-bold text-slate-900`}>Top 5 model matches</Text>
      <Text style={tw`mt-1 text-xs leading-4 text-slate-500`}>These are ranked possibilities, not confirmed diagnoses.</Text>
      <View style={tw`mt-3 gap-3`}>
        {predictions.map((prediction, index) => (
          <View key={`${prediction.disease}-${index}`} style={tw`flex-row items-center`}>
            <Text style={tw`w-6 text-xs font-bold text-slate-400`}>{index + 1}</Text>
            <Text style={tw`flex-1 text-sm font-semibold text-slate-700`}>{prediction.disease}</Text>
            <Text style={tw`text-xs font-bold text-teal-700`}>{Math.round(prediction.confidence * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PredictionChat({
  messages,
  question,
  onQuestionChange,
  onAsk,
}: {
  messages: ChatMessage[];
  question: string;
  onQuestionChange: (value: string) => void;
  onAsk: (value?: string) => void;
}) {
  const suggestedQuestions = ["What does the confidence mean?", "Why this prediction?", "What should I do next?"];

  return (
    <View style={tw`mt-6 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm`}>
      <View style={tw`flex-row items-center`}>
        <View style={tw`h-10 w-10 items-center justify-center rounded-full bg-teal-50`}>
          <Ionicons name="chatbubbles-outline" size={21} color="#0F766E" />
        </View>
        <View style={tw`ml-3 flex-1`}>
          <Text style={tw`text-lg font-bold text-slate-900`}>Talk through the prediction</Text>
          <Text style={tw`mt-1 text-xs text-slate-500`}>Ask a question and I will explain this result.</Text>
        </View>
      </View>

      <View style={tw`mt-4 gap-3`}>
        {messages.map((message) => (
          <View key={message.id} style={message.role === "user" ? tw`self-end rounded-2xl rounded-br-sm bg-teal-700 px-3 py-2` : tw`self-start max-w-full rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2`}>
            <Text style={message.role === "user" ? tw`text-sm leading-5 text-white` : tw`text-sm leading-5 text-slate-700`}>{message.text}</Text>
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`mt-4 gap-2`}>
        {suggestedQuestions.map((suggestedQuestion) => (
          <Pressable key={suggestedQuestion} onPress={() => onAsk(suggestedQuestion)} style={({ pressed }) => [tw`rounded-full border border-teal-200 px-3 py-2`, pressed && tw`opacity-70`]}>
            <Text style={tw`text-xs font-semibold text-teal-700`}>{suggestedQuestion}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={tw`mt-3 flex-row items-end rounded-xl border border-slate-200 px-3`}>
        <TextInput
          value={question}
          onChangeText={onQuestionChange}
          onSubmitEditing={() => onAsk()}
          placeholder="Ask about this prediction..."
          placeholderTextColor="#94A3B8"
          returnKeyType="send"
          style={tw`max-h-20 min-h-11 flex-1 py-3 text-sm text-slate-900`}
        />
        <Pressable accessibilityLabel="Ask question" disabled={!question.trim()} onPress={() => onAsk()} style={({ pressed }) => [tw`mb-1 h-9 w-9 items-center justify-center rounded-lg bg-teal-700`, (!question.trim() || pressed) && tw`opacity-50`]}>
          <Ionicons name="arrow-up" size={19} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

function answerPredictionQuestion(
  question: string,
  result: { diseaseText: string; confidenceText: string; symptomText: string; recommendationText: string; modelVersionText: string },
) {
  const normalizedQuestion = question.toLowerCase();
  const confidence = Number(result.confidenceText);
  const confidenceLabel = result.confidenceText && Number.isFinite(confidence) ? `${Math.round(confidence * 100)}%` : "not available";

  if (normalizedQuestion.includes("confidence") || normalizedQuestion.includes("sure") || normalizedQuestion.includes("accurate")) {
    return result.diseaseText
      ? `The model reported ${confidenceLabel} confidence for ${result.diseaseText}. Confidence is the model's estimate, not a diagnosis or a guarantee of accuracy.`
      : "There is no confidence score because a model prediction has not been returned yet.";
  }

  if (normalizedQuestion.includes("why") || normalizedQuestion.includes("based") || normalizedQuestion.includes("symptom")) {
    return result.diseaseText
      ? `This result was generated from the reported symptoms: ${result.symptomText || "no symptoms listed"}. The model compares those inputs with patterns it learned from its training data, but it does not replace a clinical examination.`
      : "The prediction cannot be explained yet because the model result is unavailable."
  }

  if (normalizedQuestion.includes("next") || normalizedQuestion.includes("do") || normalizedQuestion.includes("recommend")) {
    return result.recommendationText || "Please review the result with a qualified healthcare professional, especially if symptoms are severe, worsening, or unexpected.";
  }

  if (normalizedQuestion.includes("model") || normalizedQuestion.includes("version")) {
    return `This result came from model ${result.modelVersionText || "version information was not returned"}. The model is decision support and should be considered alongside clinical judgment.`;
  }

  return result.diseaseText
    ? `The prediction shown is ${result.diseaseText} with ${confidenceLabel} confidence. You can ask me about the confidence, the symptoms used, the recommendation, or what to do next.`
    : "I can answer questions about confidence, symptoms, recommendations, and model status once a prediction is available.";
}

function ResultPlaceholder({ icon, title, message }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string }) {
  return (
    <View style={tw`mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm`}>
      <View style={tw`h-11 w-11 items-center justify-center rounded-xl bg-teal-50`}>
        <Ionicons name={icon} size={23} color="#0F766E" />
      </View>
      <Text style={tw`mt-4 text-lg font-bold text-slate-900`}>{title}</Text>
      <Text style={tw`mt-2 text-sm leading-5 text-slate-500`}>{message}</Text>
      <View style={tw`mt-4 flex-row items-center rounded-xl bg-slate-50 px-3 py-3`}>
        <Ionicons name="time-outline" size={17} color="#94A3B8" />
        <Text style={tw`ml-2 text-xs font-medium text-slate-400`}>Waiting for model response</Text>
      </View>
    </View>
  );
}

function ResultCard({ icon, title, message }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string }) {
  return (
    <View style={tw`mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm`}>
      <View style={tw`h-11 w-11 items-center justify-center rounded-xl bg-teal-50`}>
        <Ionicons name={icon} size={23} color="#0F766E" />
      </View>
      <Text style={tw`mt-4 text-lg font-bold text-slate-900`}>{title}</Text>
      <Text style={tw`mt-2 text-sm leading-5 text-slate-600`}>{message}</Text>
    </View>
  );
}
