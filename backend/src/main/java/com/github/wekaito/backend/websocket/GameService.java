package com.github.wekaito.backend.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.wekaito.backend.Card;
import com.github.wekaito.backend.IdService;
import com.github.wekaito.backend.DeckService;
import com.github.wekaito.backend.security.MongoUserDetailsService;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.*;

@Service
@Getter
@RequiredArgsConstructor
public class GameService extends TextWebSocketHandler {

    private final MongoUserDetailsService mongoUserDetailsService;

    private final DeckService deckService;

    private final IdService idService;

    final Map<String, Set<WebSocketSession>> gameRooms = new HashMap<>();

    private static final ObjectMapper objectMapper = new ObjectMapper();

    private static final SecureRandom secureRand = new SecureRandom();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        // do nothing
    }

    @Override
    public void afterConnectionClosed(@NotNull WebSocketSession session, CloseStatus status) {
        String username = Objects.requireNonNull(session.getPrincipal()).getName();
        gameRooms.values().forEach(value -> value.removeIf(s -> username.equals(Objects.requireNonNull(s.getPrincipal()).getName())));
        gameRooms.entrySet().removeIf(entry -> entry.getValue().isEmpty());
    }

    @Scheduled(fixedRate = 7000)
    private synchronized void sendHeartbeat() throws IOException {
        for (Set<WebSocketSession> gameRoom : gameRooms.values()) {
            for (WebSocketSession webSocketSession : gameRoom) {
                webSocketSession.sendMessage(new TextMessage("[HEARTBEAT]"));
            }
        }
    }

    @Override
    protected void handleTextMessage(@NotNull WebSocketSession session, TextMessage message) throws IOException, InterruptedException {
        String userName = Objects.requireNonNull(session.getPrincipal()).getName();
        String payload = message.getPayload();
        if (payload.equals("/heartbeat/")) return;
        String[] parts = payload.split(":", 2);

        if (payload.startsWith("/startGame:") && parts.length >= 2) {
            String gameId = parts[1].trim();
            String username1 = gameId.split("‗")[0];
            String username2 = gameId.split("‗")[1];

            setUpGame(session, gameId, username1, username2);
            if (username2.equals(Objects.requireNonNull(session.getPrincipal()).getName())) return;
            Thread.sleep(3600);
            distributeCards(gameId, username1, username2);
            return;
        }

        if(payload.startsWith("/reconnect:") && parts.length >= 2){
            synchronized (gameRooms) {
                String gameId = parts[1].trim();
                Set<WebSocketSession> existingGameRoom = gameRooms.get(gameId);
                if (existingGameRoom != null && existingGameRoom.size() == 1) { // reconnect, if room exists with 1 user
                    WebSocketSession opponentSession = existingGameRoom.iterator().next();
                    existingGameRoom.add(session);
                    Thread.sleep(1000);
                    opponentSession.sendMessage(new TextMessage("[OPPONENT_RECONNECTED]"));
                    return;
                }
            }
        }

        String gameId = parts[0];
        String roomMessage = parts[1];
        Set<WebSocketSession> gameRoom = gameRooms.get(gameId);

        if (roomMessage.startsWith("/restartGame:")) {
            String username1 = gameId.split("‗")[0];
            String username2 = gameId.split("‗")[1];
            String startingPlayer = roomMessage.split(":")[1];
            restartGame(session, gameId, username1, username2, startingPlayer);
            Thread.sleep(3600);
            distributeCards(gameId, username1, username2);
            return;
        }

        if (gameRoom == null) return;

        if (roomMessage.startsWith("/updateGame:")) processGameChunk(session, roomMessage, gameRoom);

        if (roomMessage.startsWith("/attack:")) handleAttack(gameRoom, roomMessage);

        if (roomMessage.startsWith("/moveCard:")) handleSendMoveCard(gameRoom, roomMessage);

        if(roomMessage.startsWith("/moveCardToDeck:")) handleSendMoveToDeck(gameRoom, roomMessage);

        if(roomMessage.startsWith("/tiltCard:")) handleTiltCard(gameRoom, roomMessage);

        if (roomMessage.startsWith("/updateMemory:")) handleMemoryUpdate(gameRoom, roomMessage);

        if (roomMessage.startsWith("/chatMessage:")) sendChatMessage(gameRoom, userName, roomMessage);

        String[] simpleIdCommands = {"/updateAttackPhase", "/activateEffect", "/activateTarget", "/createToken"};
        if(Arrays.stream(simpleIdCommands).anyMatch(roomMessage::startsWith)) handleCommandWithId(gameRoom, roomMessage);

        else {
            String[] roomMessageParts = roomMessage.split(":", 2);
            String command = roomMessageParts[0];
            String opponentName = roomMessageParts[1];
            sendMessageToOpponent(gameRoom, opponentName, convertCommand(command));
        }
    }

    private void sendChatMessage(Set<WebSocketSession> gameRoom, String userName, String roomMessage) throws IOException {
        String[] roomMessageParts = roomMessage.split(":", 3);
        if (roomMessageParts.length < 3) return;
        String opponentName = roomMessageParts[1];
        String chatMessage = roomMessageParts[2];
        sendMessageToOpponent(gameRoom, opponentName, "[CHAT_MESSAGE]:" + userName + "﹕" + chatMessage);
    }

    private String convertCommand(String command) {
        return switch (command) {
            case "/surrender" -> "[SURRENDER]";
            case "/restartRequestAsFirst" -> "[RESTART_AS_FIRST]";
            case "/restartRequestAsSecond" -> "[RESTART_AS_SECOND]";
            case "/acceptRestart" -> "[ACCEPT_RESTART]";
            case "/openedSecurity" -> "[SECURITY_VIEWED]";
            case "/playRevealSfx" -> "[REVEAL_SFX]";
            case "/playSecurityRevealSfx" -> "[SECURITY_REVEAL_SFX]";
            case "/playPlaceCardSfx" -> "[PLACE_CARD_SFX]";
            case "/playDrawCardSfx" -> "[DRAW_CARD_SFX]";
            case "/playSuspendCardSfx" -> "[SUSPEND_CARD_SFX]";
            case "/playUnsuspendCardSfx" -> "[UNSUSPEND_CARD_SFX]";
            case "/playButtonClickSfx" -> "[BUTTON_CLICK_SFX]";
            case "/playTrashCardSfx" -> "[TRASH_CARD_SFX]";
            case "/playShuffleDeckSfx" -> "[SHUFFLE_DECK_SFX]";
            case "/playNextPhaseSfx" -> "[NEXT_PHASE_SFX]";
            case "/playPassTurnSfx" -> "[PASS_TURN_SFX]";
            case "/playerReady" -> "[PLAYER_READY]";
            case "/updatePhase" -> "[UPDATE_PHASE]";
            case "/unsuspendAll" -> "[UNSUSPEND_ALL]";
            case "/resolveCounterBlock" -> "[RESOLVE_COUNTER_BLOCK]";
            case "/loaded" -> "[LOADED]";
            case "/online" -> "[OPPONENT_ONLINE]";
            case "/activateTarget" -> "[ACTIVATE_TARGET]";
            case "/activateEffect" -> "[ACTIVATE_EFFECT]";
            case "/updateAttackPhase" -> "[OPPONENT_ATTACK_PHASE]";
            case "/createToken" -> "[CREATE_TOKEN]";
            default -> "";
        };
    }

    private String getPosition(String fromTo) {
        return switch (fromTo) {
            case "myDigi1" -> "opponentDigi1";
            case "myDigi2" -> "opponentDigi2";
            case "myDigi3" -> "opponentDigi3";
            case "myDigi4" -> "opponentDigi4";
            case "myDigi5" -> "opponentDigi5";
            case "myDigi6" -> "opponentDigi6";
            case "myDigi7" -> "opponentDigi7";
            case "myDigi8" -> "opponentDigi8";
            case "myDigi9" -> "opponentDigi9";
            case "myDigi10" -> "opponentDigi10";
            case "myDigi11" -> "opponentDigi11";
            case "myDigi12" -> "opponentDigi12";
            case "myDigi13" -> "opponentDigi13";
            case "myDigi14" -> "opponentDigi14";
            case "myDigi15" -> "opponentDigi15";
            case "mySecurity" -> "opponentSecurity";
            case "myHand" -> "opponentHand";
            case "myDeckField" -> "opponentDeckField";
            case "myEggDeck" -> "opponentEggDeck";
            case "myBreedingArea" -> "opponentBreedingArea";
            case "myTrash" -> "opponentTrash";
            case "myReveal" -> "opponentReveal";
            case "opponentDigi1" -> "myDigi1";
            case "opponentDigi2" -> "myDigi2";
            case "opponentDigi3" -> "myDigi3";
            case "opponentDigi4" -> "myDigi4";
            case "opponentDigi5" -> "myDigi5";
            case "opponentDigi6" -> "myDigi6";
            case "opponentDigi7" -> "myDigi7";
            case "opponentDigi8" -> "myDigi8";
            case "opponentDigi9" -> "myDigi9";
            case "opponentDigi10" -> "myDigi10";
            case "opponentDigi11" -> "myDigi11";
            case "opponentDigi12" -> "myDigi12";
            case "opponentDigi13" -> "myDigi13";
            case "opponentDigi14" -> "myDigi14";
            case "opponentDigi15" -> "myDigi15";
            case "opponentSecurity" -> "mySecurity";
            case "opponentHand" -> "myHand";
            case "opponentDeckField" -> "myDeckField";
            case "opponentEggDeck" -> "myEggDeck";
            case "opponentBreedingArea" -> "myBreedingArea";
            case "opponentTrash" -> "myTrash";
            case "opponentReveal" -> "myReveal";
            default -> "";
        };
    }

    private void sendMessageToOpponent(Set<WebSocketSession> gameRoom, String opponentName, String message) throws IOException {
        WebSocketSession opponentSession = gameRoom.stream()
                .filter(s -> opponentName.equals(Objects.requireNonNull(s.getPrincipal()).getName()))
                .findFirst().orElse(null);
        sendTextMessage(opponentSession, message);
    }

    private synchronized void sendTextMessage(WebSocketSession session, String message) throws IOException {
        if (session == null) return;
        if (session.isOpen()) session.sendMessage(new TextMessage(message));
    }

    private String getPlayersJson(String username1, String username2) throws JsonProcessingException {
        String avatar1 = mongoUserDetailsService.getAvatar(username1);
        String avatar2 = mongoUserDetailsService.getAvatar(username2);

        String sleeve1 = mongoUserDetailsService.getSleeve(username1);
        String sleeve2 = mongoUserDetailsService.getSleeve(username2);

        Player player1 = new Player(username1, avatar1, sleeve1);
        Player player2 = new Player(username2, avatar2, sleeve2);

        Player[] players = {player1, player2};
        return objectMapper.writeValueAsString(players);
    }

    private void setUpGame(WebSocketSession session, String gameId, String username1, String username2) throws IOException, InterruptedException {
        Set<WebSocketSession> gameRoom = gameRooms.computeIfAbsent(gameId, key -> new HashSet<>());
        gameRoom.add(session);

        Thread.sleep(500);
        sendTextMessage(session, "[START_GAME]:" + getPlayersJson(username1, username2));
        Thread.sleep(500);

        String[] names = {username1, username2};
        int index = secureRand.nextInt(names.length);
        if (Objects.requireNonNull(session.getPrincipal()).getName().equals(username1)) {
            for (WebSocketSession s : gameRoom) {
                sendTextMessage(s, "[STARTING_PLAYER]:" + names[index]);
            }
        }
    }

    private void restartGame(WebSocketSession session, String gameId, String username1, String username2, String startingPlayer) throws IOException, InterruptedException {
        Set<WebSocketSession> gameRoom = gameRooms.get(gameId);

        Thread.sleep(500);
        sendTextMessage(session, "[START_GAME]:" + getPlayersJson(username1, username2));
        Thread.sleep(500);

        for (WebSocketSession s : gameRoom) {
            sendTextMessage(s, "[STARTING_PLAYER]:" + startingPlayer);
        }
    }

    private void distributeCards(String gameId, String username1, String username2) throws IOException, InterruptedException {
        Set<WebSocketSession> gameRoom = gameRooms.get(gameId);

        List<Card> deck1 = deckService.getDeckCardsById(mongoUserDetailsService.getActiveDeck(username1));
        List<Card> deck2 = deckService.getDeckCardsById(mongoUserDetailsService.getActiveDeck(username2));

        List<GameCard> newDeck1 = createGameDeck(deck1);
        List<GameCard> newDeck2 = createGameDeck(deck2);

        List<GameCard> player1EggDeck = newDeck1.stream()
                .filter(card -> card.cardType().equals("Digi-Egg")).toList();
        newDeck1.removeAll(player1EggDeck);

        List<GameCard> player1Hand = newDeck1.stream()
                .limit(5).toList();
        newDeck1.removeAll(player1Hand);

        List<GameCard> player1Security = newDeck1.stream()
                .limit(5).toList();
        newDeck1.removeAll(player1Security);

        List<GameCard> player2EggDeck = newDeck2.stream()
                .filter(card -> card.cardType().equals("Digi-Egg")).toList();
        newDeck2.removeAll(player2EggDeck);

        List<GameCard> player2Security = newDeck2.stream()
                .limit(5).toList();
        newDeck2.removeAll(player2Security);

        List<GameCard> player2Hand = newDeck2.stream()
                .limit(5).toList();
        newDeck2.removeAll(player2Hand);

        GameStart newGame = new GameStart(player1Hand, newDeck1, player1EggDeck, player1Security, player2Hand, newDeck2, player2EggDeck, player2Security);
        String newGameJson = objectMapper.writeValueAsString(newGame);

        Thread.sleep(500);

        int chunkSize = 1000;
        int length = newGameJson.length();

        for (int i = 0; i < length; i += chunkSize) {

            int end = Math.min(length, i + chunkSize);
            String chunk = newGameJson.substring(i, end);
            for (WebSocketSession s : gameRoom) {
                sendTextMessage(s, "[DISTRIBUTE_CARDS]:" + chunk);
            }
        }
    }

    private List<GameCard> createGameDeck(List<Card> deck) {
        List<GameCard> gameDeck = new ArrayList<>();

        Collections.shuffle(deck, secureRand);

        for (Card card : deck) {
            GameCard newCard = new GameCard(
                    card.uniqueCardNumber(),
                    card.name(),
                    card.imgUrl(),
                    card.cardType(),
                    card.color(),
                    card.attribute(),
                    card.cardNumber(),
                    card.digivolveConditions(),
                    card.specialDigivolve(),
                    card.stage(),
                    card.digiType(),
                    card.dp(),
                    card.playCost(),
                    card.level(),
                    card.mainEffect(),
                    card.inheritedEffect(),
                    card.aceEffect(),
                    card.burstDigivolve(),
                    card.digiXros(),
                    card.dnaDigivolve(),
                    card.securityEffect(),
                    card.restriction_en(),
                    card.restriction_jp(),
                    card.illustrator(),
                    false,
                    idService.createId());
            gameDeck.add(newCard);
        }
        return gameDeck;
    }

    private void processGameChunk(WebSocketSession session, String command, Set<WebSocketSession> gameRoom) throws IOException {
        if (gameRoom == null) return;
        String chunk = command.substring("/updateGame:".length());
        for (WebSocketSession s : gameRoom) {
            if (s.isOpen() && !s.equals(session)) {
                sendTextMessage(s, "[UPDATE_OPPONENT]:" + chunk);
            }
        }
    }

    private void handleAttack(Set<WebSocketSession> gameRoom, String roomMessage) throws IOException {
        if (roomMessage.split(":").length < 5) return;
        String[] parts = roomMessage.split(":", 5);
        String opponentName = parts[1];
        String from = parts[2];
        String to = parts[3];
        String isEffect = parts[4];
        sendMessageToOpponent(gameRoom, opponentName, "[ATTACK]:" + getPosition(from) + ":" + getPosition(to) + ":" + isEffect);
    }

    private void handleSendMoveCard(Set<WebSocketSession> gameRoom, String roomMessage) throws IOException {
        if (roomMessage.split(":").length < 5) return;
        String[] parts = roomMessage.split(":", 5);
        String opponentName = parts[1];
        String cardId = parts[2];
        String from = parts[3];
        String to = parts[4];
        sendMessageToOpponent(gameRoom, opponentName, "[MOVE_CARD]:" + cardId + ":" + getPosition(from) + ":" + getPosition(to));
    }

    private void handleSendMoveToDeck(Set<WebSocketSession> gameRoom, String roomMessage) throws IOException {
        if (roomMessage.split(":").length < 6) return;
        String[] parts = roomMessage.split(":", 6);
        String opponentName = parts[1];
        String topOrBottom = parts[2];
        String cardId = parts[3];
        String from = parts[4];
        String to = parts[5];
        sendMessageToOpponent(gameRoom, opponentName, "[MOVE_CARD_TO_DECK]:" + topOrBottom + ":" + cardId + ":" + getPosition(from) + ":" + getPosition(to));
    }

    private void handleTiltCard(Set<WebSocketSession> gameRoom, String roomMessage) throws IOException {
        if (roomMessage.split(":").length < 4) return;
        String[] parts = roomMessage.split(":", 4);
        String opponentName = parts[1];
        String cardId = parts[2];
        String location = parts[3];
        sendMessageToOpponent(gameRoom, opponentName, "[TILT_CARD]:" + cardId + ":" + getPosition(location));
    }

    private void handleMemoryUpdate(Set<WebSocketSession> gameRoom, String roomMessage) throws IOException {
        if (roomMessage.split(":").length < 3) return;
        String[] parts = roomMessage.split(":", 3);
        String opponentName = parts[1];
        int memory = Integer.parseInt(parts[2]) * -1;
        sendMessageToOpponent(gameRoom, opponentName, "[UPDATE_MEMORY]:" + memory);
    }

    private void handleCommandWithId(Set<WebSocketSession> gameRoom, String roomMessage) throws IOException {
        if (roomMessage.split(":").length < 3) return;
        String[] parts = roomMessage.split(":", 3);
        String command = parts[0];
        String opponentName = parts[1];
        String id = parts[2];
        sendMessageToOpponent(gameRoom, opponentName, convertCommand(command) + ":" + id);
    }
}
