import dataImage from '../assets/attribute_icons/data.png';
import virusImage from '../assets/attribute_icons/virus.png';
import vaccineImage from '../assets/attribute_icons/vaccine.png';
import freeImage from '../assets/attribute_icons/free.png';
import unknownImage from '../assets/attribute_icons/unknown.png';
import variableImage from '../assets/attribute_icons/variable.png';
import {CardType, CardTypeGame, CardTypeWithId} from "./types.ts";
import takatoImage from "../assets/profile_pictures/takato.jpg";
import aibaImage from "../assets/profile_pictures/aiba.jpg";
import arataImage from "../assets/profile_pictures/arata.jpg";
import eriImage from "../assets/profile_pictures/eri.jpg";
import haruImage from "../assets/profile_pictures/haru.jpg";
import hiroImage from "../assets/profile_pictures/hiro.jpg";
import mattImage from "../assets/profile_pictures/matt.jpg";
import minoruImage from "../assets/profile_pictures/minoru.jpg";
import rinaImage from "../assets/profile_pictures/rina.jpg";
import sakiImage from "../assets/profile_pictures/saki.jpg";
import taiImage from "../assets/profile_pictures/tai.jpg";
import takumiImage from "../assets/profile_pictures/takumi.jpg";
import {
    playButtonClickSfx,
    playDrawCardSfx,
    playOpponentPlaceCardSfx,
    playRevealCardSfx,
    playSecurityRevealSfx, playShuffleDeckSfx,
    playSuspendSfx, playTrashCardSfx, playUnsuspendSfx
} from "./sound.ts";
import axios from "axios";
import {starterBeelzemon, starterGallantmon, starterImperialdramon} from "./starterDecks.ts";

export function getBackgroundColor(color: string) {
    switch (color) {
        case 'Red':
            return "#b02626";
        case 'Yellow':
            return "#b0a325";
        case 'Green':
            return "#095E1C";
        case 'Blue':
            return "#085e8c";
        case 'Purple':
            return "#46136D";
        case 'Black':
            return "#070707";
        case 'White':
            return "#DBDBDB";
        case "default":
            return "rgba(0, 0, 0, 0)";
    }
}

export function getAttributeImage(attribute: string) {
    switch (attribute) {
        case 'Virus':
            return virusImage;
        case 'Data':
            return dataImage;
        case 'Vaccine':
            return vaccineImage;
        case 'Free':
            return freeImage;
        case 'Variable':
            return variableImage;
        case 'Unknown':
            return unknownImage;
        case 'default':
            return;
    }
}

export function getStrokeColor(hoverCard: CardType | null, selectedCard: CardType | null) {
    if (hoverCard) {
        switch (hoverCard.color) {
            case 'White':
                return "#070707";
            case 'Yellow':
                return "#070707";
            default:
                return "#C5C5C5";
        }
    }
    if (selectedCard) {
        switch (selectedCard.color) {
            case 'White':
                return "#070707";
            case 'Yellow':
                return "#070707";
            default:
                return "#C5C5C5";
        }
    }
    return "#C5C5C5";
}

export function profilePicture(avatarName: string) {
    switch (avatarName) {
        case "takato":
            return takatoImage;
        case "aiba":
            return aibaImage;
        case "arata":
            return arataImage;
        case "eri":
            return eriImage;
        case "haru":
            return haruImage;
        case "hiro":
            return hiroImage;
        case "matt":
            return mattImage;
        case "minoru":
            return minoruImage;
        case "rina":
            return rinaImage;
        case "saki":
            return sakiImage;
        case "tai":
            return taiImage;
        case "takumi":
            return takumiImage;
        default:
            return takatoImage;
    }
}

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
    if(handCardLength === 3 && index === 1) return "-5px";
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
    return (index === middleIndex|| index === 0 && handCardLength == 6) ? offset + 10 - handCardLength/3 + handCardLength/10 + "px" : offset + "px";
}

export function calculateCardOffsetX(handCardLength: number, index: number) {
    if (handCardLength === 1) return "150px";
    if (handCardLength === 2) return (index * 200) / handCardLength + 80 + "px";
    if (handCardLength === 3) return (index * 300) / handCardLength + 50 + "px";
    if (handCardLength >= 4) return (index * 400) / handCardLength + "px";
}

export function topCardInfo(card: CardTypeGame, location:string, locationCards: CardTypeGame[]){
    const locationsWithInfo = ["myDigi1", "myDigi2", "myDigi3", "myDigi4", "myDigi5", "opponentDigi1", "opponentDigi2", "opponentDigi3", "opponentDigi4", "opponentDigi5", "myBreedingArea", "opponentBreedingArea"];
    if (!locationsWithInfo.find((l => l === location))) return undefined;

    let effectInfo = "Inherited effects: \n";
    locationCards.forEach((card, index) => {
        if (index === locationCards.length -1) return;
        if (card.soureeffect === null) return;
        effectInfo += "• " + card.soureeffect + "\n";
    });

    return card === locationCards[locationCards.length -1] ? effectInfo : undefined;
}

export function getOpponentSfx(command: string) {
    switch(command){
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
    }
}

export function sortCards(deck: CardTypeWithId[]){
    const newDeck = [...deck];
    newDeck.sort(compareCardNumbers);
    newDeck.sort(compareCardLevels);
    newDeck.sort(compareCardTypes);
    return newDeck;
}

function compareCardNumbers(a: CardTypeWithId, b: CardTypeWithId){
    if (a.cardnumber < b.cardnumber) return -1;
    if (a.cardnumber > b.cardnumber) return 1;
    return 0;
}

function compareCardLevels(a: CardTypeWithId, b: CardTypeWithId){
    if (a.level === null && b.level === null) return 0;
    if (a.level === null) return -1;
    if (b.level === null) return 1;
    if (a.level < b.level) return -1;
    if (a.level > b.level) return 1;
    return 0;
}

function compareCardTypes(a: CardTypeWithId, b: CardTypeWithId) {
    const typeOrder: { [key: string]: number } = {
        "Digi-Egg": 0,
        "Option": 1,
        "Tamer": 2,
        "Digimon": 3
    };
    const aTypeOrder = typeOrder[a.type];
    const bTypeOrder = typeOrder[b.type];

    if (aTypeOrder < bTypeOrder) return -1;
    if (aTypeOrder > bTypeOrder) return 1;

    return 0;
}

export function getCardSize(location: string) {
    switch (location) {
        case "myTrash":
            return "105px";
        case "opponentTrash":
            return "105px";
        case "deck":
            return "103px";
        case "fetchedData":
            return "110px";
        case "myTamer":
            return "85px";
        default:
            return "95px";
    }
}

export function getConsecutiveDigimonIndex(card: CardTypeGame, locationCards: CardTypeGame[]): number {
    if (card.type !== "Digimon") return 0;
    const cardIndex = locationCards.findIndex((c) => c.id === card.id);
    let i = 1;
    for (let j = cardIndex - 1; j >= 0; j--) {
        if (locationCards[j].type === "Digimon") {
            i++;
        } else {
            break;
        }
    }
    return i;
}

export function getTamerCardIndex(card: CardTypeGame, locationCards: CardTypeGame[]): number {
    const cardIndex = locationCards.findIndex((c) => c.id === card.id);
    let count = 0;
    for (let i = 0; i < cardIndex; i++) {
        if (locationCards[i].type === "Tamer") {
            count++;
        }
    }
    return count;
}

export function convertForLog(location: string) {
    const locationMappings: Record<string, string> = {
        myHand: "Hand",
        myDeckField: "Deck",
        myEggDeck: "Egg-Deck",
        myTrash: "Trash",
        mySecurity: "Security",
        myTamer: "Tamers",
        myDelay: "Delay",
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
        myReveal: "Reveal",
    };
    return locationMappings[location] || location;
}

function saveStarterDeck(name:string, deck: CardType[]){

    const deckToSave = {
        name: name,
        cards: deck,
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

export function addStarterDecks(){
    setTimeout(() => saveStarterDeck("[ADVANCED STARTER] Beelzemon", starterBeelzemon), 100);
    setTimeout(() => saveStarterDeck("[STARTER] Gallantmon", starterGallantmon), 200);
    setTimeout(() => saveStarterDeck("[STARTER] Ultimate Ancient Dragon", starterImperialdramon), 300);
}
