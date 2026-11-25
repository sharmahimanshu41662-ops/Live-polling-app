import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { QRCodeCanvas } from "qrcode.react";

const socket = io("https://onrender.com");

function App() {
  const [role, setRole] = useState("home");
  const [roomCode, setRoomCode] = useState("EVENT-101");

  const [newQuestion, setNewQuestion] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");

  const [activePoll, setActivePoll] = useState(null);
  const [votes, setVotes] = useState({ A: 0, B: 0 });
  const [hasVoted, setHasVoted] = useState(false);

  const [audienceQ, setAudienceQ] = useState("");
  const [allQuestions, setAllQuestions] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
const urlRoom = params.get("room")?.toUpperCase();
    if (urlRoom) {
      setRoomCode(urlRoom);
      setRole("audience");
      socket.emit("join_room", urlRoom);
    }

        // लेट जुड़ने पर सर्वर से पुराना चल रहा सवाल और वोट लेना
    socket.on("room_state", (state) => {
      if (state.poll) setActivePoll(state.poll);
      if (state.votes) setVotes(state.votes);
      if (state.questions) setAllQuestions(state.questions);
    });

    socket.on("receive_poll", (data) => {
      setActivePoll(data);
      setVotes({ A: 0, B: 0 });
      setHasVoted(false);
    });

    socket.on("receive_vote", (data) => {
      setVotes((prev) => ({
        ...prev,
        [data.option]: prev[data.option] + 1,
      }));
    });

    socket.on("receive_question", (data) => {
      setAllQuestions((prev) => [...prev, data.text]);
    });

    return () => {
      socket.off("receive_poll");
      socket.off("receive_vote");
      socket.off("receive_question");
    };
  }, []);

  const enterRoom = (selectedRole) => {
    if (!roomCode.trim()) return;
    socket.emit("join_room", roomCode);
    setRole(selectedRole);
  };

  const launchPoll = () => {
    if (!newQuestion.trim()) return;
    if (!optA.trim()) return;
    if (!optB.trim()) return;

    socket.emit("create_poll", {
      roomCode,
      question: newQuestion,
      optA,
      optB,
    });
    setNewQuestion("");
    setOptA("");
    setOptB("");
  };

  const castVote = (option) => {
    if (hasVoted) return;
    socket.emit("send_vote", { roomCode, option });
    setHasVoted(true);
  };

  const sendQuestion = () => {
    if (!audienceQ.trim()) return;
    socket.emit("send_question", { roomCode, text: audienceQ });
    setAudienceQ("");
  };

  // प्रतिशत (%) निकालने का आसान गणित
  const totalVotes = votes.A + votes.B;
  const percentA = totalVotes === 0 ? 0 : Math.round((votes.A / totalVotes) * 100);
  const percentB = totalVotes === 0 ? 0 : Math.round((votes.B / totalVotes) * 100);

  // ================= 1. HOME SCREEN =================
  if (role === "home") {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center" }}>
          <h1>Live Quiz & Polling</h1>
          <p style={{ color: "#64748b", marginBottom: "25px" }}>
            Enter a Room Code to host or join a live session
          </p>
          <input
            type="text"
            className="input-box"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Room Code (e.g. EVENT-101)"
          />
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "10px" }}>
            <button onClick={() => enterRoom("host")} className="btn btn-blue">
              Create Room (Host)
            </button>
            <button onClick={() => enterRoom("audience")} className="btn btn-green">
              Join Room (Audience)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= 2. HOST SCREEN =================
  if (role === "host") {
    return (
      <div className="container">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
              <button onClick={() => setRole("home")} className="btn" style={{ backgroundColor: "#e2e8f0", color: "#1e293b", padding: "6px 12px", fontSize: "13px", marginBottom: "10px" }}>← Back to Home</button>
              <h2 style={{ margin: 0 }}>Host Dashboard</h2>
              <p style={{ color: "#64748b", margin: "5px 0" }}>Room Code: <b>{roomCode}</b></p>
            </div>

            <div className="qr-box">
<QRCodeCanvas value={window.location.origin + "/?room=" + roomCode} size={100} />          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Create a Live Poll</h3>
          <input
            type="text"
            className="input-box"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask your question here..."
          />
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              className="input-box"
              value={optA}
              onChange={(e) => setOptA(e.target.value)}
              placeholder="Option A"
            />
            <input
              type="text"
              className="input-box"
              value={optB}
              onChange={(e) => setOptB(e.target.value)}
              placeholder="Option B"
            />
          </div>
          <button onClick={launchPoll} className="btn btn-blue" style={{ width: "100%" }}>
            Launch Poll Live
          </button>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ marginTop: 0 }}>Live Results</h3>
            <span style={{ color: "#64748b", fontSize: "14px" }}>Total Votes: <b>{totalVotes}</b></span>
          </div>

          {activePoll ? (
            <div>
              <p style={{ fontSize: "18px", marginBottom: "20px" }}><b>{activePoll.question}</b></p>

              {/* Option A Progress Bar */}
              <div className="poll-result-box">
                <div className="poll-label">
                  <span>{activePoll.optA}</span>
                  <span>{votes.A} votes ({percentA}%)</span>
                </div>
                <div className="bar-bg">
                  <div className="bar-fill-blue" style={{ width: percentA + "%" }}></div>
                </div>
              </div>

              {/* Option B Progress Bar */}
              <div className="poll-result-box">
                <div className="poll-label">
                  <span>{activePoll.optB}</span>
                  <span>{votes.B} votes ({percentB}%)</span>
                </div>
                <div className="bar-bg">
                  <div className="bar-fill-green" style={{ width: percentB + "%" }}></div>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: "#64748b" }}>No active poll yet. Launch one above!</p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Audience Questions (Q&A)</h3>
          {allQuestions.length === 0 && <p style={{ color: "#64748b" }}>No questions yet.</p>}
          <ul style={{ padding: 0, margin: 0 }}>
            {allQuestions.map((q, i) => (
              <li key={i} className="q-item">{q}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ================= 3. AUDIENCE SCREEN =================
  return (
        <div className="container">
      <div className="card">
        <button onClick={() => setRole("home")} className="btn" style={{ backgroundColor: "#e2e8f0", color: "#1e293b", padding: "6px 12px", fontSize: "13px", marginBottom: "10px" }}>← Back to Home</button>
        <h2 style={{ margin: 0 }}>Audience View</h2>
        <p style={{ color: "#64748b", margin: "5px 0 0 0" }}>Connected to Room: <b>{roomCode}</b></p>
      </div>


      <div className="card">
        <h3 style={{ marginTop: 0 }}>Live Poll</h3>
        {activePoll ? (
          <div>
            <p style={{ fontSize: "18px" }}><b>{activePoll.question}</b></p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button onClick={() => castVote("A")} disabled={hasVoted} className="btn btn-blue">
                {activePoll.optA}
              </button>
              <button onClick={() => castVote("B")} disabled={hasVoted} className="btn btn-green">
                {activePoll.optB}
              </button>
            </div>
            {hasVoted && (
              <div style={{ marginTop: "20px" }}>
                <p style={{ color: "#10b981", fontWeight: "bold" }}>✓ Your vote has been recorded!</p>

                <div className="poll-result-box">
                  <div className="poll-label">
                    <span>{activePoll.optA}</span>
                    <span>{votes.A} votes ({percentA}%)</span>
                  </div>
                  <div className="bar-bg">
                    <div className="bar-fill-blue" style={{ width: percentA + "%" }}></div>
                  </div>
                </div>

                <div className="poll-result-box">
                  <div className="poll-label">
                    <span>{activePoll.optB}</span>
                    <span>{votes.B} votes ({percentB}%)</span>
                  </div>
                  <div className="bar-bg">
                    <div className="bar-fill-green" style={{ width: percentB + "%" }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: "#64748b" }}>Waiting for Host to launch a poll...</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Ask a Question (Q&A)</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            className="input-box"
            style={{ marginBottom: 0 }}
            value={audienceQ}
            onChange={(e) => setAudienceQ(e.target.value)}
            placeholder="Type your question for the host..."
          />
          <button onClick={sendQuestion} className="btn btn-blue">Send</button>
        </div>
        <ul style={{ padding: 0, marginTop: "15px" }}>
          {allQuestions.map((q, i) => (
            <li key={i} className="q-item">{q}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
