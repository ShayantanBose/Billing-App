import React, { useCallback, useEffect, useState } from "react";
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

const createEmptyOcrResult = (): OCRResult => ({
  result: null,
  date: "",
  amount: "",
  status: "",
});

const sanitizeAmount = (value: string | undefined | null): string => {
  if (!value) return "";
  return value.replace(/₹/g, "").trim();
};

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
  const [isDragging, setIsDragging] = useState(false);

  const addImages = useCallback((incoming: File[], replace = false) => {
    if (!incoming.length) return;

    const sanitized = incoming.filter(
      (file) => file.type.startsWith("image/") && file.size > 0
    );
    if (!sanitized.length) return;

    setImages((prevImages) => {
      const nextImages = replace ? sanitized : [...prevImages, ...sanitized];
      const nextIndex = replace ? 0 : prevImages.length;
      setCurrentIndex(nextIndex);
      return nextImages;
    });

    setOcrResults((prevResults) => {
      const placeholders = sanitized.map(() => createEmptyOcrResult());
      return replace ? placeholders : [...prevResults, ...placeholders];
    });
  }, []);

  const extractImageFiles = useCallback(
    (clipboardData: DataTransfer | null) => {
      if (!clipboardData) return [] as File[];
      const timestamp = Date.now();
      const collected: File[] = [];

      const clipboardFiles = clipboardData.files
        ? Array.from(clipboardData.files)
        : [];
      clipboardFiles.forEach((file, index) => {
        if (file && file.type.startsWith("image/") && file.size > 0) {
          if (file.name) {
            collected.push(file);
          } else {
            const extension =
              file.type.split("/").pop()?.split("+")?.[0] || "png";
            collected.push(
              new File(
                [file],
                `pasted-bill-${timestamp}-${index}.${extension}`,
                { type: file.type || "image/png" }
              )
            );
          }
        }
      });

      if (collected.length) {
        return collected;
      }

      const items = clipboardData.items ? Array.from(clipboardData.items) : [];
      items.forEach((item, index) => {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob && blob.size > 0) {
            const mimeType = blob.type || "image/png";
            const extension =
              mimeType.split("/").pop()?.split("+")?.[0] || "png";
            if (blob instanceof File && blob.name) {
              collected.push(blob);
            } else {
              collected.push(
                new File(
                  [blob],
                  `pasted-bill-${timestamp}-item-${index}.${extension}`,
                  { type: mimeType }
                )
              );
            }
          }
        }
      });

      return collected;
    },
    []
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files, true);
    if (files.length) {
      setStatus(
        files.length > 1 ? `Loaded ${files.length} images.` : "Loaded 1 image."
      );
    }
    e.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer?.files || []).filter(
      (file) => file.type.startsWith("image/") && file.size > 0
    );
    if (files.length) {
      addImages(files);
      setStatus(
        files.length > 1
          ? `Added ${files.length} dropped images.`
          : "Dropped image added."
      );
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) {
      return;
    }
    setIsDragging(false);
  };

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable)
      ) {
        return;
      }

      const files = extractImageFiles(event.clipboardData || null);
      if (files.length) {
        event.preventDefault();
        addImages(files);
        setStatus(
          files.length > 1
            ? `Added ${files.length} pasted images.`
            : "Pasted image added."
        );
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addImages, extractImageFiles]);

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
      const extractedAmount =
        data["Selected Price"] ||
        data["Selected Price (max fallback)"] ||
        data["Total Amount"] ||
        "";
      updatedOcrResults[currentIndex] = {
        result: data,
        date: data["Date"] || "",
        amount: sanitizeAmount(extractedAmount),
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
      currentResult.amount = sanitizeAmount(e.target.value);
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
    const sanitizedAmount = sanitizeAmount(currentOcrResult?.amount);
    const normalizedPurpose = purpose.trim();
    if (!images[currentIndex] || !currentOcrResult?.date || !sanitizedAmount) {
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
      amount: sanitizedAmount,
      billDetails,
      remarks,
      budgetHead,
      image: images[currentIndex],
    };
    if (category === "Food") {
      data.foodS1 = sanitizedAmount;
      data.purpose = normalizedPurpose;
    } else if (category === "Travel") {
      data.from = from;
      data.to = to;
      data.modeOfTravel = modeOfTravel;
      data.purpose = normalizedPurpose;
      data.travelExpenses = sanitizedAmount;
    } else if (category === "Miscellaneous") {
      data.misc = sanitizedAmount;
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
      sanitizedAmount,
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
            color: "#fff",
            textDecoration: "none",
            position: "absolute",
            right: 20,
            top: 20,
            background: "#1976d2",
            padding: "10px 18px",
            borderRadius: 6,
            fontWeight: 600,
            letterSpacing: 0.5,
            boxShadow: "0 2px 12px rgba(25, 118, 210, 0.35)",
            border: "1px solid rgba(255,255,255,0.2)",
            transition: "background 0.2s, transform 0.2s",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#1565c0";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#1976d2";
            e.currentTarget.style.transform = "translateY(0)";
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
            </>
          )}
          {(category === "Travel" || category === "Food") && (
            <input
              type="text"
              placeholder="Purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
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
          <div
            className={`paste-drop-zone${isDragging ? " dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            tabIndex={0}
            role="button"
            aria-label="Paste or drop bill images"
          >
            <p>
              <strong>Tip:</strong> Copy a bill and press <kbd>Ctrl + V</kbd>,
              or drag and drop the image here.
            </p>
            <small>We'll queue pasted images automatically.</small>
          </div>
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
                  disabled={status === "Saving data..."}
                  style={{
                    padding: "12px 0",
                    width: "100%",
                    borderRadius: 6,
                    background:
                      status === "Saving data..." ? "#1565c0" : "#1976d2",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: 0.5,
                    marginTop: 8,
                    cursor: "pointer",
                    transition: "background 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background =
                      status === "Saving data..." ? "#1565c0" : "#1565c0")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "#1976d2")
                  }
                >
                  {status === "Saving data..." ? (
                    <>
                      <span
                        className="loading-spinner"
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,0.4)",
                          borderTopColor: "#fff",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      Submitting...
                    </>
                  ) : (
                    "Submit Data"
                  )}
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
