import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import questions from './questions';

function QuestionPage() {
  const location = useLocation();
  const { roomCode, playerId } = location.state || {};
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [fakerId, setFakerId] = useState(null);

  useEffect(() => {
    if (!roomCode || !playerId) return;

    const db = getDatabase();

    const hostRef = ref(db, `rooms/${roomCode}/players/${playerId}/isHost`);
    onValue(hostRef, (snapshot) => {
      setIsHost(snapshot.val());
    });

    const questionRef = ref(db, `rooms/${roomCode}/currentQuestion`);
    onValue(questionRef, (snapshot) => {
      const index = snapshot.val();
      if (index !== null && index < questions.length) {
        setCurrentQuestion(questions[index]);
      }
    });

    const playersRef = ref(db, `rooms/${roomCode}/players`);
    onValue(playersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const playerList = Object.entries(data).map(([id, value]) => ({
        id,
        ...value,
      }));
      setPlayers(playerList);
    });

    const fakerRef = ref(db, `rooms/${roomCode}/fakerId`);
    onValue(fakerRef, (snapshot) => {
      setFakerId(snapshot.val());
    });
  }, [roomCode, playerId]);

  const handleNextQuestion = () => {
    const db = getDatabase();
    const questionRef = ref(db, `rooms/${roomCode}/currentQuestion`);
    const fakerRef = ref(db, `rooms/${roomCode}/fakerId`);

    onValue(questionRef, (snapshot) => {
      let index = snapshot.val() || 0;
      index = index + 1 < questions.length ? index + 1 : 0;

      set(questionRef, index);

      const randomFaker =
        players[Math.floor(Math.random() * players.length)]?.id || null;
      set(fakerRef, randomFaker);
    }, { onlyOnce: true });
  };

  const isFaker = playerId === fakerId;

  return (
    <div className="min-h-screen bg-[#b1b5de] flex flex-col justify-center items-center px-4 text-center font-sans">
      {fakerId === playerId ? (
        <>
          <img src="/imposter.jpg" alt="Imposter" className="w-32 h-32 mb-4 rounded-full shadow-lg" />
          <h1 className="text-xl font-semibold text-white max-w-md">
            You are the IMPOSTER. Blend in by raising any number of fingers from 0 to 10. Be prepared to defend your number whatever happens.
          </h1>
        </>
      ) : (
        <h1 className="text-2xl font-bold text-white mb-6">{currentQuestion}</h1>
      )}
      {isHost && (
        <button
          onClick={handleNextQuestion}
          className="bg-white text-[#b1b5de] px-6 py-3 rounded-xl shadow font-bold hover:opacity-90 transition mt-6"
        >
          Next Question
        </button>
      )}
    </div>
  );
}

export default QuestionPage;
