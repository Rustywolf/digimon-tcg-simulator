import styled from "@emotion/styled";
import {useStore} from "../hooks/useStore.ts";
import {useEffect} from "react";
import ProfileDeck from "../components/ProfileDeck.tsx";
import BackButton from "../components/BackButton.tsx";
import {Headline2} from "../components/Header.tsx";
import ChooseAvatar from "../components/ChooseAvatar.tsx";
import {Loading} from "../components/FetchedCards.tsx";

export default function Profile({user}: { user: string }) {

    const fetchDecks = useStore((state) => state.fetchDecks);
    const decks = useStore((state) => state.decks);
    const isLoading = useStore((state) => state.isLoading);
    const getActiveDeck = useStore((state) => state.getActiveDeck);
    const activeDeckId = useStore((state) => state.activeDeckId);

    useEffect(() => {
        fetchDecks();
    }, [fetchDecks]);

    useEffect(() => {
        getActiveDeck();
    }, [getActiveDeck, activeDeckId]);

    return (
        <Wrapper>
            <Header>
                <Name style={{transform: "translateY(-8px)"}}>{user}</Name>
                <BackButton/>
            </Header>
            <ChooseAvatar/>
            <Container>
                {isLoading && <Loading/>}
                {!isLoading && decks?.map((deck, index) => <ProfileDeck key={index} deck={deck}/>)}
            </Container>
        </Wrapper>
    );
}

const Wrapper = styled.div`
  display: flex;
  height: 100vh;
  flex-direction: column;
  justify-content: space-between;
`;

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.5vw;
  align-items: flex-start;
  background: #0e0e0e;
  border-radius: 10px;
  width: 100vw;
  height: 410px;
  max-width: 1004px;
  
  @media (min-width: 1600px) {
    gap: 20px;
  }
  
  @media (min-width: 1600px) and (min-height: 1000px) {
    height: 32vw;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 10px;
  margin-top: 5vh;

  @media (max-width: 766px) {
    margin-top: 1.5vh;
  }
`;

const Name = styled(Headline2)`
  font-family: 'Amiga Forever', sans-serif;
  letter-spacing: -8px;
`;
