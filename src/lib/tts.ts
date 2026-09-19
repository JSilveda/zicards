let voicesLoaded = false;

function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0 && voicesLoaded) {
      resolve(voices);
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      voicesLoaded = true;
      resolve(window.speechSynthesis.getVoices());
    };

    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 500);
  });
}

function findBestVoice(
  voices: SpeechSynthesisVoice[],
  langCode: string
): SpeechSynthesisVoice | null {
  const langPrefix = langCode.split("-")[0].toLowerCase();

  const exactMatch = voices.find(
    (v) => v.lang.toLowerCase() === langCode.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  const prefixLocal = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith(langPrefix) && v.localService === true
  );
  if (prefixLocal) return prefixLocal;

  const prefixMatch = voices.find((v) =>
    v.lang.toLowerCase().startsWith(langPrefix)
  );
  if (prefixMatch) return prefixMatch;

  return null;
}

export async function speak(text: string, lang: string = "en-US") {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const voices = await ensureVoicesLoaded();
    const voice = findBestVoice(voices, lang);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    if (voice) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {}
}

export async function speakWithVoice(text: string, voiceUri: string) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const voices = await ensureVoicesLoaded();
    const voice = voices.find((v) => v.voiceURI === voiceUri);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    window.speechSynthesis.speak(utterance);
  } catch {}
}

export function getAvailableVoices(langCode: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }

  const voices = window.speechSynthesis.getVoices();
  const langPrefix = langCode.split("-")[0].toLowerCase();

  return voices.filter((v) =>
    v.lang.toLowerCase().startsWith(langPrefix)
  );
}

export function getAllVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices();
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
