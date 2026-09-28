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
  gender: "female" | "male" | "intersex" | "other" | "prefer_not_to_say";
  email: string;
  address: string;
};

type RegisterPatientProps = {
  onCancel: () => void;
  onSave: (patient: NewPatient) => void | Promise<void>;
  initialPatient?: NewPatient;
};

export default function RegisterPatient({ onCancel, onSave, initialPatient }: RegisterPatientProps) {
  const [name, setName] = useState(initialPatient?.name ?? "");
  const [phone, setPhone] = useState(initialPatient?.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(initialPatient?.dateOfBirth ?? "");
  const [gender, setGender] = useState<NewPatient["gender"] | "">(initialPatient?.gender ?? "");
  const [email, setEmail] = useState(initialPatient?.email ?? "");
  const [address, setAddress] = useState(initialPatient?.address ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const phoneDigits = phone.replace(/\D/g, "");
    if (!name.trim() || !phone.trim() || !dateOfBirth.trim() || !gender || !email.trim() || !address.trim()) {
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
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        id: initialPatient?.id ?? `patient-${Date.now()}`,
        name: name.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth.trim(),
        gender,
        email: email.trim().toLowerCase(),
        address: address.trim(),
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
          <Text style={tw`mt-1 text-2xl font-bold text-slate-900`}>{initialPatient ? "Edit patient" : "Register patient"}</Text>
          <Text style={tw`mt-1 text-sm leading-5 text-slate-500`}>{initialPatient ? "Correct the patient details below." : "Add the patient details below to create a secure record."}</Text>
        </View>
        <Pressable accessibilityLabel="Close registration form" onPress={onCancel} style={tw`h-10 w-10 items-center justify-center rounded-full bg-slate-100`}>
          <Ionicons name="close-outline" size={24} color="#475569" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={tw`mb-3 text-xs font-bold uppercase tracking-widest text-slate-400`}>Personal details</Text>
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

        <View style={tw`mb-4`}>
          <Text style={tw`mb-2 text-sm font-bold text-slate-700`}>Gender<Text style={tw`text-rose-500`}> *</Text></Text>
          <View style={tw`flex-row flex-wrap gap-2`}>
            {[['female', 'Female'], ['male', 'Male'], ['intersex', 'Intersex'], ['other', 'Other'], ['prefer_not_to_say', 'Prefer not to say']].map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => { setGender(value as NewPatient["gender"]); setError(""); }}
                style={tw`rounded-xl border px-3 py-2 ${gender === value ? "border-teal-700 bg-teal-50" : "border-slate-200 bg-white"}`}
              >
                <Text style={tw`text-xs font-semibold ${gender === value ? "text-teal-800" : "text-slate-600"}`}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={tw`mb-3 mt-2 text-xs font-bold uppercase tracking-widest text-slate-400`}>Contact details</Text>
        <FormField label="Email address" placeholder="e.g. maya@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" required />
        <FormField label="Address" placeholder="Street, city, state" value={address} onChangeText={setAddress} multiline required />

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
          <Text style={tw`font-bold text-white`}>{isSaving ? "Saving..." : initialPatient ? "Save changes" : "Save patient"}</Text>
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
  keyboardType?: "default" | "phone-pad" | "email-address";
  multiline?: boolean;
  helperText?: string;
  required?: boolean;
};

function FormField({ label, placeholder, value, onChangeText, keyboardType = "default", multiline = false, helperText, required = false }: FormFieldProps) {
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
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={tw`${multiline ? "min-h-[76px]" : ""} rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-900`}
      />
    </View>
  );
}
