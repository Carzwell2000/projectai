import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import tw from "twrnc";

export type NewPatient = {
  name: string;
  phone: string;
  dateOfBirth: string;
  condition: string;
};

type RegisterPatientProps = {
  onCancel: () => void;
  onSave: (patient: NewPatient) => void | Promise<void>;
};

export default function RegisterPatient({ onCancel, onSave }: RegisterPatientProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [condition, setCondition] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !dateOfBirth.trim()) {
      setError("Name, phone number, and date of birth are required.");
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth.trim(),
        condition: condition.trim() || "General health review",
      });
    } catch {
      setError("FastAPI is unavailable. The patient was not saved.");
    }
  };

  return (
    <View style={tw`max-h-[90%] rounded-t-3xl border-t border-slate-200 bg-white px-5 pb-8 pt-5`}>
      <View style={tw`mb-5 flex-row items-center justify-between`}>
        <View>
          <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}>PATIENT INTAKE</Text>
          <Text style={tw`text-2xl font-bold text-slate-900`}>Register patient</Text>
          <Text style={tw`mt-1 text-sm text-slate-500`}>Create a secure patient record</Text>
        </View>
        <Pressable accessibilityLabel="Close registration form" onPress={onCancel} style={tw`h-10 w-10 items-center justify-center rounded-full bg-slate-100`}>
          <Ionicons name="close-outline" size={24} color="#475569" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FormField label="Full name" placeholder="e.g. Maya Okafor" value={name} onChangeText={setName} />
        <FormField label="Phone number" placeholder="e.g. +234 800 000 0000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <FormField label="Date of birth" placeholder="DD / MM / YYYY" value={dateOfBirth} onChangeText={setDateOfBirth} />
        <FormField label="Primary concern (optional)" placeholder="e.g. Respiratory symptoms" value={condition} onChangeText={setCondition} />

        {error ? <Text style={tw`mb-3 text-sm font-medium text-rose-600`}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={handleSave}
          style={({ pressed }) => [tw`items-center rounded-xl bg-teal-700 py-4`, pressed && tw`opacity-80`]}
        >
          <Text style={tw`font-bold text-white`}>Save patient</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onCancel} style={tw`mt-3 items-center py-3`}>
          <Text style={tw`font-semibold text-slate-500`}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

type FormFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "phone-pad";
};

function FormField({ label, placeholder, value, onChangeText, keyboardType = "default" }: FormFieldProps) {
  return (
    <View style={tw`mb-4`}>
      <Text style={tw`mb-2 text-sm font-bold text-slate-700`}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        style={tw`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900`}
      />
    </View>
  );
}
