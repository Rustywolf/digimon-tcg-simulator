import {CardTypeGame, CardTypeWithId} from "./types.ts";
import cardBack from "../assets/cardBack.jpg";

import {
    playButtonClickSfx,
    playDrawCardSfx, playNextPhaseSfx,
    playOpponentPlaceCardSfx, playPassTurnSfx,
    playRevealCardSfx,
    playSecurityRevealSfx, playShuffleDeckSfx,
    playSuspendSfx, playTrashCardSfx, playUnsuspendSfx
} from "./sound.ts";
import axios from "axios";
import {starterBeelzemon, starterGallantmon} from "./starterDecks.ts";

export function calculateCardRotation(handCardLength: number, index: number) {
    const middleIndex = Math.floor(handCardLength / 2);
    let value = ((index - middleIndex) / 2);
    if (handCardLength <= 6) value *= 2;
    if (handCardLength > 10) value = ((index - middleIndex) / 3.5);
    if (handCardLength > 15) value = ((index - middleIndex) / 4);
    if (handCardLength > 20) value = ((index - middleIndex) / 5.5);
    if (handCardLength > 25) value = ((index - middleIndex) / 8);
    return value * handCardLength + "deg";
}

export function calculateCardOffsetY(handCardLength: number, index: number) {
    if (handCardLength === 3 && index === 1) return "-5px";
    if (handCardLength <= 3) return "0px";

    const middleIndex = Math.floor(handCardLength / 2);
    const middleValue = 0;
    let endValue = handCardLength + 5 + (handCardLength / 3) * 2;
    if (handCardLength > 5) {
        if (index === 0 || index === handCardLength - 1) endValue += (handCardLength / 3) * 3.25;
        if (index === 1 || index === handCardLength - 2) endValue += (handCardLength / 3) * 1.9;
        if (index === 2 || index === handCardLength - 3) endValue += (handCardLength / 3) * 1.5;
        if (index === 3 || index === handCardLength - 4) endValue += (handCardLength / 3) * 1.25;
        if (index === 4 || index === handCardLength - 5) endValue += (handCardLength / 3) * 1.1;
    }
    const distanceToMiddle = Math.abs(index - middleIndex);
    let offset = ((middleValue + (endValue - middleValue) * (distanceToMiddle / (middleIndex - 1))) - handCardLength);
    if (index === middleIndex && handCardLength % 2 === 0) offset -= (2 + handCardLength / 6);
    return (index === middleIndex || index === 0 && handCardLength == 6) ? offset + 10 - handCardLength / 3 + handCardLength / 10 + "px" : offset + "px";
}

export function calculateCardOffsetX(handCardLength: number, index: number) {
    if (handCardLength === 1) return "150px";
    if (handCardLength === 2) return (index * 200) / handCardLength + 80 + "px";
    if (handCardLength === 3) return (index * 300) / handCardLength + 50 + "px";
    if (handCardLength >= 4) return (index * 400) / handCardLength + "px";
}

export function topCardInfo(card: CardTypeGame, location: string, locationCards: CardTypeGame[]) {
    const locationsWithInfo = ["myBreedingArea", "opponentBreedingArea",
        "myDigi1", "myDigi2", "myDigi3", "myDigi4", "myDigi5", "myDigi6", "myDigi7", "myDigi8", "myDigi9", "myDigi10",
        "opponentDigi1", "opponentDigi2", "opponentDigi3", "opponentDigi4", "opponentDigi5", "opponentDigi6",
        "opponentDigi7", "opponentDigi8", "opponentDigi9", "opponentDigi10"];
    if (!locationsWithInfo.find((l => l === location))) return undefined;

    let effectInfo = "Inherited effects: \n";
    locationCards.forEach((card, index) => {
        if (index === locationCards.length - 1) return;
        if (card.inheritedEffect === null) return;
        effectInfo += "• " + card.inheritedEffect + "\n";
    });

    return card === locationCards[locationCards.length - 1] ? effectInfo : undefined;
}

export function getOpponentSfx(command: string) {
    switch (command) {
        case ("[REVEAL_SFX]"): {
            playRevealCardSfx();
            break;
        }
        case ("[SECURITY_REVEAL_SFX]"): {
            playSecurityRevealSfx();
            break;
        }
        case ("[PLACE_CARD_SFX]"): {
            playOpponentPlaceCardSfx();
            break;
        }
        case ("[DRAW_CARD_SFX]"): {
            playDrawCardSfx();
            break;
        }
        case ("[SUSPEND_CARD_SFX]"): {
            playSuspendSfx();
            break;
        }
        case ("[UNSUSPEND_CARD_SFX]"): {
            playUnsuspendSfx();
            break;
        }
        case ("[BUTTON_CLICK_SFX]"): {
            playButtonClickSfx();
            break;
        }
        case ("[TRASH_CARD_SFX]"): {
            playTrashCardSfx();
            break;
        }
        case ("[SHUFFLE_DECK_SFX]"): {
            playShuffleDeckSfx();
            break;
        }
        case ("[NEXT_PHASE_SFX]"): {
            playNextPhaseSfx();
            break;
        }
        case ("[PASS_TURN_SFX]"): {
            playPassTurnSfx();
            break;
        }
    }
}

export function sortCards(deck: CardTypeWithId[]) {
    const newDeck = [...deck];
    newDeck.sort(compareCardNumbers);
    newDeck.sort(compareCardLevels);
    newDeck.sort(compareCardTypes);
    return newDeck;
}

function compareCardNumbers(a: CardTypeWithId, b: CardTypeWithId) {
    if (a.cardNumber < b.cardNumber) return -1;
    if (a.cardNumber > b.cardNumber) return 1;
    return 0;
}

function compareCardLevels(a: CardTypeWithId, b: CardTypeWithId) {
    if (a.level === null && b.level === null) return 0;
    if (a.level === null) return -1;
    if (b.level === null) return 1;
    if (a.level && b.level && a.level < b.level) return -1;
    if (a.level && b.level && a.level > b.level) return 1;
    return 0;
}

function compareCardTypes(a: CardTypeWithId, b: CardTypeWithId) {
    const typeOrder: { [key: string]: number } = {
        "Digi-Egg": 0,
        "Option": 1,
        "Tamer": 2,
        "Digimon": 3
    };
    const aTypeOrder = typeOrder[a.cardType];
    const bTypeOrder = typeOrder[b.cardType];

    if (aTypeOrder < bTypeOrder) return -1;
    if (aTypeOrder > bTypeOrder) return 1;

    return 0;
}

export function getCardSize(location: string) {
    switch (location) {
        case "myTrash":
            return "105px";
        case "mySecurity":
            return "105px";
        case "opponentTrash":
            return "105px";
        case "deck":
            return "5.9vw";
        case "fetchedData":
            return "105px";
        default:
            return "95px";
    }
}

export function convertForLog(location: string) {
    const locationMappings: Record<string, string> = {
        myHand: "Hand",
        myDeckField: "Deck",
        myEggDeck: "Egg-Deck",
        myTrash: "Trash",
        mySecurity: "Security",
        myBreedingArea: "Breeding",
        myDigi1: "BA 1",
        myDigi2: "BA 2",
        myDigi3: "BA 3",
        myDigi4: "BA 4",
        myDigi5: "BA 5",
        myDigi6: "BA 6",
        myDigi7: "BA 7",
        myDigi8: "BA 8",
        myDigi9: "BA 9",
        myDigi10: "BA 10",
        myDigi11: "BA 11",
        myDigi12: "BA 12",
        myDigi13: "BA 13",
        myDigi14: "BA 14",
        myDigi15: "BA 15",
        myReveal: "Reveal",

        opponentHand: "Hand",
        opponentDeckField: "Deck",
        opponentEggDeck: "Egg-Deck",
        opponentTrash: "Trash",
        opponentSecurity: "Security",
        opponentBreedingArea: "Breeding",
        opponentDigi1: "BA 1",
        opponentDigi2: "BA 2",
        opponentDigi3: "BA 3",
        opponentDigi4: "BA 4",
        opponentDigi5: "BA 5",
        opponentDigi6: "BA 6",
        opponentDigi7: "BA 7",
        opponentDigi8: "BA 8",
        opponentDigi9: "BA 9",
        opponentDigi10: "BA 10",
        opponentDigi11: "BA 11",
        opponentDigi12: "BA 12",
        opponentDigi13: "BA 13",
        opponentDigi14: "BA 14",
        opponentDigi15: "BA 15",
        opponentReveal: "Reveal",
    };
    return locationMappings[location] || location;
}

function saveStarterDeck(name: string, color: string, decklist: string[]) {

    const deckToSave = {
        name: name,
        color: color,
        decklist: decklist,
        deckStatus: "INACTIVE"
    }

    axios
        .post("/api/profile/decks", deckToSave)
        .then((res) => res.data)
        .catch((error) => {
            console.error(error);
            throw error;
        });
}

export function addStarterDecks() {
    setTimeout(() => saveStarterDeck("[ADV. STARTER] Beelzemon", "Purple", starterBeelzemon), 100);
    setTimeout(() => saveStarterDeck("[STARTER] Gallantmon", "Red", starterGallantmon), 200);
}

export function mostFrequentColor(deckCards: CardTypeWithId[]) {
    const colorOccurrences = {};

    for (const card of deckCards) {
        const color = card.color[0];
        // @ts-ignore
        if (colorOccurrences[color]) {
            // @ts-ignore
            colorOccurrences[color]++;
        } else {
            // @ts-ignore
            colorOccurrences[color] = 1;
        }
    }

    let mostFrequentColor = null;
    let maxOccurrences = 0;

    for (const color in colorOccurrences) {
        // @ts-ignore
        if (colorOccurrences[color] > maxOccurrences) {
            mostFrequentColor = color;
            // @ts-ignore
            maxOccurrences = colorOccurrences[color];
        }
    }

    return mostFrequentColor;
}

export function getCardColor(color: string): [string, string] {
    switch (color) {
        case 'Red':
            return ["#b02626", "🔴"];
        case 'Yellow':
            return ["#b0a325", "🟡"];
        case 'Green':
            return ["#095E1C", "🟢"];
        case 'Blue':
            return ["#017fc2", "🔵"];
        case 'Purple':
            return ["#7f2dbd", "🟣"];
        case 'Black':
            return ["#484848", "⚫"];
        case 'White':
            return ["#DBDBDB", "⚪"];
        default:
            return ["transparent", ""];
    }
}

export function getDnaColor(word: string): string {
    switch (word) {
        case 'red':
            return "🔴";
        case 'yellow':
            return "🟡";
        case 'green':
            return "🟢";
        case 'blue':
            return "🔵";
        case 'purple':
            return "🟣";
        case 'black':
            return "⚫";
        case 'white':
            return "⚪";
        case 'all':
            return "ALL 🌈";
        default:
            return word + " ";
    }
}

const assetBaseUrl = "https://raw.githubusercontent.com/WE-Kaito/digimon-tcg-simulator/main/frontend/src/assets/"

export function getAttributeImage(attribute: string | null | undefined) {
    const baseUrl = assetBaseUrl + "attribute_icons/";
    switch (attribute) {
        case 'Virus':
            return baseUrl + "virus.png";
        case 'Data':
            return baseUrl + "data.png";
        case 'Vaccine':
            return baseUrl + "vaccine.png";
        case 'Free':
            return baseUrl + "free.png";
        case 'Variable':
            return baseUrl + "variable.png";
        case 'Unknown':
            return baseUrl + "unknown.png";
        case 'default':
            return;
    }
}

export function getCardTypeImage(cardType: string | undefined) {
    const baseUrl = assetBaseUrl + "cardtype_icons/";
    switch (cardType) {
        case 'Digimon':
            return baseUrl + "gammamon.png";
        case 'Option':
            return baseUrl + "option.png";
        case 'Tamer':
            return baseUrl + "tamer.png";
        case 'Digi-Egg':
            return baseUrl + "egg.png";
        case 'default':
            return;
    }
}

export function compareEffectText(searchText: string, card: CardTypeWithId) : boolean {
    const text = searchText.toUpperCase();

    const mainEffectMatch = card.mainEffect?.toUpperCase().includes(text) ?? false;
    const inheritedEffectMatch = card.inheritedEffect?.toUpperCase().includes(text) ?? false;
    const securityEffectMatch = card.securityEffect?.toUpperCase().includes(text) ?? false;
    const digivolveEffectMatch = card.specialDigivolve?.toUpperCase().includes(text) ?? false;
    const dnaEffectMatch = card.dnaDigivolve?.toUpperCase().includes(text) ?? false;
    const burstEffectMatch = card.burstDigivolve?.toUpperCase().includes(text) ?? false;
    const xrosEffectMatch = card.digiXros?.toUpperCase().includes(text) ?? false;

    return mainEffectMatch || inheritedEffectMatch || securityEffectMatch || digivolveEffectMatch || dnaEffectMatch || burstEffectMatch || xrosEffectMatch;
}

export const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => (event.target as HTMLImageElement).src = cardBack;

//workaround for double cards in fetchCardList
export function filterDoubleCardNumbers(cards : CardTypeWithId[]) : CardTypeWithId[] {
    const uniqueCards = [];
    let prevCardNumber = null;
    for (const card of cards) {
        if (card.uniqueCardNumber !== prevCardNumber) {
            uniqueCards.push(card);
            prevCardNumber = card.uniqueCardNumber;
        }
    }
    return uniqueCards;
}
