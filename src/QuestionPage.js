import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getDatabase, ref, onValue, set, get, child, update, remove } from 'firebase/database';
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

    const questionRef = ref(db, `rooms/${roomCode}/currentQuestion`);
    onValue(questionRef, (snapshot) => {
      const index = snapshot.val();
      if (index !== null && index < questions.length) {
        setCurrentQuestion(questions[index]);
      }
    });

  }, [roomCode, playerId]);

  const handleNextQuestion = async () => {
    const db = getDatabase();
    const repoName = "liar-celebrities"; // ← Change per repo
    const gameKey = getGameKey(repoName);
    const seenRef = ref(db, gameKey);

    const snapshot = await get(seenRef);
    let seenQuestions = snapshot.exists() ? snapshot.val() : [];

    if (seenQuestions.length >= questions.length) {
      await set(seenRef, []);
      seenQuestions = [];
    }

    const remaining = questions
      .map((_, i) => i)
      .filter((i) => !seenQuestions.includes(i));

    const nextIndex = remaining[Math.floor(Math.random() * remaining.length)];

    await set(ref(db, `rooms/${roomCode}/currentQuestion`), nextIndex);
    seenQuestions.push(nextIndex);
    await saveSeenQuestions(repoName, seenQuestions); // 🔥 Save updated list here

    const eligiblePlayers = players.filter(p => !p.isHost);
    const faker = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
    if (faker) {
      await set(ref(db, `rooms/${roomCode}/fakerId`), faker.id);
    }
  };

  const isFaker = playerId === fakerId;

  return (
    <div className="min-h-screen bg-[#b1b5de] flex flex-col justify-center items-center px-4 text-center font-sans">
      {isFaker ? (
        <>
          <img src="/imposter.jpg" alt="Imposter" className="w-64 h-64 mb-4 rounded-full shadow-lg" />
          <h1 className="text-xl font-semibold text-white max-w-md">
            Shh… You’re the IMPOSTER. They have the cue — you do not. Pretemd you know who they are talking about. If they vote you but you can guess who it is, you win the point!



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

// ✅ Reusable helper for managing seen questions by game

export function getGameKey(repoName) {
  switch (repoName) {
    case "liar-1":
      return "SeenQuestionsNumbers";
    case "liar-point":
      return "SeenQuestionsPoint";
    case "liar-celebrities":
      return "SeenQuestionsCelebrities";
    case "liar-hand":
      return "SeenQuestionsHand";
    case "liar-imposter":
      return "SeenQuestionsImposter";
    default:
      return "SeenQuestionsUnknown";
  }
}

export function saveSeenQuestions(repoName, seenQuestionsArray) {
  const db = getDatabase();
  const gameKey = getGameKey(repoName);
  set(ref(db, gameKey), seenQuestionsArray);
}

export function listenToSeenQuestions(repoName, callback) {
  const db = getDatabase();
  const gameKey = getGameKey(repoName);
  const seenRef = ref(db, gameKey);

  onValue(seenRef, (snapshot) => {
    const data = snapshot.val();
    const seen = Array.isArray(data) ? data : Object.values(data || {});
    callback(seen);
  });
}