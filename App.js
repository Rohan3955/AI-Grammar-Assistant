import { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null); // Avatar video
  const cameraRef = useRef(null); // Live camera feed

  // --- Grammar correction ---
  const checkAndCorrect = (text) => {
    let corrected = text;

    // More grammar rules
    corrected = corrected.replace(/\bi has\b/gi, "I have");
    corrected = corrected.replace(/\bhe go\b/gi, "He goes");
    corrected = corrected.replace(/\bshe do\b/gi, "She does");
    corrected = corrected.replace(/\bthey is\b/gi, "They are");
    corrected = corrected.replace(/\bi am go\b/gi, "I am going");
    corrected = corrected.replace(/\byou was\b/gi, "You were");
    corrected = corrected.replace(/\bit do\b/gi, "It does");
    corrected = corrected.replace(/\bi doesnt\b/gi, "I don’t");
    corrected = corrected.replace(/\bhe dont\b/gi, "He doesn’t");

    return corrected;
  };

  // --- Fetch AI response from OpenAI API ---
  const fetchAIResponse = async (text) => {
    try {
      setLoading(true);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful AI assistant. Correct grammar only when needed, but always answer like Google Assistant." },
            { role: "user", content: text }
          ]
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error fetching AI:", error);
      return "Sorry, I couldn't connect to AI right now.";
    } finally {
      setLoading(false);
    }
  };

  // --- Speak with avatar ---
  const speak = (text) => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.onend = () => {
      if (videoRef.current) videoRef.current.pause();
    };
    window.speechSynthesis.speak(utterance);
  };

  // --- Handle typed input ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const corrected = checkAndCorrect(input);

    if (input !== corrected) {
      setOutput(`Correction: ${corrected}`);
      speak(`I think you should say: ${corrected}`);
    }

    const reply = await fetchAIResponse(corrected);
    setOutput((prev) => prev + `\nAI: ${reply}`);
    speak(reply);

    setInput("");
  };

  // --- Mic Speech Recognition ---
  const handleMicClick = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
      const spoken = event.results[0][0].transcript;
      setInput(spoken);

      const corrected = checkAndCorrect(spoken);
      if (spoken !== corrected) {
        setOutput(`Correction: ${corrected}`);
        speak(`I think you should say: ${corrected}`);
      }

      const reply = await fetchAIResponse(corrected);
      setOutput((prev) => prev + `\nAI: ${reply}`);
      speak(reply);
    };

    recognition.start();
  };

  // --- Camera feed ---
  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cameraRef.current) {
          cameraRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    }
    initCamera();
  }, []);

  return (
    <div className="App">
      <h1>🤖 AI Grammar & Assistant</h1>
      <p className="subtitle">Chat, correct grammar & talk with your AI friend!</p>

      {/* Avatar */}
      <div className="video-container">
        <video ref={videoRef} src="/avatar.mp4" width="300" height="300" muted />
        <video ref={cameraRef} autoPlay playsInline width="300" height="300" />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={loading}>Send</button>
        <button type="button" onClick={handleMicClick}>🎤</button>
      </form>

      {/* Output */}
      <div className="chat-box">
        {loading ? <p><em>Thinking...</em></p> : <pre>{output}</pre>}
      </div>
    </div>
  );
}

export default App;
