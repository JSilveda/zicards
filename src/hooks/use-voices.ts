"use client";

import { useState, useEffect } from "react";
import { getAvailableVoices, getLanguageVoiceCode } from "@/lib/tts";

export function useVoices(languageCode: string) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");

  useEffect(() => {
    const loadVoices = () => {
      const available = getAvailableVoices(languageCode);
      setVoices(available);

      if (available.length > 0 && !selectedVoice) {
        const localVoice = available.find((v) => v.localService);
        if (localVoice) {
          setSelectedVoice(localVoice.voiceURI);
        } else {
          setSelectedVoice(available[0].voiceURI);
        }
      }
    };

    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
    };
  }, [languageCode, selectedVoice]);

  const getVoiceLangCode = () => {
    if (selectedVoice && voices.length > 0) {
      const voice = voices.find((v) => v.voiceURI === selectedVoice);
      if (voice) return voice.lang;
    }
    return getLanguageVoiceCode(languageCode);
  };

  return {
    voices,
    selectedVoice,
    setSelectedVoice,
    getVoiceLangCode,
  };
}
