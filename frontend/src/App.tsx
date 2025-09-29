import React, { useState } from "react";
import "./App.css";
import {
  processImageWithOCR,
  parseOCRText,
  saveData,
} from "./services/OcrService";
import AdminPanel from "./AdminPanel";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";

// Define interface for OCR result data
interface OCRData {
  Date?: string;
  "Selected Price"?: string;
  "Selected Price (max fallback)"?: string;
  "Total Amount"?: string;
  [key: string]: string | undefined;
}

// Define interface for OCR result state
interface OCRResult {
  result: OCRData | null;
  date: string;
  amount: string;
  status: string;
}

function MainApp() {
  const [category, setCategory] = useState("Food");
  const [images, setImages] = useState<File[]>([]);
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [modeOfTravel, setModeOfTravel] = useState("");
  const [purpose, setPurpose] = useState("");
  const [misc, setMisc] = useState("");
  const [billDetails] = useState("");
  const [remarks] = useState("");
  const [budgetHead] = useState("");
  const [status, setStatus] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(files);
    setOcrResults(
      files.map(() => ({ result: null, date: "", amount: "", status: "" }))
    );
    setCurrentIndex(0);
  };

  const handleProcessImage = async () => {
    if (!images[currentIndex]) return;
    const updatedOcrResults = [...ocrResults];
    const currentResult = updatedOcrResults[currentIndex];
    if (!currentResult) return;

    currentResult.status = "Processing OCR...";
    setOcrResults(updatedOcrResults);
    try {
      const text = await processImageWithOCR(images[currentIndex]);
      const data = parseOCRText(text);
      updatedOcrResults[currentIndex] = {
        result: data,
        date: data["Date"] || "",
        amount:
          data["Selected Price"] ||
          data["Selected Price (max fallback)"] ||
          data["Total Amount"] ||
          "",
        status: "OCR processing complete. Review and submit.",
      };
      setOcrResults([...updatedOcrResults]);
    } catch (error) {
      const errorResult = updatedOcrResults[currentIndex];
      if (errorResult) {
        errorResult.status = "Error processing image. Please try again.";
      }
      setOcrResults([...updatedOcrResults]);
      console.error(error);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedOcrResults = [...ocrResults];
    const currentResult = updatedOcrResults[currentIndex];
    if (currentResult) {
      currentResult.amount = e.target.value;
      setOcrResults(updatedOcrResults);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedOcrResults = [...ocrResults];
    const currentResult = updatedOcrResults[currentIndex];
    if (currentResult) {
      currentResult.date = e.target.value;
      setOcrResults(updatedOcrResults);
    }
  };

  const handleSubmit = async () => {
    const currentOcrResult = ocrResults[currentIndex];
    if (
      !images[currentIndex] ||
      !currentOcrResult?.date ||
      !currentOcrResult?.amount
    ) {
      setStatus("Please process an image and review the extracted fields.");
      return;
    }
    setStatus("Saving data...");
    const data = {
      date: currentOcrResult.date,
      from: "",
      to: "",
      modeOfTravel: "",
      purpose: "",
      travelExpenses: "",
      foodS1: "",
      foodS2: "",
      foodS3: "",
      foodS4: "",
      foodS5: "",
      foodS6: "",
      misc: "",
      amount: currentOcrResult.amount,
      billDetails,
      remarks,
      budgetHead,
      image: images[currentIndex],
    };
    if (category === "Food") {
      data.foodS1 = currentOcrResult.amount;
    } else if (category === "Travel") {
      data.from = from;
      data.to = to;
      data.modeOfTravel = modeOfTravel;
      data.purpose = purpose;
      data.travelExpenses = currentOcrResult.amount;
    } else if (category === "Miscellaneous") {
      data.misc = currentOcrResult.amount;
    }
    const success = await saveData(
      data.date,
      data.from,
      data.to,
      data.modeOfTravel,
      data.purpose,
      data.travelExpenses,
      data.foodS1,
      data.foodS2,
      data.foodS3,
      data.foodS4,
      data.foodS5,
      data.foodS6,
      data.misc,
      data.amount,
      billDetails,
      remarks,
      budgetHead,
      images[currentIndex]
    );
    if (success) {
      setStatus("Data saved successfully!");
      if (currentIndex < images.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setImages([]);
        setOcrResults([]);
        setCurrentIndex(0);
      }
    } else {
      setStatus("Failed to save data. Please check the console.");
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Bill OCR App</h1>
        <p>Upload a bill/receipt to extract information.</p>
        <Link
          to="/admin"
          style={{
            color: "white",
            textDecoration: "underline",
            position: "absolute",
            right: 20,
            top: 20,
          }}
        >
          Admin Panel
        </Link>
      </header>
      <main>
        <div className="form-container">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Food">Food</option>
            <option value="Travel">Travel</option>
            <option value="Miscellaneous">Miscellaneous</option>
          </select>
          {category === "Travel" && (
            <>
              <input
                type="text"
                placeholder="From"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <input
                type="text"
                placeholder="To"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <input
                type="text"
                placeholder="Mode of Travel"
                value={modeOfTravel}
                onChange={(e) => setModeOfTravel(e.target.value)}
              />
              <input
                type="text"
                placeholder="Purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </>
          )}
          {category === "Miscellaneous" && (
            <input
              type="text"
              placeholder="Miscellaneous"
              value={misc}
              onChange={(e) => setMisc(e.target.value)}
            />
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
          />
          {images.length > 0 && (
            <div
              style={{
                margin: "16px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
                disabled={currentIndex === 0}
                style={{ marginRight: 16 }}
              >
                &lt;
              </button>
              <span>
                Image {currentIndex + 1} of {images.length}
              </span>
              <button
                onClick={() =>
                  setCurrentIndex((i) => Math.min(i + 1, images.length - 1))
                }
                disabled={currentIndex === images.length - 1}
                style={{ marginLeft: 16 }}
              >
                &gt;
              </button>
            </div>
          )}
          {images[currentIndex] && (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <img
                src={URL.createObjectURL(images[currentIndex])}
                alt="Preview"
                style={{ maxWidth: 400, maxHeight: 400, display: "block" }}
              />
            </div>
          )}
          {images[currentIndex] && (
            <button onClick={handleProcessImage} style={{ margin: "16px 0" }}>
              Process Image
            </button>
          )}
          {status && <p className="status">{status}</p>}
          {ocrResults[currentIndex]?.status && (
            <p className="status">{ocrResults[currentIndex].status}</p>
          )}
          {ocrResults[currentIndex]?.result && (
            <div
              className="results-container"
              style={{
                marginTop: 24,
                maxWidth: 400,
                marginLeft: "auto",
                marginRight: "auto",
                padding: 24,
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)",
                border: "1px solid #e0e0e0",
              }}
            >
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 20,
                  color: "#222",
                  letterSpacing: 0.2,
                }}
              >
                Extracted Data
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <div style={{ marginBottom: 18 }}>
                  <label
                    htmlFor="extracted-amount"
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: 6,
                      color: "#444",
                    }}
                  >
                    Price
                  </label>
                  <input
                    id="extracted-amount"
                    type="text"
                    value={ocrResults[currentIndex]?.amount || ""}
                    onChange={handleAmountChange}
                    placeholder="Amount"
                    style={{
                      width: "100%",
                      padding: "12px 10px",
                      borderRadius: 6,
                      border: "1px solid #bdbdbd",
                      background: "#f9f9f9",
                      color: "#222",
                      fontSize: 16,
                      fontWeight: 500,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label
                    htmlFor="extracted-date"
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: 6,
                      color: "#444",
                    }}
                  >
                    Date
                  </label>
                  <input
                    id="extracted-date"
                    type="text"
                    value={ocrResults[currentIndex]?.date || ""}
                    onChange={handleDateChange}
                    placeholder="Date"
                    style={{
                      width: "100%",
                      padding: "12px 10px",
                      borderRadius: 6,
                      border: "1px solid #bdbdbd",
                      background: "#f9f9f9",
                      color: "#222",
                      fontSize: 16,
                      fontWeight: 500,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: "12px 0",
                    width: "100%",
                    borderRadius: 6,
                    background: "#1976d2",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: 0.5,
                    marginTop: 8,
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "#1565c0")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "#1976d2")
                  }
                >
                  Submit Data
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;
