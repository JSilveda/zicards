export function speak(text: string, lang: string = "en-US") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const matchingVoice = voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
  if (matchingVoice) {
    utterance.voice = matchingVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export function getLanguageVoiceCode(languageCode: string): string {
  const voiceMap: Record<string, string> = {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    it: "it-IT",
    pt: "pt-BR",
    ja: "ja-JP",
    ko: "ko-KR",
    zh: "zh-CN",
    ar: "ar-SA",
    ru: "ru-RU",
    nl: "nl-NL",
    sv: "sv-SE",
    pl: "pl-PL",
    tr: "tr-TR",
    hi: "hi-IN",
  };
  return voiceMap[languageCode] || "en-US";
}
