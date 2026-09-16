import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import tw from "twrnc";
import { getApiErrorMessage } from "../services/api";

export type NewPatient = {
  id?: string;
  name: string;
  phone: string;
  dateOfBirth: string;
};

type RegisterPatientProps = {
  onCancel: () => void;
  onSave: (patient: NewPatient) => void | Promise<void>;
};

export default function RegisterPatient({ onCancel, onSave }: RegisterPatientProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const phoneDigits = phone.replace(/\D/g, "");
    if (!name.trim() || !phone.trim() || !dateOfBirth.trim()) {
      setError("Please complete all required fields.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      setError("Phone number must contain between 10 and 15 digits.");
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        id: `patient-${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth.trim(),
      });
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={tw`max-h-[92%] rounded-t-3xl border-t border-slate-200 bg-white px-5 pb-8 pt-6`}>
      <View style={tw`mb-5 flex-row items-center justify-between`}>
        <View>
          <Text style={tw`text-xs font-bold tracking-widest text-teal-700`}>PATIENT INTAKE</Text>
          <Text style={tw`mt-1 text-2xl font-bold text-slate-900`}>Register patient</Text>
          <Text style={tw`mt-1 text-sm leading-5 text-slate-500`}>Add the patient details below to create a secure record.</Text>
        </View>
        <Pressable accessibilityLabel="Close registration form" onPress={onCancel} style={tw`h-10 w-10 items-center justify-center rounded-full bg-slate-100`}>
          <Ionicons name="close-outline" size={24} color="#475569" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FormField label="Full name" placeholder="e.g. Maya Okafor" value={name} onChangeText={setName} required />
        <FormField
          label="Phone number"
          placeholder="e.g. +234 800 000 0000"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          required
        />
        <FormField label="Date of birth" placeholder="DD / MM / YYYY" value={dateOfBirth} onChangeText={setDateOfBirth} required />

        {error ? (
          <View style={tw`mb-4 flex-row items-start rounded-xl border border-rose-200 bg-rose-50 px-3 py-3`}>
            <Ionicons name="alert-circle-outline" size={18} color="#E11D48" />
            <Text style={tw`ml-2 flex-1 text-sm font-medium leading-5 text-rose-700`}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={handleSave}
          disabled={isSaving}
          style={({ pressed }) => [tw`items-center rounded-xl bg-teal-700 py-4`, (pressed || isSaving) && tw`opacity-60`]}
        >
          <Text style={tw`font-bold text-white`}>{isSaving ? "Saving..." : "Save patient"}</Text>
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
  helperText?: string;
  required?: boolean;
};

function FormField({ label, placeholder, value, onChangeText, keyboardType = "default", helperText, required = false }: FormFieldProps) {
  return (
    <View style={tw`mb-4`}>
      <View style={tw`mb-2 flex-row items-center justify-between`}>
        <Text style={tw`text-sm font-bold text-slate-700`}>
          {label}{required ? <Text style={tw`text-rose-500`}> *</Text> : null}
        </Text>
        {helperText ? <Text style={tw`text-xs text-slate-400`}>{helperText}</Text> : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        style={tw`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900`}
      />
    </View>
  );
}
