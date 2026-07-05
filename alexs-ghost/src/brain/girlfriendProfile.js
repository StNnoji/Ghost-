const allowedKeys = new Set([
  "preferredName",
  "nicknames",
  "favoriteFoods",
  "favoriteEmojis",
  "likes",
  "dislikes",
  "comfortStyle",
  "romanticStyle",
  "lastKnownMood",
  "importantNotes"
]);

const listKeys = new Set(["nicknames", "favoriteFoods", "favoriteEmojis", "likes", "dislikes", "importantNotes"]);

function getDefaultGirlfriendProfile() {
  return {
    preferredName: "",
    nicknames: [],
    favoriteFoods: [],
    favoriteEmojis: [],
    likes: [],
    dislikes: [],
    comfortStyle: "",
    romanticStyle: "",
    lastKnownMood: "",
    importantNotes: []
  };
}

function normalizeValue(value = "") {
  return String(value).replace(/\s+/g, " ").trim().slice(0, 120);
}

function parseNoteInput(input = "") {
  const [rawKey, ...rest] = String(input).split(":");
  const key = normalizeValue(rawKey);
  const value = normalizeValue(rest.join(":"));
  if (!allowedKeys.has(key) || !value) return null;
  return { key, value };
}

function applyGirlfriendNote(profile, key, value) {
  if (!allowedKeys.has(key)) return false;
  const clean = normalizeValue(value);
  if (!clean) return false;
  profile.girlfriendProfile ||= getDefaultGirlfriendProfile();
  if (listKeys.has(key)) {
    const current = profile.girlfriendProfile[key] || [];
    profile.girlfriendProfile[key] = [...current.filter((item) => item !== clean), clean].slice(-12);
  } else {
    profile.girlfriendProfile[key] = clean;
  }
  return true;
}

function removeGirlfriendNote(profile, key) {
  if (!allowedKeys.has(key)) return false;
  profile.girlfriendProfile ||= getDefaultGirlfriendProfile();
  profile.girlfriendProfile[key] = listKeys.has(key) ? [] : "";
  return true;
}

function getGirlfriendProfileSummary(profile) {
  const gf = profile?.girlfriendProfile || {};
  const parts = [];
  if (gf.preferredName) parts.push(`Preferred name: ${gf.preferredName}`);
  if (gf.nicknames?.length) parts.push(`Nicknames: ${gf.nicknames.slice(-4).join(", ")}`);
  if (gf.favoriteFoods?.length) parts.push(`Favorite foods: ${gf.favoriteFoods.slice(-5).join(", ")}`);
  if (gf.likes?.length) parts.push(`Likes: ${gf.likes.slice(-5).join(", ")}`);
  if (gf.dislikes?.length) parts.push(`Dislikes: ${gf.dislikes.slice(-5).join(", ")}`);
  if (gf.comfortStyle) parts.push(`Comfort style: ${gf.comfortStyle}`);
  if (gf.romanticStyle) parts.push(`Romantic style: ${gf.romanticStyle}`);
  if (gf.lastKnownMood) parts.push(`Last known mood: ${gf.lastKnownMood}`);
  if (gf.importantNotes?.length) parts.push(`Important notes: ${gf.importantNotes.slice(-4).join("; ")}`);
  return parts.join(". ") || "No girlfriend profile preferences saved yet.";
}

module.exports = {
  allowedKeys,
  listKeys,
  getDefaultGirlfriendProfile,
  parseNoteInput,
  applyGirlfriendNote,
  removeGirlfriendNote,
  getGirlfriendProfileSummary
};
