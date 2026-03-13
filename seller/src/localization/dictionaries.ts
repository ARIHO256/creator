import englishDictionary from "./dictionaries/english";
import arabicDictionary from "./dictionaries/arabic";
import chineseDictionary from "./dictionaries/chinese";
import spanishDictionary from "./dictionaries/spanish";
import frenchDictionary from "./dictionaries/french";
import portugueseDictionary from "./dictionaries/portuguese";
import germanDictionary from "./dictionaries/german";
import italianDictionary from "./dictionaries/italian";
import russianDictionary from "./dictionaries/russian";
import japaneseDictionary from "./dictionaries/japanese";
import koreanDictionary from "./dictionaries/korean";
import turkishDictionary from "./dictionaries/turkish";
import vietnameseDictionary from "./dictionaries/vietnamese";
import thaiDictionary from "./dictionaries/thai";
import indonesianDictionary from "./dictionaries/indonesian";
import zhDictionary from "./dictionaries/zh";
import hindiDictionary from "./dictionaries/hindi";
import danishDictionary from "./dictionaries/danish";
import swedishDictionary from "./dictionaries/swedish";
import norwegianDictionary from "./dictionaries/norwegian";
import dutchDictionary from "./dictionaries/dutch";
import finnishDictionary from "./dictionaries/finnish";
import lugandaDictionary from "./dictionaries/luganda";

export type DictionaryMap = Record<string, string>;

const dictionaries: Record<string, DictionaryMap> = {
  "en": englishDictionary,
  "ar": arabicDictionary,
  "zh-CN": chineseDictionary,
  "es": spanishDictionary,
  "fr": frenchDictionary,
  "pt": portugueseDictionary,
  "de": germanDictionary,
  "it": italianDictionary,
  "ru": russianDictionary,
  "ja": japaneseDictionary,
  "ko": koreanDictionary,
  "tr": turkishDictionary,
  "vi": vietnameseDictionary,
  "th": thaiDictionary,
  "id": indonesianDictionary,
  "zh": zhDictionary,
  "hi": hindiDictionary,
  "da": danishDictionary,
  "sv": swedishDictionary,
  "no": norwegianDictionary,
  "nl": dutchDictionary,
  "fi": finnishDictionary,
  "lg": lugandaDictionary,
};

export default dictionaries;
